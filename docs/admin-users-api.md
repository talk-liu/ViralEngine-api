# 管理员用户管理 API 接入文档

> 版本：v1  
> 基础路径：`{API_BASE}`，默认 `http://localhost:3000/api`  
> 在线文档（Swagger）：`http://localhost:3000/api/docs`（标签 **Admin Users**）  
> OpenAPI JSON：`http://localhost:3000/api/docs-json`

---

## 1. 概述

管理员用户管理 API 用于**后台开账号、续期、禁用、重置密码**等操作。

### 业务变更说明

| 变更项 | 说明 |
|--------|------|
| 公开注册已关闭 | `POST /auth/register`、`POST /auth/sms-code`（注册验证码）已下线 |
| 开账号方式 | 仅管理员通过 `POST /admin/users` 创建 |
| 密码策略 | 系统随机生成，**仅在创建 / 重置密码时返回一次**，列表不返回密码 |
| 会员到期 | 普通用户到期后**禁止登录**；管理员账号永不过期 |
| 忘记密码 | 用户仍可通过 `POST /auth/forgot-password` 自助重置 |

### 接口一览

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| `GET` | `/admin/users` | 管理员 | 用户列表（分页） |
| `POST` | `/admin/users` | 管理员 | 创建用户 |
| `GET` | `/admin/users/:userId` | 管理员 | 用户详情 |
| `PATCH` | `/admin/users/:userId` | 管理员 | 编辑用户（到期日、禁用） |
| `POST` | `/admin/users/:userId/reset-password` | 管理员 | 重置密码 |

### 典型流程

```
管理员登录
  → GET /admin/users          查看用户列表
  → POST /admin/users         开账号，保存 initialPassword
  → 将手机号 + 密码交给用户

用户登录 POST /auth/login
  → 正常使用业务接口

会员即将到期 / 已到期
  → PATCH /admin/users/:id    修改 membershipExpiresAt 续期

用户忘记密码
  → POST /auth/forgot-password/sms-code
  → POST /auth/forgot-password（用户自助，无需管理员）

需要重新发放密码
  → POST /admin/users/:id/reset-password，保存 newPassword
```

### 前置条件

1. 使用**管理员账号**登录：

```http
POST /api/auth/login
Content-Type: application/json

{
  "phone": "13800138000",
  "password": "AdminPass1",
  "captchaId": "uuid-from-captcha",
  "captchaCode": "ab12"
}
```

2. 登录前需先获取图片验证码：`GET /api/auth/captcha`

3. 登录成功响应中的 `accessToken` 用于后续所有管理接口：

```http
Authorization: Bearer <accessToken>
```

4. 管理员账号需在数据库 `users.is_admin = 1`。首次可通过 SQL 设置：

```sql
UPDATE users SET is_admin = 1 WHERE phone = '13800138000';
```

---

## 2. 通用约定

### 2.1 请求头

| 接口 | Authorization | Content-Type |
|------|---------------|--------------|
| 所有管理接口 | `Bearer <accessToken>` | `application/json`（有 Body 时） |

### 2.2 成功响应

直接返回 JSON 对象，**不额外包装** `{ data: ... }` 层。

### 2.3 错误响应

```json
{
  "statusCode": 403,
  "timestamp": "2026-06-30T08:00:00.000Z",
  "path": "/api/admin/users",
  "message": "需要管理员权限"
}
```

| HTTP | 常见场景 |
|------|----------|
| 400 | 参数校验失败（手机号格式、日期格式等） |
| 401 | 未登录或 Token 失效 |
| 403 | 非管理员调用管理接口 |
| 404 | 用户不存在 |
| 409 | 手机号已注册、不能编辑/重置管理员账号 |

### 2.4 公共类型

#### AdminUserListItem

列表项、详情、编辑响应共用此结构：

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | `string` | 用户 UUID |
| `phone` | `string` | 手机号（11 位） |
| `referralCode` | `string` | 推荐码（8 位，创建时自动生成） |
| `isAdmin` | `boolean` | 是否为管理员 |
| `isDisabled` | `boolean` | 是否已禁用 |
| `membershipExpiresAt` | `string \| null` | 会员到期时间（ISO 8601）；管理员为 `null` 表示永不过期 |
| `isExpired` | `boolean` | 会员是否已到期（管理员恒为 `false`） |
| `createdAt` | `string` | 创建时间（ISO 8601） |
| `updatedAt` | `string` | 更新时间（ISO 8601） |

#### 分页列表响应

| 字段 | 类型 | 说明 |
|------|------|------|
| `items` | `AdminUserListItem[]` | 当前页数据 |
| `total` | `number` | 总条数 |
| `page` | `number` | 当前页码，从 1 开始 |
| `pageSize` | `number` | 每页条数 |

---

## 3. 接口详情

### 3.1 用户列表

**`GET /admin/users`**

分页查询用户，支持手机号搜索和到期状态筛选。

#### Query 参数

| 参数 | 类型 | 必填 | 默认 | 说明 |
|------|------|------|------|------|
| `page` | `number` | 否 | `1` | 页码，≥ 1 |
| `pageSize` | `number` | 否 | `20` | 每页条数，1–50 |
| `keyword` | `string` | 否 | — | 手机号关键词（模糊匹配） |
| `expired` | `boolean` | 否 | — | `true` 仅已到期；`false` 仅未到期（含管理员） |

#### 请求示例

```http
GET /api/admin/users?page=1&pageSize=20&keyword=138&expired=false
Authorization: Bearer <accessToken>
```

#### 响应示例

```json
{
  "items": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "phone": "13800138000",
      "referralCode": "A1B2C3D4",
      "isAdmin": false,
      "isDisabled": false,
      "membershipExpiresAt": "2026-12-31T23:59:59.000Z",
      "isExpired": false,
      "createdAt": "2026-06-01T08:00:00.000Z",
      "updatedAt": "2026-06-01T08:00:00.000Z"
    }
  ],
  "total": 1,
  "page": 1,
  "pageSize": 20
}
```

> **注意**：列表**不包含密码**。如需重新获取密码，请调用「重置密码」接口。

---

### 3.2 创建用户

**`POST /admin/users`**

管理员为用户开账号。系统随机生成密码和推荐码。

#### 请求 Body

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `phone` | `string` | 是 | 11 位中国大陆手机号 |
| `membershipExpiresAt` | `string` | 是 | 会员到期时间，ISO 8601 格式 |

#### 请求示例

```http
POST /api/admin/users
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "phone": "13800138000",
  "membershipExpiresAt": "2026-12-31T23:59:59.000Z"
}
```

#### 响应示例（201 Created）

在 `AdminUserListItem` 基础上额外返回 `initialPassword`：

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "phone": "13800138000",
  "referralCode": "A1B2C3D4",
  "isAdmin": false,
  "isDisabled": false,
  "membershipExpiresAt": "2026-12-31T23:59:59.000Z",
  "isExpired": false,
  "createdAt": "2026-06-30T08:00:00.000Z",
  "updatedAt": "2026-06-30T08:00:00.000Z",
  "initialPassword": "Kx9mP2nQ4a"
}
```

#### 错误场景

| HTTP | message | 说明 |
|------|---------|------|
| 409 | `该手机号已注册` | 手机号重复 |
| 400 | `手机号格式不正确` | 手机号不符合规则 |
| 400 | `会员到期时间格式不正确` | 日期格式错误 |

#### 前端建议

- 创建成功后**立即展示** `initialPassword`，并提供复制按钮。
- 密码**不会再次返回**，关闭弹窗后无法从接口找回，只能重置密码。

---

### 3.3 用户详情

**`GET /admin/users/:userId`**

#### 路径参数

| 参数 | 说明 |
|------|------|
| `userId` | 用户 UUID |

#### 请求示例

```http
GET /api/admin/users/550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer <accessToken>
```

#### 响应示例

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "phone": "13800138000",
  "referralCode": "A1B2C3D4",
  "isAdmin": false,
  "isDisabled": false,
  "membershipExpiresAt": "2026-12-31T23:59:59.000Z",
  "isExpired": false,
  "createdAt": "2026-06-01T08:00:00.000Z",
  "updatedAt": "2026-06-01T08:00:00.000Z"
}
```

---

### 3.4 编辑用户

**`PATCH /admin/users/:userId`**

修改会员到期时间或禁用状态。至少传一个字段。

#### 请求 Body

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `membershipExpiresAt` | `string` | 否 | 新的会员到期时间（ISO 8601） |
| `isDisabled` | `boolean` | 否 | `true` 禁用账号；`false` 恢复可用 |

#### 请求示例：续期

```http
PATCH /api/admin/users/550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "membershipExpiresAt": "2027-06-30T23:59:59.000Z"
}
```

#### 请求示例：禁用账号

```http
PATCH /api/admin/users/550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "isDisabled": true
}
```

#### 响应示例

返回更新后的 `AdminUserListItem`（结构同 3.3）。

#### 限制

| HTTP | message | 说明 |
|------|---------|------|
| 409 | `不能编辑管理员账号` | 目标用户 `isAdmin = true` |

---

### 3.5 重置密码

**`POST /admin/users/:userId/reset-password`**

生成新的随机密码，并使该用户已有 Token 失效（需重新登录）。

#### 请求 Body

无。

#### 请求示例

```http
POST /api/admin/users/550e8400-e29b-41d4-a716-446655440000/reset-password
Authorization: Bearer <accessToken>
```

#### 响应示例（200 OK）

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "newPassword": "Kx9mP2nQ4a"
}
```

#### 限制

| HTTP | message | 说明 |
|------|---------|------|
| 409 | `不能重置管理员密码` | 目标用户 `isAdmin = true` |

#### 前端建议

- 重置成功后弹窗展示 `newPassword`，提供复制按钮。
- 提示管理员将新密码告知用户。

---

## 4. 关联认证接口（前端需知）

以下接口不在 **Admin Users** 标签下，但与用户管理密切相关。

### 4.1 登录（用户 / 管理员通用）

**`POST /auth/login`**

普通用户到期或禁用后登录会失败：

| message | 场景 |
|---------|------|
| `账号已禁用` | `isDisabled = true` |
| `会员已到期，请联系管理员续费` | 非管理员且 `membershipExpiresAt` 已过 |
| `手机号或密码错误` | 凭证错误或用户不存在 |

### 4.2 当前用户信息

**`GET /auth/me`**

用户端可展示会员状态，响应新增字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| `membershipExpiresAt` | `string \| null` | 会员到期时间 |
| `isExpired` | `boolean` | 是否已到期 |

### 4.3 忘记密码（用户自助，保留）

| 方法 | 路径 | 说明 |
|------|------|------|
| `POST` | `/auth/forgot-password/sms-code` | 发送重置密码短信验证码 |
| `POST` | `/auth/forgot-password` | 验证码 + 新密码重置 |

### 4.4 已下线的接口

以下接口**请勿再调用**：

| 方法 | 路径 | 说明 |
|------|------|------|
| `POST` | `/auth/register` | 公开注册（已关闭） |
| `POST` | `/auth/sms-code` | 注册短信验证码（已关闭） |

---

## 5. 前端集成示例

### 5.1 管理端：开账号

```typescript
async function createUser(phone: string, expiresAt: Date) {
  const res = await fetch(`${API_BASE}/admin/users`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      phone,
      membershipExpiresAt: expiresAt.toISOString(),
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message);
  }

  const user = await res.json();
  // 务必在此展示 user.initialPassword，仅有一次机会
  return user;
}
```

### 5.2 管理端：用户列表带筛选

```typescript
async function listUsers(params: {
  page?: number;
  pageSize?: number;
  keyword?: string;
  expired?: boolean;
}) {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.pageSize) query.set('pageSize', String(params.pageSize));
  if (params.keyword) query.set('keyword', params.keyword);
  if (params.expired !== undefined) query.set('expired', String(params.expired));

  const res = await fetch(`${API_BASE}/admin/users?${query}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });

  return res.json();
}
```

### 5.3 管理端：续期

```typescript
async function renewMembership(userId: string, expiresAt: Date) {
  const res = await fetch(`${API_BASE}/admin/users/${userId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      membershipExpiresAt: expiresAt.toISOString(),
    }),
  });

  return res.json();
}
```

---

## 6. UI 字段建议

| 页面 | 建议展示字段 | 操作 |
|------|-------------|------|
| 用户列表 | 手机号、到期时间、是否到期、是否禁用、创建时间 | 搜索、筛选到期、分页、编辑、重置密码 |
| 创建用户 | 手机号输入、到期日选择器 | 提交后弹窗展示初始密码 |
| 编辑用户 | 到期日、禁用开关 | 保存 |
| 重置密码 | — | 确认后弹窗展示新密码 |

**到期状态展示建议**：

- `isExpired === true` → 显示「已到期」（红色）
- `isDisabled === true` → 显示「已禁用」（灰色）
- 管理员账号（`isAdmin === true`）→ 到期时间显示「永不过期」

---

## 7. 变更记录

| 版本 | 日期 | 说明 |
|------|------|------|
| v1 | 2026-06-30 | 初版：管理员开账号、列表、编辑、重置密码；关闭公开注册 |
