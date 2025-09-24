# Multi-stage build for production deployment
FROM node:20-alpine AS base

# Install docker-compose
RUN apk add --no-cache docker-compose

WORKDIR /app

# Copy all files
COPY . .

# Expose ports
EXPOSE 8000 8001 5432 6379

# Default command
CMD ["docker-compose", "-f", "infra/docker-compose.yml", "up", "--build"]

