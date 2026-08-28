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
COPY apps/appointment-reminder-saas/package.json apps/appointment-reminder-saas/package.json
COPY packages/feature-flags/core/package.json packages/feature-flags/core/package.json
COPY packages/auth/package.json packages/auth/package.json
COPY packages/entitlements/package.json packages/entitlements/package.json
COPY packages/billing/package.json packages/billing/package.json
COPY packages/emails/package.json packages/emails/package.json
COPY packages/analytics/package.json packages/analytics/package.json
COPY packages/landing/package.json packages/landing/package.json
COPY apps/appointment-reminder-saas apps/appointment-reminder-saas
COPY packages/feature-flags/core packages/feature-flags/core
COPY packages/auth packages/auth
COPY packages/entitlements packages/entitlements
COPY packages/billing packages/billing
COPY packages/emails packages/emails
COPY packages/analytics packages/analytics
COPY packages/landing packages/landing

RUN pnpm install --frozen-lockfile \
  --filter ./apps/appointment-reminder-saas... \
  --filter @vibetech/feature-flags-core \
  --filter @vibetech/auth \
  --filter @vibetech/entitlements \
  --filter @vibetech/billing \
  --filter @vibetech/emails \
  --filter @vibetech/analytics \
  --filter @vibetech/landing

RUN cd apps/appointment-reminder-saas && pnpm run build:shared:api && pnpm run build:api

ENV NODE_ENV=production
ENV HOST=0.0.0.0

EXPOSE 3000

CMD ["sh", "-c", "cd apps/appointment-reminder-saas && pnpm run start:api"]
