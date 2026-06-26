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
COPY apps/ai-avatar-youtube-saas/package.json apps/ai-avatar-youtube-saas/package.json
COPY apps/ai-avatar-youtube-saas/src apps/ai-avatar-youtube-saas/src
COPY apps/ai-avatar-youtube-saas/tsconfig.json apps/ai-avatar-youtube-saas/tsconfig.json
COPY apps/ai-avatar-youtube-saas/tsconfig.lint.json apps/ai-avatar-youtube-saas/tsconfig.lint.json
COPY apps/ai-avatar-youtube-saas/next.config.ts apps/ai-avatar-youtube-saas/next.config.ts
COPY apps/ai-avatar-youtube-saas/postcss.config.mjs apps/ai-avatar-youtube-saas/postcss.config.mjs
COPY apps/ai-avatar-youtube-saas/components.json apps/ai-avatar-youtube-saas/components.json
COPY apps/ai-avatar-youtube-saas/vitest.config.mts apps/ai-avatar-youtube-saas/vitest.config.mts
COPY packages/db-app packages/db-app
COPY packages/shared-config packages/shared-config

RUN pnpm install --no-frozen-lockfile \
  --filter ./apps/ai-avatar-youtube-saas... \
  --filter @vibetech/db-app \
  --filter @vibetech/shared-config

RUN cd apps/ai-avatar-youtube-saas && pnpm run build

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

EXPOSE 3000

CMD ["sh", "-c", "cd apps/ai-avatar-youtube-saas && pnpm run start"]
