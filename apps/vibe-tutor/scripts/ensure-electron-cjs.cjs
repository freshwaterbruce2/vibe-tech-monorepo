const fs = require('fs');
const path = require('path');

const outDir = path.resolve(__dirname, '..', 'dist-electron');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const pkgPath = path.join(outDir, 'package.json');
const pkg = {
  type: 'commonjs',
};

fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2), 'utf8');
