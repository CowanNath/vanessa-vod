# Vanessa VOD

基于 Next.js 的视频点播应用，支持多源聚合、在线播放、FFmpeg 下载。

## 功能

- 多视频源聚合浏览与切换
- HLS (m3u8) 在线播放，mp4 直链原生播放（支持 seek）
- m3u8 播放列表代理改写，基于域名投票自动剔除插入式广告分段
- FFmpeg 后端下载，支持代理、断线重连
- 实时下载进度（SSE 推送）
- 下载任务面板：进行中任务进度/取消 + 历史记录，关页面后下载不中断
- 多集批量下载
- 收藏夹、观看历史（服务端存储，多设备共享）
- 搜索（多源并行）
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
| `DOWNLOAD_DIR` | 视频保存目录 | `<运行目录>/downloads` |
| `DATA_DIR` | JSON 数据目录（收藏/源配置/观看历史/下载历史） | `<运行目录>/data` |
| `DOWNLOAD_PROXY` | 下载代理地址 | 无 |
| `HTTP_PROXY` | 通用 HTTP 代理（备选） | 无 |
| `HTTPS_PROXY` | 通用 HTTPS 代理（备选） | 无 |
| `AD_FILTER` | 设为 `off` 关闭 m3u8 广告分段过滤 | 开启 |

### NAS 部署注意（数据目录权限）

Docker 容器以非 root 用户（uid 1001）运行。如果收藏/源配置/下载历史报 `EACCES: permission denied` 或历史记录为空，说明挂载的 data 目录对容器用户只读，任选其一修复：

1. **推荐**：添加环境变量 `DATA_DIR`，指向一个可写目录（如下载盘挂载路径下的子目录 `/app/downloads/.appdata`，数据随外接盘持久化）
2. 在 NAS 文件管理中给 data 目录开放"所有人可写"，或 SSH 执行 `chmod -R 777 <data 目录>`
3. 部署时将容器运行用户改为 root（`user: "0:0"`）

具体哪个目录写入失败，看 `docker logs` 中的 `[storage]` / `[download]` 报错即可。

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
│   │   ├── download/    # FFmpeg 下载接口 (SSE 进度推送 + 任务列表)
│   │   ├── favorites/   # 收藏
│   │   ├── history/     # 观看历史
│   │   ├── image/       # 图片代理
│   │   ├── proxy/       # API 代理
│   │   ├── sources/     # 视频源配置
│   │   └── stream/      # 视频流代理 (m3u8 改写 + 广告分段过滤 + Range 透传)
│   ├── favorites/       # 收藏页
│   ├── history/         # 观看历史页
│   ├── search/          # 搜索页
│   └── video/[id]/      # 视频详情页
├── components/          # UI 组件
├── hooks/               # 自定义 Hooks
├── lib/                 # 类型定义、常量、m3u8 改写、工具
├── providers/           # Context Providers
└── services/            # 业务逻辑（API、存储）
```

## 下载说明

下载功能基于 FFmpeg，支持以下特性：

- 下载同样去广告：先经本地净化端点（选最高码率 + 域名投票剔除广告分段）再交给 FFmpeg，失败自动回退原始地址
- 自动携带 User-Agent 和 Referer
- HTTP 代理支持（通过 `DOWNLOAD_PROXY` 环境变量）
- 断线自动重连（最大延迟 5 秒）
- 30 秒连接超时
- MP4 faststart 优化（边下边播）
- 多线程处理

> 系统需要安装 FFmpeg（Docker 镜像已内置）。
