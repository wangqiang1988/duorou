# 多肉成长记 · HANDOFF

> 给后续 AI 对话的工作交接文档 —— 读这一份就够，不要再扫全仓库。
> 维护约定：每次改完 feature 同步更新对应章节（commit 摘要 + 设计决策）。

---

## 1. 项目定位

**多肉成长记** 是一个 PWA（Progressive Web App）+ 本地后端服务：

- 用户记录多肉植物的成长轨迹：照片 + 文字条目
- 时间轴按 `takenAt` 倒序展示（最新在上）
- 主页按品种分类（中文 → pinyin 首字母分组）
- 数据完全本地化，存 Docker 卷（SQLite + 文件系统）
- 单设备 / 内网使用，**无鉴权**

---

## 2. 技术栈

| 类别 | 技术 | 版本 |
|---|---|---|
| 前端框架 | SvelteKit | 2.63 |
| 前端 UI | Svelte 5 runes | 5.56 |
| 前端样式 | Tailwind CSS | 4 |
| 前端类型 | TypeScript | 6 |
| 前端构建 | Vite | 8 |
| 后端框架 | Fastify | 5.1 |
| 后端运行时 | Node | 20 (alpine) |
| 数据库 | better-sqlite3 | 11.5 |
| 后端构建 | esbuild | 0.24（产出 CJS） |
| 后端 ID | nanoid | 5 |
| PWA | vite-plugin-pwa | 1.1 |
| Web 服务器 | nginx | 1.27 (alpine) |
| 中文处理 | pinyin-pro | 3.29 |
| 图片处理 | exifr | 7.1 |
| ZIP 备份 | jszip | 3.10（已废弃，文件在服务器） |
| date-fns | —— | 未使用 |

**关键决策**：
- Svelte 5 + runes（`$state` / `$derived` / `$effect`）模式，**不是** legacy `let` + `$:` 响应式
- 后端 CJS 输出（`dist/server.cjs`），不用 ESM（top-level await 在 CJS 不支持）
- 不用 `src/lib/db.ts`（IndexedDB/Dexie），已删，全走 Fastify + SQLite + 文件系统

---

## 3. 目录结构

```
duorou/
├── HANDOFF.md                              # 本文档（工作交接）
├── README.md                                # 用户向文档
├── package.json                             # 前端依赖 + scripts
├── vite.config.ts                           # Vite 配置 + tailwind + PWA + dev proxy /api
├── Dockerfile                               # 前端 nginx 镜像
├── docker-compose.yml                       # 多服务编排
├── nginx.conf                               # nginx 主配置（events/http/server 全包含）
├── .env.example                             # 端口变量示例
├── .dockerignore                            # Docker 构建排除项
├── .gitignore                               # Git 排除项（含 /data）
│
├── api/                                     # 后端 Fastify 服务
│   ├── package.json                         # 后端依赖 + scripts（dev/build）
│   ├── tsconfig.json                        # TS 配置
│   ├── Dockerfile                           # 多阶段：builder → runner
│   └── src/
│       ├── server.ts                        # 入口：Fastify + multipart + cors + 路由注册
│       ├── db.ts                            # SQLite schema + 迁移系统 + 类型转换
│       ├── storage.ts                       # 文件系统操作（写入/读取/删除二进制）
│       └── routes/
│           ├── plants.ts                    # 植物 CRUD + mode 过滤
│           └── photos.ts                    # 照片 multipart 上传 + blob 下载 + 文字条目
│
├── src/                                     # 前端 SvelteKit
│   ├── app.html                             # HTML 壳（viewport-fit=cover, theme-color）
│   ├── app.css                              # 全局样式：主题色变量 + safe-area + 动画
│   ├── app.d.ts                             # SvelteKit 类型声明
│   ├── routes/
│   │   ├── +layout.svelte                   # 全局壳（<svelte:head>）
│   │   ├── +layout.ts                       # ssr=false + prerender=false（SPA）
│   │   ├── +page.svelte                     # 主页：tab + 品种 chip + grid
│   │   ├── plant/
│   │   │   ├── new/+page.svelte             # 新建植物表单
│   │   │   ├── [id]/
│   │   │   │   ├── +page.svelte             # 详情页：时间线 + Lightbox + 抽屉编辑
│   │   │   │   └── compare/+page.svelte     # 滑块对比页
│   │   └── settings/+page.svelte            # 设置页：appName / 状态 / 统计
│   └── lib/
│       ├── api.ts                           # HTTP 客户端（jsonFetch + FormData 上传）
│       ├── repo.svelte.ts                   # 响应式全局 store（plants / plantsState.mode）
│       ├── photo.ts                         # 压缩（thumb/medium）+ EXIF + formatRelativeTime
│       ├── compose.ts                       # 拼接图生成（canvas）+ saveImage（Web Share）
│       ├── grouping.ts                      # 品种 pinyin 分组
│       ├── appName.svelte.ts                # localStorage 应用名（class + $state）
│       ├── types.ts                          # 类型定义（Plant / Photo / PlantWithStats）
│       └── components/
│           ├── PlantCard.svelte              # 主页卡片（含纪念碑 grayscale）
│           ├── Lightbox.svelte               # 全屏大图浏览 + ✓拼接图 toggle
│           └── CompareSlider.svelte          # 滑块对比（pointer events）
│
├── data/                                    # 持久化目录（gitignore）
│   ├── meta.sqlite                          # SQLite 数据库
│   └── photos/<id 前2>/<id>.<thumb|medium|orig>.bin
│
├── icon.png                                   # 项目图标源图（仓库根）
└── static/                                  # PWA 静态资源
    ├── favicon.png                            # 站点图标（64×64 PNG）
    ├── apple-touch-icon-180x180.png           # iOS 主屏幕图标（180×180 必备）
    ├── icon-192.png / icon-512.png            # PWA 图标（manifest）
    ├── icon-512-maskable.png                  # PWA 启动图标（maskable，缩到 80% 居中）
    └── _gen-icons.py                          # 图标生成脚本：从 ../icon.png 重新生成
```

---

## 4. 数据模型

```ts
// src/lib/types.ts
export type PhotoKind = 'photo' | 'text';

export interface Plant {
  id: string;               // nanoid(16)
  name: string;             // 必填
  species: string;          // 品种，空字符串归到"其他"
  acquiredAt: number;       // 入手时间戳
  notes: string;            // 备注
  diedAt: number | null;    // 离世时间戳，null = 活着
  createdAt: number;
  updatedAt: number;
}

export interface Photo {
  id: string;
  plantId: string;
  takenAt: number;          // 用户视角的时间（EXIF/手填/now）
  width: number;            // 0 for text
  height: number;           // 0 for text
  caption: string;
  mime: string;             // 'image/jpeg' or 'text/plain'
  dateSource: 'exif' | 'file' | 'now';
  kind: PhotoKind;          // 'photo' 默认，'text' 表示纯文字条目
  content: string;          // text 条目的纯文本（photo 为空）
  sizeOrig: number;         // 字节数，text 为 0
  sizeMedium: number;
  sizeThumb: number;
  createdAt: number;
}

// API 返回植物列表时附加的统计字段（API 自动计算）
export interface PlantWithStats extends Plant {
  photoCount: number;
  coverPhotoId: string | null;  // taken_at ASC 最小的照片作为封面
}
```

---

## 5. API 路由

| METHOD | PATH | 用途 | 查询参数 / Body | 返回 |
|---|---|---|---|---|
| GET | `/api/health` | 健康检查 | —— | `{ok, ts}` |
| GET | `/api/stats` | 统计 | —— | `{plants, photos, totalBytes}` |
| GET | `/api/plants` | 植物列表 | `?mode=alive\|dead\|all` | `PlantWithStats[]` |
| GET | `/api/plants/:id` | 植物详情 | —— | `PlantWithStats`（含 photoCount + coverPhotoId） |
| POST | `/api/plants` | 新建植物 | `{name, species?, acquiredAt, notes?, diedAt?}` | `PlantWithStats` |
| PATCH | `/api/plants/:id` | 更新植物 | `{name?, species?, acquiredAt?, notes?, diedAt?}` | `PlantWithStats` |
| DELETE | `/api/plants/:id` | 删除植物 | —— | `{ok}`（级联删照片） |
| GET | `/api/photos` | 照片列表 | `?plantId=xxx`（DESC 排序） | `Photo[]`（含 text + photo） |
| GET | `/api/photos/:id` | 单张照片元数据 | —— | `Photo` |
| POST | `/api/photos` | 上传条目 | multipart：`plantId, takenAt, kind('photo'\|'text'), content?(text), dateSource, file/thumb/medium(photo)` | `Photo` |
| PATCH | `/api/photos/:id` | 更新条目 | `{takenAt?, caption?, content?}` | `Photo` |
| DELETE | `/api/photos/:id` | 删除条目 | —— | `{ok}`（同时删二进制文件） |
| GET | `/api/photos/:id/blob` | 下载二进制 | `?v=thumb\|medium\|orig` | 二进制流 |

**端口**：API 内部 `:3011`（容器内），nginx 反代 `/api/*` → `http://api:3011`
**鉴权**：无
**CORS**：origin: true（开发时同源足够）
**multipart 限制**：单文件 50MB，最多 3 个文件（file/thumb/medium）

---

## 6. 数据库 Schema + 迁移

```sql
CREATE TABLE plants (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  species     TEXT NOT NULL DEFAULT '',
  acquired_at INTEGER NOT NULL,
  notes       TEXT NOT NULL DEFAULT '',
  died_at     INTEGER,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);

CREATE TABLE photos (
  id           TEXT PRIMARY KEY,
  plant_id     TEXT NOT NULL,
  taken_at     INTEGER NOT NULL,
  width        INTEGER NOT NULL DEFAULT 0,
  height       INTEGER NOT NULL DEFAULT 0,
  caption      TEXT NOT NULL DEFAULT '',
  mime         TEXT NOT NULL DEFAULT 'image/jpeg',
  date_source  TEXT NOT NULL DEFAULT 'now',
  kind         TEXT NOT NULL DEFAULT 'photo',
  content      TEXT NOT NULL DEFAULT '',
  size_orig    INTEGER NOT NULL DEFAULT 0,
  size_medium  INTEGER NOT NULL DEFAULT 0,
  size_thumb   INTEGER NOT NULL DEFAULT 0,
  created_at   INTEGER NOT NULL,
  FOREIGN KEY (plant_id) REFERENCES plants(id) ON DELETE CASCADE
);

CREATE INDEX idx_photos_plant ON photos(plant_id);
CREATE INDEX idx_photos_taken ON photos(taken_at);
CREATE INDEX idx_plants_died  ON plants(died_at);
CREATE INDEX idx_photos_kind  ON photos(kind);
```

**迁移系统**（`api/src/db.ts`）：用 `PRAGMA user_version` 追踪版本。`TARGET_SCHEMA_VERSION = 3`，启动时自动跑未执行迁移，全部包在事务里。

| 版本 | 迁移内容 |
|---|---|
| v1 | 初始 schema（plants + photos + 索引） |
| v2 | plants 加 `died_at` 字段 + `idx_plants_died` |
| v3 | photos 加 `kind` + `content` 字段 + `idx_photos_kind` |

**未来加字段流程**：
1. 改 `db.ts`：在 `rowToPlant`/`rowToPhoto` 加字段映射
2. 在 `MIGRATIONS` 列表追加新版本条目（用 `PRAGMA table_info` 检查列存在性后 ALTER TABLE）
3. 部署即可，老库自动升级

**老库兼容性**：所有迁移都先 `PRAGMA table_info` 检查列存在再 ALTER，幂等。

---

## 7. 文件存储约定

```
./data/photos/<id 前两位>/<id>.<variant>.bin
```

- 路径分目录：避免单目录文件数过多
- 三档变体：
  - `thumb` —— 最大 320px，质量 0.78
  - `medium` —— 最大 1280px，质量 0.85
  - `orig` —— 原图

text 条目不写文件（size_orig = 0）。

`api/src/storage.ts`：

```ts
photoPath(id, 'thumb') // → ./data/photos/ab/abcdef123.thumb.bin
writePhotoBlob(id, variant, buffer)
readPhotoBlob(id, variant) → Buffer
deletePhotoFiles(id)  // 三档全删，ENOENT 忽略
```

---

## 8. 前端模块边界

| 文件 | 职责 | 关键 export |
|---|---|---|
| `src/lib/api.ts` | HTTP 客户端 | `plantsApi` / `photosApi` / `ApiError` |
| `src/lib/repo.svelte.ts` | 响应式 store + 调用包装 | `plants` / `plantsState.mode` / `loadPlants` / `createPlant` / `updatePlant` / `deletePlant` / `addPhoto` / `updatePhoto` / `deletePhoto` / `getPlant` / `loadPhotos` |
| `src/lib/photo.ts` | 图片处理 + 时间格式化 | `processPhotoFile` / `readTakenAt` / `formatDay` / `formatMonth` / `formatRelativeTime` / `daysSince` / `isSuspiciousDate` |
| `src/lib/compose.ts` | 拼接图生成 + 分享 | `composeTimeline(opts)` / `saveImage(blob, name)` |
| `src/lib/grouping.ts` | 品种 pinyin 分组 | `pinyinInitial` / `groupBySpecies` / `uniqueLetters` |
| `src/lib/appName.svelte.ts` | localStorage 应用名 | `appName`（class 实例）/ `setAppName` / `resetAppName` |
| `src/lib/types.ts` | 类型定义 | `Plant` / `Photo` / `PlantWithStats` / `PhotoKind` |

**全局 store 字段**（`repo.svelte.ts`）：
- `plants: PlantWithStats[]` —— 主页卡片源
- `plantsState.mode: 'alive' | 'dead'` —— 主页 tab 状态（class + $state，不是 export const $state，因为 Svelte 5 export const 不可重赋值）
- 详情页用组件局部 `$state: Photo[]` 和 `$state: Set<string>`（composeIds）

---

## 9. UI 组件结构

### `src/routes/+page.svelte` —— 主页

- 顶部 sticky header：appName + 设置齿轮
- Tab：`🌱 花园` / `🪦 纪念碑`（switchMode 调 `setPlantsMode`）
- 品种 chip 横向滚动条：`全部 / 桃蛋 / 玉露 / 其他`
- 网格：`grid-cols-2 sm:grid-cols-3`
- 浮动 `+` 按钮（仅 alive tab 显示）

### `src/routes/plant/[id]/+page.svelte` —— 详情页核心（最复杂）

- 顶部 sticky：`‹ 花园` + 植物名 + `✎ 编辑`
- 植物信息区：物种、陪伴天数、入手日期、备注
- 已离世植物：显示墓碑 🪦 + 离世日期 + 复活按钮
- 时间线：左侧节点 + 右侧照片/文字卡片（4:3 缩略图 96px 宽）
- 文字条目：`bg-amber-50` 琥珀色背景 + 琥珀菱形节点
- 底部固定操作条：拼接图勾选状态 + 全选/全不选 + `📥 生成成长长图`
- 浮动菜单按钮：`📷 拍照` / `🖼️ 相册` / `📝 文字`（展开时旋转 45°）
- 抽屉编辑：植物编辑 + 文字条目编辑（两个共用样式）

### `src/routes/plant/new/+page.svelte` —— 新建植物

- 4 字段表单：name * / species / acquiredAt / notes
- 保存 → `createPlant({name, species, acquiredAt, notes, diedAt: null})`

### `src/routes/settings/+page.svelte` —— 设置

- `应用名称`（localStorage）
- `服务器状态`（`/api/stats` + `/api/health`）
- `数据统计`
- `多设备同步说明`
- `关于`

### `src/lib/components/PlantCard.svelte`

- 封面图 `?v=thumb`（纪念碑 grayscale）
- 🪦 纪念角标（已离世）
- 文字：`陪伴 N 天 · 已离去 M 天`

### `src/lib/components/Lightbox.svelte`

- Props: `photos` / `startIndex` / `selectedIds` / `open` / `onclose` / `ontoggle`
- 全屏 fixed，黑底
- 左右按钮 / 触摸滑动 / 键盘 ← → Esc
- 缩略图条跳转
- 底部 `✓ 加入拼接图` toggle
- 图片 src：`?v=orig`（保证清晰）

### `src/lib/components/CompareSlider.svelte`

- 双图叠层 + clip-path 跟随指针
- 仅在 `/plant/[id]/compare` 页用
- 屏幕阅读器 role="slider"

---

## 10. UI 关键模式

### 时间线节点 + 缩略图 + 元信息 三段式

```svelte
<div class="flex gap-3 pl-1">   <!-- 1. 节点列 w-4 -->
<div class="aspect-[4/3] w-24">  <!-- 2. 缩略图 96px -->
<div class="flex-1">             <!-- 3. 日期 + 操作 -->
```

### 底部 fixed 操作条

```svelte
<div class="fixed bottom-0 left-0 right-0 z-20 bg-soil-50/95 backdrop-blur border-t pb-safe pt-2">
```

所有详情页都复用这个模式。`pb-safe` 处理 iOS 底部安全区。

### 底部抽屉编辑

```svelte
{#if open}
  <button class="fixed inset-0 z-40 bg-black/40" onclick={close}></button>
  <div class="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-3xl ... pb-safe pt-3 px-4 max-h-[85vh] overflow-y-auto">
    <div class="w-10 h-1 bg-leaf-200 rounded-full mx-auto mb-3"></div>  <!-- 拖动条 -->
    ...
  </div>
{/if}
```

### 顶部 sticky + `.pt-safe`

```svelte
<header class="sticky top-0 z-10 bg-soil-50/85 backdrop-blur border-b px-4 pt-safe">
```

`pt-safe` CSS：

```css
.pt-safe {
  padding-top: max(env(safe-area-inset-top), 0.5rem);
}
```

**重要**：body 上写 `safe-area-inset-top: env(...)` 是无效 CSS（不是标准属性），必须在 utility class 里写 padding-top。详见第 11 节。

---

## 11. iOS PWA 适配

- `viewport-fit=cover` —— 让 web 内容延伸到刘海区
- `apple-mobile-web-app-status-bar-style: black-translucent` —— 状态栏透明叠加
- `.pt-safe` 类处理顶部安全区（避免按钮被状态栏遮）
- `.pb-safe` 类处理底部安全区
- Web Share API 替代传统 download：iOS 上 `navigator.share({files})` 可弹出"存储图像"存到相册
- iOS 上 `capture="environment"` 强制后置摄像头；要相册选择用 `accept="image/*" multiple`（不带 capture）
- input file `multiple` 支持多选相册

---

## 12. 关键设计决策（"为什么"）

| 决策 | 原因 |
|---|---|
| **IndexedDB → Fastify + SQLite** | 多设备共享需要后端；服务器模式下离线没意义；简化前端 |
| **照片按 ID 前两位分目录** | 避免单目录文件数过多影响文件系统性能 |
| **死亡用单字段 `diedAt: number \| null`** | 简单；不需要 status 枚举；查询 `WHERE died_at IS NULL/NOT NULL` 直接 |
| **时间线缩略图固定 96px（w-24）** | 用户要求"1/8 大小"；紧凑 + 4:3 比例 |
| **支持文字条目（`kind=text`）** | 用户需求：除照片外记录文字心情 |
| **Web Share API 替代 download** | iOS 上能直接存相册，比 `<a download>` 少一步 |
| **nginx 完整主配置** | 避开 nginx 1.27-alpine 的 http.d vs conf.d 路径差异 |
| **PRAGMA user_version 迁移** | 加字段时无需用户手动 ALTER TABLE，自动跑 |
| **Svelte 5 runes（不是 legacy）** | 更严格响应式；编译器辅助；`$state` 可导出但 export const 不可重赋值 |
| **类包装 `$state`（不是 export const $state）** | 用于 `appName` / `plantsState.mode` 等需要外部赋值的场景 |
| **后端 CJS 输出 + `dist/server.cjs`** | ESM 在 Node 顶层 await + CJS 模块互操作复杂；CJS + esbuild 简单可靠 |
| **不分页（主页直接 GET all plants）** | 预计 ≤ 100 株植物，分页增加复杂度不值 |
| **text 条目不参与拼接图** | 拼接图是照片场景，文字混入会很奇怪 |
| **`?v=thumb/medium/orig` 三档** | 列表用 thumb 省带宽；详情用 medium；lightbox 用 orig |
| **dev proxy `/api → localhost:3011`** | 同源避免 CORS；nginx 反代同样路径 |
| **iOS 主屏幕图标走 `apple-touch-icon-180x180`** | iOS 不读 manifest 的 `icons`；必须 `<link rel="apple-touch-icon">` + 180×180 最佳 |
| **iOS PWA 换图标要删了重加** | iOS 把已添加的图标缓存到本地，服务端更新不生效 |

---

## 13. Docker 部署

```
┌─────────────┐         ┌─────────────┐
│   nginx:80  │ ──────► │  api:3011   │
│  (app)      │  /api/*  │  (Fastify)  │
└─────────────┘         └─────────────┘
       │                       │
       └──────────┬────────────┘
                  ▼
            ./data volume
        (SQLite + photos/)
```

`docker-compose.yml`：
- `app` 服务：nginx 1.27-alpine，端口 `${DUOROU_HTTP_PORT:-8080}` → 80
- `api` 服务：node 20-alpine + 自打包 CJS，端口 3011（不直接暴露）
- 网络：`duorou-net`（bridge）
- 依赖：`app` 依赖 `api` service_started
- 健康检查：`wget http://localhost/...`

构建：
```bash
docker-compose up -d --build
```

数据备份：
```bash
cp -r ./data ./data.bak.$(date +%Y%m%d)
```

⚠️ **别跑 `docker-compose down -v`**（带 `-v` 会清 volume）。

⚠️ **老 docker-compose v1.29** 与 Docker Engine 29+ 有 `KeyError: 'ContainerConfig'` 兼容 bug，推荐用 docker compose v2（`docker compose` 无连字符）。

---

## 14. 当前未做的事（明确边界）

❌ **不做**：
- 多用户账号系统（用户名/密码/会话）
- 云端同步（用户已有的 Docker 数据 → 跨设备自动同步）
- 鉴权（API 任何人都能访问，仅靠内网保护）
- 社交分享（朋友圈等，不含系统级 Web Share API）
- 照片 EXIF 重写（拼接图生成时丢弃 EXIF）
- PWA 离线写入队列（API 必须在线）
- 多语言 i18n（仅简体中文）
- 撤销 / 重做
- 数据导出 / 导入 ZIP（之前实现过，已删除——数据在服务器）
- 通知 / 浇水提醒

---

## 15. 当前版本 + 近期改动

**当前状态**：v0.4+（手动版本号未严格管理），代码库稳定。

**近期 20 个 commit 摘要**：

| Commit | 说明 |
|---|---|
| `91ad403` | 替换项目图标为 icon.png（粉樱多肉）|
| `d557640` | 添加 apple-touch-icon-180x180，iOS 主屏幕图标 |
| `91ad403` | 替换项目图标为 duorou.png |
| `87b939b` | 时间线支持文字条目（kind=text）|
| `9c18063` | 设置页可自定义应用名称 |
| `e60d576` | 缩略图缩小约 1/8，重构为左侧小图 + 右侧元信息 |
| `ed4be2a` | 自动迁移系统，schema 版本追踪（PRAGMA user_version）|
| `35daa11` | 缩略图 timeline + 死亡/纪念碑功能 |
| `8a0c4fe` | 缩略图改为等比缩放（object-cover → object-contain → 4:3 + cover）|
| `1e049b9` | 详情页照片列表改为单列微缩图 |
| `57fbf66` | 修复 iOS PWA 全屏模式顶栏被状态栏遮挡（pt-safe 类）|
| `8b1922b` | 修复 3 个 bug：返回按钮 / 编辑功能 / 选择按钮 |
| `2e73225` | 详情页时间轴改为倒序单列展示 |
| `ad49564` | 主页品种 chip 过滤 + Lightbox 浏览 + 编辑入手日期 |
| `70f6a6e` | 多选删除 + 删除多肉二次确认 |
| `1d6900f` | 拼接图改用 Web Share API 直接保存到相册 |
| `6d7d717` | 简化 docker-compose 适配老版 docker-compose v1 |
| `9e19794` | 详情页加多选 + 拼接图下载 |
| `2400326` | 重写 nginx.conf 为主配置 + 修 docker 健康检查 |
| `8b551bf` | API 默认端口改为 3011 |
| `136c115` | 修复 nginx.conf 被 .dockerignore 误排除 |
| `c384fb4` | 改造为 Fastify 后端 + 文件系统存储 |
| `5354027` | 拆分拍照/相册入口，EXIF 日期自动归档 |

**已知小问题 / TODO**（不急）：
- 单次拼接图 large 列表性能（>20 张）需测试
- 多用户场景完全未设计
- 主页 tab 切换 cache miss 时短暂空状态
- 没有卸载/重装提示（localStorage appName 丢失）

---

## AI 对话使用提示

如果你（AI）看到这份文档：

1. **不要**先扫全仓库 —— 看完 HANDOFF.md 就够了
2. 用户的需求通常分两类：
   - **改 feature**：先看第 9 节（UI 组件结构）找对应文件，再看第 12 节（设计决策）了解约束
   - **加 feature**：先看第 4 节（数据模型）设计字段，看第 6 节（迁移）决定是否要 schema 版本号 +1，看第 12 节避免破坏已有设计
3. 修改数据库 schema 时必须更新 `db.ts` 的 `MIGRATIONS` 列表和 `TARGET_SCHEMA_VERSION`
4. 修改 API 时同时更新 `src/lib/api.ts` 的类型 + 后端路由
5. 涉及 iOS PWA 时注意第 11 节（safe-area 必加 pt-safe 类）
6. 测试时记得两个端口：`localhost:5173`（前端 dev） + `localhost:3011`（API dev）
7. 跑完代码改动 + check + commit + push 后，主动建议同步更新 HANDOFF.md 对应章节