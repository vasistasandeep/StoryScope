# DigitalOcean App Platform Deployment

## Deploy to DigitalOcean App Platform

### 1. Prepare Repository
1. Push all changes to GitHub
2. Ensure `docker-compose.prod.yml` is in root directory

### 2. Create App on DigitalOcean
1. Go to [DigitalOcean App Platform](https://cloud.digitalocean.com/apps)
2. Click "Create App"
3. Connect your GitHub repository
4. Select your StoryScope repository

### 3. Configure Services

#### API Service
- **Type**: Web Service
- **Source**: Your repository
- **Dockerfile Path**: `infra/Dockerfile`
- **HTTP Port**: 8000
- **Health Check**: `/health`

#### Database
- **Type**: Database
- **Engine**: PostgreSQL
- **Plan**: Basic ($12/month)
- **Name**: `storyscope-db`

#### Redis
- **Type**: Database  
- **Engine**: Redis
- **Plan**: Basic ($15/month)
- **Name**: `storyscope-redis`

### 4. Environment Variables
```yaml
DATABASE_URL: ${db.CONNECTIONSTRING}
REDIS_URL: ${redis.CONNECTIONSTRING}
NLP_URL: http://nlp:8001
PORT: 8000
NODE_ENV: production
```

### 5. Deploy
Click "Create Resources" and wait for deployment!

## Cost Estimate
- **App Platform**: $5/month (Basic)
- **PostgreSQL**: $12/month (Basic)
- **Redis**: $15/month (Basic)
- **Total**: ~$32/month

