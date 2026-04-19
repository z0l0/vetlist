#!/usr/bin/env node

/**
 * Fast build script for development
 * Uses optimized settings to build much faster
 */

import { spawn } from 'child_process';

// Set environment variables for fast build
process.env.FAST_BUILD = 'true';
process.env.MAX_PROFILES_PER_BUILD = '500';
process.env.NODE_ENV = 'development';

console.log('🚀 Starting fast build with optimizations...');
console.log('- Using only first CSV file per type');
console.log('- Limiting to 500 profiles max');
console.log('- Enabling data cache');

function run(command, args) {
    return new Promise((resolve, reject) => {
        const child = spawn(command, args, {
            stdio: 'inherit',
            env: process.env
        });

        child.on('close', (code) => {
            if (code === 0) resolve();
            else reject(new Error(`${command} ${args.join(' ')} failed with code ${code}`));
        });
    });
}

try {
    await run('node', ['scripts/precompute-site-data.js']);
    await run('node', ['--max-old-space-size=8192', 'node_modules/.bin/astro', 'build']);
    console.log('✅ Fast build completed successfully!');
} catch (error) {
    console.log('❌ Fast build failed:', error.message);
    process.exit(1);
}
