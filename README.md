# ViralEngine API

NestJS + MySQL + Redis 后端服务。

## 技术栈

- **NestJS 11** — API 框架
- **TypeORM** — MySQL ORM
- **ioredis** — Redis 客户端
- **Docker Compose** — MySQL / Redis / API 容器编排
- **JWT + Passport** — 认证授权
- **Helmet + Throttler** — 安全头与接口限流
- **Pino** — 结构化日志

## 项目结构

```
src/
├── config/          # 环境变量与配置校验
├── database/        # TypeORM 数据库模块
├── redis/           # Redis 全局模块
├── health/          # 健康检查 (MySQL + Redis)
├── common/          # 公共过滤器、工具等
└── modules/         # 业务模块（后续在此扩展）
```

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

```bash
cp .env.example .env
```

### 3. 启动 MySQL + Redis（Docker）

```bash
npm run docker:up
```

### 4. 启动开发服务

```bash
npm run start:dev
```

访问健康检查：`GET http://localhost:3000/api/health`

访问接口文档：`http://localhost:3000/api/docs`

OpenAPI JSON：`http://localhost:3000/api/docs-json`

## Docker 命令

| 命令 | 说明 |
|------|------|
| `npm run docker:up` | 仅启动 MySQL + Redis |
| `npm run docker:up:all` | 启动全部服务（含 API 容器） |
| `npm run docker:down` | 停止并移除容器 |

## 环境变量

见 [.env.example](.env.example)。

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `SWAGGER_ENABLED` | 是否启用 Swagger 文档 | `true` |
| `SWAGGER_PATH` | 文档访问路径（配合 `/api` 前缀） | `docs` |

生产环境建议设置 `SWAGGER_ENABLED=false`。

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `JWT_SECRET` | JWT 签名密钥 | 无（必填） |
| `JWT_EXPIRES_IN` | Token 过期时间 | `7d` |
| `THROTTLE_TTL` | 限流窗口（毫秒） | `60000` |
| `THROTTLE_LIMIT` | 窗口内最大请求数 | `100` |
| `CORS_ORIGINS` | 允许跨域来源（逗号分隔）；开发环境另自动放行 `localhost` / `wails.localhost` | 空 |

Wails 等桌面端开发时，来源形如 `http://wails.localhost:34115`，开发模式下无需单独配置即可跨域；生产环境请在 `CORS_ORIGINS` 中写明前端地址。

## 数据库迁移

生产环境请关闭 `DB_SYNCHRONIZE`，使用 migration 管理表结构：

```bash
# 生成迁移文件（示例）
npm run migration:generate -- src/database/migrations/InitSchema

# 执行迁移
npm run migration:run

# 回滚上一次迁移
npm run migration:revert
```

## 新增业务模块

```bash
npx nest g module modules/user
npx nest g controller modules/user
npx nest g service modules/user
```

在 `modules/user/` 下创建 Entity，TypeORM 会通过 `autoLoadEntities` 自动加载。

## 外部接入文档

- **[用户注册接入文档](docs/register-integration.md)** — 两步注册流程、请求/响应、错误码、多语言调用示例

## 认证接口

| 方法 | 路径 | 说明 |
|------|------|------|
| `POST` | `/api/auth/sms-code` | 发送注册短信验证码 |
| `POST` | `/api/auth/register` | 用户注册 |
| `GET` | `/api/auth/captcha` | 获取登录图片验证码 |
| `POST` | `/api/auth/login` | 用户登录 |
| `GET` | `/api/auth/me` | 获取当前用户（需 Bearer Token） |

### 注册流程

1. `POST /api/auth/sms-code` → `{ "phone": "13800138000" }`
2. 开发环境响应含 `debugCode`（生产环境走真实短信通道）
3. `POST /api/auth/register`：

```json
{
  "phone": "13800138000",
  "smsCode": "123456",
  "password": "Abc12345",
  "confirmPassword": "Abc12345",
  "referralCode": "A1B2C3D4"
}
```

### 登录流程

1. `GET /api/auth/captcha` → 获取 `captchaId` 与 `image`（SVG Base64）
2. `POST /api/auth/login`：

```json
{
  "phone": "13800138000",
  "password": "Abc12345",
  "captchaId": "uuid",
  "captchaCode": "ab12"
}
```

登录/注册成功返回 JWT，Swagger 中点击 **Authorize** 填入 `Bearer <token>` 即可访问 `/api/auth/me`。

```typescript
import { Inject, Injectable } from '@nestjs/common';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.constants';

@Injectable()
export class SomeService {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async setCache(key: string, value: string) {
    await this.redis.set(key, value, 'EX', 3600);
  }
}
```
