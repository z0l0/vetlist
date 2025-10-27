import { loadAllCsvData } from '../../lib/csvToJson.js';

let cachedData = null;
let cacheTime = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function GET() {
  try {
    // Check if we have cached data that's still fresh
    if (cachedData && cacheTime && (Date.now() - cacheTime < CACHE_DURATION)) {
      return new Response(JSON.stringify(cachedData), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }

    // Load fresh data
    console.log('Loading CSV data...');
    const data = loadAllCsvData();
    
    // Cache the data
    cachedData = data;
    cacheTime = Date.now();
    
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Error loading CSV data:', error);
    return new Response(JSON.stringify({ error: 'Failed to load CSV data' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}