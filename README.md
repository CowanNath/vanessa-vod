# Vanessa VOD

基于 Next.js 的视频点播应用，支持多源聚合、在线播放、FFmpeg 下载。

## 功能

- 多视频源聚合浏览与切换
- HLS (m3u8) 在线播放
- FFmpeg 后端下载，支持代理、断线重连
- 实时下载进度（SSE 推送）
- 多集批量下载
- 收藏夹（本地存储）
- 搜索
- 深色/浅色主题
- Docker 一键部署

## 技术栈

- **框架：** Next.js 16 (App Router, Standalone Output)
- **播放器：** ArtPlayer + HLS.js
- **下载：** FFmpeg (child_process)
- **样式：** Tailwind CSS 4
- **部署：** Docker (node:20-alpine)

## 环境变量

| 变量 | 说明 | 默认值 |
|---|---|---|
| `PORT` | 服务端口 | `8608` |
| `HOSTNAME` | 监听地址 | `0.0.0.0` |
| `DOWNLOAD_PROXY` | 下载代理地址 | 无 |
| `HTTP_PROXY` | 通用 HTTP 代理（备选） | 无 |
| `HTTPS_PROXY` | 通用 HTTPS 代理（备选） | 无 |

## Docker 部署

### 1. 直接构建运行

```bash
git clone https://github.com/CowanNath/vanessa-vod.git
cd vanessa-vod

# 构建镜像
docker build -t vanessa-vod .

# 运行容器
docker run -d \
  --name vanessa-vod \
  -p 8608:8608 \
  -v vanessa-downloads:/app/downloads \
  -e DOWNLOAD_PROXY=http://127.0.0.1:7890 \
  --restart unless-stopped \
  vanessa-vod
```

### 2. Docker Compose（推荐）

```bash
git clone https://github.com/CowanNath/vanessa-vod.git
cd vanessa-vod

# 直接启动
docker compose up -d
```

如需配置代理，编辑 `docker-compose.yml` 添加环境变量：

```yaml
services:
  vanessa-vod:
    build: .
    container_name: vanessa-vod
    ports:
      - "8608:8608"
    volumes:
      - downloads:/app/downloads
    environment:
      - DOWNLOAD_PROXY=http://host.docker.internal:7890
    restart: unless-stopped

volumes:
  downloads:
```

> **注意：** Docker 容器内访问宿主机代理请使用 `host.docker.internal` 作为主机名（Docker Desktop 自带），Linux 上需在 docker compose 中添加 `extra_hosts: ["host.docker.internal:host-gateway"]`。

### 3. 持久化下载文件

下载的视频保存在容器内的 `/app/downloads`，通过 Docker Volume `downloads` 持久化。如需直接挂载到宿主机目录：

```yaml
volumes:
  - ./downloads:/app/downloads
```

### 4. 常用管理命令

```bash
# 查看日志
docker logs -f vanessa-vod

# 重启
docker restart vanessa-vod

# 停止并删除
docker compose down

# 重新构建（代码更新后）
docker compose up -d --build

# 进入容器
docker exec -it vanessa-vod sh
```

## 本地开发

```bash
# 安装依赖
npm install

# 配置代理（可选，写入 .env.local）
# DOWNLOAD_PROXY=http://127.0.0.1:7890

# 启动开发服务器
npm run dev
```

访问 http://localhost:8608

## 项目结构

```
src/
├── app/
│   ├── api/
│   │   ├── download/    # FFmpeg 下载接口 (SSE 进度推送)
│   │   ├── image/       # 图片代理
│   │   ├── proxy/       # API 代理
│   │   └── stream/      # 视频流代理
│   ├── favorites/       # 收藏页
│   ├── search/          # 搜索页
│   └── video/[id]/      # 视频详情页
├── components/          # UI 组件
├── hooks/               # 自定义 Hooks
├── lib/                 # 类型定义、常量、工具
├── providers/           # Context Providers
└── services/            # 业务逻辑（API、存储）
```

## 下载说明

下载功能基于 FFmpeg，支持以下特性：

- 自动携带 User-Agent 和 Referer
- HTTP 代理支持（通过 `DOWNLOAD_PROXY` 环境变量）
- 断线自动重连（最大延迟 5 秒）
- 30 秒连接超时
- MP4 faststart 优化（边下边播）
- 多线程处理

> 系统需要安装 FFmpeg（Docker 镜像已内置）。
