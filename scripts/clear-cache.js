#!/usr/bin/env node

/**
 * Clear data cache script
 */

import fs from 'fs/promises';
import path from 'path';

const CACHE_FILE = path.join(process.cwd(), '.astro', 'data-cache.json');

try {
    await fs.unlink(CACHE_FILE);
    console.log('✅ Data cache cleared successfully');
} catch (error) {
    if (error.code === 'ENOENT') {
        console.log('ℹ️  No cache file found to clear');
    } else {
        console.error('❌ Error clearing cache:', error.message);
        process.exit(1);
    }
}