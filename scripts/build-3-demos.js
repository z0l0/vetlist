import fs from 'fs';
import Papa from 'papaparse';

const scraped = JSON.parse(fs.readFileSync('data/parallel-test-results.json', 'utf-8'));
const scrapedMap = new Map(scraped.results.filter(r => r.status === 'success').map(r => [r.name, r]));

const csv = fs.readFileSync('data/professionals.csv', 'utf-8');
const allProfiles = Papa.parse(csv, { header: true, skipEmptyLines: true }).data;

// Get enriched profiles
const enriched = allProfiles
  .filter(p => scrapedMap.has(p.name))
  .map(p => ({ ...p, scraped: scrapedMap.get(p.name).extraction }))
  .filter(p => p.scraped.confidence_score >= 6);

// Group by city
const byCity = {};
enriched.forEach(p => {
  const key = `${p.city}, ${p.province}`;
  if (!byCity[key]) byCity[key] = [];
  byCity[key].push(p);
});

// Find cities of different sizes
const cities = Object.entries(byCity).map(([name, vets]) => ({ name, vets, count: vets.length }));
cities.sort((a, b) => b.count - a.count);

const large = cities.find(c => c.count >= 8); // 8+ vets
const medium = cities.find(c => c.count >= 4 && c.count < 8); // 4-7 vets
const small = cities.find(c => c.count >= 2 && c.count < 4); // 2-3 vets

console.log('Large city:', large?.name, '(' + large?.count + ' vets)');
console.log('Medium city:', medium?.name, '(' + medium?.count + ' vets)');
console.log('Small city:', small?.name, '(' + small?.count + ' vets)');

// Save for HTML generation
fs.writeFileSync('data/demo-cities.json', JSON.stringify({ large, medium, small }, null, 2));
console.log('\nSaved to data/demo-cities.json');
