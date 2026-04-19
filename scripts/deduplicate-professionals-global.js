import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';

/**
 * Deduplicate professionals CSV files GLOBALLY across all files
 * Based on phone number, address, and name
 * If all three match, keep only the first occurrence across ALL files
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

// Read all CSV files
function readAllFiles(files) {
  const allData = [];
  
  for (const filename of files) {
    const filePath = path.join(DATA_DIR, filename);
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const parsed = Papa.parse(fileContent, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false
    });
    
    allData.push({
      filename,
      records: parsed.data
    });
  }
  
  return allData;
}

// Main execution
async function main() {
  console.log('='.repeat(60));
  console.log('GLOBAL DEDUPLICATION OF PROFESSIONALS CSV FILES');
  console.log('='.repeat(60));
  console.log('\nCriteria: Same name + phone + address = duplicate');
  console.log('Action: Keep first occurrence GLOBALLY, remove from all files\n');
  
  // Find all professionals*.csv files
  const files = fs.readdirSync(DATA_DIR)
    .filter(file => file.startsWith('professionals') && file.endsWith('.csv'))
    .sort();
  
  console.log(`Found ${files.length} professionals CSV files to process\n`);
  
  // Create backup directory if it doesn't exist
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
  
  // Backup all files first
  console.log('Creating backups...');
  for (const file of files) {
    const filePath = path.join(DATA_DIR, file);
    const backupPath = path.join(BACKUP_DIR, `${file}.backup-${Date.now()}`);
    fs.copyFileSync(filePath, backupPath);
  }
  console.log('✓ All files backed up\n');
  
  // Read all files
  console.log('Reading all files...');
  const allData = readAllFiles(files);
  const totalOriginal = allData.reduce((sum, file) => sum + file.records.length, 0);
  console.log(`✓ Read ${totalOriginal} total records\n`);
  
  // Track seen keys globally
  const seenKeys = new Map();
  const duplicates = [];
  const fileResults = [];
  
  console.log('Deduplicating across all files...\n');
  
  // Process each file
  for (const fileData of allData) {
    const uniqueRecords = [];
    let removedCount = 0;
    
    for (const record of fileData.records) {
      const key = createDedupeKey(record);
      
      // If no key (missing data), keep the record
      if (!key) {
        uniqueRecords.push(record);
        continue;
      }
      
      // Check if we've seen this combination before (globally)
      if (seenKeys.has(key)) {
        const original = seenKeys.get(key);
        duplicates.push({
          name: record.name,
          phone: record.phone_number,
          address: record.address,
          originalFile: original.file,
          duplicateFile: fileData.filename,
          originalId: original.id,
          duplicateId: record.id
        });
        removedCount++;
      } else {
        seenKeys.set(key, {
          file: fileData.filename,
          id: record.id,
          name: record.name
        });
        uniqueRecords.push(record);
      }
    }
    
    fileResults.push({
      filename: fileData.filename,
      original: fileData.records.length,
      unique: uniqueRecords.length,
      removed: removedCount
    });
    
    // Write deduplicated data back to file
    const filePath = path.join(DATA_DIR, fileData.filename);
    const output = Papa.unparse(uniqueRecords, {
      quotes: true,
      header: true
    });
    
    fs.writeFileSync(filePath, output, 'utf-8');
    
    console.log(`  ${fileData.filename}: ${fileData.records.length} → ${uniqueRecords.length} (removed ${removedCount})`);
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('DEDUPLICATION SUMMARY');
  console.log('='.repeat(60));
  
  const totalUnique = fileResults.reduce((sum, r) => sum + r.unique, 0);
  const totalRemoved = fileResults.reduce((sum, r) => sum + r.removed, 0);
  
  console.log(`\nTotal records processed: ${totalOriginal}`);
  console.log(`Total unique records: ${totalUnique}`);
  console.log(`Total duplicates removed: ${totalRemoved}`);
  console.log(`Reduction: ${((totalRemoved / totalOriginal) * 100).toFixed(2)}%`);
  
  if (duplicates.length > 0) {
    console.log(`\n${'='.repeat(60)}`);
    console.log('DUPLICATES FOUND (showing first 20):');
    console.log('='.repeat(60));
    
    duplicates.slice(0, 20).forEach((dup, index) => {
      console.log(`\n${index + 1}. ${dup.name}`);
      console.log(`   Phone: ${dup.phone}`);
      console.log(`   Address: ${dup.address}`);
      console.log(`   Original: ${dup.originalFile} (ID: ${dup.originalId})`);
      console.log(`   Duplicate: ${dup.duplicateFile} (ID: ${dup.duplicateId})`);
    });
    
    if (duplicates.length > 20) {
      console.log(`\n... and ${duplicates.length - 20} more duplicates`);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✓ Global deduplication complete!');
  console.log(`✓ Backups saved to: ${BACKUP_DIR}`);
  console.log('\nNext steps:');
  console.log('  1. Review the changes above');
  console.log('  2. Run: npm run build:fast');
  console.log('  3. Test the site to ensure everything works');
  console.log('  4. If issues occur, restore from backups\n');
}

main().catch(console.error);
