# 多肉成长记 🥬

记录多肉植物的成长时光 · PWA + 本地服务器存储 · 数据持久化在 Docker 卷中

## 功能

- 🌱 **植物档案**：名字、品种、入手时间、备注
- 📸 **拍照 + 相册**：调起相机 / 从相册多选
- 📅 **EXIF 自动归档**：按真实拍摄日期归到对应月份
- 🕒 **成长时间轴**：按月分组的照片流
- 🔀 **滑块对比**：选 2 张照片做 before/after
- 📱 **PWA**：可安装到手机主屏
- 🖥️ **本地服务器存储**：照片存在 Docker 卷，多设备共享

## 架构（v0.3）

```
┌─────────────┐    HTTP    ┌──────────────┐
│  PWA 浏览器 │ ─────────► │ Fastify API  │
│  (SvelteKit)│            │  :3001       │
│             │            │              │
│  • UI 渲染  │            │  • SQLite    │
│  • 图片压缩 │            │  • 文件存储   │
│  • EXIF 读  │            │  (./data)    │
└─────────────┘            └──────────────┘
       │                          ▲
       │                          │
   nginx 反代 /api ─────────────────┘
   :80  (Docker)
```

```
duorou/
├── src/                       # SvelteKit 前端
│   ├── lib/
│   │   ├── api.ts            # HTTP 客户端
│   │   ├── photo.ts          # 图片压缩 + EXIF 读取
│   │   ├── repo.svelte.ts    # 响应式状态
│   │   └── types.ts
│   └── routes/
│       ├── +page.svelte      # 花园首页
│       ├── plant/[id]/       # 详情 + 时间轴 + 对比
│       └── settings/         # 设置/状态
├── api/                       # Fastify 后端
│   ├── src/
│   │   ├── server.ts         # 入口
│   │   ├── db.ts             # SQLite schema
│   │   ├── storage.ts        # 文件系统操作
│   │   └── routes/           # plants / photos CRUD
│   └── Dockerfile
├── data/                      # 持久化数据（gitignore）
│   ├── meta.sqlite
│   └── photos/ab/cd/abcd...orig.bin
├── Dockerfile                 # 前端 nginx 镜像
├── docker-compose.yml         # 多服务编排
└── nginx.conf                 # 前端 nginx 配置 + /api 反代
```

## 启动

### Docker（推荐）

```bash
# 启动（自动构建）
docker-compose up -d --build

# 访问
open http://localhost:8080

# 数据存在 ./data 目录（容器外持久化）
ls ./data/photos/    # 照片按 ID 前两位分目录打散
sqlite3 ./data/meta.sqlite  # 元数据

# 停止
docker-compose down
```

### 开发模式

需要 Node 20+。

```bash
# 后端（一个终端）
cd api && npm install && npm run dev
# → http://localhost:3001

# 前端（另一个终端，根目录）
npm install && npm run dev
# → http://localhost:5173
# /api 自动 proxy 到 :3001
```

或者一键：

```bash
docker-compose --profile dev up dev
# 5173 (前端) + 3001 (API) 都暴露
```

## API 概览

```
GET    /api/health                # 健康检查
GET    /api/stats                 # 统计（植物/照片数/磁盘占用）

# 植物
GET    /api/plants                # 列表（含 photoCount + coverPhotoId）
GET    /api/plants/:id            # 详情
POST   /api/plants                # 新建
PATCH  /api/plants/:id            # 更新
DELETE /api/plants/:id            # 删除（级联删除照片）

# 照片
GET    /api/photos?plantId=xxx    # 列出
GET    /api/photos/:id            # 元数据
POST   /api/photos                # 上传（multipart：file + thumb + medium + plantId + meta）
GET    /api/photos/:id/blob?v=medium  # 下载（v: orig | medium | thumb）
PATCH  /api/photos/:id            # 修改日期 / 备注
DELETE /api/photos/:id            # 删除
```

## 数据备份

整个 `./data` 目录就是全部数据：

```bash
# 备份
tar -czf duorou-backup-$(date +%Y%m%d).tar.gz data/

# 恢复
tar -xzf duorou-backup.tar.gz
```

## 部署建议

无鉴权模式只适合**内网 / 个人使用**。要公网部署请加一层：
- Cloudflare Tunnel（免证书）
- Caddy / Nginx 反代 + Let's Encrypt
- Cloudflare CDN 前置

PWA 摄像头需要 HTTPS 才能调起（iOS Safari 限制）。

## 配置

| 环境变量 | 默认 | 说明 |
|---|---|---|
| `DUOROU_HTTP_PORT` | `8080` | 前端宿主机端口 |
| `DATA_DIR` | `/app/data` | API 数据目录（容器内） |
| `PORT` | `3001` | API 容器内端口 |

## 路线图

- [x] 植物档案 + 拍照 + EXIF 时间轴
- [x] 滑块对比
- [x] ZIP 备份/恢复（已废弃，数据在服务器）
- [x] 后端 API（Fastify + SQLite + 文件）
- [x] Docker 多服务编排
- [ ] 多肉图鉴
- [ ] 浇水提醒
- [ ] 鉴权（多用户）
- [ ] 云端同步