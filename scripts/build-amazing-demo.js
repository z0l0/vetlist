import fs from 'fs';
import Papa from 'papaparse';

const scraped = JSON.parse(fs.readFileSync('data/parallel-test-results.json', 'utf-8'));
const scrapedMap = new Map(scraped.results.filter(r => r.status === 'success').map(r => [r.name, r]));

const csv = fs.readFileSync('data/professionals.csv', 'utf-8');
const profiles = Papa.parse(csv, { header: true, skipEmptyLines: true }).data;

// Get enriched profiles
const enriched = profiles
  .filter(p => scrapedMap.has(p.name))
  .map(p => ({ ...p, scraped: scrapedMap.get(p.name).extraction }))
  .filter(p => p.scraped.confidence_score >= 6)
  .slice(0, 20); // Use 20 for better demo

// Calculate stats
const stats = {
  total: enriched.length,
  emergency: enriched.filter(p => p.scraped.emergency_services === true).length,
  telehealth: enriched.filter(p => p.scraped.telehealth_available === true).length,
  booking: enriched.filter(p => p.scraped.online_booking === true).length,
  payment: enriched.filter(p => p.scraped.payment_plans?.length > 0).length,
  accredited: enriched.filter(p => p.scraped.accreditations?.length > 0).length,
  hasServices: enriched.filter(p => p.scraped.services_offered?.length > 0).length,
  exotic: enriched.filter(p => {
    const pets = p.scraped.pet_types_served || [];
    return pets.some(a => a.toLowerCase().includes('exotic') || a.toLowerCase().includes('bird') || a.toLowerCase().includes('reptile'));
  }).length
};

console.log('Stats:', stats);

// Save for HTML generation
fs.writeFileSync('data/demo-stats.json', JSON.stringify({ profiles: enriched, stats }, null, 2));
console.log('Saved enriched data');
