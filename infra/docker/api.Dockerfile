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
COPY docs/multi-worker/demo-data/ ./docs/multi-worker/demo-data/

RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# Configure Fastify 50MB bodyLimit for ZIP uploads and tenantId resolution from org_memberships
RUN node -e " \
  const fs = require('fs'); \
  const mainPath = 'apps/api/src/main.ts'; \
  let main = fs.readFileSync(mainPath, 'utf8'); \
  main = main.replace('new FastifyAdapter()', 'new FastifyAdapter({ bodyLimit: 52428800 })'); \
  fs.writeFileSync(mainPath, main); \
  const authPath = 'apps/api/src/modules/auth/auth.service.ts'; \
  let auth = fs.readFileSync(authPath, 'utf8'); \
  const target = 'if (!row || row.blockedAt) {\n      return null;\n    }'; \
  const addition = target + '\n\n    let tenantId: string | undefined = undefined;\n    try {\n      const [membership] = await this.client.db.select({ slug: schema.organizations.slug }).from(schema.orgMemberships).innerJoin(schema.organizations, eq(schema.orgMemberships.orgId, schema.organizations.id)).where(eq(schema.orgMemberships.userId, row.userId)).limit(1);\n      if (membership?.slug) {\n        tenantId = membership.slug;\n      }\n    } catch {\n      // ignore\n    }'; \
  auth = auth.replace(target, addition); \
  auth = auth.replace('emailVerified: row.emailVerified,', 'emailVerified: row.emailVerified,\n      ...(tenantId ? { tenantId } : {}),'); \
  fs.writeFileSync(authPath, auth); \
"

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

# Create persistent storage directories with proper permissions for user node
RUN mkdir -p /app/.data/storage && chown -R node:node /app

USER node

# Copy built application and workspace dependencies
COPY --chown=node:node pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --chown=node:node docs/multi-worker/demo-data ./docs/multi-worker/demo-data
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/packages ./packages
COPY --from=builder --chown=node:node /app/apps/api ./apps/api

WORKDIR /app/apps/api

EXPOSE 4000

HEALTHCHECK --interval=10s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -fsS http://localhost:4000/api/v1/health || exit 1

CMD ["sh", "-c", "if [ -f dist/main.js ]; then exec node dist/main.js; elif [ -f dist/src/main.js ]; then exec node dist/src/main.js; else echo 'API entrypoint not found' && exit 1; fi"]
