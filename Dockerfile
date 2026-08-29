# syntax=docker/dockerfile:1.6
# KV Synology — Next.js 15 standalone Docker image (GPL-3.0)
# Multi-stage: deps -> builder -> runner (non-root, minimal)

FROM node:20-alpine AS base
WORKDIR /app

# --- deps: install with lockfile for reproducibility ---
FROM base AS deps
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --prefer-offline --no-audit --no-fund

# --- builder: build Next.js ---
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Ensure public exists (Next.js standalone expects it, but project has no public dir)
RUN mkdir -p ./public
# Next.js standalone output — enabled via next.config.ts
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# --- runner: minimal production image ---
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Default port matches package.json scripts (8088). Override with PORT env.
ENV PORT=8088
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

# Copy standalone + static assets (requires output: "standalone" in next.config)
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Include full GPL-3.0 license text as required when distributing binaries
COPY --from=builder /app/LICENSE ./LICENSE

USER nextjs
EXPOSE 8088

# next.js standalone server
CMD ["node", "server.js"]
