import algoliasearch from 'algoliasearch';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const ALGOLIA_APP_ID = process.env.ALGOLIA_APP_ID;
const ALGOLIA_SEARCH_KEY = process.env.ALGOLIA_SEARCH_KEY || process.env.ALGOLIA_API_KEY;
const ALGOLIA_INDEX_NAME = process.env.ALGOLIA_INDEX_NAME || 'vetlist_locations';

async function testAlgoliaSearch() {
  try {
    console.log('🔍 Testing Algolia search...');
    
    if (!ALGOLIA_APP_ID || !ALGOLIA_SEARCH_KEY) {
      console.error('❌ Missing Algolia credentials');
      return;
    }
    
    const client = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_SEARCH_KEY);
    const index = client.initIndex(ALGOLIA_INDEX_NAME);
    
    // Test multiple searches
    const testQueries = ['miami', 'toronto', 'vancouver', 'chicago', 'new york'];
    
    for (const query of testQueries) {
      const { hits } = await index.search(query, {
        hitsPerPage: 3
      });
      
      console.log(`✅ Search for "${query}": Found ${hits.length} results`);
      if (hits.length > 0) {
        hits.forEach((hit, i) => {
          console.log(`   ${i + 1}. ${hit.name} → ${hit.url}`);
        });
      }
      console.log('');
    }
    
  } catch (error) {
    console.error('❌ Algolia search test failed:', error.message);
  }
}

testAlgoliaSearch();