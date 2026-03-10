# Production Deployment Guide

## Pre-Launch Checklist

### 1. API Keys & Credentials (CRITICAL)

**Square Payment Setup:**

1. Create Square Production account at <https://developer.squareup.com/>
2. Generate Production Application ID and Access Token
3. Set up webhook endpoint in Square Dashboard: `https://yourdomain.com/api/webhooks/square`
4. Note down Location ID from Square Dashboard

**External API Keys:**

- **LiteAPI**: Get production key from <https://www.liteapi.travel/>
- **OpenAI**: Upgrade to production tier at <https://platform.openai.com/>
- **SendGrid**: Set up account for transactional emails at <https://sendgrid.com/>

### 2. Environment Configuration

**Frontend (.env.production):**

```bash
VITE_API_URL=https://api.yourdomain.com
VITE_SQUARE_APPLICATION_ID=sq0idp-YOUR_PRODUCTION_APP_ID
VITE_SQUARE_LOCATION_ID=YOUR_PRODUCTION_LOCATION_ID
VITE_SQUARE_ENVIRONMENT=production
VITE_OPENAI_API_KEY=sk-YOUR_OPENAI_PRODUCTION_KEY
VITE_LITEAPI_KEY=YOUR_LITEAPI_PRODUCTION_KEY
```

**Backend (.env):**

```bash
NODE_ENV=production
DATABASE_URL=postgresql://username:password@host:5432/database
SQUARE_ACCESS_TOKEN=YOUR_SQUARE_PRODUCTION_ACCESS_TOKEN
SQUARE_WEBHOOK_SIGNATURE_KEY=YOUR_WEBHOOK_SIGNATURE_KEY
JWT_SECRET=YOUR_64_CHARACTER_SECRET
SENDGRID_API_KEY=YOUR_SENDGRID_API_KEY
```

### 3. Database Setup

**Option A: PostgreSQL (Recommended for production)**

1. Set up PostgreSQL instance (AWS RDS, Google Cloud SQL, or self-hosted)
2. Run migration script: `psql -d your_database -f backend/migrations/001_initial_schema.sql`
3. Create database backups schedule

**Option B: SQLite (For smaller scale)**

1. Ensure disk space for database file
2. Set up regular backups of the SQLite file

### 4. Hosting Setup

**Frontend Deployment (Vercel - Recommended):**

1. Install Vercel CLI: `npm i -g vercel`
2. Deploy: `vercel --prod`
3. Configure environment variables in Vercel dashboard
4. Set up custom domain in Vercel settings

**Alternative Frontend Hosting:**

- **Netlify**: Drag & drop `dist/` folder after `npm run build`
- **AWS S3 + CloudFront**: Upload build files to S3, configure CloudFront

**Backend Deployment Options:**

**Option A: Railway (Easiest)**

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway init
railway up
```

**Option B: Render**

1. Connect GitHub repository
2. Set environment variables
3. Deploy from dashboard

**Option C: Heroku**

```bash
# Install Heroku CLI
heroku create your-app-name
heroku config:set NODE_ENV=production
heroku config:set DATABASE_URL=your_database_url
git push heroku main
```

### 5. Domain & SSL Setup

1. **Purchase Domain**: Register domain (GoDaddy, Namecheap, etc.)
2. **Configure DNS**:
   - Point domain to frontend hosting (Vercel/Netlify)
   - Create subdomain for API: `api.yourdomain.com` → Backend hosting
3. **SSL Certificates**: Most hosting providers auto-generate SSL certificates

### 6. Payment Webhook Configuration

1. Go to Square Developer Dashboard
2. Navigate to Webhooks section
3. Add webhook URL: `https://api.yourdomain.com/api/webhooks/square`
4. Select events:
   - `payment.created`
   - `payment.updated`
   - `refund.created`
   - `customer.created`
5. Test webhook with sample events

### 7. Email Setup

**SendGrid Configuration:**

1. Create SendGrid account
2. Create API key with Mail Send permissions
3. Set up domain authentication for better deliverability
4. Create email templates in SendGrid dashboard

### 8. Monitoring & Analytics

**Error Tracking (Sentry):**

```bash
npm install @sentry/node @sentry/react
```

Add to backend and frontend

**Analytics:**

- Set up Google Analytics 4
- Configure conversion tracking for bookings
- Set up Google Search Console

**Uptime Monitoring:**

- UptimeRobot (free tier available)
- Pingdom
- Monitor both frontend and API endpoints

### 9. Security Hardening

**Backend Security:**

1. Generate strong JWT secrets (64+ characters)
2. Enable CORS for your domain only
3. Set up rate limiting
4. Enable security headers (Helmet.js)
5. Regular security updates

**Database Security:**

1. Use strong passwords
2. Enable SSL connections
3. Restrict access by IP
4. Regular backups

### 10. Performance Optimization

**Frontend:**

- Enable CDN (automatically handled by Vercel/Netlify)
- Optimize images (use WebP format)
- Enable gzip compression
- Monitor Core Web Vitals

**Backend:**

- Enable Redis caching for hotel data
- Database query optimization
- API response caching
- Load balancing for high traffic

## Deployment Commands

**Frontend Build & Deploy:**

```bash
# Build production bundle
npm run build

# Deploy to Vercel
vercel --prod

# Or deploy to Netlify
npm install -g netlify-cli
netlify deploy --prod --dir=dist
```

**Backend Deploy:**

```bash
# Build TypeScript
npm run build

# Deploy to Railway
railway up

# Or deploy to Heroku
git push heroku main
```

## Post-Launch Checklist

### Week 1: Monitoring

- [ ] Check error rates in monitoring tools
- [ ] Verify payment processing works end-to-end
- [ ] Monitor API response times
- [ ] Check email delivery rates
- [ ] Verify webhook processing

### Week 2: Optimization

- [ ] Analyze user behavior with analytics
- [ ] Optimize slow API endpoints
- [ ] Review and optimize database queries
- [ ] Test load handling with traffic spikes

### Ongoing: Growth & Maintenance

- [ ] Weekly backup verification
- [ ] Monthly security updates
- [ ] Quarterly performance reviews
- [ ] Regular API key rotation

## Revenue Tracking

**Commission Tracking:**

- Monitor booking completion rates
- Track average booking values
- Calculate monthly recurring revenue
- Set up alerts for revenue drops

**Expected Metrics:**

- 100 bookings/month @ $200 avg = $1,000 commission (5%)
- 500 bookings/month @ $200 avg = $5,000 commission
- 1000 bookings/month @ $200 avg = $10,000 commission

## Support & Maintenance

**Emergency Contacts:**

- Hosting provider support numbers
- Payment provider support
- Database provider support

**Backup Strategy:**

- Daily database backups
- Weekly full system backups
- Monthly backup restore tests

**Update Schedule:**

- Security updates: Immediate
- Feature updates: Monthly
- Dependency updates: Quarterly

## Scaling Considerations

**Traffic Growth:**

- Monitor server resources
- Plan for auto-scaling
- Consider CDN for global users
- Database read replicas for performance

**Feature Expansion:**

- Mobile app development
- Additional payment providers
- Multi-language support
- Advanced booking features

---

**Ready to Launch?** Complete all checklist items above, then run your final tests with real payment transactions (small amounts) to verify everything works end-to-end.
