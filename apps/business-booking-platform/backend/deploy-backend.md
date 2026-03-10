# Deploy Backend for Faster Performance

## Quick Deploy to Railway (5 minutes)

1. **Go to**: <https://railway.app>
2. **Sign in** with GitHub
3. **New Project** → "Deploy from GitHub repo"
4. **Select**: Your hotelbooking repo
5. **Configure**:
   - Root Directory: `backend`
   - Start Command: `node server-minimal.cjs`
6. **Get URL**: Like `your-app.railway.app`

## Quick Deploy to Render (Alternative)

1. **Go to**: <https://render.com>
2. **New** → Web Service
3. **Connect** GitHub repo
4. **Settings**:
   - Root: `backend`
   - Build: `npm install`
   - Start: `node server-minimal.cjs`
5. **Deploy**

## Update Frontend with Backend URL

Once backend is deployed:

1. Create `.env.production.local`:

```env
VITE_API_URL=https://your-backend.railway.app
```

1. Rebuild: `npm run build`
2. Redeploy to Netlify

## Benefits of Deployed Backend

- Even faster search (no timeout needed)
- Real booking storage
- Payment processing ready
- Analytics tracking
- Customer data management
