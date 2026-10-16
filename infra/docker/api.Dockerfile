# Multi-stage Dockerfile for NestJS API Application and Background Worker
# Runs with non-root user 'node', Fastify adapter, healthcheck configured.
# Path: infra/docker/api.Dockerfile

FROM node:24-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS builder
WORKDIR /app

COPY pnpm-lock.yaml package.json pnpm-workspace.yaml turbo.json ./
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/

RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm --filter @jlpt/schema build && pnpm --filter "./packages/*" build && pnpm --filter @jlpt/api build
RUN if [ -f /app/apps/api/dist/src/main.js ] && [ ! -f /app/apps/api/dist/main.js ]; then \
      printf "%s\n" "export * from './src/main.js';" "import './src/main.js';" > /app/apps/api/dist/main.js; \
    fi && \
    if [ -d /app/apps/api/src/db/migrations ]; then \
      mkdir -p /app/apps/api/dist/src/db/migrations /app/apps/api/dist/migrations && \
      cp -r /app/apps/api/src/db/migrations/* /app/apps/api/dist/src/db/migrations/ && \
      cp -r /app/apps/api/src/db/migrations/* /app/apps/api/dist/migrations/; \
    fi

FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000
ENV HOST="0.0.0.0"

RUN apk add --no-cache curl

USER node

# Copy built application and workspace dependencies
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/packages ./packages
COPY --from=builder --chown=node:node /app/apps/api ./apps/api

WORKDIR /app/apps/api

EXPOSE 4000

HEALTHCHECK --interval=10s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -fsS http://localhost:4000/api/v1/health || exit 1

CMD ["sh", "-c", "if [ -f dist/main.js ]; then exec node dist/main.js; elif [ -f dist/src/main.js ]; then exec node dist/src/main.js; else echo 'API entrypoint not found' && exit 1; fi"]
