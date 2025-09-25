# Vercel Deployment Guide for StoryScope

## Prerequisites
1. Vercel account (sign up at vercel.com)
2. Vercel CLI installed: `npm i -g vercel`
3. PostgreSQL database (we'll use Vercel Postgres or external service)

## Step 1: Prepare the Project

The project is already configured for Vercel deployment with:
- `vercel.json` - Main configuration
- `api/index.js` - Serverless function entry point
- `apps/web/vercel.json` - Frontend build config
- `.vercelignore` - Files to exclude

## Step 2: Set up Database

### Option A: Vercel Postgres (Recommended)
1. Go to Vercel Dashboard → Your Project → Storage
2. Create a new Postgres database
3. Note the connection details

### Option B: External Database (Railway, Supabase, etc.)
1. Create a PostgreSQL database
2. Get the connection URL

## Step 3: Deploy to Vercel

### Method 1: Using Vercel CLI
```bash
# Install dependencies
npm install

# Login to Vercel
vercel login

# Deploy
vercel

# Set environment variables
vercel env add DATABASE_URL
vercel env add JWT_SECRET
vercel env add NODE_ENV
```

### Method 2: Using Vercel Dashboard
1. Go to vercel.com/dashboard
2. Click "New Project"
3. Import your Git repository
4. Vercel will auto-detect the configuration

## Step 4: Environment Variables

Set these in Vercel Dashboard → Project → Settings → Environment Variables:

### Required Variables:
```
DATABASE_URL=postgresql://username:password@host:port/database
JWT_SECRET=your-super-secret-jwt-key-here
NODE_ENV=production
```

### Optional Variables:
```
NLP_URL=http://your-nlp-service-url (if using external NLP)
HTTP_TIMEOUT_MS=10000
```

## Step 5: Database Setup

The database will be automatically initialized on first API call. Tables created:
- `users` - User accounts and authentication
- `stories` - Story estimates and data

## Step 6: Test Deployment

1. Visit your Vercel URL (e.g., `https://your-project.vercel.app`)
2. Test the health endpoint: `https://your-project.vercel.app/api/health`
3. Sign up for a new account
4. Submit a test story
5. Check the dashboard

## Project Structure for Vercel

```
/
├── api/
│   └── index.js          # Serverless function entry point
├── apps/
│   ├── api/              # Backend code (shared with serverless)
│   └── web/              # Frontend React app
├── vercel.json           # Vercel configuration
├── package.json          # Root dependencies
└── .vercelignore         # Files to exclude
```

## API Endpoints

All API endpoints are prefixed with `/api/`:
- `GET /api/health` - Health check
- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `POST /api/estimate` - Estimate story complexity
- `GET /api/stories` - List user stories
- `GET /api/stats` - User statistics
- `GET /api/report.csv` - Download CSV report
- `GET /api/admin/users` - Admin: List users (admin only)

## Troubleshooting

### Common Issues:

1. **Database Connection Error**
   - Check DATABASE_URL format
   - Ensure database is accessible from Vercel
   - Verify credentials

2. **Build Failures**
   - Check Node.js version (requires 18+)
   - Verify all dependencies are in package.json
   - Check build logs in Vercel dashboard

3. **API 500 Errors**
   - Check function logs in Vercel dashboard
   - Verify environment variables are set
   - Check database connectivity

4. **Frontend Not Loading**
   - Verify build completed successfully
   - Check if dist folder exists
   - Verify vercel.json routes configuration

### Debug Commands:
```bash
# Check Vercel logs
vercel logs

# Check function logs
vercel logs --follow

# Redeploy
vercel --prod
```

## Production Checklist

- [ ] Environment variables set
- [ ] Database connected and accessible
- [ ] Health endpoint returns 200
- [ ] User registration works
- [ ] Story estimation works
- [ ] Frontend loads correctly
- [ ] All API endpoints respond
- [ ] CSV export works
- [ ] Admin functions work (if applicable)

## Next Steps

1. Set up custom domain (optional)
2. Configure monitoring and alerts
3. Set up CI/CD with GitHub integration
4. Add rate limiting and security headers
5. Implement backup strategies for database
