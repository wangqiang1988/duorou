# 多肉成长记 🥬

记录多肉植物的成长时光 · PWA · 数据完全本地化

## 功能

- 🌱 **植物档案**：名字、品种、入手时间、备注
- 📸 **拍照记录**：调起相机，EXIF 自动提取拍摄日期
- 🕒 **成长时间轴**：按月分组的照片流
- 🔀 **滑块对比**：选 2 张照片做 before/after
- 📦 **数据备份**：一键导出/导入 ZIP（含全部原图）
- 📱 **PWA**：可安装到手机主屏，离线可用

## 技术栈

- SvelteKit 2 + Svelte 5 (runes)
- TypeScript
- Tailwind CSS 4
- Dexie.js (IndexedDB)
- exifr (EXIF 读取)
- JSZip + file-saver
- vite-plugin-pwa

## 开发

```bash
npm install
npm run dev          # 本机跑：http://localhost:5173
npm run dev -- --host   # 同 WiFi 手机访问
```

## 构建

```bash
npm run build
npm run preview
```

构建产物在 `build/`，可静态托管到任意 CDN / GitHub Pages / Cloudflare Pages。

## 数据存储

所有数据存在浏览器 IndexedDB 中，**不会上传任何服务器**。
建议定期使用「设置 → 导出备份」保存 ZIP 文件。

## 拍照提示

- iOS Safari：需在 PWA 模式（添加到主屏后打开）才能正常调起相机
- 桌面浏览器：会打开文件选择对话框
- 第一次拍摄请允许相机权限

## 目录结构

```
src/
├── routes/
│   ├── +page.svelte                  # 花园首页
│   ├── plant/new/+page.svelte        # 新建植物
│   ├── plant/[id]/+page.svelte       # 详情/时间轴
│   ├── plant/[id]/compare/+page.svelte
│   └── settings/+page.svelte         # 设置/备份
└── lib/
    ├── db.ts                         # Dexie 数据层
    ├── photo.ts                      # 拍照、压缩、EXIF
    ├── backup.ts                     # 导出/导入
    ├── repo.svelte.ts                # 响应式状态
    └── components/
            ├── PlantCard.svelte
            └── CompareSlider.svelte
```

## 重新生成图标

```bash
python3 static/_gen-icons.py
```