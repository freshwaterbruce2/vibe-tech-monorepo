# Invoice Automation SaaS - Project Guide

**Project Path:** `C:\dev\apps\invoice-automation-saas`  
**Type:** Full-Stack SaaS Application  
**Platform:** Web (Multi-tenant)  
**Database:** D:\databases\invoiceflow.db (SQLite)  
**Status:** Production Ready

---

## 🎯 Project Overview

Multi-tenant SaaS platform for automated invoice processing, OCR extraction, and workflow automation. Features AI-powered data extraction, payment tracking, approval workflows, and comprehensive analytics.

### Key Features

- **AI-Powered OCR**: Extract data from PDF/image invoices
- **Multi-tenant Architecture**: Isolated data per organization
- **Workflow Automation**: Approval chains and notifications
- **Payment Tracking**: Integration with accounting systems
- **Analytics Dashboard**: Real-time reporting and insights
- **API Integration**: Webhooks and REST API
- **Role-Based Access**: Admin, Manager, User roles
- **Audit Trail**: Complete activity logging

---

## 📁 Project Structure

```
invoice-automation-saas/
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── pages/          # Page views
│   │   ├── hooks/          # Custom hooks
│   │   ├── contexts/       # React contexts
│   │   ├── utils/          # Utilities
│   │   └── api/            # API client
│   ├── public/             # Static assets
│   └── package.json
├── backend/
│   ├── src/
│   │   ├── routes/         # API routes
│   │   ├── controllers/    # Request handlers
│   │   ├── models/         # Database models
│   │   ├── services/       # Business logic
│   │   ├── middleware/     # Express middleware
│   │   └── utils/          # Utilities
│   ├── migrations/         # Database migrations
│   └── package.json
├── shared/
│   ├── types/              # Shared TypeScript types
│   └── constants/          # Shared constants
└── docs/                   # Documentation
```

---

## 🚀 Quick Start

### First Time Setup

```powershell
# Navigate to project
cd C:\dev\apps\invoice-automation-saas

# Install dependencies (entire monorepo)
pnpm install

# Set up database
cd backend
node src/scripts/init-db.js

# Run database migrations
node src/scripts/migrate.js

# Seed initial data (optional)
node src/scripts/seed.js
```

### Development Workflow

```powershell
# Start backend (from project root)
cd C:\dev\apps\invoice-automation-saas
pnpm run dev:backend

# Start frontend (new terminal)
pnpm run dev:frontend

# Run both concurrently
pnpm run dev
```

**Access Points:**

- Frontend: <http://localhost:3000>
- Backend API: <http://localhost:5000>
- API Docs: <http://localhost:5000/api-docs>

---

## 💾 Database

### Location

- **Path**: `D:\databases\invoiceflow.db`
- **Type**: SQLite
- **Backups**: `D:\databases\backups\invoiceflow_*.db`

### Schema Overview

```sql
-- Organizations (Multi-tenant)
CREATE TABLE organizations (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    subdomain TEXT UNIQUE,
    plan TEXT DEFAULT 'free',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Users
CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    org_id INTEGER,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (org_id) REFERENCES organizations(id)
);

-- Invoices
CREATE TABLE invoices (
    id INTEGER PRIMARY KEY,
    org_id INTEGER,
    user_id INTEGER,
    vendor_name TEXT,
    invoice_number TEXT,
    amount REAL,
    due_date DATE,
    status TEXT DEFAULT 'pending',
    file_path TEXT,
    extracted_data JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (org_id) REFERENCES organizations(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Workflows
CREATE TABLE workflows (
    id INTEGER PRIMARY KEY,
    org_id INTEGER,
    name TEXT NOT NULL,
    rules JSON,
    active BOOLEAN DEFAULT 1,
    FOREIGN KEY (org_id) REFERENCES organizations(id)
);

-- Audit Log
CREATE TABLE audit_log (
    id INTEGER PRIMARY KEY,
    org_id INTEGER,
    user_id INTEGER,
    action TEXT,
    entity_type TEXT,
    entity_id INTEGER,
    details JSON,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Database Operations

```powershell
# View database
D:
cd D:\databases
sqlite3 invoiceflow.db

# Backup database
Copy-Item invoiceflow.db -Destination "backups\invoiceflow_$(Get-Date -Format 'yyyyMMdd_HHmmss').db"

# Restore from backup
Copy-Item "backups\invoiceflow_20260102.db" -Destination invoiceflow.db
```

---

## 🔧 Configuration

### Environment Variables

Create `.env` files in both frontend and backend:

**Backend (.env)**

```env
# Server
PORT=5000
NODE_ENV=development

# Database
DB_PATH=D:/databases/invoiceflow.db

# Authentication
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d

# OCR Service
OCR_API_KEY=your-ocr-api-key
OCR_PROVIDER=tesseract  # or 'aws-textract', 'google-vision'

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Storage
UPLOAD_DIR=D:/data/vibe-justice/uploads
MAX_FILE_SIZE=10485760  # 10MB
```

**Frontend (.env)**

```env
VITE_API_URL=http://localhost:5000
VITE_APP_NAME=InvoiceFlow
```

---

## 📋 Common Tasks

### User Management

```powershell
# Create admin user
cd C:\dev\apps\invoice-automation-saas\backend
node src/scripts/create-admin.js --email admin@example.com --password secure123

# List users
node src/scripts/list-users.js

# Reset password
node src/scripts/reset-password.js --email user@example.com
```

### Invoice Processing

```powershell
# Process invoice manually
node src/scripts/process-invoice.js --file "D:/data/invoices/invoice.pdf"

# Reprocess failed invoices
node src/scripts/retry-failed.js

# Export invoices
node src/scripts/export-invoices.js --org-id 1 --format csv
```

### Workflow Management

```powershell
# Create approval workflow
node src/scripts/create-workflow.js --org-id 1 --name "Manager Approval"

# Test workflow
node src/scripts/test-workflow.js --workflow-id 1 --invoice-id 123
```

---

## 🧪 Testing

```powershell
# Run all tests
pnpm test

# Run backend tests only
cd backend
pnpm test

# Run frontend tests only
cd frontend
pnpm test

# Run with coverage
pnpm test:coverage

# Run e2e tests
pnpm test:e2e
```

---

## 🏗️ Building

### Development Build

```powershell
# Build frontend
cd C:\dev\apps\invoice-automation-saas\frontend
pnpm build

# Build backend
cd ../backend
pnpm build
```

### Production Build

```powershell
# Build everything
cd C:\dev\apps\invoice-automation-saas
pnpm build:prod

# Output:
# frontend/dist - Static files
# backend/dist - Compiled backend
```

---

## 🚢 Deployment

### Environment Setup

```powershell
# Set production environment
$env:NODE_ENV = "production"

# Configure production database
$env:DB_PATH = "D:/databases/invoiceflow_prod.db"
```

### Deploy Steps

1. Build production version
2. Set environment variables
3. Run migrations
4. Start services

```powershell
# Run migrations
cd backend
node dist/scripts/migrate.js

# Start backend
node dist/server.js

# Serve frontend (use nginx, serve, or similar)
cd ../frontend
npx serve -s dist -p 3000
```

---

## 🔍 Monitoring & Logs

### Log Locations

- **Backend Logs**: `D:\logs\invoice-automation-saas\`
- **Error Logs**: `D:\logs\invoice-automation-saas\errors.log`
- **Access Logs**: `D:\logs\invoice-automation-saas\access.log`
- **OCR Logs**: `D:\logs\invoice-automation-saas\ocr.log`

### View Logs

```powershell
# View recent errors
Get-Content D:\logs\invoice-automation-saas\errors.log -Tail 50 -Wait

# View access log
Get-Content D:\logs\invoice-automation-saas\access.log -Tail 100

# Search logs
Select-String -Path "D:\logs\invoice-automation-saas\*.log" -Pattern "error|critical"
```

---

## 🐛 Troubleshooting

### Common Issues

**OCR Not Working**

```powershell
# Check Tesseract installation
tesseract --version

# Verify OCR service
node src/scripts/test-ocr.js --file "test-invoice.pdf"
```

**Database Locked**

```powershell
# Check for open connections
node src/scripts/check-db-connections.js

# Force close (use carefully!)
taskkill /F /IM node.exe
```

**File Upload Fails**

```powershell
# Check upload directory permissions
icacls "D:\data\vibe-justice\uploads"

# Create if missing
New-Item -ItemType Directory -Force -Path "D:\data\vibe-justice\uploads"
```

**Email Not Sending**

```powershell
# Test SMTP connection
node src/scripts/test-email.js --to test@example.com
```

---

## 🔐 Security

### API Authentication

- JWT tokens for authentication
- Role-based access control (RBAC)
- Organization-level data isolation

### File Security

```powershell
# Scan uploads for malware (requires ClamAV or similar)
node src/scripts/scan-uploads.js

# Clean old uploads (90+ days)
node src/scripts/cleanup-uploads.js --days 90
```

---

## 📊 Analytics

### Generate Reports

```powershell
# Monthly invoice report
node src/scripts/generate-report.js --org-id 1 --month 2026-01

# Usage analytics
node src/scripts/usage-stats.js --org-id 1

# Export to CSV
node src/scripts/export-analytics.js --org-id 1 --format csv
```

---

## 🔗 API Endpoints

### Authentication

- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/refresh` - Refresh token

### Invoices

- `GET /api/invoices` - List invoices
- `POST /api/invoices` - Upload new invoice
- `GET /api/invoices/:id` - Get invoice details
- `PUT /api/invoices/:id` - Update invoice
- `DELETE /api/invoices/:id` - Delete invoice

### Organizations

- `GET /api/org` - Get current organization
- `PUT /api/org` - Update organization
- `GET /api/org/users` - List users

### Workflows

- `GET /api/workflows` - List workflows
- `POST /api/workflows` - Create workflow
- `PUT /api/workflows/:id` - Update workflow

---

## 📚 Additional Resources

- **API Documentation**: <http://localhost:5000/api-docs>
- **Admin Panel**: <http://localhost:3000/admin>
- **Swagger UI**: <http://localhost:5000/swagger>

---

## 🎯 Key Dependencies

### Frontend

- React 18
- TypeScript
- Vite
- React Router
- Axios
- React Query
- Tailwind CSS

### Backend

- Express
- TypeScript
- SQLite3
- JWT
- Multer (file uploads)
- Tesseract.js (OCR)
- Nodemailer

---

## ✅ Checklist for New Deployment

- [ ] Database initialized
- [ ] Migrations run
- [ ] Admin user created
- [ ] Environment variables set
- [ ] Upload directories created
- [ ] Email SMTP configured
- [ ] OCR service tested
- [ ] SSL certificate installed (production)
- [ ] Backup automation configured

---

**Last Updated**: January 2, 2026  
**Maintainer**: Bruce  
**Status**: Active Development
