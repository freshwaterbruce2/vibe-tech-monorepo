import fs from 'fs';
import path from 'path';

const files = process.argv.slice(2);

if (files.length === 0) {
    process.exit(0);
}

// Regex to catch hardcoded V: drive, V:\monorepo references, or deprecated paths
const VIOLATION_REGEXES = [
    {
        pattern: /v:(\\|\/)(monorepo)?/i,
        label: 'Hardcoded V: drive path reference'
    },
    {
        pattern: /d:(\\|\/)learning(?!-system)/i,
        label: 'Deprecated D:\\learning path reference'
    },
    {
        pattern: /v:(\\|\/)monorepo(\\|\/)(data|logs|databases)/i,
        label: 'Deprecated V:\\monorepo sub-path reference'
    }
];

let hasErrors = false;

for (const file of files) {
    if (!fs.existsSync(file)) {
        continue;
    }

    const stat = fs.statSync(file);
    if (!stat.isFile()) {
        continue;
    }

    // Skip lockfiles, images, etc.
    const ext = path.extname(file).toLowerCase();
    if (['.png', '.jpg', '.jpeg', '.gif', '.ico', '.pdf', '.zip', '.tar', '.gz'].includes(ext)) {
        continue;
    }

    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split(/\r?\n/);

    lines.forEach((line, index) => {
        // Allow escaping with an ignore comment
        if (line.includes('path-segregation-ignore')) {
            return;
        }

        for (const rule of VIOLATION_REGEXES) {
            if (rule.pattern.test(line)) {
                console.error(`\x1b[31m[PathSegregationError]\x1b[0m ${file}:${index + 1}: ${rule.label}`);
                console.error(`  > ${line.trim()}`);
                hasErrors = true;
            }
        }
    });
}

if (hasErrors) {
    console.error('\x1b[31mPath segregation regex validation failed. Fix references before committing.\x1b[0m');
    process.exit(1);
} else {
    console.log('\x1b[32mPath segregation regex check passed.\x1b[0m');
    process.exit(0);
}
