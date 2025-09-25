# Root Dockerfile for Railway deployment (builds web and runs API)
FROM node:20-alpine

WORKDIR /app

# Copy repo
COPY . .

# Build frontend
RUN npm ci --prefix apps/web \
    && npm run build --prefix apps/web

# Install backend deps (prod)
RUN npm ci --omit=dev --prefix apps/api

WORKDIR /app/apps/api

EXPOSE 8000
CMD ["node", "server.cjs"]
