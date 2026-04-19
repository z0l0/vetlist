#!/usr/bin/env node
/**
 * Extract Toronto vets from ALL professionals CSV files
 * Creates a single file for testing the scraper
 */

import fs from 'fs';
import Papa from 'papaparse';

const csvFiles = [
  'data/professionals.csv',
  'data/professionals2.csv',
  'data/professionals3.csv',
  'data/professionals4.csv',
  'data/professionals5.csv',
  'data/professionals6.csv',
  'data/professionals7.csv',
  'data/professionals8.csv',
  'data/professionals9.csv',
  'data/professionals10.csv'
];

console.log('🔍 Extracting Toronto vets from all CSV files...\n');

let allTorontoVets = [];

for (const file of csvFiles) {
  if (!fs.existsSync(file)) {
    console.log(`⚠️  Skipping ${file} (not found)`);
    continue;
  }
  
  const content = fs.readFileSync(file, 'utf-8');
  const { data } = Papa.parse(content, { header: true, skipEmptyLines: true });
  
  const torontoVets = data.filter(p => 
    p.city?.toLowerCase() === 'toronto' && 
    p.province?.toLowerCase().includes('ontario')
  );
  
  console.log(`📂 ${file}: ${torontoVets.length} Toronto vets (of ${data.length} total)`);
  allTorontoVets.push(...torontoVets);
}

// Remove duplicates by name
const uniqueVets = [];
const seenNames = new Set();
for (const vet of allTorontoVets) {
  if (!seenNames.has(vet.name)) {
    seenNames.add(vet.name);
    uniqueVets.push(vet);
  }
}

console.log(`\n📊 Total Toronto vets: ${allTorontoVets.length}`);
console.log(`📊 Unique Toronto vets: ${uniqueVets.length}`);
console.log(`🌐 With websites: ${uniqueVets.filter(v => v.website && v.website.trim()).length}`);

// Save to file
const outputPath = 'data/toronto-vets.csv';
const csv = Papa.unparse(uniqueVets);
fs.writeFileSync(outputPath, csv);

console.log(`\n✅ Saved to: ${outputPath}`);
console.log(`\n🚀 Now run:`);
console.log(`   node scripts/production-scraper-v2.js data/toronto-vets.csv`);
