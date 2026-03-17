#!/bin/sh
set -e

echo "Running Prisma db push..."
cd /app/apps/api
node ../../node_modules/.bin/prisma db push --skip-generate --accept-data-loss 2>&1 || echo "WARNING: prisma db push failed, continuing anyway..."
cd /app

echo "Starting server..."
exec node apps/api/dist/server.js
