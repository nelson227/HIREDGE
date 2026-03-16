FROM node:20-alpine AS base
WORKDIR /app

# Install all dependencies
FROM base AS deps
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/
RUN npm ci

# Build shared package
FROM deps AS shared-build
COPY packages/shared/ ./packages/shared/
RUN cd packages/shared && npm run build

# Build API
FROM deps AS api-build
COPY apps/api/ ./apps/api/
COPY packages/shared/ ./packages/shared/
COPY --from=shared-build /app/packages/shared/dist ./packages/shared/dist
RUN cd apps/api && npx prisma generate
RUN cd apps/api && npm run build

# Prod dependencies only
FROM base AS prod-deps
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/
RUN npm ci --omit=dev

# Production image
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 hiredge

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=prod-deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=api-build /app/apps/api ./apps/api
COPY --from=shared-build /app/packages/shared ./packages/shared

USER hiredge

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["node", "apps/api/dist/server.js"]
