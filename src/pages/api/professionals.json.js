import { loadAllCsvData } from '../../lib/csvToJson.js';

export async function GET({ params, request }) {
  try {
    const allData = loadAllCsvData();
    
    // Return all CSV data for admin use
    return new Response(JSON.stringify(allData), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300' // Cache for 5 minutes
      }
    });
  } catch (error) {
    console.error('Error loading CSV data:', error);
    return new Response(JSON.stringify({ error: 'Failed to load data' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}