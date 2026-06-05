# IndexTTS2 语音合成 API

基于本地 [IndexTTS2](https://github.com/index-tts/IndexTTS) 仓库的零样本 TTS，走与字幕/水印相同的 **Media AI 异步任务** 架构：NestJS API 入队 → `media-worker` 消费 → 产出 WAV 签名下载 URL。

## 前置条件

1. 本机已下载模型（示例路径）：
   - 仓库：`D:\workbench\talk\IndexTTS2`
   - 权重：`D:\workbench\talk\IndexTTS2\checkpoints`
2. 在 `media-worker/.env` 配置：

```env
INDEXTTS2_REPO_PATH=D:/workbench/talk/IndexTTS2
# 可选，默认 {INDEXTTS2_REPO_PATH}/checkpoints
# INDEXTTS2_MODEL_DIR=D:/workbench/talk/IndexTTS2/checkpoints
# INDEXTTS2_DEVICE=cuda:0
# INDEXTTS2_USE_FP16=true
# INDEXTTS2_USE_CUDA_KERNEL=true
```

## Docker 部署（GPU）

生产推荐用 GPU 覆盖 compose，挂载宿主机模型目录、容器内双 venv 隔离依赖：

```bash
# .env 配置 INDEXTTS2_HOST_PATH、FLASHHEAD_HOST_PATH
docker compose -f docker-compose.yml -f docker-compose.gpu.yml up -d --build
```

详见 [docker-media-worker-gpu.md](./docker-media-worker-gpu.md)。

## 本地开发（非 Docker）

3. **Python 环境**：TTS 必须使用 IndexTTS2 自带 venv（含 `torchaudio`、CUDA 版 `torch` 与匹配的 `transformers`）。首次需补装 worker 队列依赖：

```powershell
D:\workbench\talk\IndexTTS2\.venv\Scripts\python.exe -m ensurepip --upgrade
D:\workbench\talk\IndexTTS2\.venv\Scripts\python.exe -m pip install redis pydantic-settings
```

启动（推荐脚本）：

```powershell
cd D:\workbench\ViralEngine-api\media-worker
.\scripts\start-worker.ps1
```

或手动：

```powershell
D:\workbench\talk\IndexTTS2\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

勿用 `media-worker\.venv` 跑 TTS：缺少 `torchaudio`，且 `transformers` 版本与 IndexTTS2 不兼容。

## 获取参数 schema（前端表单）

```http
GET /api/media-ai/tts/params
Authorization: Bearer <token>
```

响应包含每个字段的 `name`、`type`、`default`、`minimum`、`maximum`、`enum` 等，以及 multipart 字段名 `spkFile` / `emoFile`。

## 创建合成任务

```http
POST /api/media-ai/jobs/tts
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `spkFile` | file | **必填**，音色参考音频 |
| `emoFile` | file | `emoControlMethod=1` 时必填，情感参考音频 |
| `text` | string | **必填**，待合成文本 |
| `emoControlMethod` | number | `0` 音色同源 / `1` 情感音频 / `2` 情感向量 / `3` 情感文本 |
| `emoWeight` | number | 情感权重，默认 `0.65` |
| `emoVector` | string | JSON 数组，8 维，如 `[0,0,0,0,0,0,0,1]` |
| `emoText` | string | 情感描述（mode=3） |
| `emoRandom` | boolean | 情感随机采样 |
| `maxTextTokensPerSegment` | number | 分句 Token 上限，默认 `120` |
| `intervalSilence` | number | 句间静音 ms，默认 `200` |
| `verbose` | boolean | 详细日志 |
| `doSample` | boolean | 默认 `true` |
| `topP` | number | 默认 `0.8` |
| `topK` | number | 默认 `30`，`0` 表示关闭 |
| `temperature` | number | 默认 `0.8` |
| `lengthPenalty` | number | 默认 `0` |
| `numBeams` | number | 默认 `3` |
| `repetitionPenalty` | number | 默认 `10` |
| `maxMelTokens` | number | 默认 `1500`，上限见 `limits.maxMelTokens` |

### 查询任务

```http
GET /api/media-ai/jobs/:jobId
```

完成后 `outputUrl` 为 `speech.wav` 的签名地址。

### 示例（curl）

```bash
curl -X POST "https://127.0.0.1:3443/api/media-ai/jobs/tts" \
  -H "Authorization: Bearer $TOKEN" \
  -F "spkFile=@prompt.wav" \
  -F "text=欢迎大家体验 IndexTTS2。" \
  -F "emoControlMethod=0" \
  -F "emoWeight=0.65"
```

## 生成速度说明

| 现象 | 原因 | 建议 |
|------|------|------|
| 第一次很慢 | IndexTTS2 需加载多份大模型到 GPU（约 20–60s） | `INDEXTTS2_PRELOAD=true`，worker 启动时预热 |
| 每次都很慢 | 默认 `numBeams=3` 做 beam search，约为 `1` 的数倍耗时 | 请求里传 `numBeams=1`（API 默认已改为 1） |
| 长文本更慢 | 按 `maxTextTokensPerSegment` 分段，段数越多越慢 | 适当增大该值（如 160），或减少文本长度 |
| 启动报错 1455 | Windows 页面文件不足，模型加载失败 | 增大虚拟内存或关闭占显存程序 |

质量优先可把 `numBeams` 调回 `3`；与 IndexTTS2 WebUI 高级参数一致。

## 任务类型

队列 payload `type` 为 `tts`，与 `MediaJobType.TTS` 一致。

## Docker 说明

见 [docker-media-worker-gpu.md](./docker-media-worker-gpu.md)。容器内通过 `INDEXTTS2_PYTHON` 子进程推理，挂载宿主机 IndexTTS2 目录即可。

本地开发推荐宿主机 IndexTTS2 venv + `scripts/start-worker.ps1`，可设 `INDEXTTS2_PRELOAD=true` 预热。
