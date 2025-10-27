# Algolia Location Search Setup

This guide will help you set up Algolia search for location autocomplete on your VetList homepage.

## Quick Setup

### 1. Create Algolia Account
1. Go to [Algolia](https://www.algolia.com/) and create a free account
2. Create a new application (or use existing one)
3. Go to API Keys section and copy:
   - Application ID
   - Admin API Key (for indexing)
   - Search-Only API Key (for frontend)

### 2. Configure Environment Variables
1. Copy `.env.example` to `.env`
2. Fill in your Algolia credentials:
```bash
ALGOLIA_APP_ID=your_app_id_here
ALGOLIA_API_KEY=your_admin_api_key_here
ALGOLIA_INDEX_NAME=vetlist_locations
```

### 3. Build and Upload Search Index
Run this command to extract locations from your profiles and upload to Algolia:
```bash
npm run build:algolia
```

This will:
- Extract unique locations from `src/data/profiles.json`
- Create search-friendly location objects
- Upload them to your Algolia index
- Configure search settings

### 4. Update Frontend API Key
For security, update the frontend to use your Search-Only API Key instead of Admin key:

In `src/lib/algolia.js`, replace the Admin API Key with your Search-Only API Key for production.

### 5. Build with Search
To build your site with search index updated:
```bash
npm run build:with-search
```

## How It Works

### Data Structure
Each location in the search index contains:
- `name`: "City, Region" (e.g., "Miami, Florida")
- `city`: City name
- `region`: State/Province
- `country`: Country name
- `url`: Direct link to city page (e.g., "/united-states/florida/miami")
- `searchTerms`: Array of search variations

### Search Features
- **Autocomplete**: Shows results as you type (minimum 2 characters)
- **Typo tolerance**: Handles misspellings
- **Highlighting**: Highlights matching text
- **Fast search**: Debounced with 300ms delay
- **Keyboard navigation**: ESC to close
- **Click outside**: Closes dropdown

### URL Pattern
Locations follow this URL pattern:
`/{country}/{region}/{city}`

Examples:
- `/united-states/florida/miami`
- `/canada/ontario/toronto`

## Customization

### Search Settings
Modify search behavior in `scripts/build-algolia-index.js`:
- `hitsPerPage`: Number of results shown
- `typoTolerance`: Enable/disable typo correction
- `searchableAttributes`: Which fields to search

### UI Styling
The search component uses Tailwind CSS classes and can be customized in:
- `src/components/home/Hero.astro` (main search integration)
- Search dropdown styling in the component script

## Troubleshooting

### Common Issues
1. **"Index not found"**: Run `npm run build:algolia` first
2. **No search results**: Check API keys and index name
3. **Search not working**: Verify environment variables are loaded

### Debug Mode
Add console logs in the search function to debug:
```javascript
console.log('Search query:', query);
console.log('Search results:', hits);
```

## Production Deployment

### Environment Variables
Make sure to set these in your hosting platform:
- `ALGOLIA_APP_ID`
- `ALGOLIA_API_KEY` (Admin key for build process)
- `ALGOLIA_INDEX_NAME`

### Build Process
Include the Algolia index build in your deployment:
```bash
npm run build:with-search
```

### Security
- Use Admin API Key only for building/indexing
- Use Search-Only API Key for frontend searches
- Never expose Admin API Key in client-side code