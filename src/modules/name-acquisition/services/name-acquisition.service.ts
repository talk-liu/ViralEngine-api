import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { ListNameAcquisitionRecordsQueryDto } from '../dto/list-name-acquisition-records-query.dto';
import { SaveNameAcquisitionRecordsDto } from '../dto/save-name-acquisition-records.dto';
import { NameAcquisitionRecord } from '../entities/name-acquisition-record.entity';
import {
  dedupeNameAcquisitionRecordsByUrl,
  hashNameAcquisitionUrl,
} from '../utils/name-acquisition-url.util';

const INSERT_BATCH_SIZE = 500;

@Injectable()
export class NameAcquisitionService {
  constructor(
    @InjectRepository(NameAcquisitionRecord)
    private readonly recordRepository: Repository<NameAcquisitionRecord>,
  ) {}

  async listRecords(userId: string, query: ListNameAcquisitionRecordsQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const qb = this.recordRepository
      .createQueryBuilder('record')
      .where('record.user_id = :userId', { userId });

    if (query.region !== undefined) {
      qb.andWhere('record.region = :region', { region: query.region.trim() });
    }

    const [items, total] = await qb
      .orderBy('record.created_at', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return {
      items: items.map((record) => ({
        id: record.id,
        region: record.region,
        url: record.url,
        createdAt: record.createdAt.toISOString(),
      })),
      total,
      page,
      pageSize,
    };
  }

  async saveRecords(
    userId: string,
    dto: SaveNameAcquisitionRecordsDto,
  ): Promise<{ savedCount: number }> {
    const records = dedupeNameAcquisitionRecordsByUrl(dto.records);
    if (records.length === 0) {
      return { savedCount: 0 };
    }

    const now = new Date();

    for (let i = 0; i < records.length; i += INSERT_BATCH_SIZE) {
      const batch = records.slice(i, i + INSERT_BATCH_SIZE);
      const values = batch.map((record) => ({
        id: randomUUID(),
        userId,
        region: record.region ?? '',
        url: record.url,
        urlHash: hashNameAcquisitionUrl(record.url),
        createdAt: now,
      }));

      await this.recordRepository
        .createQueryBuilder()
        .insert()
        .into(NameAcquisitionRecord)
        .values(values)
        .orUpdate(['region', 'created_at'], ['user_id', 'url_hash'])
        .execute();
    }

    return { savedCount: records.length };
  }
}
