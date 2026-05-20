# 🚀 DEPLOY-READY CONFIGURATION

## Your Domain: vibe-tech.org ✅ (August 2025)

- **Domain**: vibe-tech.org
- **Registrar**: IONOS (not Cloudflare)
- **Cost**: $25 (August 2025 pricing)
- **Status**: Active and configured

## DEPLOYMENT STATUS ✅

### Backend - Railway (target)

- **Service**: vibe-tech-lovable backend
- **URL**: <https://api.vibe-tech.org>
- **Status**: Pending Railway redeploy and DNS verification
- **Health Check**: `/api/health`
- **Custom Domain**: `api.vibe-tech.org`

### Frontend - Vercel (DEPLOYING)

- **Project**: vibe-tech
- **Status**: 🔄 Currently deploying
- **Repository**: freshwaterbruce2/vibetech
- **Environment Variables**: ✅ Configured with Railway backend URL

---

## 🔧 RAILWAY BACKEND DEPLOYMENT

### Environment Variables (Copy these to Railway)

```env
NODE_ENV=production
HOST=0.0.0.0
ALLOWED_ORIGINS=https://vibe-tech.org,https://www.vibe-tech.org
```

Railway injects `PORT`; do not hard-code it. The service must listen on that `PORT` and bind
`HOST=0.0.0.0`. The configured health check path is `/api/health`.

### Railway Deployment Steps

1. Go to railway.app
2. "Deploy from GitHub repo"
3. Select this app as the service root, or run the monorepo-root fallback command from
   `apps/vibe-tech-lovable/railway.json`
4. Set environment variables above
5. Confirm `GET https://api.vibe-tech.org/api/health` returns JSON with
   `"app": "vibe-tech-lovable"`

---

## 🌐 VERCEL FRONTEND DEPLOYMENT  

### Environment Variables (Copy to Vercel)

```env
VITE_API_URL=https://api.vibe-tech.org
```

### Vercel Deployment Steps

1. Go to vercel.com
2. "Import project" from GitHub
3. Select your repo (root folder)
4. Framework: Vite
5. Build command: npm run build
6. Output directory: dist
7. Set environment variable above
8. Deploy

---

## 🔗 DNS CONFIGURATION

### In Cloudflare DNS (after domain registration)

```
Type: A
Name: @
Content: [Copy from Vercel deployment]
TTL: Auto

Type: CNAME
Name: www  
Content: vibe-tech.org
TTL: Auto

Type: CNAME
Name: api
Content: [Copy from Railway deployment]
TTL: Auto
```

---

## ✅ FINAL CHECKLIST

After domain registration:

- [x] Replace "YOUR-DOMAIN-HERE" with actual domain: vibe-tech.org
- [ ] Deploy backend to Railway 
- [ ] Deploy frontend to Vercel
- [ ] Configure DNS records
- [ ] Test: <https://vibe-tech.org>
- [ ] Test API: <https://api.vibe-tech.org/api/health>
- [ ] Test blog: <https://vibe-tech.org/blog-editor>

**ESTIMATED TOTAL TIME: 30 minutes after domain registration**
