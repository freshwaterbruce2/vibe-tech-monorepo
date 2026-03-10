/**
 * Workspace Template Service
 * Quick scaffolding for new projects with predefined templates
 *
 * Supports: React, Node.js, Full-Stack, Python FastAPI, Electron
 */

import { logger } from './Logger';

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  category: 'frontend' | 'backend' | 'fullstack' | 'desktop' | 'mobile';
  icon: string;
  tags: string[];
  files: TemplateFile[];
  scripts?: Record<string, string>;
  dependencies?: string[];
  devDependencies?: string[];
  estimatedSetupTime?: string; // e.g., "2-3 min"
}

export interface TemplateFile {
  path: string;
  content: string;
  description?: string;
}

export class WorkspaceTemplateService {
  private templates: Map<string, ProjectTemplate> = new Map();

  constructor() {
    this.loadDefaultTemplates();
  }

  /**
   * Load predefined templates
   */
  private loadDefaultTemplates() {
    // React TypeScript App
    this.templates.set('react-ts-app', REACT_TS_TEMPLATE);

    // Node.js Backend API
    this.templates.set('node-api', NODE_API_TEMPLATE);

    // Full-Stack (Nx Monorepo)
    this.templates.set('fullstack-nx', FULLSTACK_NX_TEMPLATE);

    // Python FastAPI
    this.templates.set('python-fastapi', PYTHON_FASTAPI_TEMPLATE);

    // Electron Desktop App
    this.templates.set('electron-app', ELECTRON_TEMPLATE);

    logger.info('[WorkspaceTemplates] Loaded', this.templates.size, 'templates');
  }

  /**
   * Get all available templates
   */
  getAllTemplates(): ProjectTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Get template by ID
   */
  getTemplate(id: string): ProjectTemplate | undefined {
    return this.templates.get(id);
  }

  /**
   * Get templates by category
   */
  getTemplatesByCategory(category: string): ProjectTemplate[] {
    return Array.from(this.templates.values()).filter(t => t.category === category);
  }

  /**
   * Search templates
   */
  searchTemplates(query: string): ProjectTemplate[] {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.templates.values()).filter(
      t =>
        t.name.toLowerCase().includes(lowerQuery) ||
        t.description.toLowerCase().includes(lowerQuery) ||
        t.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  }

  /**
   * Generate project files from template
   */
  async generateProject(templateId: string, projectName: string, targetPath: string): Promise<GeneratedProject> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    const startTime = Date.now();
    const generatedFiles: string[] = [];

    try {
      // Generate files
      for (const file of template.files) {
        const filePath = file.path.replace('{{projectName}}', projectName);
        const content = file.content.replace(/{{projectName}}/g, projectName);

        // Create file (you'd implement actual file writing here)
        logger.debug('[WorkspaceTemplates] Generating file:', filePath);
        generatedFiles.push(filePath);

        // In actual implementation:
        // await fileSystemService.writeFile(path.join(targetPath, filePath), content);
      }

      return {
        template,
        projectName,
        targetPath,
        filesGenerated: generatedFiles.length,
        generationTime: Date.now() - startTime,
        nextSteps: this.getNextSteps(template),
      };
    } catch (error) {
      logger.error('[WorkspaceTemplates] Failed to generate project:', error);
      throw error;
    }
  }

  /**
   * Get next steps after project generation
   */
  private getNextSteps(template: ProjectTemplate): string[] {
    const steps: string[] = [];

    if (template.dependencies && template.dependencies.length > 0) {
      steps.push('Run: pnpm install (or npm install)');
    }

    if (template.scripts) {
      if (template.scripts['dev']) {
        steps.push('Run: pnpm dev (start development server)');
      }
      if (template.scripts['build']) {
        steps.push('Run: pnpm build (build for production)');
      }
    }

    if (template.category === 'backend') {
      steps.push('Configure environment variables (.env file)');
    }

    if (template.category === 'fullstack') {
      steps.push('Review README.md for monorepo setup instructions');
    }

    return steps;
  }
}

export interface GeneratedProject {
  template: ProjectTemplate;
  projectName: string;
  targetPath: string;
  filesGenerated: number;
  generationTime: number;
  nextSteps: string[];
}

// ===================================
// TEMPLATE DEFINITIONS
// ===================================

const REACT_TS_TEMPLATE: ProjectTemplate = {
  id: 'react-ts-app',
  name: 'React TypeScript App',
  description: 'Modern React 19 app with TypeScript, Vite, and Tailwind CSS',
  category: 'frontend',
  icon: '⚛️',
  tags: ['react', 'typescript', 'vite', 'tailwind', 'frontend'],
  estimatedSetupTime: '2-3 min',
  files: [
    {
      path: 'package.json',
      content: `{
  "name": "{{projectName}}",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0"
  },
  "dependencies": {
    "react": "^19.2.3",
    "react-dom": "^19.2.3"
  },
  "devDependencies": {
    "@types/react": "^19.2.7",
    "@types/react-dom": "^19.2.3",
    "@vitejs/plugin-react": "^4.3.1",
    "typescript": "^5.5.3",
    "vite": "^7.0.5",
    "tailwindcss": "^3.4.18",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.49"
  }
}`,
    },
    {
      path: 'tsconfig.json',
      content: `{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}`,
    },
    {
      path: 'vite.config.ts',
      content: `import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true
  }
});`,
    },
    {
      path: 'src/main.tsx',
      content: `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);`,
    },
    {
      path: 'src/App.tsx',
      content: `import React from 'react';

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-white mb-4">
          Welcome to {{projectName}}
        </h1>
        <p className="text-xl text-white/90">
          Built with React 19 + TypeScript + Vite + Tailwind
        </p>
      </div>
    </div>
  );
}

export default App;`,
    },
    {
      path: 'src/index.css',
      content: `@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  margin: 0;
  font-family: system-ui, -apple-system, sans-serif;
}`,
    },
    {
      path: 'tailwind.config.js',
      content: `export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
};`,
    },
    {
      path: 'index.html',
      content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{{projectName}}</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>`,
    },
    {
      path: 'README.md',
      content: `# {{projectName}}

React 19 + TypeScript + Vite + Tailwind CSS

## Quick Start

\`\`\`bash
pnpm install
pnpm dev
\`\`\`

Visit: http://localhost:3000
`,
    },
  ],
};

const NODE_API_TEMPLATE: ProjectTemplate = {
  id: 'node-api',
  name: 'Node.js REST API',
  description: 'Express + TypeScript backend API with modern setup',
  category: 'backend',
  icon: '🟢',
  tags: ['node', 'express', 'typescript', 'api', 'backend'],
  estimatedSetupTime: '2-3 min',
  files: [
    {
      path: 'package.json',
      content: `{
  "name": "{{projectName}}",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "express": "^4.21.2",
    "cors": "^2.8.5",
    "dotenv": "^16.4.7"
  },
  "devDependencies": {
    "@types/express": "^5.0.0",
    "@types/cors": "^2.8.17",
    "typescript": "^5.5.3",
    "tsx": "^4.19.2"
  }
}`,
    },
    {
      path: 'tsconfig.json',
      content: `{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "lib": ["ES2022"],
    "moduleResolution": "node",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "strict": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"]
}`,
    },
    {
      path: 'src/index.ts',
      content: `import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  logger.info(\`🚀 Server running on http://localhost:\${PORT}\`);
});`,
    },
    {
      path: '.env.example',
      content: `PORT=3000
DATABASE_URL=
API_KEY=`,
    },
    {
      path: 'README.md',
      content: `# {{projectName}}

Node.js REST API with Express + TypeScript

## Quick Start

\`\`\`bash
pnpm install
cp .env.example .env
pnpm dev
\`\`\`

API: http://localhost:3000/api/health
`,
    },
  ],
};

// Simplified templates (use similar structure)
const FULLSTACK_NX_TEMPLATE: ProjectTemplate = {
  id: 'fullstack-nx',
  name: 'Full-Stack Nx Monorepo',
  description: 'Nx monorepo with React frontend + Node.js backend',
  category: 'fullstack',
  icon: '📦',
  tags: ['nx', 'monorepo', 'fullstack', 'react', 'node'],
  estimatedSetupTime: '5-8 min',
  files: [], // Would include nx.json, workspace structure, etc.
};

const PYTHON_FASTAPI_TEMPLATE: ProjectTemplate = {
  id: 'python-fastapi',
  name: 'Python FastAPI',
  description: 'Modern Python API with FastAPI + SQLAlchemy',
  category: 'backend',
  icon: '🐍',
  tags: ['python', 'fastapi', 'api', 'backend'],
  estimatedSetupTime: '3-5 min',
  files: [], // Would include main.py, requirements.txt, etc.
};

const ELECTRON_TEMPLATE: ProjectTemplate = {
  id: 'electron-app',
  name: 'Electron Desktop App',
  description: 'Cross-platform desktop app with Electron + React',
  category: 'desktop',
  icon: '⚡',
  tags: ['electron', 'desktop', 'react', 'typescript'],
  estimatedSetupTime: '4-6 min',
  files: [], // Would include electron main, preload, renderer, etc.
};
