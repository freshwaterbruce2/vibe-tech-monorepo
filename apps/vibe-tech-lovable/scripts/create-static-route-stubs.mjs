import { cp, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const distDir = path.join(projectRoot, 'dist');
const indexPath = path.join(distDir, 'index.html');

const routes = [
  'about',
  'services',
  'portfolio',
  'portfolio/project-1',
  'portfolio/project-2',
  'portfolio/project-3',
  'portfolio/project-4',
  'portfolio/project-5',
  'portfolio/project-6',
  'portfolio/project-7',
  'portfolio/project-8',
  'blog',
  'blog/1',
  'blog/2',
  'blog/3',
  'blog/4',
  'blog/5',
  'blog/6',
  'blog/category/technology',
  'blog/category/design',
  'blog/category/programming',
  'blog/category/architecture',
  'blog/category/security',
  'blog/category/css',
  'blog/tag/ai',
  'blog/tag/web-development',
  'blog/tag/ui-ux',
  'contact',
  'dashboard',
  'pricing',
  'tools',
  'resources',
  'privacy',
  'terms',
  'blog-editor',
  'palette-preview',
  'futuristic-demo',
];

const run = async () => {
  for (const route of routes) {
    const routeDir = path.join(distDir, route);
    await mkdir(routeDir, { recursive: true });
    await cp(indexPath, path.join(routeDir, 'index.html'));
  }
};

run().catch((error) => {
  console.error('Failed to create static route stubs:', error);
  process.exit(1);
});
