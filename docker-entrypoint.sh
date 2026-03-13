#!/bin/sh
set -e

PRISMA="node ./node_modules/prisma/build/index.js"

echo "Running database migrations..."
$PRISMA migrate deploy

echo "Seeding database..."
node ./prisma/seed.js || true

echo "Starting application..."
exec "$@"
