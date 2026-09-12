# InvoiceFlow Standalone Production Dockerfile
FROM node:22-bookworm-slim AS builder

WORKDIR /app

# Install build dependencies for better-sqlite3 native compilation
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

COPY package.json ./
RUN npm install

COPY . .

# Build frontend and server
RUN npm run build
RUN npm run build:api

# ─── Production Stage ───
FROM node:22-bookworm-slim AS runner

WORKDIR /app

RUN apt-get update && apt-get install -y wget && rm -rf /var/lib/apt/lists/*

COPY package.json ./
RUN npm install --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/server/src/migrations ./server/src/migrations

RUN mkdir -p /data

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=8787
ENV DATABASE_PATH=/data/invoiceflow.db
ENV SERVE_WEB=1
ENV WEB_DIST_DIR=/app/dist

EXPOSE 8787

CMD ["node", "server/dist/index.js"]
