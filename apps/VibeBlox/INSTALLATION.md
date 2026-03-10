# VibeBlox Installation & Deployment Guide

## 📦 Package & Install

### Quick Start

1. **Package the application:**
   ```bash
   cd apps/VibeBlox
   pnpm package
   ```

2. **Navigate to the package:**
   ```bash
   cd package
   ```

3. **Install dependencies:**
   ```bash
   pnpm install
   ```

4. **Configure environment:**
   ```bash
   # Windows
   copy .env.example .env
   
   # Linux/Mac
   cp .env.example .env
   ```

5. **Edit `.env` file** and update:
   - `JWT_SECRET` - Change to a secure random string
   - `VIBEBLOX_DATABASE_PATH` - Set your database location
   - `PORT` - Default is 3003

6. **Initialize database:**
   ```bash
   pnpm run db:migrate
   pnpm run db:seed
   ```

7. **Start the server:**
   ```bash
   pnpm start
   ```

8. **Access the application:**
   - Open browser to: http://localhost:3003
   - Default credentials (from seed):
     - **Child:** username: `child`, password: `child123`
     - **Parent:** username: `parent`, password: `parent123`

---

## 🏗️ Production Deployment

### Option 1: Windows Service (Recommended for Windows)

1. **Install Node.js Windows Service wrapper:**
   ```bash
   npm install -g node-windows
   ```

2. **Create service script** (`install-service.js`):
   ```javascript
   const Service = require('node-windows').Service;
   
   const svc = new Service({
     name: 'VibeBlox',
     description: 'VibeBlox Token Economy System',
     script: 'C:\\path\\to\\package\\server\\index.js',
     env: {
       name: 'NODE_ENV',
       value: 'production'
     }
   });
   
   svc.on('install', () => {
     svc.start();
   });
   
   svc.install();
   ```

3. **Install the service:**
   ```bash
   node install-service.js
   ```

### Option 2: PM2 Process Manager (Cross-platform)

1. **Install PM2:**
   ```bash
   npm install -g pm2
   ```

2. **Start with PM2:**
   ```bash
   pm2 start server/index.js --name vibeblox
   pm2 save
   pm2 startup
   ```

3. **Monitor:**
   ```bash
   pm2 status
   pm2 logs vibeblox
   ```

### Option 3: Docker (Advanced)

Create `Dockerfile` in package directory:
```dockerfile
FROM node:22-alpine

WORKDIR /app

COPY package.json ./
RUN npm install --production

COPY . .

EXPOSE 3003

CMD ["node", "server/index.js"]
```

Build and run:
```bash
docker build -t vibeblox .
docker run -d -p 3003:3003 --name vibeblox \
  -v /path/to/data:/data \
  -e VIBEBLOX_DATABASE_PATH=/data/vibeblox.db \
  vibeblox
```

---

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `production` |
| `PORT` | Server port | `3003` |
| `VIBEBLOX_DATABASE_PATH` | SQLite database path | `D:\data\vibeblox\vibeblox.db` |
| `JWT_SECRET` | JWT signing secret | (must change!) |
| `CORS_ORIGIN` | CORS allowed origin | (optional) |

### Database Location

The database path can be customized via `VIBEBLOX_DATABASE_PATH`. Ensure:
- Directory exists and is writable
- Regular backups are configured
- Path is absolute

---

## 🔐 Security Checklist

- [ ] Change `JWT_SECRET` to a strong random value
- [ ] Change default user passwords
- [ ] Configure firewall rules (allow port 3003)
- [ ] Enable HTTPS (use reverse proxy like nginx)
- [ ] Set up regular database backups
- [ ] Review and restrict file permissions
- [ ] Keep Node.js and dependencies updated

---

## 📊 Monitoring & Maintenance

### Health Check
```bash
curl http://localhost:3003/health
```

### Database Backup
```bash
# Windows
copy D:\data\vibeblox\vibeblox.db D:\backups\vibeblox-backup-%date%.db

# Linux/Mac
cp /data/vibeblox/vibeblox.db /backups/vibeblox-backup-$(date +%Y%m%d).db
```

### Logs
- PM2: `pm2 logs vibeblox`
- Windows Service: Check Event Viewer
- Docker: `docker logs vibeblox`

---

## 🚀 Updating

1. **Stop the server**
2. **Backup database**
3. **Replace package files**
4. **Run migrations:** `pnpm run db:migrate`
5. **Restart server**

---

## 🆘 Troubleshooting

### Server won't start
- Check port 3003 is not in use: `netstat -ano | findstr :3003`
- Verify database path exists and is writable
- Check Node.js version (requires v22+)

### Database errors
- Ensure database directory exists
- Check file permissions
- Verify SQLite is not corrupted

### Frontend not loading
- Verify `client/` directory exists in package
- Check browser console for errors
- Ensure `NODE_ENV=production` is set

---

## 📞 Support

For issues or questions, refer to:
- `STATUS.md` - Project status and features
- `INTEGRATION-COMPLETE.md` - Integration details
- `VIBEBLOX-PRD.md` - Product requirements

