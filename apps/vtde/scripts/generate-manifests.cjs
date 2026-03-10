const fs = require('fs');
const path = require('path');

const appsRoot = path.resolve(__dirname, '..', '..');

const apps = [
  {
    dir: 'nova-agent',
    displayName: 'Nova Agent',
    category: 'ai',
    type: 'native',
    description: 'AI desktop assistant with RAG — 121/121 tests',
  },
  {
    dir: 'vibe-code-studio',
    displayName: 'Vibe Code Studio',
    category: 'dev',
    type: 'native',
    description: 'AI-powered IDE with 27+ models',
  },
  {
    dir: 'vtde',
    displayName: 'VTDE',
    category: 'dev',
    type: 'native',
    description: 'Tauri 2.0 desktop environment (self)',
  },
  {
    dir: 'nova-mobile-app',
    displayName: 'Nova Mobile',
    category: 'ai',
    type: 'web',
    description: 'Mobile companion app — HTTP bridge',
  },
  {
    dir: 'crypto-enhanced',
    displayName: 'Crypto Enhanced',
    category: 'finance',
    type: 'web',
    description: 'Cryptocurrency trading bot',
  },
  {
    dir: 'desktop-commander-v3',
    displayName: 'Desktop Commander',
    category: 'dev',
    type: 'native',
    description: 'MCP server for system control',
  },
  {
    dir: 'memory-mcp',
    displayName: 'Memory MCP',
    category: 'ai',
    type: 'native',
    description: 'Memory system — 56/56 tests',
  },
  {
    dir: 'vibe-justice',
    displayName: 'Vibe Justice',
    category: 'business',
    type: 'web',
    description: 'Legal case management assistant',
  },
  {
    dir: 'vibe-shop',
    displayName: 'Vibe Shop',
    category: 'business',
    type: 'web',
    description: 'AI e-commerce platform',
  },
  {
    dir: 'clawdbot-desktop',
    displayName: 'ClawdBot Desktop',
    category: 'ai',
    type: 'native',
    description: 'Desktop automation agent',
  },
  {
    dir: 'prompt-engineer',
    displayName: 'Prompt Lab',
    category: 'ai',
    type: 'web',
    description: 'Prompt optimization tool',
  },
  {
    dir: 'mcp-codeberg',
    displayName: 'GitHub MCP',
    category: 'dev',
    type: 'native',
    description: 'Version control MCP server',
  },
  {
    dir: 'mcp-skills-server',
    displayName: 'Skills Server',
    category: 'dev',
    type: 'native',
    description: '206-skill library MCP',
  },
  {
    dir: 'invoice-automation-saas',
    displayName: 'Invoice Automation',
    category: 'finance',
    type: 'web',
    description: 'B2B invoicing platform',
  },
  {
    dir: 'symptom-tracker',
    displayName: 'Health Tracker',
    category: 'utility',
    type: 'web',
    description: 'Symptom tracking app',
  },
  {
    dir: 'monorepo-dashboard',
    displayName: 'Monorepo Dashboard',
    category: 'dev',
    type: 'web',
    description: 'Workspace visualization',
  },
  {
    dir: 'shipping-pwa',
    displayName: 'Shipping Tracker',
    category: 'business',
    type: 'web',
    description: 'Logistics PWA',
  },
  {
    dir: 'business-booking-platform',
    displayName: 'Booking Platform',
    category: 'business',
    type: 'web',
    description: 'Scheduling platform',
  },
  {
    dir: 'mcp-gateway',
    displayName: 'MCP Gateway',
    category: 'dev',
    type: 'native',
    description: 'MCP routing server',
  },
  {
    dir: 'agent-sdk-workspace',
    displayName: 'Agent SDK',
    category: 'ai',
    type: 'native',
    description: 'Agent development SDK',
  },
  {
    dir: 'vibe-tech-lovable',
    displayName: 'Vibe Tech Showcase',
    category: 'utility',
    type: 'web',
    description: 'Technology showcase',
  },
  {
    dir: 'VibeBlox',
    displayName: 'VibeBlox',
    category: 'education',
    type: 'web',
    description: 'Gamified token economy',
  },
  {
    dir: 'gravity-claw',
    displayName: 'Gravity Claw',
    category: 'utility',
    type: 'web',
    description: 'Physics game',
  },
  {
    dir: 'avge-dashboard',
    displayName: 'AVGE Dashboard',
    category: 'finance',
    type: 'web',
    description: 'Analytics dashboard',
  },
  {
    dir: 'ai-youtube-pipeline',
    displayName: 'AI YouTube Pipeline',
    category: 'ai',
    type: 'web',
    description: 'Video content pipeline',
  },
];

apps.forEach((app) => {
  const dirPath = path.join(appsRoot, app.dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  const manifestPath = path.join(dirPath, 'vibe-app.json');
  const manifest = {
    displayName: app.displayName,
    description: app.description,
    version: '1.0.0',
    category: app.category,
    icon: `/app-icons/${app.dir}.png`,
    launch: 'pnpm dev',
    port: null,
    type: app.type,
    features: ['vtde-autodiscovered'],
  };
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.warn(`Created ${manifestPath}`);
});
console.warn('Done');
