FROM node:20-bookworm-slim AS builder

WORKDIR /app

ENV NPM_CONFIG_AUDIT=false
ENV NPM_CONFIG_FUND=false

COPY package.json package-lock.json ./
COPY .npmrc .npmrc
COPY tsconfig.base.json tsconfig.base.json
COPY apps/api/package.json apps/api/package.json
COPY apps/api/tsconfig.json apps/api/tsconfig.json
COPY apps/web/package.json apps/web/package.json
COPY prisma/schema.prisma prisma/schema.prisma
COPY prisma/migrations prisma/migrations

RUN npm ci --no-audit --no-fund

COPY apps/api/src apps/api/src

RUN npx prisma generate \
  && npm run build -w @huigui/api

FROM node:20-bookworm-slim AS runner

ARG APT_MIRROR=https://mirrors.tencent.com/debian
ARG APT_SECURITY_MIRROR=https://mirrors.tencent.com/debian-security

WORKDIR /app

RUN set -eux; \
  if [ -n "${APT_MIRROR:-}" ]; then \
    if [ -f /etc/apt/sources.list.d/debian.sources ]; then \
      sed -i \
        -e "s|https\\?://deb.debian.org/debian|${APT_MIRROR}|g" \
        -e "s|https\\?://security.debian.org/debian-security|${APT_SECURITY_MIRROR}|g" \
        /etc/apt/sources.list.d/debian.sources; \
    fi; \
    if [ -f /etc/apt/sources.list ]; then \
      sed -i \
        -e "s|https\\?://deb.debian.org/debian|${APT_MIRROR}|g" \
        -e "s|https\\?://security.debian.org/debian-security|${APT_SECURITY_MIRROR}|g" \
        /etc/apt/sources.list; \
    fi; \
  fi; \
  apt-get update -o Acquire::Retries=3 -o Acquire::http::Timeout=30; \
  apt-get install -y --no-install-recommends fonts-wqy-zenhei openssl; \
  rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV PORT=3001
ENV API_PORT=3001
ENV LOCAL_UPLOAD_DIR=/app/storage/uploads
ENV PDF_FONT_PATH=/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc

COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api ./apps/api
COPY --from=builder /app/prisma ./prisma
COPY api/start.sh /app/api/start.sh

RUN mkdir -p /app/storage/uploads \
  && chmod +x /app/api/start.sh

EXPOSE 3001

CMD ["/app/api/start.sh"]
