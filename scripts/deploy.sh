#!/bin/bash

# Production deployment script for Render
echo "🚀 Starting production deployment..."

# Generate Prisma client
echo "📦 Generating Prisma client..."
npx prisma generate

# Run database migrations
echo "🗃️ Running database migrations..."
npx prisma migrate deploy

# Start the application
echo "🌟 Starting the application..."
exec node dist/server.js
