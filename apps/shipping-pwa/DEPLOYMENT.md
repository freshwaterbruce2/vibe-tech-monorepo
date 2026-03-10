# 🚀 DC8980 Shipping PWA - Production Deployment Guide

## Prerequisites

- Cloudflare account with Workers & Pages enabled
- Google Play Developer account ($25 one-time)
- Apple Developer account ($99/year) - for iOS
- Square account for payment processing
- SendGrid account for email services

## 🌐 Web Deployment (Cloudflare)

### Step 1: Initial Cloudflare Setup

1. **Login to Cloudflare Dashboard**

   ```bash
   npx wrangler login
   ```

2. **Create D1 Database**

   ```bash
   npm run db:create
   ```

   Save the database ID returned and update `wrangler.toml`

3. **Run Database Migrations**

   ```bash
   npm run db:migrate:local  # Test locally first
   npm run db:migrate        # Apply to production
   ```

4. **Create KV Namespace for Sessions**

   ```bash
   npx wrangler kv:namespace create "SESSIONS"
   npx wrangler kv:namespace create "SESSIONS" --preview
   ```

   Update the IDs in `wrangler.toml`

### Step 2: Configure Environment Secrets

```bash
# Square Payment Integration
npx wrangler secret put SQUARE_ACCESS_TOKEN
npx wrangler secret put SQUARE_WEBHOOK_SECRET

# Email Service (SendGrid)
npx wrangler secret put SENDGRID_API_KEY

# Authentication
npx wrangler secret put JWT_SECRET
npx wrangler secret put ADMIN_PASSWORD_HASH

# Firebase (if using)
npx wrangler secret put FIREBASE_SERVICE_ACCOUNT
```

### Step 3: Deploy Backend (Workers)

```bash
# Test locally first
npm run worker:dev

# Deploy to staging
npm run worker:deploy:staging

# Deploy to production
npm run worker:deploy:production
```

### Step 4: Deploy Frontend (Pages)

```bash
# Build and deploy frontend
npm run pages:deploy

# Or via Git integration:
# 1. Push to GitHub
# 2. Connect repo in Cloudflare Pages
# 3. Set build command: npm run build
# 4. Set output directory: dist
```

### Step 5: Configure Custom Domain

1. Go to Cloudflare Pages > Custom domains
2. Add your domain (e.g., app.yourdomain.com)
3. Update DNS records (automatic if domain is on Cloudflare)

## 📱 Mobile App Deployment

### Android (Google Play Store)

1. **Generate Release Keystore**

   ```bash
   keytool -genkey -v -keystore release-key.keystore -alias dc8980-shipping -keyalg RSA -keysize 2048 -validity 10000
   ```

2. **Configure Signing**
   Place keystore in `android/app/` and update `android/app/build.gradle`:

   ```gradle
   signingConfigs {
       release {
           storeFile file('release-key.keystore')
           storePassword 'YOUR_STORE_PASSWORD'
           keyAlias 'dc8980-shipping'
           keyPassword 'YOUR_KEY_PASSWORD'
       }
   }
   ```

3. **Build AAB (Android App Bundle)**

   ```bash
   npm run android:bundle
   ```

   Output: `android/app/build/outputs/bundle/release/app-release.aab`

4. **Upload to Play Console**
   - Create app in Google Play Console
   - Upload AAB file
   - Fill in store listing (description, screenshots, etc.)
   - Set up pricing (Free with IAP)
   - Submit for review

### iOS (Apple App Store)

1. **Update Team ID**
   Edit `capacitor.config.ts`:

   ```typescript
   ios: {
     buildOptions: {
       developmentTeam: 'YOUR_TEAM_ID'
     }
   }
   ```

2. **Build in Xcode**

   ```bash
   npm run ios:build
   ```

3. **Archive and Upload**
   - In Xcode: Product > Archive
   - Distribute App > App Store Connect
   - Upload to App Store Connect

4. **Submit for Review**
   - Complete app information
   - Add screenshots for all device sizes
   - Submit for TestFlight/Review

## 💰 Payment & Monetization Setup

### Square Configuration

1. **Create Subscription Plans in Square Dashboard**
   - Free: $0/month (20 doors)
   - Starter: $49/month (100 doors)
   - Professional: $149/month (unlimited)
   - Enterprise: Custom

2. **Set up Webhooks**
   - URL: `https://api.yourdomain.com/webhooks/square`
   - Events: payment.created, payment.updated, subscription.created, subscription.updated

3. **Configure OAuth (optional)**
   For marketplace/multi-merchant support

## 📊 Monitoring & Analytics

### Sentry Setup

1. **Create Sentry Project**
   - Sign up at sentry.io
   - Create new project (React)

2. **Update Environment Variables**

   ```env
   VITE_SENTRY_DSN=https://YOUR_DSN@sentry.io/PROJECT_ID
   VITE_SENTRY_ENVIRONMENT=production
   ```

3. **Deploy with Source Maps**

   ```bash
   npm run build
   npx @sentry/wizard -i sourcemaps
   ```

### Cloudflare Analytics

- Workers Analytics: Automatic with Workers
- Pages Analytics: Enable in Pages settings
- Web Analytics: Add snippet to index.html

## 🧪 Beta Testing

### Web Beta

1. **Deploy to Staging**

   ```bash
   npm run worker:deploy:staging
   ```

2. **Staging URL**
   - Workers: `https://dc8980-shipping-api-staging.YOUR_SUBDOMAIN.workers.dev`
   - Pages: `https://staging.dc8980shipping.pages.dev`

### Mobile Beta

- **Android**: Use Google Play Console Internal Testing track
- **iOS**: Use TestFlight for beta distribution

## 📋 Pre-Launch Checklist

### Backend

- [ ] D1 Database migrated and seeded
- [ ] Environment secrets configured
- [ ] Rate limiting enabled
- [ ] CORS properly configured
- [ ] Health check endpoint working
- [ ] Email service tested

### Frontend

- [ ] Service worker registered
- [ ] PWA manifest configured
- [ ] Offline mode working
- [ ] Sentry error tracking active
- [ ] Analytics configured
- [ ] SEO meta tags set

### Mobile

- [ ] App icons generated (all sizes)
- [ ] Splash screens configured
- [ ] Deep linking tested
- [ ] Push notifications setup
- [ ] App store listings complete

### Security

- [ ] SSL certificates active
- [ ] API keys rotated
- [ ] Admin password changed from default
- [ ] Square webhook signature verification
- [ ] Rate limiting configured
- [ ] CSRF protection enabled

## 🚨 Rollback Procedure

### Quick Rollback

```bash
# List deployments
wrangler deployments list

# Rollback to previous version
wrangler rollback [deployment-id]
```

### Database Rollback

```bash
# Create backup before migration
wrangler d1 backup create dc8980-shipping-db

# Restore from backup
wrangler d1 backup restore dc8980-shipping-db [backup-id]
```

## 📞 Support & Troubleshooting

### Common Issues

1. **Blank page after deployment**
   - Check browser console for errors
   - Verify API endpoints in production
   - Check CORS configuration

2. **Payment failures**
   - Verify Square API keys
   - Check webhook signature
   - Review Square logs

3. **Email not sending**
   - Verify SendGrid API key
   - Check spam folders
   - Review email service logs

### Debug Commands

```bash
# Check Worker logs
wrangler tail

# Check D1 database
wrangler d1 execute dc8980-shipping-db --sql "SELECT * FROM tenants"

# Test API endpoint
curl https://api.yourdomain.com/api/health
```

## 📈 Post-Launch

1. **Monitor Performance**
   - Check Cloudflare Analytics daily
   - Review Sentry for errors
   - Monitor API response times

2. **Gather Feedback**
   - Set up in-app feedback form
   - Monitor app store reviews
   - Conduct user surveys

3. **Iterate & Improve**
   - Weekly deployment cycle
   - A/B testing for features
   - Performance optimizations

## 🎉 Launch Day Commands

```bash
# Final quality check
npm run quality

# Deploy everything
npm run worker:deploy:production
npm run pages:deploy
npm run android:bundle
npm run ios:build

# Verify deployment
curl https://api.yourdomain.com/api/health
```

## 📝 Notes

- Keep `wrangler.toml` updated with correct IDs
- Never commit secrets to git
- Always test in staging first
- Monitor costs (Cloudflare Workers, D1, SendGrid)
- Set up alerts for errors and usage limits

---

**Deployment Time Estimate**: 2-3 hours for web, 1-2 days for mobile app store approval

**Support**: For deployment issues, check Cloudflare Discord or Stack Overflow with tags `cloudflare-workers`, `cloudflare-pages`, `capacitor`.
