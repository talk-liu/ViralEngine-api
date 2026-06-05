# LatentSync 视频对口型 API

基于本地 [LatentSync](https://github.com/bytedance/LatentSync) **stage2-512** 模型，走与 FlashHead/TTS 相同的 **Media AI 异步任务** 架构：NestJS API 入队 → `media-worker` 消费 → 产出 MP4 签名下载 URL。

## 前置条件

1. 本机已部署 LatentSync（示例路径）：
   - 仓库：`D:\workbench\LatentSync`
   - UNet 权重：`D:\workbench\LatentSync\checkpoints\latentsync_unet.pt`
   - UNet 配置：`D:\workbench\LatentSync\configs\unet\stage2_512.yaml`
2. 系统已安装 **ffmpeg**（LatentSync 处理音视频时需要）
3. 在 `media-worker/.env` 配置：

```env
LATENTSYNC_REPO_PATH=D:/workbench/LatentSync
LATENTSYNC_CKPT_PATH=D:/workbench/LatentSync/checkpoints/latentsync_unet.pt
LATENTSYNC_UNET_CONFIG=D:/workbench/LatentSync/configs/unet/stage2_512.yaml
LATENTSYNC_PYTHON=D:/workbench/LatentSync/venv/Scripts/python.exe
```

`LATENTSYNC_CKPT_PATH` 与 `LATENTSYNC_UNET_CONFIG` 可省略，默认使用仓库内 `checkpoints/latentsync_unet.pt` 与 `configs/unet/stage2_512.yaml`。

## Docker 部署（GPU）

```bash
# .env 配置 LATENTSYNC_HOST_PATH 指向含 scripts/inference.py 的 LatentSync 目录
docker compose -f docker-compose.yml -f docker-compose.gpu.yml up -d --build
```

详见 [docker-media-worker-gpu.md](./docker-media-worker-gpu.md)。

## 任务队列（按模型拆分）

API 按任务类型路由到不同 Redis 队列，避免 TTS 与 LatentSync 在同一 Worker 上反复冷启动：

| 任务类型 | 队列 |
|----------|------|
| `latentsync` | `media-ai:jobs:latentsync` |
| `tts` | `media-ai:jobs:tts` |
| `flashhead` | `media-ai:jobs:flashhead` |
| 字幕 / 水印 / 直播切片等 | `media-ai:jobs:cpu` |

前缀由 `MEDIA_AI_QUEUE_PREFIX` 控制（默认 `media-ai:jobs`），API 与 Worker 需保持一致。

## 本地启动（推荐：常驻推理 + 专用 Worker）

**终端 1 — LatentSync 常驻服务**（启动时加载一次模型，后续任务复用显存）：

```powershell
cd D:\workbench\ViralEngine-api\media-worker
# 首次需在 LatentSync venv 安装：pip install fastapi uvicorn httpx pydantic-settings
.\scripts\start-latentsync-server.ps1
```

健康检查：`GET http://127.0.0.1:8102/health`

**终端 2 — LatentSync 专用 Worker**（只消费 `:latentsync` 队列，HTTP 调用常驻服务）：

```powershell
.\scripts\start-worker-latentsync.ps1
```

**终端 3 — 通用 Worker**（TTS / FlashHead / CPU 任务，不含 LatentSync）：

```powershell
.\scripts\start-worker-general.ps1
```

`media-worker/.env` 需配置：

```env
MEDIA_AI_QUEUE_PREFIX=media-ai:jobs
LATENTSYNC_REPO_PATH=D:/workbench/LatentSync
LATENTSYNC_SERVER_URL=http://127.0.0.1:8102
```

### 兼容模式（单子进程，每次冷启动）

不启常驻服务时，Worker 仍可通过子进程推理（较慢）：

```powershell
# 不设置 LATENTSYNC_SERVER_URL
.\scripts\start-worker.ps1
```
## 获取参数 schema（前端表单）

```http
GET /api/media-ai/latentsync/params
Authorization: Bearer <token>
```

响应包含每个字段的 `name`、`type`、`default` 等，以及 multipart 字段名 `videoFile` / `audioFile`。

## 创建视频对口型任务

```http
POST /api/media-ai/jobs/latentsync
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `videoFile` | file | **必填**，待对口型的源视频（mp4/mov/webm 等） |
| `audioFile` | file | **必填**，驱动口型的音频（wav/mp3 等，建议 16kHz） |
| `seed` | number | 随机种子，默认 `1247` |
| `inferenceSteps` | number | 扩散推理步数，默认 `20` |
| `guidanceScale` | number | 引导系数，默认 `1.5` |
| `enableDeepcache` | boolean | 是否启用 DeepCache 加速，默认 `true` |
| `landmarkSmoothAlpha` | number | 人脸关键点平滑系数，默认 `0.7` |

### 查询任务

```http
GET /api/media-ai/jobs/:jobId
```

完成后 `outputUrl` 为 `lipsync.mp4` 的签名地址。

### 示例（curl）

```bash
curl -X POST "https://127.0.0.1:3443/api/media-ai/jobs/latentsync" \
  -H "Authorization: Bearer $TOKEN" \
  -F "videoFile=@examples/demo1_video.mp4" \
  -F "audioFile=@examples/demo1_audio.wav" \
  -F "enableDeepcache=true" \
  -F "guidanceScale=1.5"
```

## 与 IndexTTS2 / FlashHead 的区别

| 模型 | 输入 | 场景 |
|------|------|------|
| **LatentSync** | 视频 + 音频 | 已有真人/数字人视频，替换口型 |
| **FlashHead** | 人像图 + 音频 | 从静态人像生成口播视频 |
| **IndexTTS2** | 音色音频 + 文本 | 仅合成语音 |

典型流水线：

1. `POST /api/media-ai/jobs/tts` — 合成语音
2. `POST /api/media-ai/jobs/latentsync` — 将语音对口到已有视频

## 内存与显存说明

| 模式 | 行为 |
|------|------|
| **常驻服务**（推荐） | `start-latentsync-server.ps1` 启动时加载 UNet + VAE + Whisper，任务间模型保持驻留 |
| **子进程**（兼容） | 每任务起子进程，结束后释放显存，切换模型慢 |

多用户场景建议：**LatentSync 与 TTS 各跑独立 Worker + 独立队列**，互不抢占显存。

| 现象 | 原因 | 建议 |
|------|------|------|
| 进度停在 10% | LatentSync 暂未上报中间进度 | 看 `start-latentsync-server.ps1` 终端日志 |
| 比测试项目慢 | Worker 子进程冷启动，或音视频时长不一致 | 启用常驻服务；尽量让音频与视频等长 |
| 显存不足 | 512 分辨率 + 多模型同卡 | 拆分 Worker / 分 GPU |
| ffmpeg 报错 | 未安装或未加入 PATH | 安装 ffmpeg 并确保命令行可用 |

## 任务类型

队列 payload `type` 为 `latentsync`，入队到 `{MEDIA_AI_QUEUE_PREFIX}:latentsync`。
