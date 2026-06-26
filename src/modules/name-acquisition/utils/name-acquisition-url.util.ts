import { createHash } from 'crypto';
import type { NameAcquisitionRecordItemDto } from '../dto/save-name-acquisition-records.dto';

export function hashNameAcquisitionUrl(url: string): string {
  return createHash('sha256').update(url).digest('hex');
}

/** 同批请求内按 url 去重，后者覆盖前者。 */
export function dedupeNameAcquisitionRecordsByUrl(
  records: NameAcquisitionRecordItemDto[],
): NameAcquisitionRecordItemDto[] {
  const byUrl = new Map<string, NameAcquisitionRecordItemDto>();

  for (const record of records) {
    byUrl.set(record.url, record);
  }

  return [...byUrl.values()];
}
