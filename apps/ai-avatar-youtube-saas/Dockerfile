# AI Avatar YouTube Studio - Multi-stage Production Dockerfile
FROM node:22-bookworm-slim AS builder

WORKDIR /app

# Install native build toolchain for better-sqlite3 compilation
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

COPY package.json ./
RUN npm install --legacy-peer-deps

COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV SKIP_ENV_VALIDATION=true

RUN npm run build

# ─── Production Stage ───
FROM node:22-bookworm-slim AS runner

WORKDIR /app

RUN apt-get update && apt-get install -y wget curl && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /data

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Next.js standalone binds with HOSTNAME (Docker sets this to the container id by default).
ENV HOSTNAME=0.0.0.0
ENV HOST=0.0.0.0
ENV PORT=3000
ENV APP_DB_PATH=/data/ai-avatar.db

# Standalone output includes minimal server.js and bundled dependencies
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/.next/static ./apps/ai-avatar-youtube-saas/.next/static
COPY --from=builder /app/public ./apps/ai-avatar-youtube-saas/public

EXPOSE 3000

CMD ["sh", "-c", "target=$(find /app -name server.js | grep -v 'node_modules' | head -n 1); if [ -n \"$target\" ]; then echo \"Starting Next.js standalone from $target\"; cd $(dirname \"$target\") && node server.js; else echo \"server.js not found outside node_modules\"; find /app; exit 1; fi"]
