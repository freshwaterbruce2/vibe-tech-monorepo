import fs from 'fs';
import path from 'path';
import { performance } from 'perf_hooks';

const srcDir = 'V:/caches/pnpm/v10/test-src';
const destDir = 'V:/monorepo/scratch/test-dest';

// Ensure directories exist
if (!fs.existsSync(srcDir)) fs.mkdirSync(srcDir, { recursive: true });
if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });

const srcFile = path.join(srcDir, 'source.bin');
// Create a 1MB file
const buffer = Buffer.alloc(1024 * 1024, 'a');
fs.writeFileSync(srcFile, buffer);

console.log('Testing file copy methods on V: drive...');

async function testCopy() {
    const start = performance.now();
    for (let i = 0; i < 100; i++) {
        const dest = path.join(destDir, `copy_${i}.bin`);
        fs.copyFileSync(srcFile, dest);
    }
    console.log(`Standard copy (100 files): ${(performance.now() - start).toFixed(2)}ms`);
}

async function testClone() {
    const start = performance.now();
    for (let i = 0; i < 100; i++) {
        const dest = path.join(destDir, `clone_${i}.bin`);
        await new Promise((resolve, reject) => {
            fs.copyFile(srcFile, dest, fs.constants.COPYFILE_FICLONE, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }
    console.log(`FICLONE clone (100 files): ${(performance.now() - start).toFixed(2)}ms`);
}

async function testCloneForce() {
    const start = performance.now();
    try {
        for (let i = 0; i < 100; i++) {
            const dest = path.join(destDir, `clone_force_${i}.bin`);
            await new Promise((resolve, reject) => {
                fs.copyFile(srcFile, dest, fs.constants.COPYFILE_FICLONE_FORCE, (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        }
        console.log(`FICLONE_FORCE clone (100 files): ${(performance.now() - start).toFixed(2)}ms`);
    } catch (err) {
        console.log(`FICLONE_FORCE clone failed: ${err.message}`);
    }
}

async function testHardlink() {
    const start = performance.now();
    for (let i = 0; i < 100; i++) {
        const dest = path.join(destDir, `link_${i}.bin`);
        if (fs.existsSync(dest)) fs.unlinkSync(dest);
        fs.linkSync(srcFile, dest);
    }
    console.log(`Hardlink (100 files): ${(performance.now() - start).toFixed(2)}ms`);
}

async function run() {
    try {
        await testCopy();
        await testClone();
        await testCloneForce();
        await testHardlink();
    } finally {
        // Cleanup
        fs.rmSync(destDir, { recursive: true, force: true });
        fs.rmSync(srcDir, { recursive: true, force: true });
    }
}

run();
