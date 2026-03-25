# Use the official Playwright image which includes Chromium + all system deps
FROM mcr.microsoft.com/playwright:v1.44.0-jammy AS base

WORKDIR /app

# Install Node.js dependencies
FROM base AS deps
COPY package.json ./
COPY packages/db/package.json ./packages/db/
COPY apps/worker/package.json ./apps/worker/

RUN npm install --workspaces --include-workspace-root

# Generate Prisma client
FROM deps AS prisma
COPY packages/db/prisma ./packages/db/prisma
RUN npx --workspace=packages/db prisma generate

# Build the worker
FROM prisma AS builder
COPY packages/db/src ./packages/db/src
COPY packages/db/tsconfig.json ./packages/db/tsconfig.json
COPY apps/worker/src ./apps/worker/src
COPY apps/worker/tsconfig.json ./apps/worker/tsconfig.json
COPY tsconfig.base.json ./

RUN npm run build -w apps/worker

# Production
FROM base AS runner
ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/worker/dist ./apps/worker/dist
COPY --from=builder /app/packages/db/src ./packages/db/src

CMD ["node", "apps/worker/dist/index.js"]
