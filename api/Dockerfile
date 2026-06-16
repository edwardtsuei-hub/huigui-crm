FROM node:20-bookworm-slim AS builder

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

ENV NPM_CONFIG_AUDIT=false
ENV NPM_CONFIG_FUND=false
ENV NPM_CONFIG_FETCH_RETRIES=5
ENV NPM_CONFIG_FETCH_RETRY_MINTIMEOUT=20000
ENV NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT=120000
ENV NPM_CONFIG_FETCH_TIMEOUT=300000

COPY package.json package-lock.json ./
COPY .npmrc .npmrc
COPY tsconfig.base.json tsconfig.base.json
COPY apps/api/package.json apps/api/package.json
COPY apps/api/tsconfig.json apps/api/tsconfig.json
COPY apps/web/package.json apps/web/package.json
COPY prisma/schema.prisma prisma/schema.prisma
COPY prisma/migrations prisma/migrations
COPY prisma/seed prisma/seed
COPY scripts/with-local-db-env.mjs ./scripts/

RUN npm ci --no-audit --no-fund

COPY apps/api/src apps/api/src

RUN npx prisma generate --schema=prisma/schema.prisma
RUN npm run build -w @huigui/api

FROM node:20-bookworm-slim AS runner

WORKDIR /app

COPY api/assets/fonts-arphic-gbsn00lp_2.11-16_all.deb /tmp/fonts-arphic-gbsn00lp.deb

RUN sed -i 's#http://deb.debian.org/debian#http://mirrors.cloud.tencent.com/debian#g; s#http://deb.debian.org/debian-security#http://mirrors.cloud.tencent.com/debian-security#g' /etc/apt/sources.list.d/debian.sources \
  && apt-get update \
  && apt-get install -y --no-install-recommends openssl ffmpeg \
  && dpkg-deb -x /tmp/fonts-arphic-gbsn00lp.deb / \
  && rm -rf /var/lib/apt/lists/* \
  && rm -f /tmp/fonts-arphic-gbsn00lp.deb

ENV NODE_ENV=production
ENV PORT=3001
ENV API_PORT=3001
ENV LOCAL_UPLOAD_DIR=/app/storage/uploads
ENV PDF_FONT_PATH=/usr/share/fonts/truetype/arphic-gbsn00lp/gbsn00lp.ttf

COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma/seed ./prisma/seed
COPY --from=builder /app/scripts/ ./scripts/
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/apps/api/src/management ./apps/api/src/management
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY api/start.sh /app/api/start.sh

RUN mkdir -p /app/storage/uploads \
  && test -d /app/node_modules/.prisma/client \
  && test -d /app/node_modules/@prisma/client \
  && test -f /app/apps/api/dist/main.js \
  && chmod +x /app/api/start.sh

EXPOSE 3001

CMD ["/app/api/start.sh"]
