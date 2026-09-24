# syntax=docker/dockerfile:1.7

# 构建阶段：安装依赖 + 编译 TS
FROM node:20-alpine AS builder
WORKDIR /app

RUN npm config set registry https://registry.npmmirror.com \
 && npm config set fetch-retries 3 \
 && npm config set fetch-retry-mintimeout 20000

COPY package.json package-lock.json* ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --no-audit --no-fund || npm install --no-audit --no-fund

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# 运行阶段：仅拷贝编译产物 + 生产依赖
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV DATA_DIR=/app/data
ENV PORT=3011
ENV HOST=0.0.0.0

# 仅安装生产依赖
COPY package.json package-lock.json* ./
RUN npm config set registry https://registry.npmmirror.com \
 && --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev --no-audit --no-fund || npm install --omit=dev --no-audit --no-fund

COPY --from=builder /app/dist ./dist

# 数据卷：照片 + sqlite
RUN mkdir -p /app/data/photos
VOLUME ["/app/data"]

# 健康检查
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -q -O - http://localhost:3011/api/health || exit 1

EXPOSE 3011

CMD ["node", "dist/server.cjs"]