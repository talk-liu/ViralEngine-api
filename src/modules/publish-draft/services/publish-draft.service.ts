import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  PayloadTooLargeException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Like, Repository } from 'typeorm';
import { PlatformId } from '../../platform/enums/platform-id.enum';
import { SavePublishDraftDto } from '../dto/save-publish-draft.dto';
import { ListPublishDraftsQueryDto } from '../dto/list-publish-drafts-query.dto';
import { PublishDraftPayloadDto } from '../dto/publish-draft-payload.dto';
import { PublishDraftAsset } from '../entities/publish-draft-asset.entity';
import { PublishDraft } from '../entities/publish-draft.entity';
import { DraftAssetKind } from '../enums/draft-asset-kind.enum';
import { DraftStatus } from '../enums/draft-status.enum';
import type { PublishDraftPayload } from '../types/publish-draft-payload.type';
import { PublishDraftStorageService } from './publish-draft-storage.service';
import {
  buildPlatformCoverUrls,
  normalizePayload,
  pickCoverPreviewAsset,
  resolveListTitle,
  toIso,
} from '../utils/publish-draft.mapper';
import { buildUniqueFileName } from '../utils/upload-filename.util';

const VIDEO_MIME_TYPES = new Set([
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'video/x-msvideo',
]);

const COVER_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

const PLATFORM_IDS = new Set<string>(Object.values(PlatformId));

@Injectable()
export class PublishDraftService {
  private readonly maxPerUser: number;
  private readonly videoMaxBytes: number;
  private readonly coverMaxBytes: number;

  constructor(
    @InjectRepository(PublishDraft)
    private readonly draftRepository: Repository<PublishDraft>,
    @InjectRepository(PublishDraftAsset)
    private readonly assetRepository: Repository<PublishDraftAsset>,
    private readonly storageService: PublishDraftStorageService,
    private readonly configService: ConfigService,
  ) {
    this.maxPerUser =
      this.configService.get<number>('publishDraft.maxPerUser') ?? 100;
    this.videoMaxBytes =
      this.configService.get<number>('publishDraft.videoMaxBytes') ??
      4 * 1024 * 1024 * 1024;
    this.coverMaxBytes =
      this.configService.get<number>('publishDraft.coverMaxBytes') ??
      10 * 1024 * 1024;
  }

  async list(userId: string, query: ListPublishDraftsQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const where: Record<string, unknown> = {
      userId,
      status: DraftStatus.DRAFT,
    };
    if (query.keyword?.trim()) {
      where.listTitle = Like(`%${query.keyword.trim()}%`);
    }

    const [drafts, total] = await this.draftRepository.findAndCount({
      where,
      order: { updatedAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    const draftIds = drafts.map((d) => d.id);
    const coverAssets =
      draftIds.length === 0
        ? []
        : await this.assetRepository.find({
            where: {
              draftId: In(draftIds),
              kind: DraftAssetKind.PLATFORM_COVER,
            },
          });

    const coversByDraft = new Map<string, PublishDraftAsset[]>();
    for (const asset of coverAssets) {
      const list = coversByDraft.get(asset.draftId) ?? [];
      list.push(asset);
      coversByDraft.set(asset.draftId, list);
    }

    const items = drafts.map((draft) => {
      const preview = pickCoverPreviewAsset(
        coversByDraft.get(draft.id) ?? [],
      );
      return {
        id: draft.id,
        listTitle: draft.listTitle,
        videoFileName: draft.videoFileName,
        status: draft.status,
        hasVideo: Boolean(draft.videoAssetId),
        coverPreviewUrl: preview
          ? this.storageService.getSignedUrl(preview.storageKey)
          : undefined,
        updatedAt: toIso(draft.updatedAt),
        createdAt: toIso(draft.createdAt),
      };
    });

    return { items, total, page, pageSize };
  }

  async getDetail(userId: string, draftId: string) {
    const draft = await this.findOwnedDraft(userId, draftId);
    return this.toDetailDto(draft);
  }

  async create(userId: string, dto: SavePublishDraftDto) {
    await this.assertDraftQuota(userId);
    this.validatePayload(dto.payload);

    const payload = normalizePayload(
      dto.payload as unknown as PublishDraftPayload,
    );
    const videoFileName = dto.videoFileName?.trim() || null;

    const draft = this.draftRepository.create({
      userId,
      listTitle: resolveListTitle(payload, videoFileName),
      videoFileName,
      videoAssetId: null,
      status: DraftStatus.DRAFT,
      payload,
    });

    const saved = await this.draftRepository.save(draft);
    return this.toDetailDto(saved);
  }

  async update(userId: string, draftId: string, dto: SavePublishDraftDto) {
    const draft = await this.findOwnedDraft(userId, draftId);
    this.validatePayload(dto.payload);

    const payload = normalizePayload(
      dto.payload as unknown as PublishDraftPayload,
    );
    const videoFileName =
      dto.videoFileName !== undefined
        ? dto.videoFileName?.trim() || null
        : draft.videoFileName;

    draft.payload = payload;
    draft.listTitle = resolveListTitle(payload, videoFileName);
    draft.videoFileName = videoFileName;

    const saved = await this.draftRepository.save(draft);
    return this.toDetailDto(saved);
  }

  async remove(userId: string, draftId: string) {
    const draft = await this.findOwnedDraft(userId, draftId);
    const assets = await this.assetRepository.find({
      where: { draftId: draft.id },
    });

    await this.draftRepository.remove(draft);

    for (const asset of assets) {
      await this.storageService.deleteFile(asset.storageKey);
    }
  }

  async uploadVideo(
    userId: string,
    draftId: string,
    file: Express.Multer.File,
  ) {
    const draft = await this.findOwnedDraft(userId, draftId);
    this.assertFilePresent(file);
    this.assertVideoFile(file);

    const fileName = buildUniqueFileName('video', file.mimetype, file.originalname);
    const storageKey = this.storageService.buildStorageKey(
      userId,
      draftId,
      'video',
      fileName,
    );

    let asset: PublishDraftAsset;
    try {
      await this.storageService.saveFile(
        storageKey,
        file.buffer,
        file.mimetype,
        fileName,
      );

      asset = this.assetRepository.create({
        userId,
        draftId: draft.id,
        kind: DraftAssetKind.VIDEO,
        platformId: null,
        storageKey,
        mimeType: file.mimetype,
        fileName,
        fileSize: String(file.size),
      });
      asset = await this.assetRepository.save(asset);
    } catch (err) {
      await this.storageService.deleteFile(storageKey);
      throw err;
    }

    const previousVideoAssetId = draft.videoAssetId;
    draft.videoFileName = fileName;
    draft.videoAssetId = asset.id;
    await this.draftRepository.save(draft);

    if (previousVideoAssetId && previousVideoAssetId !== asset.id) {
      await this.deleteAssetById(userId, previousVideoAssetId);
    }

    return {
      videoAssetId: asset.id,
      videoFileName: fileName,
      videoUrl: this.storageService.getSignedUrl(storageKey),
      fileSize: file.size,
    };
  }

  async uploadPlatformCover(
    userId: string,
    draftId: string,
    platformId: PlatformId,
    file: Express.Multer.File,
  ) {
    const draft = await this.findOwnedDraft(userId, draftId);
    this.assertFilePresent(file);
    this.assertCoverFile(file);

    const storageKey = this.storageService.buildStorageKey(
      userId,
      draftId,
      `cover-${platformId}`,
      buildUniqueFileName(`cover-${platformId}`, file.mimetype, file.originalname),
    );

    let asset: PublishDraftAsset;
    try {
      await this.storageService.saveFile(
        storageKey,
        file.buffer,
        file.mimetype,
        file.originalname,
      );

      const existing = await this.assetRepository.findOne({
        where: {
          draftId: draft.id,
          kind: DraftAssetKind.PLATFORM_COVER,
          platformId,
        },
      });

      asset = this.assetRepository.create({
        userId,
        draftId: draft.id,
        kind: DraftAssetKind.PLATFORM_COVER,
        platformId,
        storageKey,
        mimeType: file.mimetype,
        fileName: file.originalname,
        fileSize: String(file.size),
      });
      asset = await this.assetRepository.save(asset);

      if (existing && existing.id !== asset.id) {
        await this.deleteAssetRecord(existing);
      }
    } catch (err) {
      await this.storageService.deleteFile(storageKey);
      throw err;
    }

    const payload = normalizePayload(draft.payload);
    const override = payload.platformOverrides[platformId] ?? {
      customized: false,
      title: '',
      description: '',
      cartItems: [],
      location: null,
    };
    override.coverAssetId = asset.id;
    payload.platformOverrides[platformId] = override;
    draft.payload = payload;
    await this.draftRepository.save(draft);

    return {
      platformId,
      coverAssetId: asset.id,
      coverUrl: this.storageService.getSignedUrl(storageKey),
    };
  }

  async removePlatformCover(
    userId: string,
    draftId: string,
    platformId: PlatformId,
  ) {
    const draft = await this.findOwnedDraft(userId, draftId);
    const asset = await this.assetRepository.findOne({
      where: {
        draftId: draft.id,
        userId,
        kind: DraftAssetKind.PLATFORM_COVER,
        platformId,
      },
    });

    if (asset) {
      await this.deleteAssetRecord(asset);
    }

    const payload = normalizePayload(draft.payload);
    const override = payload.platformOverrides[platformId];
    if (override) {
      override.coverAssetId = null;
      payload.platformOverrides[platformId] = override;
      draft.payload = payload;
      await this.draftRepository.save(draft);
    }
  }

  async findOwnedDraft(userId: string, draftId: string): Promise<PublishDraft> {
    const draft = await this.draftRepository.findOne({
      where: { id: draftId, userId },
    });
    if (!draft) {
      throw new NotFoundException('草稿不存在');
    }
    if (draft.userId !== userId) {
      throw new ForbiddenException('无权操作该草稿');
    }
    return draft;
  }

  private async toDetailDto(draft: PublishDraft) {
    const assets = await this.assetRepository.find({
      where: { draftId: draft.id },
    });

    const videoAsset = draft.videoAssetId
      ? assets.find((a) => a.id === draft.videoAssetId)
      : undefined;

    const coverAssets = assets.filter(
      (a) => a.kind === DraftAssetKind.PLATFORM_COVER,
    );

    const sign = (asset: PublishDraftAsset) =>
      this.storageService.getSignedUrl(asset.storageKey);

    return {
      id: draft.id,
      listTitle: draft.listTitle,
      videoFileName: draft.videoFileName,
      videoAssetId: draft.videoAssetId,
      videoUrl: videoAsset ? sign(videoAsset) : null,
      status: draft.status,
      payload: normalizePayload(draft.payload),
      platformCoverUrls: buildPlatformCoverUrls(coverAssets, sign),
      createdAt: toIso(draft.createdAt),
      updatedAt: toIso(draft.updatedAt),
    };
  }

  private async assertDraftQuota(userId: string) {
    const count = await this.draftRepository.count({
      where: { userId, status: DraftStatus.DRAFT },
    });
    if (count >= this.maxPerUser) {
      throw new BadRequestException(
        `草稿数量已达上限（${this.maxPerUser}）`,
      );
    }
  }

  private validatePayload(payload: PublishDraftPayloadDto) {
    if (payload.showSchedule) {
      if (!payload.scheduleAt?.trim()) {
        throw new UnprocessableEntityException(
          '开启定时发布时必须设置 scheduleAt',
        );
      }
      const at = new Date(payload.scheduleAt);
      if (Number.isNaN(at.getTime())) {
        throw new UnprocessableEntityException(
          'scheduleAt 必须是有效的 ISO 8601 时间',
        );
      }
      if (at <= new Date()) {
        throw new UnprocessableEntityException(
          '定时发布时间必须是将来时间',
        );
      }
    }

    for (const [platformId, override] of Object.entries(
      payload.platformOverrides ?? {},
    )) {
      if (!PLATFORM_IDS.has(platformId)) {
        throw new UnprocessableEntityException(`无效的平台 ID: ${platformId}`);
      }
      if (!override) {
        continue;
      }
      if (override.customized && override.title.length > 80) {
        throw new UnprocessableEntityException(
          `${platformId} 标题不能超过 80 字`,
        );
      }
    }
  }

  private assertFilePresent(file: Express.Multer.File | undefined) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('请上传文件');
    }
  }

  private assertVideoFile(file: Express.Multer.File) {
    if (file.size > this.videoMaxBytes) {
      throw new PayloadTooLargeException('视频文件过大');
    }
    if (!VIDEO_MIME_TYPES.has(file.mimetype)) {
      throw new UnprocessableEntityException('不支持的视频格式');
    }
  }

  private assertCoverFile(file: Express.Multer.File) {
    if (file.size > this.coverMaxBytes) {
      throw new PayloadTooLargeException('封面图片过大');
    }
    if (!COVER_MIME_TYPES.has(file.mimetype)) {
      throw new UnprocessableEntityException('不支持的图片格式');
    }
  }

  private async deleteAssetById(userId: string, assetId: string) {
    const asset = await this.assetRepository.findOne({
      where: { id: assetId, userId },
    });
    if (asset) {
      await this.deleteAssetRecord(asset);
    }
  }

  private async deleteAssetRecord(asset: PublishDraftAsset) {
    await this.storageService.deleteFile(asset.storageKey);
    await this.assetRepository.remove(asset);
  }
}
