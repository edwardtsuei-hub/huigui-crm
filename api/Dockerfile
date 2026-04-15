FROM node:20-bookworm-slim AS builder

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends fonts-noto-cjk netcat-openbsd openssl \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY .npmrc .npmrc
COPY tsconfig.base.json tsconfig.base.json
COPY apps apps
COPY prisma prisma

RUN npm ci

RUN npx prisma generate \
  && npm run build -w @huigui/api

FROM node:20-bookworm-slim AS runner

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends fonts-noto-cjk netcat-openbsd openssl \
  && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV PORT=3001
ENV API_PORT=3001
ENV LOCAL_UPLOAD_DIR=/app/storage/uploads

COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/.npmrc ./.npmrc
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api ./apps/api
COPY --from=builder /app/prisma ./prisma
COPY api/start.sh /app/api/start.sh

RUN mkdir -p /app/storage/uploads \
  && chmod +x /app/api/start.sh

EXPOSE 3001

CMD ["/app/api/start.sh"]
