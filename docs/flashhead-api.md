# FlashHead Pro 口播数字人 API

基于本地 [SoulX-FlashHead](https://github.com/Soul-AILab/SoulX-FlashHead) **Pro** 模型，走与 TTS/字幕相同的 **Media AI 异步任务** 架构：NestJS API 入队 → `media-worker` 消费 → 产出 MP4 签名下载 URL。

## 前置条件

1. 本机已部署 FlashHead（示例路径）：
   - 仓库：`D:\workbench\FlashHeadLite`
   - Pro 权重：`D:\workbench\FlashHeadLite\models\SoulX-FlashHead-1_3B`
   - wav2vec：`D:\workbench\FlashHeadLite\models\wav2vec2-base-960h`
2. 系统已安装 **ffmpeg**（`generate_video.py` 合并音视频时需要）
3. 在 `media-worker/.env` 配置：

```env
FLASHHEAD_REPO_PATH=D:/workbench/FlashHeadLite
FLASHHEAD_CKPT_DIR=D:/workbench/FlashHeadLite/models/SoulX-FlashHead-1_3B
FLASHHEAD_WAV2VEC_DIR=D:/workbench/FlashHeadLite/models/wav2vec2-base-960h
FLASHHEAD_PYTHON=D:/workbench/FlashHeadLite/.venv/Scripts/python.exe
```

推理固定使用 **Pro** 模型（`Model_Pro` + `VAE_Wan`），无需下载 Lite 权重。

## Docker 部署（GPU）

```bash
# .env 配置 FLASHHEAD_HOST_PATH 指向含 generate_video.py 的 FlashHead 目录
docker compose -f docker-compose.yml -f docker-compose.gpu.yml up -d --build
```

容器内固定 Pro 推理，挂载权重即可；Lite 目录不会被加载。详见 [docker-media-worker-gpu.md](./docker-media-worker-gpu.md)。

## 本地 Worker 启动

FlashHead 推理通过子进程调用 FlashHead 自带 venv，与 IndexTTS2 venv 互不冲突。Worker 仍可用 IndexTTS2 venv 启动：

```powershell
cd D:\workbench\ViralEngine-api\media-worker
.\scripts\start-worker.ps1
```

## 获取参数 schema（前端表单）

```http
GET /api/media-ai/flashhead/params
Authorization: Bearer <token>
```

响应包含每个字段的 `name`、`type`、`default` 等，以及 multipart 字段名 `portraitFile` / `audioFile`。

## 创建口播数字人任务

```http
POST /api/media-ai/jobs/flashhead
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `portraitFile` | file | **必填**，人像参考图（jpg/png/webp） |
| `audioFile` | file | **必填**，驱动口型的音频（wav/mp3 等，建议 16kHz） |
| `seed` | number | 随机种子，默认 `42` |
| `useFaceCrop` | boolean | 是否启用人脸检测裁剪，默认 `true` |
| `audioEncodeMode` | string | `once`（推荐）或 `stream` |

### 查询任务

```http
GET /api/media-ai/jobs/:jobId
```

完成后 `outputUrl` 为 `talking-head.mp4` 的签名地址。

### 示例（curl）

```bash
curl -X POST "https://127.0.0.1:3443/api/media-ai/jobs/flashhead" \
  -H "Authorization: Bearer $TOKEN" \
  -F "portraitFile=@examples/girl.png" \
  -F "audioFile=@examples/podcast_sichuan_16k.wav" \
  -F "useFaceCrop=true" \
  -F "audioEncodeMode=once"
```

## 与 IndexTTS2 串联

典型口播流水线：

1. `POST /api/media-ai/jobs/tts` — 用 IndexTTS2 合成语音 WAV
2. 下载 `speech.wav` 或轮询任务完成后取 `outputUrl`
3. `POST /api/media-ai/jobs/flashhead` — 上传人像 + 上一步音频，生成对口型视频

## 性能说明

| 现象 | 原因 | 建议 |
|------|------|------|
| 首次很慢 | Pro 模型需加载 VAE + DiT + wav2vec 到 GPU | 单独跑一条短音频预热 |
| 比 Lite 慢 | Pro 追求画质，单卡约 10 FPS | 口播成片可接受 |
| ffmpeg 报错 | 未安装或未加入 PATH | 安装 ffmpeg 并确保命令行可用 |

## 任务类型

队列 payload `type` 为 `flashhead`，与 `MediaJobType.FLASHHEAD` 一致。

## Docker 说明

见 [docker-media-worker-gpu.md](./docker-media-worker-gpu.md)。勿将宿主机 `.venv` 挂载进 Linux 容器；使用镜像内 `/opt/venvs/flashhead` 即可。
