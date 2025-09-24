# Root Dockerfile for Railway deployment
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY apps/api/package.json apps/api/package-lock.json* ./

# Install dependencies
RUN npm install --omit=dev

# Copy the entire project
COPY . .

# Set working directory to API
WORKDIR /app/apps/api

# Expose port
EXPOSE 8000

# Start command
CMD ["node", "server.cjs"]
