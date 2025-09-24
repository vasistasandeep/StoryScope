# Railway Deployment Guide

## Quick Deploy to Railway

### 1. Install Railway CLI
```bash
npm install -g @railway/cli
```

### 2. Login to Railway
```bash
railway login
```

### 3. Initialize Project
```bash
railway init
```

### 4. Deploy
```bash
railway up
```

### 5. Set Environment Variables
```bash
railway variables set DATABASE_URL=postgres://storyscope:password@db:5432/storyscope
railway variables set REDIS_URL=redis://cache:6379/0
railway variables set NLP_URL=http://nlp:8001
railway variables set PORT=8000
```

### 6. Get Your URL
```bash
railway domain
```

## Manual Railway Setup

1. Go to [railway.app](https://railway.app)
2. Connect your GitHub repository
3. Select "Deploy from GitHub"
4. Choose your StoryScope repository
5. Railway will automatically detect the `railway.json` config
6. Add environment variables in the dashboard
7. Deploy!

## Environment Variables Needed:
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string  
- `NLP_URL`: Internal NLP service URL
- `PORT`: Port for API service (8000)

