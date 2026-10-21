# Multi-stage Dockerfile for Next.js Web App
# Runs with non-root user 'nextjs', standalone output, healthcheck configured.
# Path: infra/docker/web.Dockerfile

FROM node:24-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS builder
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy root monorepo files
COPY pnpm-lock.yaml package.json pnpm-workspace.yaml turbo.json ./
COPY packages/ ./packages/
COPY apps/web/ ./apps/web/

RUN mkdir -p /app/apps/web/public
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
ARG NEXT_PUBLIC_API_URL=/api/v1
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
# Features hidden in this release phase (apps/web/lib/features.ts); build with =1 to show one again.
ARG NEXT_PUBLIC_FEATURE_PRIVACY_POLICY=0
ARG NEXT_PUBLIC_FEATURE_TTS=0
ARG NEXT_PUBLIC_FEATURE_AI_EXPLANATION=0
ENV NEXT_PUBLIC_FEATURE_PRIVACY_POLICY=$NEXT_PUBLIC_FEATURE_PRIVACY_POLICY
ENV NEXT_PUBLIC_FEATURE_TTS=$NEXT_PUBLIC_FEATURE_TTS
ENV NEXT_PUBLIC_FEATURE_AI_EXPLANATION=$NEXT_PUBLIC_FEATURE_AI_EXPLANATION
RUN pnpm --filter @jlpt/schema build && pnpm --filter "./packages/*" build && pnpm --filter @jlpt/web build

FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN apk add --no-cache curl && \
    addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone build output
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -fsS http://localhost:3000/healthz || exit 1

CMD ["node", "apps/web/server.js"]
