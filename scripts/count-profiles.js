import fs from 'fs';
import Papa from 'papaparse';

let total = 0;
let withWebsites = 0;

for (let i = 1; i <= 10; i++) {
  const file = i === 1 ? 'data/professionals.csv' : `data/professionals${i}.csv`;
  if (!fs.existsSync(file)) continue;
  const csv = fs.readFileSync(file, 'utf-8');
  const data = Papa.parse(csv, { header: true, skipEmptyLines: true }).data;
  const valid = data.filter(r => r.website?.trim() && !r.website.includes('facebook.com') && r.website.startsWith('http'));
  console.log(`${file}: ${data.length} total, ${valid.length} with websites`);
  total += data.length;
  withWebsites += valid.length;
}
console.log(`\nTOTAL: ${total} profiles, ${withWebsites} with scrapable websites`);
console.log(`Estimated scrape cost: $${(withWebsites * 0.00021).toFixed(2)}`);
console.log(`Estimated time: ~${Math.round(withWebsites * 2.5 / 60)} minutes (~${(withWebsites * 2.5 / 3600).toFixed(1)} hours)`);
