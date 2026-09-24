# syntax=docker/dockerfile:1.7

# ============== 构建阶段 ==============
FROM node:20-alpine AS builder
WORKDIR /app

# 国内镜像加速 + 重试
RUN npm config set registry https://registry.npmmirror.com \
 && npm config set fetch-retries 3 \
 && npm config set fetch-retry-mintimeout 20000

# 单独装依赖以利用缓存
COPY package.json package-lock.json* ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --no-audit --no-fund || npm install --no-audit --no-fund

# 复制源码并构建
COPY . .
RUN npm run build

# ============== 运行阶段 ==============
FROM nginx:1.27-alpine AS runner

# 健康检查依赖
RUN apk add --no-cache curl

# 复制构建产物
COPY --from=builder /app/build /usr/share/nginx/html

# 复制 nginx 配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 移除 nginx 默认配置
RUN rm -f /etc/nginx/conf.d/default.conf.bak /etc/nginx/http.d/default.conf

# 健康检查
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD curl -fsS http://localhost/ > /dev/null || exit 1

EXPOSE 80

# nginx 前台运行
CMD ["nginx", "-g", "daemon off;"]