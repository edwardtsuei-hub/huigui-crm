FROM node:20-bookworm-slim AS builder

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1
ENV NPM_CONFIG_AUDIT=false
ENV NPM_CONFIG_FUND=false

COPY package.json package-lock.json ./
COPY .npmrc .npmrc
COPY tsconfig.base.json tsconfig.base.json
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY apps/web/tsconfig.json apps/web/tsconfig.json
COPY apps/web/next-env.d.ts apps/web/next-env.d.ts
COPY apps/web/next.config.mjs apps/web/next.config.mjs

RUN npm ci --no-audit --no-fund

COPY apps/web/app apps/web/app
COPY apps/web/components apps/web/components
COPY apps/web/lib apps/web/lib

ARG NEXT_PUBLIC_APP_NAME=洄归生态客户管理与报价协同系统
ARG NEXT_PUBLIC_API_BASE_URL=/api

ENV NEXT_PUBLIC_APP_NAME=${NEXT_PUBLIC_APP_NAME}
ENV NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL}

RUN npm run build -w @huigui/web

FROM node:20-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV NEXT_TELEMETRY_DISABLED=1
ENV NPM_CONFIG_AUDIT=false
ENV NPM_CONFIG_FUND=false

COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/web ./apps/web

EXPOSE 3000

CMD ["npm", "run", "start", "-w", "@huigui/web"]
