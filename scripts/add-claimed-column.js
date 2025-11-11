import fs from 'fs/promises';
import Papa from 'papaparse';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// List of claimed listings (from the user's request)
const claimedListings = [
  'colchester-veterinary-hospital',
  'sissiboo-veterinary-services-ltd',
  'waterside-veterinary-services'
];

async function addClaimedColumn() {
  const dataDir = path.join(__dirname, '..', 'data');
  const files = [
    'professionals.csv',
    'professionals2.csv',
    'professionals3.csv',
    'professionals4.csv',
    'professionals5.csv',
    'professionals6.csv',
    'professionals7.csv',
    'professionals8.csv',
    'professionals9.csv',
    'professionals10.csv'
  ];

  for (const file of files) {
    const filePath = path.join(dataDir, file);
    
    try {
      // Check if file exists
      await fs.access(filePath);
      
      console.log(`Processing ${file}...`);
      
      // Read the CSV file
      const csvContent = await fs.readFile(filePath, 'utf-8');
      const { data, meta } = Papa.parse(csvContent, { header: true, skipEmptyLines: true });
      
      // Check if 'claimed' column already exists
      if (meta.fields.includes('claimed')) {
        console.log(`  - 'claimed' column already exists in ${file}, skipping...`);
        continue;
      }
      
      // Add 'claimed' column to each row
      let claimedCount = 0;
      const updatedData = data.map(row => {
        // Create slug from name for comparison
        const nameSlug = row.name
          .toString()
          .toLowerCase()
          .trim()
          .replace(/\s+/g, '-')
          .replace(/[^\w-]+/g, '')
          .replace(/--+/g, '-')
          .replace(/-?\d+$/, '');
        
        // Check if this listing is claimed
        const isClaimed = claimedListings.includes(nameSlug);
        if (isClaimed) {
          claimedCount++;
          console.log(`  - Found claimed listing: ${row.name} (${nameSlug})`);
        }
        
        return {
          ...row,
          claimed: isClaimed ? 'true' : 'false'
        };
      });
      
      console.log(`  - Marked ${claimedCount} listings as claimed in ${file}`);
      
      // Convert back to CSV
      const csv = Papa.unparse(updatedData, {
        quotes: true,
        header: true
      });
      
      // Write back to file
      await fs.writeFile(filePath, csv, 'utf-8');
      console.log(`  - Updated ${file} successfully`);
      
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log(`  - ${file} not found, skipping...`);
      } else {
        console.error(`  - Error processing ${file}:`, error.message);
      }
    }
  }
  
  console.log('\nDone! All CSV files have been updated with the "claimed" column.');
}

addClaimedColumn().catch(console.error);
