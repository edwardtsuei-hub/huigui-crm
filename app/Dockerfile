FROM node:20-bookworm-slim AS builder

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1
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
COPY apps/web/package.json apps/web/package.json
COPY apps/web/tsconfig.json apps/web/tsconfig.json
COPY apps/web/next-env.d.ts apps/web/next-env.d.ts
COPY apps/web/next.config.mjs apps/web/next.config.mjs
COPY apps/web/middleware.ts apps/web/middleware.ts

RUN npm ci --no-audit --no-fund

COPY apps/web/app apps/web/app
COPY apps/web/components apps/web/components
COPY apps/web/lib apps/web/lib
COPY apps/web/public apps/web/public

ARG NEXT_PUBLIC_APP_NAME=洄归生态客户管理与报价协同系统
ARG NEXT_PUBLIC_API_BASE_URL=/api
ARG NEXT_PUBLIC_ENABLE_DAOCHONG_MOBILE_GRAY=false
ARG NEXT_PUBLIC_DAOCHONG_MOBILE_DATA_SOURCE=mock
ARG NEXT_PUBLIC_DAOCHONG_MOBILE_READONLY_FETCH=false

ENV NEXT_PUBLIC_APP_NAME=${NEXT_PUBLIC_APP_NAME}
ENV NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL}
ENV NEXT_PUBLIC_ENABLE_DAOCHONG_MOBILE_GRAY=${NEXT_PUBLIC_ENABLE_DAOCHONG_MOBILE_GRAY}
ENV NEXT_PUBLIC_DAOCHONG_MOBILE_DATA_SOURCE=${NEXT_PUBLIC_DAOCHONG_MOBILE_DATA_SOURCE}
ENV NEXT_PUBLIC_DAOCHONG_MOBILE_READONLY_FETCH=${NEXT_PUBLIC_DAOCHONG_MOBILE_READONLY_FETCH}

RUN npm run build -w @huigui/web

FROM node:20-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

EXPOSE 3000

CMD ["node", "apps/web/server.js"]
