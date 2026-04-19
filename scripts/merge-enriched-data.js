#!/usr/bin/env node
/**
 * Merge enriched data into main professionals.csv
 * 
 * Matches by website URL (normalized) or name+city+province
 * Updates enriched fields while keeping original data
 */

import fs from 'fs';
import Papa from 'papaparse';
import { createHash } from 'crypto';

const normalizeUrl = (url) => {
  if (!url) return null;
  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`);
    return u.origin + u.pathname.replace(/\/$/, '');
  } catch { return null; }
};

console.log('🔄 Merging enriched data into professionals.csv...\n');

// Read main file
const mainContent = fs.readFileSync('data/professionals.csv', 'utf-8');
const { data: mainData } = Papa.parse(mainContent, { header: true, skipEmptyLines: true });
console.log(`📂 Main file: ${mainData.length} profiles`);

// Read enriched file
const enrichedContent = fs.readFileSync('data/enriched-professionals-v3.csv', 'utf-8');
const { data: enrichedData } = Papa.parse(enrichedContent, { header: true, skipEmptyLines: true });
console.log(`📂 Enriched file: ${enrichedData.length} profiles\n`);

// Build lookup map by website URL and name+city
const enrichedMap = new Map();
enrichedData.forEach(profile => {
  const normUrl = normalizeUrl(profile.website);
  if (normUrl) {
    enrichedMap.set(normUrl, profile);
  }
  const nameKey = `${profile.name}|${profile.city}|${profile.province}`;
  enrichedMap.set(nameKey, profile);
});

console.log(`🔍 Built lookup map with ${enrichedMap.size} keys\n`);

// Enriched fields to merge
const enrichedFields = [
  'emergency_services', 'emergency_24_hour', 'online_booking', 'telehealth_available',
  'house_calls_available', 'mobile_vet_service', 'accepts_pet_insurance',
  'languages_spoken', 'services_offered', 'boarding', 'grooming', 'pharmacy',
  'accreditations', 'pet_types_served', 'year_established', 'veterinarian_count',
  'veterinarian_names', 'email_scraped', 'has_client_portal', 'social_facebook',
  'social_instagram', 'has_pricing', 'pricing_exam', 'pricing_vaccine', 'pricing_rabies',
  'pricing_spay_dog', 'pricing_spay_cat', 'pricing_neuter_dog', 'pricing_neuter_cat',
  'pricing_dental', 'pricing_blood_panel', 'pricing_fecal', 'pricing_microchip',
  'pricing_xray', 'pricing_nail_trim', 'pricing_anal_gland', 'pricing_ear_clean',
  'pricing_other', 'scraped', 'scraped_at'
];

// Merge data
let mergedCount = 0;
mainData.forEach(profile => {
  // Try to find enriched data
  const normUrl = normalizeUrl(profile.website);
  const nameKey = `${profile.name}|${profile.city}|${profile.province}`;
  
  let enriched = null;
  if (normUrl && enrichedMap.has(normUrl)) {
    enriched = enrichedMap.get(normUrl);
  } else if (enrichedMap.has(nameKey)) {
    enriched = enrichedMap.get(nameKey);
  }
  
  if (enriched) {
    // Merge enriched fields
    enrichedFields.forEach(field => {
      if (enriched[field] !== undefined && enriched[field] !== '') {
        profile[field] = enriched[field];
      }
    });
    mergedCount++;
  }
});

console.log(`✅ Merged ${mergedCount} profiles with enriched data\n`);

// Backup original
const backupFile = `data/professionals-backup-${new Date().toISOString().split('T')[0]}.csv`;
fs.copyFileSync('data/professionals.csv', backupFile);
console.log(`💾 Backed up original to: ${backupFile}\n`);

// Write merged data
const csv = Papa.unparse(mainData, { quotes: true });
fs.writeFileSync('data/professionals.csv', csv);
console.log(`📝 Wrote merged data to: data/professionals.csv`);
console.log(`\n✅ DONE! Now clear cache and rebuild:\n`);
console.log(`   rm -rf .astro dist`);
console.log(`   npm run build\n`);
