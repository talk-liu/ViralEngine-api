import { PlatformId } from '../../platform/enums/platform-id.enum';

export interface PublishDraftCartItem {
  id: string;
  title: string;
  link: string;
}

export interface PublishDraftLocation {
  id: string;
  name: string;
  address: string;
}

export interface PublishDraftPlatformOverride {
  customized: boolean;
  title: string;
  description: string;
  cartItems: PublishDraftCartItem[];
  location: PublishDraftLocation | null;
  coverAssetId?: string | null;
}

export interface PublishDraftPayloadItem {
  clientId: string;
  videoFileName: string | null;
  videoLocalPath: string | null;
  title: string;
  description: string;
  topics: string[];
  tags: string[];
  scheduleAt: string;
  showSchedule: boolean;
  platformOverrides: Partial<Record<PlatformId, PublishDraftPlatformOverride>>;
  accountIds: string[];
}

export interface PublishDraftPayload {
  title: string;
  description: string;
  topics: string[];
  tags: string[];
  scheduleAt: string;
  showSchedule: boolean;
  platformOverrides: Partial<Record<PlatformId, PublishDraftPlatformOverride>>;
  accountIds: string[];
  items?: PublishDraftPayloadItem[];
}
