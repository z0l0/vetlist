import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  output: 'static',
  site: 'https://vetlist.org', // Required for sitemap generation
  trailingSlash: 'always', // Ensure consistent trailing slashes
  build: { 
    assets: 'assets',
    inlineStylesheets: 'never', // Never inline CSS - keep as external files
    assetsPrefix: '/' // Ensure proper asset paths
  },
  compressHTML: true, // Minifies HTML output
  devToolbar: { enabled: false },
  server: { port: 4323 },
  vite: { 
    resolve: { alias: { '@': '/src' } },
    build: {
      minify: 'terser', // More aggressive JS minification
      cssMinify: true, // Ensure CSS is minified
    },
    // Enable compression for JSON files
    optimizeDeps: {
      include: []
    },
    // Configure compression for static assets
    json: {
      stringify: true // Enable JSON compression
    }
  },
  integrations: [
    tailwind(),
    sitemap({
      // Optional: Customize sitemap settings here
      changefreq: 'weekly', // Default change frequency for pages
      priority: 0.7, // Default priority (0.0 to 1.0)
      // Exclude admin pages from sitemap
      filter: (page) => !page.includes('/admin'),
      // Example: Add custom pages (uncomment if needed)
      // customPages: ['https://vetlist.org/external-page'],
    })
  ],
});