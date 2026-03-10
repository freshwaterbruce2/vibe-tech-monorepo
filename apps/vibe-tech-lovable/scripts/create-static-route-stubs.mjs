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
  'blog',
  'contact',
  'pricing',
  'tools',
  'resources',
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
