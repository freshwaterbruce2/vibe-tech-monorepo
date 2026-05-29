FROM node:22-bookworm-slim AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
ENV PUPPETEER_SKIP_DOWNLOAD=true

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

FROM base AS build

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY patches ./patches
COPY apps/vibe-booking-backend/package.json apps/vibe-booking-backend/package.json
COPY packages/feature-flags/core/package.json packages/feature-flags/core/package.json
COPY packages/auth/package.json packages/auth/package.json
COPY packages/monetization/package.json packages/monetization/package.json
COPY packages/billing/package.json packages/billing/package.json
COPY packages/payments/package.json packages/payments/package.json
COPY packages/emails/package.json packages/emails/package.json
COPY packages/email/package.json packages/email/package.json
COPY packages/analytics/package.json packages/analytics/package.json
COPY packages/ai/package.json packages/ai/package.json
COPY packages/landing/package.json packages/landing/package.json
COPY apps/vibe-booking-backend apps/vibe-booking-backend
COPY packages/feature-flags/core packages/feature-flags/core
COPY packages/auth packages/auth
COPY packages/monetization packages/monetization
COPY packages/billing packages/billing
COPY packages/payments packages/payments
COPY packages/emails packages/emails
COPY packages/email packages/email
COPY packages/analytics packages/analytics
COPY packages/ai packages/ai
COPY packages/landing packages/landing

RUN pnpm install --frozen-lockfile \
  --filter ./apps/vibe-booking-backend... \
  --filter @vibetech/feature-flags-core \
  --filter @vibetech/auth \
  --filter @vibetech/monetization \
  --filter @vibetech/billing \
  --filter @vibetech/payments \
  --filter @vibetech/emails \
  --filter @vibetech/email \
  --filter @vibetech/analytics \
  --filter @vibetech/ai \
  --filter @vibetech/landing

RUN cd apps/vibe-booking-backend && pnpm run build:shared:api && pnpm run build:api

ENV NODE_ENV=production
ENV HOST=0.0.0.0

EXPOSE 3000

CMD ["sh", "-c", "cd apps/vibe-booking-backend && pnpm run start:api"]
