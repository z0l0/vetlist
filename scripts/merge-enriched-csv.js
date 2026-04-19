#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    main: null,
    enriched: null,
    output: null,
  };

  for (const arg of args) {
    if (arg.startsWith('--main=')) options.main = arg.split('=').slice(1).join('=').replace(/^"|"$/g, '');
    else if (arg.startsWith('--enriched=')) options.enriched = arg.split('=').slice(1).join('=').replace(/^"|"$/g, '');
    else if (arg.startsWith('--output=')) options.output = arg.split('=').slice(1).join('=').replace(/^"|"$/g, '');
  }

  if (!options.main || !options.enriched) {
    console.error('Usage: node scripts/merge-enriched-csv.js --main=data/professionals-canada.csv --enriched=data/enriched-ontario.csv [--output=data/professionals-canada.csv]');
    process.exit(1);
  }

  if (!options.output) options.output = options.main;
  return options;
}

function readCsv(filePath) {
  const raw = fs.readFileSync(filePath, 'utf-8');
  return Papa.parse(raw, { header: true, skipEmptyLines: true });
}

function normalizeUrl(url) {
  if (!url) return null;
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    return `${parsed.origin}${parsed.pathname.replace(/\/$/, '')}`;
  } catch {
    return null;
  }
}

function isMeaningful(value) {
  if (value === undefined || value === null) return false;
  if (typeof value !== 'string') return true;

  const trimmed = value.trim();
  if (!trimmed) return false;

  const normalized = trimmed.toLowerCase();
  return !['null', 'undefined', 'nan'].includes(normalized);
}

function buildLookup(rows) {
  const lookup = new Map();

  for (const row of rows) {
    if (isMeaningful(row.id)) lookup.set(`id:${row.id}`, row);

    const url = normalizeUrl(row.website);
    if (url) lookup.set(`url:${url}`, row);

    const name = row.name?.trim();
    const city = row.city?.trim();
    const province = row.province?.trim();
    if (name && city && province) {
      lookup.set(`name:${name.toLowerCase()}|${city.toLowerCase()}|${province.toLowerCase()}`, row);
    }
  }

  return lookup;
}

function findMatch(row, lookup) {
  if (isMeaningful(row.id) && lookup.has(`id:${row.id}`)) {
    return { key: `id:${row.id}`, row: lookup.get(`id:${row.id}`), type: 'id' };
  }

  const url = normalizeUrl(row.website);
  if (url && lookup.has(`url:${url}`)) {
    return { key: `url:${url}`, row: lookup.get(`url:${url}`), type: 'website' };
  }

  const name = row.name?.trim();
  const city = row.city?.trim();
  const province = row.province?.trim();
  if (name && city && province) {
    const key = `name:${name.toLowerCase()}|${city.toLowerCase()}|${province.toLowerCase()}`;
    if (lookup.has(key)) {
      return { key, row: lookup.get(key), type: 'name-city-province' };
    }
  }

  return null;
}

function ensureBackupDirectory(outputPath) {
  const backupDir = path.join(path.dirname(outputPath), 'backups');
  fs.mkdirSync(backupDir, { recursive: true });
  return backupDir;
}

function createBackupIfOverwriting(outputPath) {
  const absoluteOutput = path.resolve(outputPath);
  if (!fs.existsSync(absoluteOutput)) return null;

  const backupDir = ensureBackupDirectory(absoluteOutput);
  const timestamp = Date.now();
  const backupPath = path.join(backupDir, `${path.basename(outputPath)}.backup-${timestamp}`);
  fs.copyFileSync(absoluteOutput, backupPath);
  return backupPath;
}

function main() {
  const options = parseArgs();
  const mainPath = path.resolve(options.main);
  const enrichedPath = path.resolve(options.enriched);
  const outputPath = path.resolve(options.output);

  if (!fs.existsSync(mainPath)) {
    console.error(`Main CSV not found: ${mainPath}`);
    process.exit(1);
  }

  if (!fs.existsSync(enrichedPath)) {
    console.error(`Enriched CSV not found: ${enrichedPath}`);
    process.exit(1);
  }

  const mainParsed = readCsv(mainPath);
  const enrichedParsed = readCsv(enrichedPath);

  const mainRows = mainParsed.data;
  const enrichedRows = enrichedParsed.data;
  const allColumns = Array.from(new Set([...(mainParsed.meta.fields || []), ...(enrichedParsed.meta.fields || [])]));
  const lookup = buildLookup(enrichedRows);

  let mergedCount = 0;
  let idMatches = 0;
  let websiteMatches = 0;
  let nameMatches = 0;
  let enrichedFieldsApplied = 0;

  const mergedRows = mainRows.map((row) => {
    const match = findMatch(row, lookup);
    if (!match) {
      const withAllColumns = {};
      for (const column of allColumns) withAllColumns[column] = row[column] ?? '';
      return withAllColumns;
    }

    mergedCount++;
    if (match.type === 'id') idMatches++;
    if (match.type === 'website') websiteMatches++;
    if (match.type === 'name-city-province') nameMatches++;

    const mergedRow = {};
    for (const column of allColumns) {
      const enrichedValue = match.row[column];
      if (isMeaningful(enrichedValue)) {
        mergedRow[column] = enrichedValue;
        if (row[column] !== enrichedValue) enrichedFieldsApplied++;
      } else {
        mergedRow[column] = row[column] ?? '';
      }
    }
    return mergedRow;
  });

  const backupPath = createBackupIfOverwriting(outputPath);
  const outputCsv = Papa.unparse(mergedRows, { columns: allColumns, quotes: true });
  fs.writeFileSync(outputPath, outputCsv, 'utf-8');

  console.log('\n=== MERGE COMPLETE ===');
  console.log(`Main rows: ${mainRows.length}`);
  console.log(`Enriched rows: ${enrichedRows.length}`);
  console.log(`Matched main rows: ${mergedCount}`);
  console.log(`Match breakdown: id=${idMatches} website=${websiteMatches} name+city+province=${nameMatches}`);
  console.log(`Updated field values: ${enrichedFieldsApplied}`);
  if (backupPath) console.log(`Backup: ${backupPath}`);
  console.log(`Output: ${outputPath}\n`);
}

main();
