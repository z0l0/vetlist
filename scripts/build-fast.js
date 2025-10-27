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
console.log('- Limiting to 100 profiles max');
console.log('- Enabling data cache');

// Run the build with increased memory
const build = spawn('node', ['--max-old-space-size=8192', 'node_modules/.bin/astro', 'build'], {
    stdio: 'inherit',
    env: process.env
});

build.on('close', (code) => {
    if (code === 0) {
        console.log('✅ Fast build completed successfully!');
    } else {
        console.log('❌ Fast build failed with code:', code);
        process.exit(code);
    }
});