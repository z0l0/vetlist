#!/usr/bin/env node
/**
 * Properly merge enriched Ontario data into professionals.csv
 * Adds new columns and updates Ontario profiles
 */

import fs from 'fs';
import Papa from 'papaparse';

const MAIN_FILE = 'data/professionals.csv';
const ENRICHED_FILE = 'data/ontario-all.csv';
const OUTPUT_FILE = 'data/professionals.csv';

console.log('📊 Merging enriched Ontario data properly...\n');

// Read main file
const mainContent = fs.readFileSync(MAIN_FILE, 'utf-8');
const { data: mainData, meta: mainMeta } = Papa.parse(mainContent, { header: true, skipEmptyLines: true });

// Read enriched file
const enrichedContent = fs.readFileSync(ENRICHED_FILE, 'utf-8');
const { data: enrichedData, meta: enrichedMeta } = Papa.parse(enrichedContent, { header: true, skipEmptyLines: true });

console.log(`📂 Main file: ${mainData.length} profiles`);
console.log(`📂 Enriched file: ${enrichedData.length} profiles`);

// Get all unique columns from both files
const allColumns = [...new Set([...mainMeta.fields, ...enrichedMeta.fields])];
console.log(`📋 Total columns: ${allColumns.length} (main: ${mainMeta.fields.length}, enriched: ${enrichedMeta.fields.length})`);

// Create lookup by ID
const enrichedMap = new Map();
enrichedData.forEach(row => {
  if (row.id) enrichedMap.set(row.id, row);
});

console.log(`🔄 Merging...\n`);

// Merge - for Ontario profiles, use enriched data; for others, keep original
let updated = 0;
const mergedData = mainData.map(row => {
  const enriched = enrichedMap.get(row.id);
  if (enriched) {
    updated++;
    // Merge: enriched data takes precedence, but keep original for missing fields
    const merged = {};
    allColumns.forEach(col => {
      merged[col] = enriched[col] !== undefined && enriched[col] !== '' ? enriched[col] : row[col];
    });
    return merged;
  }
  // Not enriched - add empty values for new columns
  const withNewCols = {};
  allColumns.forEach(col => {
    withNewCols[col] = row[col] !== undefined ? row[col] : '';
  });
  return withNewCols;
});

console.log(`✅ Updated ${updated} Ontario profiles with enriched data`);

// Write output
const csv = Papa.unparse(mergedData, { columns: allColumns, quotes: true });
fs.writeFileSync(OUTPUT_FILE, csv);

console.log(`📁 Output: ${OUTPUT_FILE}`);
console.log(`\n✅ Done! professionals.csv now has enriched Ontario data.`);
