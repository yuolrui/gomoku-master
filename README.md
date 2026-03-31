# 五子棋大师 (Gomoku Master Online)

一个精美、流畅且功能强大的网页版五子棋游戏。支持本地 AI 对战、在线多人对战及实时观战功能。

## 🌟 核心功能

### 1. 游戏模式
- **人机对战 (PvC)**：内置智能 AI 算法，支持“简单”、“中等”、“困难”三种难度调节。
- **在线对战 (PvP)**：基于 WebSocket (Socket.io) 的实时多人对战系统。
- **实时观战**：支持无限数量的观众进入房间实时观看对局。

### 2. 房间系统
- **创建/加入房间**：输入自定义房间号即可与好友进入同一对局。
- **快速匹配**：一键生成随机房间号，快速开启对战。
- **角色自动分配**：前两名进入者为对战方，后续进入者自动转为观战模式。
- **实时聊天**：房间内内置实时聊天室，支持对战双方与观战者交流。

### 3. 交互体验
- **精美视觉**：采用木质纹理棋盘设计，搭配优雅的阴影、渐变和 `motion` 动画。
- **智能提示**：落子位置预览、当前回合高亮、胜负即时判定。
- **悔棋与重开**：支持在不同模式下的悔棋逻辑和一键重置游戏。

---

## 🚀 部署说明

本项目采用 **Express + Vite + Socket.io** 的全栈架构，可以轻松部署到各种云平台。

### 1. 在 Google AI Studio 部署
本项目已针对 Google AI Studio 环境进行了优化：
- 点击右上角的 **"Deploy"** 按钮。
- 系统会自动构建并部署到 Google Cloud Run。
- 部署完成后，您将获得一个唯一的 `Shared App URL`，分享该链接即可邀请好友在线对战。

### 2. 本地开发与运行
如果您想在本地运行本项目，请确保已安装 [Node.js](https://nodejs.org/) (建议 v18+)。

```bash
# 1. 克隆或下载项目代码
# 2. 安装依赖
npm install

# 3. 启动开发服务器
npm run dev
```
访问 `http://localhost:3000` 即可开始游戏。

### 3. 通用服务器部署 (Docker/VPS)
- **构建项目**：运行 `npm run build` 生成静态资源。
- **环境变量**：确保设置了必要的环境变量（如 `NODE_ENV=production`）。
- **启动命令**：运行 `npm start`（或 `node server.ts`，需确保环境支持 tsx 或已编译）。

### 4. Nginx 部署 (反向代理)
如果您使用 Nginx 作为 Web 服务器，请按照以下步骤配置反向代理。这对于支持 **WebSocket (Socket.io)** 至关重要。

#### 步骤 A: 准备工作
1. 在服务器上运行 `npm run build`。
2. 使用进程管理器（如 [PM2](https://pm2.keymetrics.io/)）运行服务器：
   ```bash
   pm2 start tsx -- server.ts --name gomoku-app
   ```
   *注意：确保服务器监听 `3000` 端口。*

#### 步骤 B: Nginx 配置文件
在您的 Nginx 配置（如 `/etc/nginx/sites-available/default`）中添加以下内容：

```nginx
server {
    listen 80;
    server_name your-domain.com; # 替换为您的域名或 IP

    location / {
        proxy_pass http://localhost:3000; # 转发到 Express 端口
        proxy_http_version 1.1;
        
        # WebSocket 支持 (关键)
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # 标准请求头
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # 超时设置 (防止 WebSocket 断开)
        proxy_read_timeout 86400;
    }
}
```

#### 步骤 C: 重启 Nginx
```bash
sudo nginx -t
sudo systemctl restart nginx
```

---

## 🛠️ 技术栈
- **前端**：React 19, Tailwind CSS 4, Motion (Framer Motion), Lucide React
- **后端**：Node.js, Express, Socket.io
- **构建工具**：Vite 6, TypeScript, tsx

---

## 📝 游戏规则
- 黑方先行，白方后行。
- 任何一方在横、竖、斜方向上连成五子即获胜。
- 棋盘大小为标准 15x15。

---

祝您在五子棋大师中获得愉快的对弈体验！
