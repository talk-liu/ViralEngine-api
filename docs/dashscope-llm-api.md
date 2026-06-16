# 通义千问 LLM（直播切片高光识别 / 卖货话术 / 视频详情）

Media Worker 通过 **OpenAI 兼容接口** 调用阿里云百炼（DashScope），用于直播切片的 LLM 高光识别，自动生成每段切片的 **标题、描述、话题、标签**。

## 开通 API Key

1. 登录 [阿里云百炼控制台](https://bailian.console.aliyun.com/)
2. 进入 **API-KEY 管理**，创建 Key（格式 `sk-xxx`）
3. 确保账号已开通 **通义千问** 模型服务（新用户通常有免费体验额度）

## 配置

**前端「根据话题生成视频详情」** 由 NestJS API 直接调用通义，Key 配在**根目录 `.env`**：

```env
LLM_API_BASE=https://dashscope.aliyuncs.com/compatible-mode/v1
LLM_API_KEY=sk-你的Key
LLM_MODEL=qwen-plus
LLM_TIMEOUT=120
```

**直播切片 LLM** 由 Media Worker 调用，配置写在 **`media-worker/.env`**（可与上面使用相同 Key）：

```env
LLM_API_BASE=https://dashscope.aliyuncs.com/compatible-mode/v1
LLM_API_KEY=sk-你的Key
LLM_MODEL=qwen-plus
LLM_TIMEOUT=120
```

| 变量 | 说明 |
|------|------|
| `LLM_API_BASE` | 通义 OpenAI 兼容端点，一般无需修改 |
| `LLM_API_KEY` | 百炼 API Key，**必填** |
| `LLM_MODEL` | 模型名，推荐 `qwen-plus`；省钱可用 `qwen-turbo` |
| `LLM_TIMEOUT` | 请求超时（秒），长直播字幕可适当加大 |

Docker 部署时，可在根目录 `.env` 配置相同变量，`docker-compose.yml` 会传给 `media-worker` 容器。

## 验证

```powershell
cd D:\workbench\ViralEngine-api\media-worker
python scripts/verify_llm.py
```

成功会输出一段测试文案；失败会提示 Key 错误或网络问题。

Worker 健康检查也会反映 LLM 状态：

```text
GET http://localhost:8000/health
```

响应中 `llm.configured` 为 `true` 表示 Key 已配置。

## 在项目中的用途

| 场景 | 模块 | 说明 |
|------|------|------|
| **根据话题生成视频详情** | `POST /api/media-ai/generate/video-details` | 前端同步接口，生成 title / description / topics / tags / salesScript |
| 直播切片高光 | `highlight_analyzer.py` | 从字幕中挑选片段，生成 title / description / topics / tags |
| Worker LLM 封装 | `llm_client.py` | 直播切片等 Worker 内调用 |

### 前端接口：根据话题生成视频详情

```http
POST /api/media-ai/generate/video-details
Authorization: Bearer <accessToken>
Content-Type: application/json
```

请求体：

```json
{
  "topics": ["夏日防晒", "油皮护肤"],
  "productName": "清透防晒喷雾",
  "platform": "douyin",
  "extraPrompt": "口语化、适合二次发布"
}
```

| 字段 | 必填 | 说明 |
|------|------|------|
| `topics` | 是 | 1–10 个话题 |
| `productName` | 否 | 关联商品，优化卖货话术 |
| `platform` | 否 | `douyin` / `kuaishou` / `bilibili` / `xiaohongshu` / `general`，默认 `douyin` |
| `extraPrompt` | 否 | 额外风格说明 |

响应：

```json
{
  "title": "油皮夏天也能清爽出门！这支防晒真的绝了",
  "description": "夏天出油脱妆？…",
  "topics": ["夏日防晒", "油皮护肤", "防晒喷雾"],
  "tags": ["防晒", "护肤", "好物分享"],
  "salesScript": "姐妹们夏天最怕什么？脸油还晒黑！…"
}
```

字段长度与发布草稿一致：`title` ≤80 字，`description` ≤5000 字，话题 ≤10 个，标签 ≤9 个。

未配置 `LLM_API_KEY` 时，直播切片会**自动回退规则引擎**（免费但质量较差）。

API 调用失败时同样回退规则引擎，并在 Worker 日志中记录原因。

## 费用说明

按 Token 计费，单次直播切片通常 **几毛到几元** 量级（取决于直播时长与字幕量）。`qwen-turbo` 更便宜，`qwen-plus` 文案质量更好。

## 常见问题

| 问题 | 处理 |
|------|------|
| `401` / `Invalid API Key` | 检查 Key 是否正确、是否过期 |
| `403` / 模型未开通 | 在百炼控制台开通对应模型 |
| 切片质量仍差 | 确认 `/health` 中 `llm.configured=true`，且日志无「回退规则引擎」 |
| Docker 不生效 | 确认根目录 `.env` 有 `LLM_API_KEY` 并重启 api / media-worker 容器 |
| 前端生成详情 503 | 根目录 `.env` 未配置 `LLM_API_KEY` |
