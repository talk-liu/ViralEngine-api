# 生产环境部署指南（Docker + 阿里云 ACR）

本文档说明如何将 **ViralEngine API**（仅 Node 服务，不含 Python media-worker）部署到 Linux 服务器（如阿里云 ECS）。

**特点：**

- 服务器**不需要**上传源代码
- 本机构建镜像 → 推到阿里云 ACR → 服务器 `pull` 运行
- 数据库用 TypeORM migration 初始化（推荐）

---

## 架构概览

```text
本机（Windows，有源码）
  build-push-images.ps1
        ↓
阿里云 ACR（镜像仓库）
        ↓ pull
ECS 服务器 /opt/viralengine/
  ├── docker-compose.prod.api.yml
  └── .env
        ↓
  腾讯云 CDB MySQL   （.env 中 DB_HOST/DB_PORT，ECS 经外网/内网访问）
  viralengine-redis   （Docker 内网 redis:6379，不映射宿主机）
  viralengine-api     （宿主机 3003 → 容器 3000）
```

---

## 前置准备

### 1. 阿里云 ACR（个人版）

1. 打开 [容器镜像服务 ACR](https://cr.console.aliyun.com)，开通**个人版**（与 ECS 同地域，如上海）
2. 创建**命名空间**，例如：`viral-engine-api`
3. 创建**镜像仓库**（私有）：
   - `viralengine-api`
   - （可选）`viralengine-media-worker`、`viralengine-media-worker-gpu`
4. **访问凭证** → 设置**固定密码**（用于 `docker login`）

本项目的 Registry 示例：

```text
crpi-mm6tfxx66owmuulg.cn-shanghai.personal.cr.aliyuncs.com
```

镜像完整地址格式：

```text
crpi-mm6tfxx66owmuulg.cn-shanghai.personal.cr.aliyuncs.com/viral-engine-api/viralengine-api:<tag>
```

### 2. ECS 服务器

- 安装 Docker 与 Docker Compose
- 安全组放行：
  - **22**（SSH）
  - **3003**（API 对外端口，见下文端口说明）
  - **80 / 443**（若后续加 Nginx）
- **不要**对公网开放 3306、6379

### 3. 本机开发环境

- Node.js、npm
- Docker Desktop
- 项目源码

---

## 端口说明（重要）

为避免与服务器上已有服务冲突，**对外使用 3003**，**容器内固定 3000**。

| 变量 | 值 | 含义 |
|------|-----|------|
| `API_HOST_PORT` | `3003` | 宿主机对外端口（`curl`、浏览器访问） |
| `PORT` | `3000` | 容器内 NestJS 监听端口（**不要改成 3003**） |

`docker-compose.prod.api.yml` 中：

```yaml
ports:
  - '${API_HOST_PORT:-3000}:3000'
environment:
  PORT: '3000'   # 强制覆盖 .env，防止误配
```

**常见错误：** 在 `.env` 里写 `PORT=3003`，会导致容器内监听 3003，而映射目标是容器 3000，出现 `Connection refused` / `Connection reset`。

访问地址：

- 服务器本机：`http://127.0.0.1:3003/api/health`
- 外网（暂无域名）：`http://<ECS公网IP>:3003/api/health`

---

## 一、本机构建并推送镜像

在项目根目录执行（PowerShell）：

```powershell
cd d:\workbench\ViralEngine-api

docker login --username=<ACR用户名> crpi-mm6tfxx66owmuulg.cn-shanghai.personal.cr.aliyuncs.com

.\scripts\build-push-images.ps1 `
  -Registry crpi-mm6tfxx66owmuulg.cn-shanghai.personal.cr.aliyuncs.com/viral-engine-api `
  -ApiOnly `
  -Push
```

脚本会输出类似：

```text
API_IMAGE=crpi-mm6tfxx66owmuulg.cn-shanghai.personal.cr.aliyuncs.com/viral-engine-api/viralengine-api:abc1234
```

**记下 `<tag>`**（如 git 短 commit `abc1234`），写入服务器 `.env`。

### 国内 Docker Hub 拉取失败

若 build 时报 `node:22-alpine` 连接超时：

1. 配置 [ACR 镜像加速器](https://cr.console.aliyun.com)（Docker Desktop → Settings → Docker Engine）
2. 或临时执行：

```powershell
docker pull docker.m.daocloud.io/library/node:22-alpine
docker tag docker.m.daocloud.io/library/node:22-alpine node:22-alpine
```

然后重新 build。

---

## 二、准备服务器目录

在 ECS 上：

```bash
mkdir -p /opt/viralengine
cd /opt/viralengine
```

只需两个文件（**无需源码**）：

| 文件 | 说明 |
|------|------|
| `docker-compose.prod.api.yml` | 项目根目录，编排 Redis + API + migrate（MySQL 用远程 CDB） |
| `.env` | 生产配置，参考 [.env.prod.example](../.env.prod.example) |

从本机上传（示例）：

```powershell
scp docker-compose.prod.api.yml root@<ECS_IP>:/opt/viralengine/
scp .env.prod.example root@<ECS_IP>:/opt/viralengine/.env
```

再 SSH 登录编辑 `/opt/viralengine/.env`。

---

## 三、服务器 `.env` 配置

复制 [.env.prod.example](../.env.prod.example) 并修改以下项：

```env
# 镜像（必填，tag 用 push 脚本输出的值）
API_IMAGE=crpi-mm6tfxx66owmuulg.cn-shanghai.personal.cr.aliyuncs.com/viral-engine-api/viralengine-api:abc1234

# 端口
PORT=3000
API_HOST_PORT=3003

# 应用
NODE_ENV=production
HTTPS_ENABLED=false
SWAGGER_ENABLED=false
DB_SYNCHRONIZE=false

# MySQL（腾讯云 CDB；控制台确认库名，ECS IP 加入白名单）
DB_HOST=sh-cdb-b4rg6szq.sql.tencentcdb.com
DB_PORT=25350
DB_USERNAME=ViralEngine1
DB_PASSWORD=<强密码>
DB_DATABASE=viralengine
DB_SYNCHRONIZE=false

# Redis（容器内必须用服务名 redis）
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# 密钥（生产环境务必使用随机长字符串）
JWT_SECRET=<随机字符串>
MEDIA_WORKER_SECRET=<随机字符串>

STORAGE_LOCAL_PATH=storage

# 有域名后填写
# CORS_ORIGINS=https://your-frontend.com
# OAUTH_CALLBACK_BASE_URL=https://api.your-domain.com
# STORAGE_PUBLIC_BASE_URL=https://api.your-domain.com/api
```

### `.env` 要点

| 项 | 要求 |
|----|------|
| `DB_HOST` | 腾讯云 CDB 连接地址（不是 `localhost`） |
| `DB_PORT` | CDB 控制台端口（如 `25350`，不是默认 `3306`） |
| `REDIS_HOST` | 必须是 `redis`（容器内 Redis 服务名） |
| `DB_SYNCHRONIZE` | 必须是 `false` |
| `HTTPS_ENABLED` | 必须是 `false`（HTTPS 交给 Nginx） |
| CDB 白名单 | 必须包含 ECS 公网 IP（或同 VPC 内网 IP） |

### 可选：Docker 内自建 MySQL

若不用远程 CDB，可在 `.env` 中改回 `DB_HOST=mysql`、`DB_PORT=3306`，并设置 `DB_ROOT_PASSWORD`，启动时加 `--profile local-mysql`。

---

## 四、首次部署（推荐流程）

在服务器 `/opt/viralengine` 执行：

```bash
cd /opt/viralengine

# 登录 ACR
sudo docker login --username=<ACR用户名> crpi-mm6tfxx66owmuulg.cn-shanghai.personal.cr.aliyuncs.com

# 拉取镜像
sudo docker compose -f docker-compose.prod.api.yml pull

# 确认 ECS 能连 CDB（可选）
nc -zv sh-cdb-b4rg6szq.sql.tencentcdb.com 25350

# 启动 Redis
sudo docker compose -f docker-compose.prod.api.yml up -d redis

# 初始化数据库表（空库执行；使用 API 镜像内的 TypeORM migration，连远程 CDB）
sudo docker compose -f docker-compose.prod.api.yml --profile migrate run --rm migrate

# 启动 API
sudo docker compose -f docker-compose.prod.api.yml up -d

# 验证
sudo docker exec viralengine-api wget -qO- http://127.0.0.1:3000/api/health
curl http://127.0.0.1:3003/api/health
```

### 空库重建（表结构混乱时）

在腾讯云 CDB 控制台清空库或新建库后，重新执行 migration 即可（无需删 Docker 卷）。

### 验证 migration

在 ECS 上（需安装 `mysql` 客户端）：

```bash
mysql -h sh-cdb-b4rg6szq.sql.tencentcdb.com -P 25350 -u ViralEngine1 -p viralengine -e "SHOW TABLES;"
mysql -h sh-cdb-b4rg6szq.sql.tencentcdb.com -P 25350 -u ViralEngine1 -p viralengine -e "SELECT * FROM migrations;"
```

---

## 五、发版更新

### 本机

```powershell
.\scripts\build-push-images.ps1 `
  -Registry crpi-mm6tfxx66owmuulg.cn-shanghai.personal.cr.aliyuncs.com/viral-engine-api `
  -ApiOnly `
  -Tag "1.0.1" `
  -Push
```

### 服务器

```bash
cd /opt/viralengine
# 修改 .env 中 API_IMAGE 的 tag

sudo docker compose -f docker-compose.prod.api.yml pull

# 若有新 migration
sudo docker compose -f docker-compose.prod.api.yml --profile migrate run --rm migrate

sudo docker compose -f docker-compose.prod.api.yml up -d
curl http://127.0.0.1:3003/api/health
```

---

## 六、常用运维命令

```bash
cd /opt/viralengine

# 查看容器状态
sudo docker compose -f docker-compose.prod.api.yml ps

# 查看 API 日志
sudo docker compose -f docker-compose.prod.api.yml logs api --tail 100 -f

# 重启 API
sudo docker compose -f docker-compose.prod.api.yml up -d --force-recreate api

# 停止全部
sudo docker compose -f docker-compose.prod.api.yml down
```

---

## 七、HTTPS 与域名（建议）

生产环境不要在应用内开 HTTPS（`HTTPS_ENABLED=false`），在前方加 Nginx / Caddy：

```nginx
server {
    listen 80;
    server_name api.example.com;

    location / {
        proxy_pass http://127.0.0.1:3003;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

配置证书后更新 `.env`：

```env
CORS_ORIGINS=https://your-frontend.com
OAUTH_CALLBACK_BASE_URL=https://api.example.com
STORAGE_PUBLIC_BASE_URL=https://api.example.com/api
```

---

## 八、故障排查

| 现象 | 可能原因 | 处理 |
|------|----------|------|
| `Connection refused` / `Connection reset` | `PORT=3003` 误配在容器内 | 改 `PORT=3000`，`API_HOST_PORT=3003`，重建 API |
| `Access denied for user` | `.env` 密码与 CDB 不一致 | 对齐 CDB 控制台账号密码 |
| `connect ETIMEDOUT` / 连不上 CDB | ECS IP 未加入 CDB 白名单 | 在腾讯云 CDB 控制台添加 ECS 公网 IP |
| `Table ... doesn't exist` | 未跑 migration | 执行 `--profile migrate run --rm migrate` |
| `6379/3306 address already in use` | 宿主机端口冲突 | 生产 compose 已不映射 MySQL/Redis 端口，确认用最新 compose |
| `Empty reply` / 容器 `Up N seconds` 很短 | API 启动崩溃 | `logs api --tail 100` 查具体错误 |
| `pull access denied` | 未 login ACR | `docker login` |

### 诊断命令

```bash
sudo docker ps -a | grep viralengine
sudo docker compose -f docker-compose.prod.api.yml logs api --tail 50
grep -E '^(PORT|API_HOST_PORT|HTTPS_ENABLED|DB_HOST|DB_PORT)=' /opt/viralengine/.env
nc -zv sh-cdb-b4rg6szq.sql.tencentcdb.com 25350
```

---

## 九、扩展部署

| 场景 | 文件 / 命令 |
|------|-------------|
| 含 Python media-worker | `docker-compose.prod.yml` + 推送 worker 镜像 |
| GPU media-worker | 再加 `docker-compose.prod.gpu.yml` |
| Linux 本机构建 | `scripts/build-push-images.sh` |

---

## 十、检查清单

部署前确认：

- [ ] ACR 已创建命名空间与 `viralengine-api` 仓库
- [ ] 本机已 `docker push` 成功
- [ ] 服务器 `/opt/viralengine/` 有 `docker-compose.prod.api.yml` 与 `.env`
- [ ] `.env` 中 `API_IMAGE` tag 正确
- [ ] `PORT=3000`，`API_HOST_PORT=3003`
- [ ] `HTTPS_ENABLED=false`，`DB_SYNCHRONIZE=false`
- [ ] `DB_HOST` / `DB_PORT` 指向腾讯云 CDB，ECS IP 已在 CDB 白名单
- [ ] `REDIS_HOST=redis`
- [ ] migration 已执行或表已存在
- [ ] 安全组已放行 3003
- [ ] `curl http://127.0.0.1:3003/api/health` 返回 JSON

---

## 相关文件

| 文件 | 用途 |
|------|------|
| [docker-compose.prod.api.yml](../docker-compose.prod.api.yml) | 生产编排（API only） |
| [.env.prod.example](../.env.prod.example) | 服务器 `.env` 模板 |
| [scripts/build-push-images.ps1](../scripts/build-push-images.ps1) | Windows 构建推送 |
| [scripts/build-push-images.sh](../scripts/build-push-images.sh) | Linux 构建推送 |
