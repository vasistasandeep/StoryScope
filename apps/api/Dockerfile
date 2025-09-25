FROM node:20-alpine

WORKDIR /app

# Copy entire monorepo
COPY . .

# Build frontend
RUN npm ci --prefix apps/web \
    && npm run build --prefix apps/web

# Install backend dependencies (production)
RUN npm ci --omit=dev --prefix apps/api

WORKDIR /app/apps/api

ENV NODE_ENV=production

EXPOSE 8000
CMD ["node", "server.cjs"]