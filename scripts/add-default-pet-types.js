#!/usr/bin/env node
/**
 * Add default pet types to all vets
 * 
 * Logic: Most vets treat dogs and cats by default
 * Only specialty vets treat other animals
 */

import fs from 'fs';
import Papa from 'papaparse';

console.log('🐾 Adding default pet types to all vets...\n');

// Read main file
const content = fs.readFileSync('data/professionals.csv', 'utf-8');
const { data } = Papa.parse(content, { header: true, skipEmptyLines: true });

console.log(`📂 Processing ${data.length} profiles\n`);

let updated = 0;

data.forEach(profile => {
  // Check if pet_types_served is empty or missing
  const current = profile.pet_types_served;
  
  if (!current || current === '' || current === '[]' || current === 'null') {
    // Set default: dogs and cats
    profile.pet_types_served = JSON.stringify(['dogs', 'cats']);
    updated++;
  }
});

console.log(`✅ Updated ${updated} profiles with default pet types ["dogs", "cats"]\n`);

// Backup
const backupFile = `data/professionals-backup-${new Date().toISOString().split('T')[0]}-before-pets.csv`;
fs.copyFileSync('data/professionals.csv', backupFile);
console.log(`💾 Backed up to: ${backupFile}\n`);

// Write
const csv = Papa.unparse(data, { quotes: true });
fs.writeFileSync('data/professionals.csv', csv);

console.log(`📝 Updated data/professionals.csv`);
console.log(`\n✅ DONE! Now restart dev server to see pet types.\n`);
