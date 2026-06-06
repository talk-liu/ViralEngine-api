import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { PlatformAccount } from '../../platform/entities/platform-account.entity';
import { PublishDraft } from '../../publish-draft/entities/publish-draft.entity';
import { DraftStatus } from '../../publish-draft/enums/draft-status.enum';
import { ListPublishResultsQueryDto } from '../dto/list-publish-results-query.dto';
import { SubmitPublishResultDto } from '../dto/submit-publish-result.dto';
import { PublishBatchItem } from '../entities/publish-batch-item.entity';
import { PublishBatch } from '../entities/publish-batch.entity';
import { PublishBatchItemStatus } from '../enums/publish-batch-item-status.enum';
import { PublishBatchStatus } from '../enums/publish-batch-status.enum';
import {
  batchToNormalizedPayload,
  buildAccountsPreview,
  buildSummaryTitle,
  normalizeSubmitPayload,
  toDetail,
  toSubmitResponse,
} from '../utils/publish-result.mapper';

@Injectable()
export class PublishResultService {
  constructor(
    @InjectRepository(PublishBatch)
    private readonly batchRepository: Repository<PublishBatch>,
    @InjectRepository(PublishBatchItem)
    private readonly itemRepository: Repository<PublishBatchItem>,
    @InjectRepository(PublishDraft)
    private readonly draftRepository: Repository<PublishDraft>,
    @InjectRepository(PlatformAccount)
    private readonly accountRepository: Repository<PlatformAccount>,
    private readonly dataSource: DataSource,
  ) {}

  async submit(
    userId: string,
    dto: SubmitPublishResultDto,
  ): Promise<{ result: ReturnType<typeof toSubmitResponse>; created: boolean }> {
    this.validateCounts(dto);

    if (dto.draftId) {
      await this.findOwnedDraft(userId, dto.draftId);
    }

    await this.validateAccountIds(
      userId,
      dto.items.map((item) => item.accountId),
    );

    if (dto.clientBatchId) {
      const existing = await this.batchRepository.findOne({
        where: { userId, clientBatchId: dto.clientBatchId },
      });

      if (existing) {
        const existingItems = await this.itemRepository.find({
          where: { batchId: existing.id },
          order: { stepKey: 'ASC' },
        });

        const incoming = normalizeSubmitPayload(dto);
        const stored = batchToNormalizedPayload(existing, existingItems);

        if (incoming !== stored) {
          throw new ConflictException('同 clientBatchId 的请求体与已有记录不一致');
        }

        return {
          result: toSubmitResponse(existing, existingItems),
          created: false,
        };
      }
    }

    const batch = await this.dataSource.transaction(async (manager) => {
      const batchRepo = manager.getRepository(PublishBatch);
      const itemRepo = manager.getRepository(PublishBatchItem);
      const draftRepo = manager.getRepository(PublishDraft);

      const savedBatch = await batchRepo.save(
        batchRepo.create({
          userId,
          clientBatchId: dto.clientBatchId ?? null,
          publishSessionKey: dto.publishSessionKey ?? null,
          draftId: dto.draftId ?? null,
          status: dto.status,
          platformScope: dto.platformScope,
          publishMethod: dto.publishMethod,
          videoCount: dto.videoCount,
          taskCount: dto.taskCount,
          successCount: dto.successCount,
          failureCount: dto.failureCount,
          skippedNonDouyinCount: dto.skippedNonDouyinCount ?? 0,
          startedAt: new Date(dto.startedAt),
          finishedAt: new Date(dto.finishedAt),
        }),
      );

      const savedItems = await itemRepo.save(
        dto.items.map((item) =>
          itemRepo.create({
            batchId: savedBatch.id,
            userId,
            stepKey: item.stepKey,
            entryClientId: item.entryClientId,
            draftItemClientId: item.draftItemClientId ?? null,
            accountId: item.accountId,
            platformId: item.platformId,
            accountNickname: item.accountNickname,
            accountOpenId: item.accountOpenId ?? null,
            videoTitle: item.videoTitle,
            videoDescription: item.videoDescription ?? '',
            topics: item.topics ?? null,
            tags: item.tags ?? null,
            videoFileName: item.videoFileName ?? null,
            videoLocalPathHash: item.videoLocalPathHash ?? null,
            douyinPublishTag: item.douyinPublishTag ?? null,
            douyinCartItems: item.douyinCartItems ?? null,
            location: item.location ?? null,
            scheduleAt: item.scheduleAt ? new Date(item.scheduleAt) : null,
            status: item.status,
            errorCode: item.errorCode ?? null,
            errorMessage: item.errorMessage ?? null,
            platformWorkId: item.platformWorkId ?? null,
            platformWorkUrl: item.platformWorkUrl ?? null,
            publishedAt: new Date(item.publishedAt),
          }),
        ),
      );

      if (
        dto.draftId &&
        dto.status === PublishBatchStatus.SUCCESS
      ) {
        await draftRepo.update(
          { id: dto.draftId, userId },
          { status: DraftStatus.PUBLISHED },
        );
      }

      savedBatch.items = savedItems;
      return savedBatch;
    });

    const items =
      batch.items ??
      (await this.itemRepository.find({
        where: { batchId: batch.id },
        order: { stepKey: 'ASC' },
      }));

    return {
      result: toSubmitResponse(batch, items),
      created: true,
    };
  }

  async list(userId: string, query: ListPublishResultsQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const qb = this.batchRepository
      .createQueryBuilder('batch')
      .where('batch.user_id = :userId', { userId });

    if (query.status) {
      qb.andWhere('batch.status = :status', { status: query.status });
    }

    if (query.from) {
      qb.andWhere('batch.finished_at >= :from', { from: new Date(query.from) });
    }

    if (query.to) {
      qb.andWhere('batch.finished_at <= :to', { to: new Date(query.to) });
    }

    if (query.accountId) {
      qb.andWhere(
        `EXISTS (
          SELECT 1 FROM publish_batch_items item
          WHERE item.batch_id = batch.id AND item.account_id = :accountId
        )`,
        { accountId: query.accountId },
      );
    }

    if (query.keyword?.trim()) {
      const keyword = `%${query.keyword.trim()}%`;
      qb.andWhere(
        `EXISTS (
          SELECT 1 FROM publish_batch_items item
          WHERE item.batch_id = batch.id
            AND (item.video_title LIKE :keyword OR item.account_nickname LIKE :keyword)
        )`,
        { keyword },
      );
    }

    qb.orderBy('batch.finished_at', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    const [batches, total] = await qb.getManyAndCount();

    if (batches.length === 0) {
      return { items: [], total, page, pageSize };
    }

    const batchIds = batches.map((batch) => batch.id);
    const allItems = await this.itemRepository.find({
      where: { batchId: In(batchIds) },
      order: { publishedAt: 'ASC' },
    });

    const itemsByBatch = new Map<string, PublishBatchItem[]>();
    for (const item of allItems) {
      const list = itemsByBatch.get(item.batchId) ?? [];
      list.push(item);
      itemsByBatch.set(item.batchId, list);
    }

    const items = batches.map((batch) => {
      const batchItems = itemsByBatch.get(batch.id) ?? [];
      return {
        id: batch.id,
        status: batch.status,
        videoCount: batch.videoCount,
        taskCount: batch.taskCount,
        successCount: batch.successCount,
        failureCount: batch.failureCount,
        finishedAt: batch.finishedAt.toISOString(),
        summaryTitle: buildSummaryTitle(batchItems, batch.videoCount),
        accountsPreview: buildAccountsPreview(batchItems),
      };
    });

    return { items, total, page, pageSize };
  }

  async getDetail(userId: string, batchId: string) {
    const batch = await this.findOwnedBatch(userId, batchId);
    const items = await this.itemRepository.find({
      where: { batchId: batch.id },
      order: { publishedAt: 'ASC' },
    });

    return toDetail(batch, items);
  }

  private validateCounts(dto: SubmitPublishResultDto) {
    if (dto.taskCount !== dto.items.length) {
      throw new BadRequestException('taskCount 与 items 长度不一致');
    }

    const actualSuccess = dto.items.filter(
      (item) => item.status === PublishBatchItemStatus.SUCCESS,
    ).length;
    const actualFailure = dto.items.filter(
      (item) => item.status === PublishBatchItemStatus.FAILED,
    ).length;

    if (dto.successCount !== actualSuccess) {
      throw new BadRequestException('successCount 与 items 中成功数量不一致');
    }

    if (dto.failureCount !== actualFailure) {
      throw new BadRequestException('failureCount 与 items 中失败数量不一致');
    }

    if (dto.successCount + dto.failureCount !== dto.taskCount) {
      throw new BadRequestException('successCount + failureCount 必须等于 taskCount');
    }

    if (
      dto.status === PublishBatchStatus.SUCCESS &&
      dto.failureCount !== 0
    ) {
      throw new BadRequestException('status 为 success 时 failureCount 必须为 0');
    }

    if (dto.status === PublishBatchStatus.FAILED && dto.successCount !== 0) {
      throw new BadRequestException('status 为 failed 时 successCount 必须为 0');
    }

    if (
      dto.status === PublishBatchStatus.PARTIAL_FAILED &&
      (dto.successCount === 0 || dto.failureCount === 0)
    ) {
      throw new BadRequestException(
        'status 为 partial_failed 时 successCount 与 failureCount 均须大于 0',
      );
    }

    const stepKeys = dto.items.map((item) => item.stepKey);
    if (new Set(stepKeys).size !== stepKeys.length) {
      throw new BadRequestException('items 中 stepKey 必须批次内唯一');
    }
  }

  private async validateAccountIds(userId: string, accountIds: string[]) {
    const uniqueIds = [...new Set(accountIds)];
    if (uniqueIds.length === 0) {
      return;
    }

    const accounts = await this.accountRepository.find({
      where: { id: In(uniqueIds), userId },
    });

    if (accounts.length !== uniqueIds.length) {
      const found = new Set(accounts.map((account) => account.id));
      const missing = uniqueIds.filter((id) => !found.has(id));
      throw new ForbiddenException(
        `账号不存在或不属于当前用户: ${missing.join(', ')}`,
      );
    }
  }

  private async findOwnedDraft(userId: string, draftId: string) {
    const draft = await this.draftRepository.findOne({
      where: { id: draftId, userId },
    });

    if (!draft) {
      throw new NotFoundException('关联草稿不存在');
    }

    return draft;
  }

  private async findOwnedBatch(userId: string, batchId: string) {
    const batch = await this.batchRepository.findOne({
      where: { id: batchId, userId },
    });

    if (!batch) {
      throw new NotFoundException('发布批次不存在');
    }

    return batch;
  }
}
