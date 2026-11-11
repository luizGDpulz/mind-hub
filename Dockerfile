# Stage 1: Multi-Arch Native Builder (compiles TS + Vite without QEMU emulation overhead)
FROM --platform=$BUILDPLATFORM node:24-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@12.9.1 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/shared/package.json ./packages/shared/package.json
COPY apps/server/package.json ./apps/server/package.json
COPY apps/web/package.json ./apps/web/package.json

RUN pnpm install --frozen-lockfile

COPY packages ./packages
COPY apps ./apps

RUN pnpm run build && \
    pnpm --filter @mind-hub/server deploy --prod --legacy /prod/server

# Stage 2: Minimal Hardened Production Runtime (Non-Root)
FROM node:24-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3333 \
    STATIC_DIR=/app/public \
    DATA_FILE_PATH=/app/data/mind-hub-store.json

RUN mkdir -p /app/data && chown -R node:node /app/data

COPY --from=builder --chown=node:node /prod/server/package.json ./package.json
COPY --from=builder --chown=node:node /prod/server/node_modules ./node_modules
COPY --from=builder --chown=node:node /prod/server/dist ./dist
COPY --from=builder --chown=node:node /app/apps/web/dist ./public

USER node

EXPOSE 3333

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || '3333') + '/healthz').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "dist/index.js"]
