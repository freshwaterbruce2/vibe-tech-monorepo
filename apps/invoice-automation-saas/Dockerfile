# InvoiceFlow Production Dockerfile
# Multi-stage build for minimal final image

# ─── Stage 1: Build ───
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package.json ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# Copy source
COPY . .

# Build frontend
RUN pnpm exec vite build

# Build backend
RUN cd server && npx tsc -p tsconfig.json

# ─── Stage 2: Production ───
FROM node:22-alpine AS production

WORKDIR /app

# Install production dependencies only
COPY package.json ./
RUN npm install -g pnpm && pnpm install --prod --frozen-lockfile

# Copy built artifacts
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/server/src/migrations ./server/src/migrations

# Create data directory for SQLite
RUN mkdir -p /data && chown node:node /data

ENV NODE_ENV=production
ENV PORT=8787
ENV HOST=0.0.0.0
ENV DATABASE_PATH=/data/invoiceflow.db
ENV SERVE_WEB=1
ENV WEB_DIST_DIR=/app/dist

EXPOSE 8787

USER node

CMD ["node", "server/dist/index.js"]
