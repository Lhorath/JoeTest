#!/bin/sh

echo "⚠️ ⚠️ ⚠️  WARNING  ⚠️ ⚠️ ⚠️"
echo "You are about to RESET the local infrastructure for TheQueue!"
echo "This action will permanently DELETE all local PostgreSQL database content, cached Redis queues, and local MinIO S3 media uploads!"
echo ""
echo "Press ENTER to proceed with the deletion, or Ctrl+C to abort."
read -r CONFIRM

echo "Destroying containers and volumes..."
docker compose -f infrastructure/docker/docker-compose.yml down -v

echo "Creating fresh new containers and volumes..."
docker compose -f infrastructure/docker/docker-compose.yml up -d

echo "✅ TheQueue infrastructure has been completely reset!"
