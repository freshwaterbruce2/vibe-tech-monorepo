#!/usr/bin/env node
/**
 * VibeBlox Production Packaging Script
 * Builds and packages the application for deployment
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DIST_DIR = path.join(__dirname, 'dist');
const PACKAGE_DIR = path.join(__dirname, 'package');
const SERVER_DIR = path.join(__dirname, 'server');

console.log('🚀 VibeBlox Production Packaging\n');

// Step 1: Clean previous builds
console.log('📦 Step 1: Cleaning previous builds...');
if (fs.existsSync(DIST_DIR)) {
  fs.rmSync(DIST_DIR, { recursive: true, force: true });
}
if (fs.existsSync(PACKAGE_DIR)) {
  fs.rmSync(PACKAGE_DIR, { recursive: true, force: true });
}
console.log('✅ Clean complete\n');

// Step 2: Run TypeScript type checking
console.log('🔍 Step 2: Type checking...');
try {
  execSync('pnpm typecheck', { stdio: 'inherit', cwd: __dirname });
  console.log('✅ Type check passed\n');
} catch (error) {
  console.error('❌ Type check failed');
  process.exit(1);
}

// Step 3: Build frontend
console.log('🏗️  Step 3: Building frontend...');
try {
  execSync('pnpm build', { stdio: 'inherit', cwd: __dirname });
  console.log('✅ Frontend build complete\n');
} catch (error) {
  console.error('❌ Frontend build failed');
  process.exit(1);
}

// Step 4: Create package directory structure
console.log('📁 Step 4: Creating package structure...');
fs.mkdirSync(PACKAGE_DIR, { recursive: true });
fs.mkdirSync(path.join(PACKAGE_DIR, 'client'), { recursive: true });
fs.mkdirSync(path.join(PACKAGE_DIR, 'server'), { recursive: true });

// Copy frontend build
console.log('  - Copying frontend build...');
fs.cpSync(DIST_DIR, path.join(PACKAGE_DIR, 'client'), { recursive: true });

// Copy server files
console.log('  - Copying server files...');
fs.cpSync(SERVER_DIR, path.join(PACKAGE_DIR, 'server'), { recursive: true });

// Create production package.json
console.log('  - Creating production package.json...');
const prodPackageJson = {
  name: '@vibetech/vibeblox-production',
  version: '1.0.0',
  type: 'module',
  description: 'VibeBlox Production Package',
  scripts: {
    start: 'NODE_ENV=production node server/index.js',
    'db:migrate': 'node server/db/index.js',
    'db:seed': 'node server/db/seed.js',
  },
  dependencies: {
    '@hono/node-server': '^1.13.7',
    'better-sqlite3': '^11.9.0',
    'bcryptjs': '^2.4.3',
    hono: '^4.6.14',
    jsonwebtoken: '^9.0.2',
    zod: '^3.24.1',
  },
};

fs.writeFileSync(
  path.join(PACKAGE_DIR, 'package.json'),
  JSON.stringify(prodPackageJson, null, 2)
);

// Create .env.example
console.log('  - Creating .env.example...');
const envExample = `# VibeBlox Production Environment Variables

# Database
VIBEBLOX_DATABASE_PATH=D:\\data\\vibeblox\\vibeblox.db

# Server
PORT=3003
NODE_ENV=production

# JWT Secret (CHANGE THIS IN PRODUCTION!)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# CORS (if needed)
# CORS_ORIGIN=http://localhost:5174
`;

fs.writeFileSync(path.join(PACKAGE_DIR, '.env.example'), envExample);

// Create README
console.log('  - Creating deployment README...');
const readme = `# VibeBlox Production Package

## Installation

1. Install dependencies:
\`\`\`bash
npm install
# or
pnpm install
\`\`\`

2. Copy \`.env.example\` to \`.env\` and configure:
\`\`\`bash
cp .env.example .env
\`\`\`

3. Initialize database:
\`\`\`bash
npm run db:migrate
npm run db:seed
\`\`\`

4. Start the server:
\`\`\`bash
npm start
\`\`\`

The application will be available at http://localhost:3003

## Directory Structure

- \`client/\` - Frontend static files (built React app)
- \`server/\` - Backend API server (Hono)
- \`.env\` - Environment configuration

## Database

Default location: D:\\data\\vibeblox\\vibeblox.db

Change via VIBEBLOX_DATABASE_PATH environment variable.
`;

fs.writeFileSync(path.join(PACKAGE_DIR, 'README.md'), readme);

console.log('✅ Package structure created\n');

// Step 5: Summary
console.log('🎉 Packaging complete!\n');
console.log('📦 Package location:', PACKAGE_DIR);
console.log('\n📋 Next steps:');
console.log('  1. cd package');
console.log('  2. pnpm install');
console.log('  3. cp .env.example .env (and configure)');
console.log('  4. pnpm run db:migrate');
console.log('  5. pnpm run db:seed');
console.log('  6. pnpm start');
console.log('\n✨ Done!\n');

