# Render Deployment Guide

## Deploy to Render

### 1. Connect Repository
1. Go to [render.com](https://render.com)
2. Sign up/Login with GitHub
3. Click "New +" → "Web Service"
4. Connect your GitHub repository

### 2. Configure Service
- **Name**: `storyscope-api`
- **Environment**: `Docker`
- **Dockerfile Path**: `./infra/Dockerfile`
- **Docker Context**: `.` (root directory)

### 3. Add Environment Variables
```
DATABASE_URL=postgres://storyscope:password@db:5432/storyscope
REDIS_URL=redis://cache:6379/0
NLP_URL=http://localhost:8001
PORT=8000
```

### 4. Add Database
1. Go to "New +" → "PostgreSQL"
2. Name: `storyscope-db`
3. Copy connection string to `DATABASE_URL`

### 5. Add Redis
1. Go to "New +" → "Redis"
2. Name: `storyscope-redis`
3. Copy connection string to `REDIS_URL`

### 6. Deploy
Click "Create Web Service" and wait for deployment!

## Alternative: Use render.yaml
1. Push `render.yaml` to your repository
2. Go to Render dashboard
3. Click "New +" → "Blueprint"
4. Connect your repository
5. Render will automatically configure everything!

