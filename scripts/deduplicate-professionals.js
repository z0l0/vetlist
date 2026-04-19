import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';

/**
 * Deduplicate professionals CSV files based on phone number, address, and name
 * If all three match, keep only the first occurrence
 */

const DATA_DIR = './data';
const BACKUP_DIR = './data/backups';

// Normalize phone number for comparison (remove formatting and country code)
function normalizePhone(phone) {
  if (!phone) return '';
  // Remove all formatting characters
  let normalized = phone.replace(/[\s\-\(\)\+]/g, '').toLowerCase();
  // Remove leading 1 (North American country code) if present
  if (normalized.startsWith('1') && normalized.length === 11) {
    normalized = normalized.substring(1);
  }
  return normalized;
}

// Normalize address for comparison (lowercase, remove extra spaces)
function normalizeAddress(address) {
  if (!address) return '';
  return address.toLowerCase().trim().replace(/\s+/g, ' ');
}

// Normalize name for comparison (lowercase, remove extra spaces)
function normalizeName(name) {
  if (!name) return '';
  return name.toLowerCase().trim().replace(/\s+/g, ' ');
}

// Create a unique key for deduplication
function createDedupeKey(record) {
  const phone = normalizePhone(record.phone_number);
  const address = normalizeAddress(record.address);
  const name = normalizeName(record.name);
  
  // Only create key if all three fields exist
  if (!phone || !address || !name) {
    return null;
  }
  
  return `${name}|${phone}|${address}`;
}

// Process a single CSV file
function deduplicateFile(filename) {
  const filePath = path.join(DATA_DIR, filename);
  
  console.log(`\nProcessing ${filename}...`);
  
  // Read the CSV file
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const parsed = Papa.parse(fileContent, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false
  });
  
  const records = parsed.data;
  
  console.log(`  Original records: ${records.length}`);
  
  // Track seen keys and duplicates
  const seenKeys = new Map();
  const uniqueRecords = [];
  const duplicates = [];
  
  for (const record of records) {
    const key = createDedupeKey(record);
    
    // If no key (missing data), keep the record
    if (!key) {
      uniqueRecords.push(record);
      continue;
    }
    
    // Check if we've seen this combination before
    if (seenKeys.has(key)) {
      duplicates.push({
        name: record.name,
        phone: record.phone_number,
        address: record.address,
        originalId: seenKeys.get(key),
        duplicateId: record.id
      });
    } else {
      seenKeys.set(key, record.id);
      uniqueRecords.push(record);
    }
  }
  
  console.log(`  Unique records: ${uniqueRecords.length}`);
  console.log(`  Duplicates removed: ${duplicates.length}`);
  
  // Log duplicates found
  if (duplicates.length > 0) {
    console.log(`\n  Duplicates found in ${filename}:`);
    duplicates.forEach(dup => {
      console.log(`    - ${dup.name} (${dup.phone}) at ${dup.address}`);
      console.log(`      Kept ID: ${dup.originalId}, Removed ID: ${dup.duplicateId}`);
    });
  }
  
  // Create backup directory if it doesn't exist
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
  
  // Backup original file
  const backupPath = path.join(BACKUP_DIR, `${filename}.backup-${Date.now()}`);
  fs.copyFileSync(filePath, backupPath);
  console.log(`  Backup created: ${backupPath}`);
  
  // Write deduplicated data back to file
  const output = Papa.unparse(uniqueRecords, {
    quotes: true,
    header: true
  });
  
  fs.writeFileSync(filePath, output, 'utf-8');
  console.log(`  ✓ File updated: ${filePath}`);
  
  return {
    filename,
    original: records.length,
    unique: uniqueRecords.length,
    removed: duplicates.length,
    duplicates
  };
}

// Main execution
async function main() {
  console.log('='.repeat(60));
  console.log('DEDUPLICATING PROFESSIONALS CSV FILES');
  console.log('='.repeat(60));
  console.log('\nCriteria: Same name + phone + address = duplicate');
  console.log('Action: Keep first occurrence, remove subsequent duplicates\n');
  
  // Find all professionals*.csv files
  const files = fs.readdirSync(DATA_DIR)
    .filter(file => file.startsWith('professionals') && file.endsWith('.csv'))
    .sort();
  
  console.log(`Found ${files.length} professionals CSV files to process\n`);
  
  const results = [];
  
  for (const file of files) {
    try {
      const result = deduplicateFile(file);
      results.push(result);
    } catch (error) {
      console.error(`  ✗ Error processing ${file}:`, error.message);
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('DEDUPLICATION SUMMARY');
  console.log('='.repeat(60));
  
  const totalOriginal = results.reduce((sum, r) => sum + r.original, 0);
  const totalUnique = results.reduce((sum, r) => sum + r.unique, 0);
  const totalRemoved = results.reduce((sum, r) => sum + r.removed, 0);
  
  console.log(`\nTotal records processed: ${totalOriginal}`);
  console.log(`Total unique records: ${totalUnique}`);
  console.log(`Total duplicates removed: ${totalRemoved}`);
  console.log(`Reduction: ${((totalRemoved / totalOriginal) * 100).toFixed(2)}%`);
  
  console.log('\nPer-file breakdown:');
  results.forEach(r => {
    console.log(`  ${r.filename}: ${r.original} → ${r.unique} (removed ${r.removed})`);
  });
  
  console.log('\n✓ Deduplication complete!');
  console.log(`✓ Backups saved to: ${BACKUP_DIR}`);
  console.log('\nNext steps:');
  console.log('  1. Review the changes');
  console.log('  2. Run: npm run build:fast');
  console.log('  3. Test the site to ensure everything works');
  console.log('  4. If issues occur, restore from backups\n');
}

main().catch(console.error);
