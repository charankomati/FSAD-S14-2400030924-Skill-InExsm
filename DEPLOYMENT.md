# Deployment Guide - Render with PostgreSQL

## 🗄️ Database Setup

### Local Development (SQLite)

1. **Install Prisma CLI**:
   ```bash
   npm install -D prisma
   ```

2. **Create database**:
   ```bash
   npm run prisma:push
   ```

3. **Verify it works**:
   - The `.env` file uses `file:./auranutrics.db` (SQLite local database)
   - Run `npm run dev` to start server with local database

### Production on Render (PostgreSQL)

Render provides automatic PostgreSQL databases.

## Prerequisites
- GitHub account with your code pushed to: `https://github.com/charankomati/FSAD`
- Render account: https://render.com (sign up with GitHub)
- Google Gemini API key

## Step 1: Get Your Gemini API Key
1. Go to https://ai.google.dev/
2. Click "Get API Key"
3. Create a new API key
4. Copy the key

## Step 2: Deploy on Render with Database

### Option A: Web Dashboard (Recommended)

1. Go to https://render.com/dashboard
2. Click **"New +"** → **"PostgreSQL"**
   - **Name**: `auranutrics-db`
   - **Database Name**: `auranutrics`
   - Keep other defaults
   - Click **Create Database**
3. Copy the **Internal Database URL** (you'll need this)

4. Click **"New +"** → **"Web Service"**
5. Select **"Deploy from a Git repository"**
6. Authorize GitHub and select `charankomati/FSAD`
7. Configure the service:
   - **Name**: `auranutrics`
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run prisma:push && npm run build`
   - **Start Command**: `npm start`
   - **Instance Type**: Free tier

8. Add Environment Variables:
   - `NODE_ENV` = `production`
   - `GEMINI_API_KEY` = `<your-api-key>`
   - `DATABASE_URL` = `<database-url-from-postgresql-service>`

9. Click **Create Web Service**

Wait 5-10 minutes for deployment...

### Option B: Using render.yaml (Automatic)

1. The `render.yaml` file in the repo automatically sets up both web service and database
2. Push to GitHub
3. Go to https://render.com/dashboard
4. Click **"New +"** → **"Web Service"**
5. Select your GitHub repo
6. Render auto-detects and uses `render.yaml`
7. Add these environment variables:
   - `GEMINI_API_KEY` = your API key
   - `DATABASE_URL` = your PostgreSQL URL from the created database service
8. Deploy!

## Step 3: Verify Database Connection

Check deployment logs in Render:
1. Go to your `auranutrics` web service
2. Click **Logs**
3. Look for: `AuraNutrics Server running on port 3000`
4. No database errors = success ✅

## Step 4: Test Your App

1. Visit your deployed URL (e.g., `https://auranutrics-xxxxx.onrender.com`)
2. Login with:
   - Email: any email
   - Password: `aura2026`
3. Profile should show: **Charan**, 18, 168cm, 66kg
4. Create a meal entry - it should save to the database!

## 🔄 Database Schema

Your app has these database tables:
- **Users**: Profile information
- **Meals**: Food entries with nutrition data
- **Notifications**: System alerts
- **UserSettings**: User preferences
- **Cohorts**: Population health data
- **RDAStandards**: Nutritional reference values

All automatically created and synced by Prisma!

## Troubleshooting

### Database Connection Failed
- Check `DATABASE_URL` environment variable is set
- Verify PostgreSQL service is running
- Check logs for specific error

### Build Command Fails
```bash
# Ensure Prisma can generate client:
npm run prisma:generate

# Push schema to database:
npm run prisma:push
```

### Data Persists After Redeploy
- ✅ PostgreSQL service keeps data permanently
- Data survives web service restarts
- Only deleted if you manually drop the database

### Free Tier Issues
- Web service hibernates after 15 mins (PostgreSQL doesn't)
- Visit URL to wake up web service
- Upgrade to paid tier for always-on service

## Updating Your App

1. Make changes locally
2. Test with local database: `npm run dev`
3. Commit and push: `git push origin main`
4. Render automatically:
   - Runs build and migrations
   - Updates database schema if needed
   - Redeploys web service
5. Check **Deployments** tab for status

## Useful Commands

```bash
# Local development
npm install
npm run prisma:push
npm run dev

# View database GUI
npx prisma studio

# Check migrations status
npx prisma migrate status

# View database URL (Render)
# In Render dashboard → PostgreSQL service → URL
```

## Environment Variables Summary

```env
# Application
NODE_ENV=production
PORT=3000

# API
GEMINI_API_KEY=AIzaSyDt38kHd09nCNfxYWSbkSKiDjUi3QDZh1U

# Database (Render PostgreSQL)
DATABASE_URL=postgresql://user:password@host:5432/auranutrics
```

---

**Your Live App**: https://auranutrics-xxxxx.onrender.com  
**Render Console**: https://render.com/dashboard  
**Prisma Docs**: https://www.prisma.io/docs  
**GitHub Repo**: https://github.com/charankomati/FSAD
