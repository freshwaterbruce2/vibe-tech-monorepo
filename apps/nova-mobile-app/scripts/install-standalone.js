const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const projectRoot = path.resolve(__dirname, '..');
const workspaceRoot = path.resolve(projectRoot, '..', '..');

const pkgJsonPath = path.join(projectRoot, 'package.json');
const pkgJsonBakPath = path.join(projectRoot, 'package.json.bak');
const workspaceYamlPath = path.join(workspaceRoot, 'pnpm-workspace.yaml');
const workspaceYamlBakPath = path.join(workspaceRoot, 'pnpm-workspace.yaml.bak');

// Catalog version definitions from workspace catalog
const catalog = {
  "@expo/vector-icons": "15.1.1",
  "@react-native-async-storage/async-storage": "2.1.0",
  "@react-native-community/netinfo": "11.4.1",
  "@react-navigation/bottom-tabs": "7.15.8",
  "@react-navigation/native": "7.2.1",
  "@react-navigation/native-stack": "7.14.9",
  "expo": "54.0.33",
  "expo-constants": "18.0.13",
  "expo-device": "8.0.10",
  "expo-haptics": "15.0.8",
  "expo-local-authentication": "17.0.8",
  "expo-notifications": "0.32.17",
  "expo-secure-store": "15.0.8",
  "expo-speech": "14.0.8",
  "expo-status-bar": "3.0.9",
  "lucide-react-native": "0.563.0",
  "memoize-one": "6.0.0",
  "react": "19.2.4",
  "react-native": "0.81.5",
  "react-native-safe-area-context": "5.4.0",
  "react-native-screens": "4.16.0",
  "react-native-svg": "15.12.1",
  "zustand": "5.0.11",
  "@babel/core": "7.29.0",
  "@types/react": "19.2.14",
  "typescript": "5.9.3",
  "vitest": "4.1.2"
};

try {
  console.log('backing up package.json...');
  fs.copyFileSync(pkgJsonPath, pkgJsonBakPath);

  console.log('modifying package.json with resolved catalog versions...');
  const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));

  for (const depType of ['dependencies', 'devDependencies']) {
    if (pkg[depType]) {
      for (const [dep, val] of Object.entries(pkg[depType])) {
        if (val === 'catalog:') {
          if (catalog[dep]) {
            pkg[depType][dep] = catalog[dep];
            console.log(`  Resolved: ${dep} -> ${catalog[dep]}`);
          } else {
            console.warn(`  Warning: dependency ${dep} uses catalog: but not defined in script map!`);
          }
        }
      }
    }
  }

  fs.writeFileSync(pkgJsonPath, JSON.stringify(pkg, null, 2), 'utf8');

  console.log('temporarily renaming pnpm-workspace.yaml to disable workspaces...');
  if (fs.existsSync(workspaceYamlPath)) {
    fs.renameSync(workspaceYamlPath, workspaceYamlBakPath);
  }

  console.log('running local pnpm install --offline inside apps/nova-mobile-app...');
  execSync('pnpm install --offline --no-hoist --store-dir V:\\caches\\pnpm\\v10', {
    cwd: projectRoot,
    stdio: 'inherit'
  });

  console.log('SUCCESS: local installation finished successfully!');

} catch (err) {
  console.error('ERROR during installation:', err);
} finally {
  console.log('restoring workspace configuration and package.json...');
  if (fs.existsSync(pkgJsonBakPath)) {
    fs.copyFileSync(pkgJsonBakPath, pkgJsonPath);
    fs.unlinkSync(pkgJsonBakPath);
  }
  if (fs.existsSync(workspaceYamlBakPath)) {
    fs.renameSync(workspaceYamlBakPath, workspaceYamlPath);
  }
  console.log('workspace restored.');
}
