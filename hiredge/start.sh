#!/bin/sh
set -e

echo "Running Prisma db push..."
cd /app/apps/api
npx prisma db push --skip-generate
cd /app

echo "Starting server..."
exec node apps/api/dist/server.js
