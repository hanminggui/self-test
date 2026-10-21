# 第三方账号登录配置与部署方案指南 (Authentication Configuration Guide)

本项目支持多渠道 OAuth 2.0 身份认证体系（**GitHub**、**LinuxDo Connect** 与 **Google Identity**），并内置了**细粒度渠道开关**。你可以根据业务需求在不同部署环境下灵活开启或关闭特定的登录渠道。

---

## 目录
1. [配置项总览 (Configuration Matrix)](#1-配置项总览-configuration-matrix)
2. [第三方平台应用创建指引](#2-第三方平台应用创建指引)
   - [GitHub OAuth App](#21-github-oauth-app)
   - [LinuxDo Connect](#22-linuxdo-connect)
   - [Google Identity (OAuth 2.0)](#23-google-identity-oauth-20)
3. [多场景部署方案实操配置](#3-多场景部署方案实操配置)
   - [方案一：本地开发调试 (Local Dev)](#方案一本地开发调试-local-dev)
   - [方案二：Docker / Docker Compose 部署](#方案二docker--docker-compose-部署)
   - [方案三：Cloudflare Workers / Pages 边缘部署](#方案三cloudflare-workers--pages-边缘部署)
   - [方案四：自建 Linux VPS (Nginx + Systemd/PM2)](#方案四自建-linux-vps-nginx--systemdpm2)
4. [前端与服务端的自动化联动机制](#4-前端与服务端的自动化联动机制)
5. [常见问题与排查 (Troubleshooting)](#5-常见问题与排查-troubleshooting)

---

## 1. 配置项总览 (Configuration Matrix)

可以通过环境变量配置全局与单渠道的启用状态及凭据：

| 环境变量名 | 类型 | 默认值 | 说明 |
| :--- | :---: | :---: | :--- |
| `AUTH_ENABLED` | boolean | `true` | **全局认证总开关**。设为 `false` 会一次性停用所有第三方登录渠道。 |
| `AUTH_GITHUB_ENABLED` | boolean | `true` | 是否启用 GitHub 登录渠道 (`true` / `false`)。 |
| `GITHUB_CLIENT_ID` | string | - | GitHub OAuth App 的 Client ID。 |
| `GITHUB_CLIENT_SECRET` | string | - | GitHub OAuth App 的 Client Secret。 |
| `GITHUB_REDIRECT_URI` | string | 自动推导 | 自定义 GitHub 授权回调 URL（可选，默认自动基于当前请求域名推导）。 |
| `AUTH_LINUXDO_ENABLED` | boolean | `true` | 是否启用 LinuxDo Connect 登录渠道 (`true` / `false`)。 |
| `LINUXDO_CLIENT_ID` | string | - | LinuxDo Connect 的 Client ID。 |
| `LINUXDO_CLIENT_SECRET` | string | - | LinuxDo Connect 的 Client Secret。 |
| `LINUXDO_REDIRECT_URI` | string | 自动推导 | 自定义 LinuxDo 授权回调 URL（可选）。 |
| `AUTH_GOOGLE_ENABLED` | boolean | `true` | 是否启用 Google 登录渠道 (`true` / `false`)。 |
| `GOOGLE_CLIENT_ID` | string | - | Google Cloud Console 生成的 Web 客户端 ID。 |
| `GOOGLE_CLIENT_SECRET` | string | - | Google Cloud Web 客户端密钥。 |
| `GOOGLE_REDIRECT_URI` | string | 自动推导 | 自定义 Google 授权回调 URL（可选）。 |
| `JWT_SECRET` | string | 内置默认密钥 | 用于签署用户登录身份凭证 (`auth_token` Cookie) 的对称密钥。**生产环境必须替换**。 |

> **提示**：布尔值支持 `true`/`false`、`1`/`0`、`yes`/`no`、`on`/`off`。

---

## 2. 第三方平台应用创建指引

### 2.1 GitHub OAuth App
1. 访问并登录 [GitHub Developer Settings -> OAuth Apps](https://github.com/settings/developers)。
2. 点击 **"New OAuth App"**。
3. 填写基本信息：
   - **Application name**: 自定义（如 `Metacognitive Testing`）
   - **Homepage URL**: 你的站点主页（如 `http://localhost:3000` 或 `https://your-domain.com`）
   - **Authorization callback URL**:
     - 本地开发：`http://localhost:3000/api/auth/github/callback`（通过 Vite 反向代理）
     - 独立后端：`http://localhost:8000/api/auth/github/callback`
     - 线上生产：`https://your-domain.com/api/auth/github/callback`
4. 点击 **"Register application"** 后，复制 **Client ID**，并点击 **"Generate a new client secret"** 保存生成的秘钥。

---

### 2.2 LinuxDo Connect
1. 访问并登录 [LinuxDo Connect 控制台](https://connect.linux.do/)。
2. 创建或申请一个新的 OAuth2 应用：
   - **Redirect URI**: 填入 `https://your-domain.com/api/auth/linuxdo/callback`（本地测试填 `http://localhost:3000/api/auth/linuxdo/callback`）
   - **Scope**: 请求基础用户信息权限。
3. 获取生成的 `Client ID` 和 `Client Secret`。
4. *特性说明*：系统会自动识别 LinuxDo 社区的信任等级（Trust Level L0~L4），并在探索者名片中点亮专属社区勋章。

---

### 2.3 Google Identity (OAuth 2.0)
1. 登录 [Google Cloud Console - 凭据中心](https://console.cloud.google.com/apis/credentials)。
2. 选择已有项目或新建项目。
3. 首次配置时，先配置 **OAuth 同意屏幕 (OAuth consent screen)**：
   - 用户类型：选 **外部 (External)**。
   - 填写应用名称、用户支持电子邮件和开发者联系信息。
4. 进入 **凭据 (Credentials)** 标签页，点击 **+ 创建凭据 -> OAuth 客户端 ID**：
   - 应用类型：选择 **Web 应用程序 (Web application)**。
   - 名称：自定义（如 `Metacognitive Testing Web`）。
   - **已获授权的重定向 URI (Authorized redirect URIs)**：
     - 点击 **+ 添加 URI**，填写：`https://your-domain.com/api/auth/google/callback`（本地开发加 `http://localhost:3000/api/auth/google/callback`）。
5. 点击创建，妥善保存弹出的 **客户端 ID (Client ID)** 和 **客户端密钥 (Client Secret)**。

---

## 3. 多场景部署方案实操配置

### 方案一：本地开发调试 (Local Dev)

本地开发时，前端运行在 `http://localhost:3000`（由 Vite 代理 `/api` 到后端的 `8000` 端口）。

1. 复制根目录模板生成 `.env`：
   ```bash
   cp .env.example .env
   ```
2. 编辑 `.env`，填入你已注册的平台凭据；如果某平台尚未注册，直接将其开关设为 `false`：
   ```bash
   # 例如：仅开启 GitHub，暂时关闭 LinuxDo 与 Google
   AUTH_GITHUB_ENABLED=true
   GITHUB_CLIENT_ID=your_real_github_client_id
   GITHUB_CLIENT_SECRET=your_real_github_client_secret

   AUTH_LINUXDO_ENABLED=false
   AUTH_GOOGLE_ENABLED=false
   ```
3. 启动开发服务器：
   ```bash
   # 终端 1：启动 Hono API 后端
   bun run start

   # 终端 2：启动 Vite 前端
   bun run dev
   ```
   访问 `http://localhost:3000`，登录弹窗将只会显示已启用的渠道。

---

### 方案二：Docker / Docker Compose 部署

项目根目录包含预置的 [`Dockerfile`](file:///Users/aduang/github/self-test/Dockerfile) 与 [`docker-compose.yml`](file:///Users/aduang/github/self-test/docker-compose.yml)。

1. 在项目根目录创建或编辑 `.env` 文件：
   ```bash
   JWT_SECRET=production_random_secret_string_32chars
   ADMIN_PASSWORD=your_secure_admin_password

   # 登录渠道控制
   AUTH_GITHUB_ENABLED=true
   GITHUB_CLIENT_ID=xxxx
   GITHUB_CLIENT_SECRET=xxxx

   AUTH_LINUXDO_ENABLED=true
   LINUXDO_CLIENT_ID=xxxx
   LINUXDO_CLIENT_SECRET=xxxx

   AUTH_GOOGLE_ENABLED=false
   ```
2. 一键启动容器：
   ```bash
   docker compose up -d --build
   ```
   `docker-compose.yml` 已配置自动将 `.env` 中的认证配置与渠道开关注入容器。数据与 SQLite 数据库持久化在 `./data` 目录下。

---

### 方案三：Cloudflare Workers / Pages 边缘部署

在 Cloudflare 边缘架构中，明文配置放置在 [`wrangler.toml`](file:///Users/aduang/github/self-test/wrangler.toml) 中，敏感的 Client Secret 与 JWT Secret 使用加密的 `wrangler secret`。

#### 1. 配置渠道开关与公共 Client ID
编辑 `wrangler.toml`，在 `[vars]` 块中指定（如果文件内没有 `[vars]` 可在末尾添加）：
```toml
[vars]
AUTH_ENABLED = "true"
AUTH_GITHUB_ENABLED = "true"
GITHUB_CLIENT_ID = "your_github_client_id"
AUTH_LINUXDO_ENABLED = "true"
LINUXDO_CLIENT_ID = "your_linuxdo_client_id"
AUTH_GOOGLE_ENABLED = "false"
```

#### 2. 上传加密密钥 (Secrets)
运行以下命令安全录入密钥（不会被提交到代码仓库）：
```bash
# 录入会话 JWT 密钥
npx wrangler secret put JWT_SECRET

# 录入 GitHub 密钥
npx wrangler secret put GITHUB_CLIENT_SECRET

# 录入 LinuxDo 密钥
npx wrangler secret put LINUXDO_CLIENT_SECRET

# 录入 Google 密钥（若启用）
npx wrangler secret put GOOGLE_CLIENT_SECRET
```

#### 3. 部署并更新回调地址
```bash
bun run deploy
```
发布成功后，将各第三方控制台中的回调地址更新为 Cloudflare 实际域名：
`https://<your-worker-name>.<your-subdomain>.workers.dev/api/auth/<provider>/callback`

---

### 方案四：自建 Linux VPS (Nginx + Systemd/PM2)

当使用 VPS 部署时，通常使用 Nginx 作为反向代理并开启 HTTPS。

#### 1. Nginx 反向代理关键配置
为确保后端能够自动正确推导出 `https` 回调 URL，Nginx 必须传递 `Host` 与 `X-Forwarded-Proto` 头：
```nginx
server {
    server_name test.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    listen 443 ssl http2;
    # ... SSL 证书相关配置 ...
}
```

#### 2. 服务环境变量 (Systemd 服务示例)
在 `/etc/systemd/system/self-test.service` 中直接配置或引用环境变量文件：
```ini
[Unit]
Description=Metacognitive Testing Service
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/var/www/self-test
EnvironmentFile=/var/www/self-test/.env
ExecStart=/home/ubuntu/.bun/bin/bun src/backend/server.ts
Restart=always

[Install]
WantedBy=multi-user.target
```

---

## 4. 前端与服务端的自动化联动机制

1. **服务发现端点 (`GET /api/auth/providers`)**：
   - 前端启动时会自动请求此接口获取当前服务器开启的渠道状态字典，例如：
     ```json
     {
       "providers": {
         "github": true,
         "linuxdo": true,
         "google": false
       }
     }
     ```
2. **UI 动态降级与自适应渲染**：
   - 登录模态框（[`AuthModal`](file:///Users/aduang/github/self-test/src/frontend/components/auth/AuthModal.tsx)）会自动只渲染被开启渠道的登录按钮。
   - 若某渠道被关闭，其对应按钮彻底隐藏，绝不给用户呈现无法登录的死链接。
   - 若所有渠道均被关闭（`hasAnyProvider === false`），导航栏的“登录”按钮会自动隐藏，模态框内会友好提示“当前未开启任何第三方登录渠道，您可直接以游客身份继续探索与评测”。
3. **服务端严格边界拦截**：
   - 即使有人绕过前端直接调用被关闭渠道的重定向或回调 URL（例如 `/api/auth/google` 或 `/api/auth/google/callback`），后端路由会立即拦截并返回 `HTTP 403 Forbidden`：
     ```json
     {
       "error": "Google authentication is disabled"
     }
     ```
4. **账号跨渠道去重与自动绑定**：
   - 系统支持基于已验证邮箱（Verified Email）跨渠道自动聚合账号。例如用户先通过 GitHub 登录，随后通过 Google 登录相同邮箱账号，系统会自动将两个身份绑定至同一个用户档案，保留其所有历史认知流形测验记录。

---

## 5. 常见问题与排查 (Troubleshooting)

### Q1: 点击登录后第三方页面提示 `redirect_uri_mismatch`？
* **原因**：第三方平台开发者控制台中填写的授权回调地址与当前访问的地址不完全一致（包括协议 `http` vs `https`、端口号、末尾斜杠）。
* **解决办法**：
  1. 检查请求的来源域名。如果是本地通过 Vite `3000` 端口访问，回调地址应为 `http://localhost:3000/api/auth/<provider>/callback`；
  2. 也可以在 `.env` 中强制指定明确的回调地址，例如：
     `GITHUB_REDIRECT_URI=https://your-domain.com/api/auth/github/callback`。

### Q2: 为什么我配置了环境变量，界面上对应渠道依然没出来？
* **排查步骤**：
  1. 打开浏览器开发者工具 Network 面板，查看 `/api/auth/providers` 返回的 JSON 是否为 `true`；
  2. 检查变量名拼写是否符合规范：`AUTH_GITHUB_ENABLED`、`AUTH_LINUXDO_ENABLED`、`AUTH_GOOGLE_ENABLED`；
  3. 若通过 Docker 运行，检查是否重新构建了镜像或重新加载了 `.env`（执行 `docker compose down && docker compose up -d`）。

### Q3: 生产环境部署后提示 Cookie 无法设置或登录态丢失？
* **原因**：认证 Token 采用 `HttpOnly; SameSite=Lax` Cookie 发放。在跨域反代或非 HTTPS 环境下可能被浏览器拦截。
* **解决办法**：确保线上站点启用了有效的 SSL/TLS 证书（HTTPS），并在反向代理服务器（如 Nginx/Caddy）中正确设置了 `X-Forwarded-Proto https`。
