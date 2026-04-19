import fs from 'fs';
import Papa from 'papaparse';

// Load scraped results
const scraped = JSON.parse(fs.readFileSync('data/parallel-test-results.json', 'utf-8'));
const scrapedMap = new Map(scraped.results.map(r => [r.name, r]));

// Load original CSV
const csv = fs.readFileSync('data/professionals.csv', 'utf-8');
const profiles = Papa.parse(csv, { header: true, skipEmptyLines: true }).data;

// Find best examples with real data
const enriched = profiles
  .filter(p => scrapedMap.has(p.name) && scrapedMap.get(p.name).status === 'success')
  .map(p => ({ ...p, scraped: scrapedMap.get(p.name).extraction }))
  .filter(p => p.scraped.confidence_score >= 7); // Only high quality

// Get specific examples
const emergency = enriched.filter(p => p.scraped.emergency_services === true).slice(0, 3);
const booking = enriched.filter(p => p.scraped.online_booking === true).slice(0, 2);
const accredited = enriched.filter(p => p.scraped.accreditations?.length > 0).slice(0, 2);
const payment = enriched.filter(p => p.scraped.payment_plans?.length > 0);
const exotic = enriched.filter(p => p.scraped.pet_types_served?.some(a => 
  a.toLowerCase().includes('exotic') || 
  a.toLowerCase().includes('bird') || 
  a.toLowerCase().includes('reptile')
)).slice(0, 2);

// Pick 6 diverse examples
const examples = [
  ...accredited.slice(0, 1),
  ...payment.slice(0, 1),
  ...exotic.slice(0, 1),
  ...emergency.slice(0, 2),
  ...booking.slice(0, 1)
].slice(0, 6);

console.log('Selected profiles:', examples.map(p => p.name));
console.log('\nGenerating HTML...\n');

// Save for use
fs.writeFileSync('data/demo-profiles.json', JSON.stringify(examples, null, 2));
console.log('Saved to data/demo-profiles.json');
