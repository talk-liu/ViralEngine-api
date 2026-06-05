# 任务中心 API 接入文档

> 版本：v1  
> 基础路径：`{API_BASE}`，默认 `http://localhost:3000/api`  
> 在线文档（Swagger）：`http://localhost:3000/api/docs`（标签 **Media AI**）  
> OpenAPI JSON：`http://localhost:3000/api/docs-json`

---

## 1. 概述

任务中心用于展示当前登录用户的**全部媒体 AI 异步任务**，包括进行中、已完成与失败的任务。

| 项目 | 说明 |
|------|------|
| 数据来源 | `media_jobs` 表，不含发布草稿（`publish-drafts` 为独立模块） |
| 任务类型 | 水印、字幕、直播切片、TTS、数字人口播等 |
| 用户隔离 | 仅返回当前 JWT 用户自己的任务，**禁止**客户端传 `userId` |
| 列表范围 | 默认返回全部状态；可按 `status` / `type` 筛选 |

各任务类型的**创建接口**见专项文档：

| 类型 | 创建接口 | 文档 |
|------|----------|------|
| `subtitle` | `POST /media-ai/jobs/subtitle` | [subtitle-recognition-api.md](./subtitle-recognition-api.md) |
| `watermark` | `POST /media-ai/jobs/watermark` | [video-watermark-api.md](./video-watermark-api.md) |
| `live_slice` | `POST /media-ai/jobs/live-slice` | [live-slice-api.md](./live-slice-api.md) |
| `tts` | `POST /media-ai/jobs/tts` | [indextts2-api.md](./indextts2-api.md) |
| `flashhead` | `POST /media-ai/jobs/flashhead` | [flashhead-api.md](./flashhead-api.md) |

### 前置条件

客户端需先完成用户登录，取得 JWT：

| 步骤 | 接口 |
|------|------|
| 登录 | `POST /api/auth/login` |
| 或注册 | `POST /api/auth/register` |

登录成功响应中的 `accessToken` 用于后续所有任务中心接口。

---

## 2. 通用约定

### 2.1 请求头

| 接口 | Authorization | Content-Type |
|------|---------------|--------------|
| 任务列表 | `Bearer <accessToken>` | 无（GET） |
| 任务详情 | `Bearer <accessToken>` | 无（GET） |
| 删除任务 | `Bearer <accessToken>` | 无（DELETE） |
| 下载产出（签名 URL） | **不需要** JWT | 无（GET） |

Swagger 调试：点击 **Authorize**，填入 `Bearer <token>`。

### 2.2 成功响应

直接返回 JSON 对象，**不**额外包装 `{ data: ... }` 层。

### 2.3 错误响应

```json
{
  "statusCode": 401,
  "timestamp": "2026-06-04T08:00:00.000Z",
  "path": "/api/media-ai/jobs",
  "message": "Unauthorized"
}
```

参数校验失败时，`message` 可能为字符串数组。

| HTTP | 常见场景 |
|------|----------|
| 400 | 查询参数非法 |
| 401 | 未登录或 Token 失效 |
| 404 | 任务不存在或不属于当前用户 |
| 422 | `status` / `type` 枚举值非法 |

### 2.4 TypeScript 类型（与前端对齐）

```typescript
type MediaJobType =
  | 'watermark'
  | 'subtitle'
  | 'text2image'
  | 'live_slice'
  | 'tts'
  | 'flashhead';

type MediaJobStatus = 'pending' | 'processing' | 'completed' | 'failed';

interface MediaJobResponse {
  id: string;
  type: MediaJobType;
  status: MediaJobStatus;
  /** 0–100 */
  progress: number;
  /** 上传文件的签名下载地址 */
  inputUrl?: string;
  /** 产出文件的签名下载地址（completed 时有意义；过期后可能缺失） */
  outputUrl?: string;
  /** 失败原因（仅 status=failed 时有值） */
  errorMessage?: string;
  createdAt: string;   // ISO 8601
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
  /** 仅 GET /jobs/:jobId 且 type=live_slice 完成时返回，列表接口不含 */
  manifest?: LiveSliceManifest;
}

interface MediaJobListResponse {
  items: MediaJobResponse[];
  total: number;
  page: number;
  pageSize: number;
}

interface ListMediaJobsQuery {
  page?: number;       // 默认 1
  pageSize?: number;   // 默认 20，最大 50
  status?: MediaJobStatus;
  type?: MediaJobType;
}
```

### 2.5 任务类型与展示文案

| `type` | 建议展示名 | 产出说明 |
|--------|------------|----------|
| `watermark` | 视频加水印 | MP4 |
| `subtitle` | 字幕识别 | SRT / VTT |
| `live_slice` | 直播切片 | 多段 MP4 + 封面 + 字幕（见 manifest） |
| `tts` | 语音合成 | WAV |
| `flashhead` | 数字人口播 | MP4 |
| `text2image` | 文生图 | 图片（若后续开放） |

### 2.6 任务状态与 UI 建议

| `status` | 含义 | UI 建议 |
|----------|------|---------|
| `pending` | 已入队，等待 Worker | 显示「排队中」，`progress` 通常为 0 |
| `processing` | Worker 处理中 | 显示进度条，轮询刷新 |
| `completed` | 成功 | 显示下载 / 预览；无 `outputUrl` 时提示「产出已过期」 |
| `failed` | 失败 | 展示 `errorMessage`，可提供重试（重新创建任务） |

---

## 3. 接口列表

### 3.1 任务列表（任务中心）

**`GET /media-ai/jobs`**

分页列出当前用户的媒体处理任务，按创建时间**倒序**（最新在前）。

#### 查询参数

| 参数 | 类型 | 必填 | 默认 | 说明 |
|------|------|------|------|------|
| `page` | number | 否 | `1` | 页码，≥ 1 |
| `pageSize` | number | 否 | `20` | 每页条数，1–50 |
| `status` | string | 否 | — | 按状态筛选：`pending` \| `processing` \| `completed` \| `failed` |
| `type` | string | 否 | — | 按类型筛选，见 [§2.5](#25-任务类型与展示文案) |

#### 请求示例

```http
GET /api/media-ai/jobs?page=1&pageSize=20
Authorization: Bearer <accessToken>
```

按 Tab 筛选示例：

```http
# 进行中（需前端分两次请求，或只传一种 status）
GET /api/media-ai/jobs?status=processing
GET /api/media-ai/jobs?status=pending

# 只看 TTS 任务
GET /api/media-ai/jobs?type=tts
```

> **说明**：接口一次只支持单个 `status` 值。若「进行中」Tab 需同时包含 `pending` 与 `processing`，前端可并发两次请求合并，或不传 `status` 后在客户端过滤。

#### 响应 `200`

```json
{
  "items": [
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "type": "flashhead",
      "status": "processing",
      "progress": 45,
      "inputUrl": "http://localhost:3000/api/media-ai/assets/content?key=...&expires=...&sig=...",
      "createdAt": "2026-06-04T10:00:00.000Z",
      "updatedAt": "2026-06-04T10:02:30.000Z",
      "startedAt": "2026-06-04T10:00:05.000Z"
    },
    {
      "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
      "type": "subtitle",
      "status": "completed",
      "progress": 100,
      "inputUrl": "http://localhost:3000/api/media-ai/assets/content?key=...&expires=...&sig=...",
      "outputUrl": "http://localhost:3000/api/media-ai/assets/content?key=...&expires=...&sig=...",
      "createdAt": "2026-06-03T08:00:00.000Z",
      "updatedAt": "2026-06-03T08:05:00.000Z",
      "startedAt": "2026-06-03T08:00:10.000Z",
      "completedAt": "2026-06-03T08:05:00.000Z"
    },
    {
      "id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
      "type": "tts",
      "status": "failed",
      "progress": 0,
      "errorMessage": "IndexTTS2 推理超时",
      "createdAt": "2026-06-02T12:00:00.000Z",
      "updatedAt": "2026-06-02T12:10:00.000Z",
      "startedAt": "2026-06-02T12:00:05.000Z",
      "completedAt": "2026-06-02T12:10:00.000Z"
    }
  ],
  "total": 42,
  "page": 1,
  "pageSize": 20
}
```

| 字段 | 说明 |
|------|------|
| `items` | 当前页任务列表 |
| `total` | 符合筛选条件的总条数（用于分页器） |
| `page` / `pageSize` | 当前分页参数 |

#### 列表与详情的差异

| 项目 | 列表 `GET /jobs` | 详情 `GET /jobs/:jobId` |
|------|------------------|-------------------------|
| `manifest` | **不返回** | `live_slice` 完成时返回切片清单 |
| 签名 URL | 有 `inputKey` / `outputKey` 时返回 | 同左 |

直播切片任务在列表中仅展示基础字段；用户点击进入详情后再拉 manifest 展示各切片。

#### cURL 示例

```bash
curl "http://localhost:3000/api/media-ai/jobs?page=1&pageSize=20" \
  -H "Authorization: Bearer <accessToken>"
```

---

### 3.2 任务详情

**`GET /media-ai/jobs/:jobId`**

查询单个任务状态；进行中任务用于轮询，完成后获取下载地址。

#### 路径参数

| 参数 | 说明 |
|------|------|
| `jobId` | 任务 UUID |

#### 响应 `200`

结构与列表中的单条 `MediaJobResponse` 相同。`live_slice` 且 `status=completed` 时额外包含 `manifest`：

```json
{
  "id": "...",
  "type": "live_slice",
  "status": "completed",
  "progress": 100,
  "outputUrl": "...",
  "manifest": {
    "version": 1,
    "sourceDurationSec": 3600,
    "asrEngine": "faster-whisper",
    "clips": [
      {
        "id": "clip-1",
        "title": "高光片段 1",
        "durationSec": 58.2,
        "score": 0.92,
        "videoUrl": "...",
        "coverUrl": "...",
        "subtitleUrl": "..."
      }
    ]
  },
  "createdAt": "...",
  "updatedAt": "...",
  "completedAt": "..."
}
```

#### 错误

| HTTP | message | 说明 |
|------|---------|------|
| 404 | `任务不存在` | ID 无效或不属于当前用户 |

---

### 3.3 删除任务

**`DELETE /media-ai/jobs/:jobId`**

删除任务记录及关联存储文件，响应 **204 No Content**（无 body）。

适用场景：用户下载完产出后主动清理；也可在任务中心提供「删除」操作。

> 未手动删除时，已完成任务的产出文件默认保留 **12 小时**，之后服务端自动清理文件，但任务记录仍保留（`inputUrl` / `outputUrl` 可能为空）。

---

## 4. 前端集成指南

### 4.1 任务中心页面结构建议

```
┌─────────────────────────────────────────┐
│  任务中心                    [刷新]      │
├─────────────────────────────────────────┤
│  [全部] [进行中] [已完成] [失败]         │  ← status 筛选
├─────────────────────────────────────────┤
│  🎬 数字人口播    处理中 45%   10:00     │
│  📝 字幕识别      已完成      [下载]     │
│  🔊 语音合成      失败        查看原因    │
│  ...                                     │
├─────────────────────────────────────────┤
│  « 1  2  3 »                            │  ← page / pageSize
└─────────────────────────────────────────┘
```

### 4.2 加载列表

```typescript
const API_BASE = 'http://localhost:3000/api';

async function fetchTaskList(
  accessToken: string,
  query: ListMediaJobsQuery = {},
): Promise<MediaJobListResponse> {
  const params = new URLSearchParams();
  if (query.page) params.set('page', String(query.page));
  if (query.pageSize) params.set('pageSize', String(query.pageSize));
  if (query.status) params.set('status', query.status);
  if (query.type) params.set('type', query.type);

  const res = await fetch(`${API_BASE}/media-ai/jobs?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
```

### 4.3 进行中任务轮询

列表页若存在 `pending` / `processing` 任务，建议每 **2–3 秒** 刷新列表，或仅对进行中项调用详情接口：

```typescript
function isInProgress(job: MediaJobResponse): boolean {
  return job.status === 'pending' || job.status === 'processing';
}

async function pollJobUntilDone(
  accessToken: string,
  jobId: string,
  intervalMs = 2500,
  timeoutMs = 30 * 60 * 1000,
): Promise<MediaJobResponse> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const res = await fetch(`${API_BASE}/media-ai/jobs/${jobId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) throw new Error(await res.text());
    const job: MediaJobResponse = await res.json();
    if (job.status === 'completed' || job.status === 'failed') {
      return job;
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error('任务超时');
}
```

### 4.4 产出过期处理

```typescript
function canDownload(job: MediaJobResponse): boolean {
  return job.status === 'completed' && Boolean(job.outputUrl);
}

function getDownloadHint(job: MediaJobResponse): string {
  if (job.status === 'completed' && !job.outputUrl) {
    return '产出文件已过期，请重新生成';
  }
  if (job.status === 'failed') {
    return job.errorMessage ?? '任务失败';
  }
  return '';
}
```

### 4.5 下载文件

`outputUrl` / `inputUrl` 为带签名的 GET 地址，**无需**再带 Authorization：

```typescript
// 浏览器直接打开或 <a download>
window.open(job.outputUrl, '_blank');

// 或 fetch 后保存
const blob = await fetch(job.outputUrl!).then((r) => r.blob());
```

---

## 5. 完整流程示例

用户从创建任务到在任务中心查看的典型流程：

1. 用户在业务页调用 `POST /media-ai/jobs/tts`（或其他创建接口）→ 获得 `job.id`
2. 可选：跳转任务中心，或在本页轮询 `GET /media-ai/jobs/:jobId`
3. 用户在任务中心打开 `GET /media-ai/jobs` 查看历史与进行中任务
4. 点击某条进入详情 `GET /media-ai/jobs/:jobId`；`live_slice` 在此页展示切片列表
5. 下载完成后可 `DELETE /media-ai/jobs/:jobId` 释放存储

---

## 6. 常见问题

| 问题 | 原因 | 处理 |
|------|------|------|
| 任务一直 `pending` | Media Worker 未启动 | 确认 `media-worker` 运行中 |
| `completed` 但无 `outputUrl` | 产出超过保留期（默认 12h）被清理 | 提示用户重新生成 |
| 列表没有 `manifest` | 设计如此，避免列表性能问题 | 详情页再请求 |
| 看不到别人的任务 | 按 `userId` 隔离 | 正常行为 |
| 草稿不在列表里 | 发布草稿走 `/publish-drafts` | 任务中心仅含 AI 媒体任务 |
