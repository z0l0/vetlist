import fs from 'fs';
import path from 'path';

export function loadAllCsvData() {
  const dataDir = path.join(process.cwd(), 'data');
  const allData = {};
  
  // Get all CSV files in the data directory
  const files = fs.readdirSync(dataDir).filter(file => file.endsWith('.csv'));
  
  files.forEach(filename => {
    const csvPath = path.join(dataDir, filename);
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    
    const lines = csvContent.split('\n');
    const headers = lines[0].split(',');
    const data = [];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;
      
      const values = parseCSVLine(line);
      const record = {};
      
      headers.forEach((header, index) => {
        record[header] = values[index] || '';
      });
      
      // Add metadata about which file this record came from
      record._sourceFile = filename;
      record._sourceIndex = i;
      
      data.push(record);
    }
    
    // Store data by filename (without extension)
    const fileKey = filename.replace('.csv', '');
    allData[fileKey] = data;
  });
  
  return allData;
}

// Keep the old function for backward compatibility
export function loadProfessionalsData() {
  const allData = loadAllCsvData();
  return allData.profressionals || [];
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  
  return result;
}