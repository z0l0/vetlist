# Astro Static Site

A static website built with Astro featuring search functionality, CSV data processing, and optimized performance.

## Prerequisites

Before you begin, ensure you have the following installed on your system:

- **Node.js** (version 18 or higher)
- **npm** (comes with Node.js)

You can check your versions by running:
```bash
node --version
npm --version
```

## Installation

1. **Clone the repository** (if not already done):
   ```bash
   git clone <your-repo-url>
   cd <your-repo-name>
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Environment Setup**:
   The project includes a `.env` file with Supabase configuration. Make sure this file exists in your root directory with the following variables:
   ```
   SUPABASE_URL=your_supabase_url
   SUPABASE_KEY=your_supabase_key
   ```

## Development

### Test/Live Data Switch

The project includes a convenient test/live switch to speed up development builds. This switch is located in three files:

1. `src/lib/supabase.js` - Controls data loading from CSV files
2. `src/lib/dataCache.js` - Controls fallback data loading for the Astro build

```javascript
// Set to true for testing (uses only 1 CSV file each), false for live site (uses all 10 CSV files)
const IS_TEST_MODE = true;
```

**How it works:**
- **Test Mode (`true`)**: Loads only the first CSV file for professionals and locations (~3,000 records)
- **Live Mode (`false`)**: Loads all 10 CSV files for each type (30,000+ records)

**When to use:**
- Set to `true` during development and testing for faster builds
- Set to `false` before deploying to production

**Important**: Make sure all three files have the same setting to keep data consistent.

This dramatically reduces build time during development since processing 30,000+ pages can take several minutes.

### Build Optimization

The project includes advanced build optimization features that can reduce build times by **80-90%** during development:

#### Quick Start

**For Development (Recommended):**
```bash
npm run build:fast
```
- Uses only 1 CSV file with max 100 profiles
- Builds ~3,600 pages in ~10 seconds
- Perfect for testing layouts, styling, and functionality

**For Production:**
```bash
npm run build:full
```
- Uses all 10 CSV files with complete dataset
- Builds 40,000+ pages (full production build)
- Use before deployment

**Clear Cache (if needed):**
```bash
npm run clear-cache
```

#### How It Works

The optimization system includes:

1. **Smart Data Loading**
   - Fast mode: Loads only first CSV file with 100 profiles max
   - Full mode: Loads all CSV files with complete dataset
   - Automatic environment detection

2. **Data Caching**
   - Saves processed data to `.astro/data-cache.json`
   - Subsequent builds load from cache instead of re-processing CSV files
   - Dramatically speeds up repeated builds

3. **Optimized Processing**
   - Reduced console logging in fast mode
   - Efficient lookup table generation
   - Minimal memory usage

#### Environment Variables

Customize build behavior with these environment variables:

```bash
# Enable fast build mode
FAST_BUILD=true

# Custom profile limit (default: 100 in fast mode)
MAX_PROFILES_PER_BUILD=50

# Disable caching if needed
DISABLE_DATA_CACHE=true

# Force production mode
NODE_ENV=production
```

#### Performance Comparison

| Build Type | Time | Pages Built | Profiles Used | Use Case |
|------------|------|-------------|---------------|----------|
| **Fast Build** | ~10 seconds | ~3,600 | 100 | Development, testing |
| **Full Build** | ~5-10 minutes | 40,000+ | 40,000+ | Production deployment |

#### When to Use Each Build Type

**Use Fast Build (`npm run build:fast`) for:**
- Developing and testing layout changes
- Working on styling and components  
- Testing routing and navigation
- Quick iteration cycles
- Daily development work

**Use Full Build (`npm run build:full`) for:**
- Production deployment
- Testing with complete dataset
- Final quality assurance
- Verifying all profiles work correctly

For more detailed information, see `BUILD_OPTIMIZATION.md`.

### Development Workflow

**⚠️ Important**: `npm run dev` and `npm run preview` will hang when run through Kiro due to the large number of pages being generated. These commands work fine in the terminal but will show as "Working....." indefinitely in Kiro. Instead, use the build workflow:

```bash
# Build the site
npm run build

# For development, run these commands manually in your terminal:
npm run dev      # Works in terminal, hangs in Kiro
npm run preview  # Works in terminal, hangs in Kiro
```

This is a known limitation when running development servers through Kiro with large datasets.

### Generate Search Index

The site includes search functionality that requires generating a search index from CSV data:

```bash
npm run generate-search
```

This script processes the CSV files in the `data/` directory and creates search indexes.

## Building for Production

### Optimized Build Commands

**For Development (Fast):**
```bash
npm run build:fast
```
⚡ **Recommended for daily development** - Builds in ~10 seconds with sample data

**For Production (Full):**
```bash
npm run build:full
```
🚀 **Use before deployment** - Complete build with all data

### Standard Build

To build the site for production:

```bash
npm run build
```

### Build with Search Index

To build the site and generate the search index in one command:

```bash
npm run build-with-search
```

The built files will be output to the `dist/` directory.

## Preview Production Build

After building, you can preview the production build locally:

```bash
npm run preview
```

This serves the built site from the `dist/` directory.

## Project Structure

```
├── src/                    # Source files
│   ├── pages/             # Astro pages (file-based routing)
│   └── ...
├── public/                # Static assets
│   ├── images/           # Image assets
│   ├── scripts/          # Client-side scripts
│   └── styles/           # CSS files
├── data/                  # CSV data files
├── scripts/               # Build scripts
├── api/                   # API endpoints
└── dist/                  # Built site (generated)
```

## Key Features

- **Static Site Generation**: Built with Astro for optimal performance

- **Sitemap Generation**: Automatic sitemap creation for SEO
- **Optimized Build**: Minified HTML, CSS, and JavaScript
- **CSV Data Processing**: Handles professional and location data from CSV files

## Available Scripts

### Development Scripts
- `npm run dev` - Start development server
- `npm start` - Alternative to dev command
- `npm run preview` - Preview production build

### Build Scripts
- `npm run build` - Standard build for production
- `npm run build:fast` - **Fast build for development** (recommended for daily use)
- `npm run build:full` - Full production build with complete dataset
- `npm run build-with-search` - Build with search index generation

### Utility Scripts
- `npm run generate-search` - Generate search index only
- `npm run clear-cache` - Clear build optimization cache

## Deployment

The site is configured for static hosting and can be deployed to:

- **Vercel** (configuration included in `vercel.json`)
- **Netlify** (configuration included in `netlify.toml`)
- Any static hosting service

### Vercel Deployment

The project includes Vercel configuration. Simply connect your repository to Vercel for automatic deployments.

### Netlify Deployment

The project includes Netlify configuration with build settings and redirects.

## Troubleshooting

### Common Issues

1. **Port already in use**: The dev server uses port 4323. If it's busy, Astro will automatically find another port.

2. **Search not working**: Make sure to run `npm run generate-search` before building or use `npm run build-with-search`.

3. **Missing dependencies**: Run `npm install` to ensure all dependencies are installed.

### Build Issues

If you encounter build issues:

1. Clear node_modules and reinstall:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

2. Check Node.js version compatibility (requires Node 18+)

## Contributing

1. Make your changes
2. Test locally with `npm run dev`
3. Build and test with `npm run build && npm run preview`
4. Ensure search functionality works with `npm run generate-search`

## License

[Add your license information here]