import algoliasearch from 'algoliasearch';

// Algolia configuration
// For production, use your Search-Only API Key here (not Admin key)
const ALGOLIA_APP_ID = import.meta.env.ALGOLIA_APP_ID || 'YOUR_APP_ID';
const ALGOLIA_API_KEY = import.meta.env.ALGOLIA_SEARCH_KEY || import.meta.env.ALGOLIA_API_KEY || 'YOUR_SEARCH_ONLY_API_KEY';
const ALGOLIA_INDEX_NAME = import.meta.env.ALGOLIA_INDEX_NAME || 'vetlist_locations';

// Initialize Algolia client
export const algoliaClient = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_API_KEY);
export const algoliaIndex = algoliaClient.initIndex(ALGOLIA_INDEX_NAME);

// Search configuration
export const searchConfig = {
  hitsPerPage: 10,
  attributesToRetrieve: ['name', 'city', 'region', 'country', 'url', 'objectID'],
  attributesToHighlight: ['name', 'city'],
  typoTolerance: true,
  minWordSizefor1Typo: 4,
  minWordSizefor2Typos: 8,
};