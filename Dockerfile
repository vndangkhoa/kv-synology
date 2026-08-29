# syntax=docker/dockerfile:1.6
# KV Synology — Next.js 15 standalone Docker image (GPL-3.0)
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=8088
ENV HOSTNAME=0.0.0.0

RUN apk add --no-cache libc6-compat \
 && addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

# Copy prebuilt Next.js 15 standalone server & public assets
COPY --chown=nextjs:nodejs .next/standalone ./
COPY --chown=nextjs:nodejs .next/static ./.next/static
COPY --chown=nextjs:nodejs public ./public
COPY LICENSE ./LICENSE

USER nextjs
EXPOSE 8088

# Next.js standalone entrypoint
CMD ["node", "server.js"]
