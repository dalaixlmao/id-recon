#!/bin/bash

# Production deployment script for Render
echo "🚀 Starting production deployment..."

# Exit on any error
set -e

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL environment variable is not set"
    exit 1
fi

# Generate Prisma client
echo "📦 Generating Prisma client..."
npx prisma generate

# Run database migrations
echo "🗃️ Running database migrations..."
npx prisma migrate deploy

# Verify the build exists
if [ ! -f "dist/server.js" ]; then
    echo "❌ ERROR: Build not found at dist/server.js"
    exit 1
fi

# Start the application
echo "🌟 Starting the application..."
exec node dist/server.js
