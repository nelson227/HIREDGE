FROM node:20-alpine AS base
RUN apk add --no-cache openssl
WORKDIR /app

# Install all dependencies
FROM base AS deps
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY apps/mobile/package.json ./apps/mobile/
COPY packages/shared/package.json ./packages/shared/
RUN npm install --no-audit --no-fund

# Build shared package
FROM deps AS shared-build
COPY tsconfig.json ./
COPY packages/shared/ ./packages/shared/
RUN cd packages/shared && npm run build

# Build API
FROM deps AS api-build
COPY tsconfig.json ./
COPY apps/api/ ./apps/api/
COPY packages/shared/ ./packages/shared/
COPY --from=shared-build /app/packages/shared/dist ./packages/shared/dist
RUN cd apps/api && npx prisma generate
RUN cd apps/api && npm run build

# Prod dependencies only
FROM base AS prod-deps
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY apps/mobile/package.json ./apps/mobile/
COPY packages/shared/package.json ./packages/shared/
RUN npm install --omit=dev --no-audit --no-fund

# Production image
FROM node:20-alpine AS runner
RUN apk add --no-cache openssl
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 hiredge

# Create uploads directory for fastify-static
RUN mkdir -p /app/uploads && chown hiredge:nodejs /app/uploads

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=prod-deps /app/apps/api/node_modules ./apps/api/node_modules
# Copy generated Prisma client (prisma generate ran in api-build, not in prod-deps)
COPY --from=api-build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=api-build /app/apps/api ./apps/api
COPY --from=shared-build /app/packages/shared ./packages/shared
# COPY follows symlinks so @hiredge/shared in node_modules lost its link to packages/shared
# Copy the built dist explicitly so require('@hiredge/shared') resolves correctly
COPY --from=shared-build /app/packages/shared/dist ./node_modules/@hiredge/shared/dist

# Startup script: run prisma db push then start server
COPY start.sh ./start.sh
RUN chmod +x start.sh && sed -i 's/\r$//' start.sh

# Prisma needs a writable home for its cache
ENV HOME=/tmp

USER hiredge

EXPOSE 8080

CMD ["sh", "start.sh"]
