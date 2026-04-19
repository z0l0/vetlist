# Professional Data Deduplication Guide

## Overview

This guide explains how to deduplicate professional listings across all CSV files in the `data/` directory.

## Problem

Sometimes the same veterinary clinic appears multiple times across different CSV files with slight variations:
- Different phone number formats: `(604) 854-2313` vs `+1 604-854-2313`
- Same name, address, and phone number
- Results in duplicate listings on city pages

## Solution

We have two deduplication scripts:

### 1. Single-File Deduplication (Basic)
```bash
npm run dedupe
```

**What it does:**
- Deduplicates within each CSV file individually
- Faster but misses duplicates across different files
- Good for quick cleanup of a single file

### 2. Global Deduplication (Recommended)
```bash
npm run dedupe:global
```

**What it does:**
- Deduplicates across ALL CSV files globally
- Keeps the first occurrence, removes all subsequent duplicates
- Handles phone number variations (with/without country code)
- More thorough and catches cross-file duplicates

## Deduplication Criteria

A record is considered a duplicate if ALL THREE fields match:
1. **Name** (normalized: lowercase, trimmed)
2. **Phone Number** (normalized: removes formatting, handles +1 country code)
3. **Address** (normalized: lowercase, trimmed)

### Phone Number Normalization Examples
- `(604) 854-2313` → `6048542313`
- `+1 604-854-2313` → `6048542313`
- `604.854.2313` → `6048542313`
- `1-604-854-2313` → `6048542313`

All of these are considered the same phone number.

## Recent Deduplication Results

**Date:** November 12, 2024

**Results:**
- Total records processed: 27,937
- Unique records: 27,893
- Duplicates removed: 44
- Reduction: 0.16%

**Files with most duplicates:**
- `professionals7.csv`: 26 duplicates removed
- `professionals6.csv`: 11 duplicates removed
- `professionals5.csv`: 2 duplicates removed
- `professionals3.csv`: 2 duplicates removed
- `professionals9.csv`: 2 duplicates removed
- `professionals4.csv`: 1 duplicate removed

**Notable duplicates removed:**
- Shelley Horvat DVM (Abbotsford, BC) - duplicate in professionals7.csv
- Desert Mountain Animal Hospital (Sonoita, AZ)
- Clearwater Animal Hospital (Windsor, ON)
- Barlow Trail Animal Hospital (Calgary, AB)
- And 40 more...

## Safety Features

### Automatic Backups
Before any deduplication, the script automatically creates backups:
- Location: `data/backups/`
- Format: `professionals.csv.backup-[timestamp]`
- All original files are preserved

### Restore from Backup
If something goes wrong, restore the original files:

```bash
# Restore all files from the most recent backup
for file in data/backups/professionals*.backup-[timestamp]; do 
  original=$(echo $file | sed 's|data/backups/||' | sed 's|\.backup-.*||')
  cp "$file" "data/$original"
  echo "Restored $original"
done
```

Replace `[timestamp]` with the actual timestamp from your backup files.

## Workflow

### Step 1: Run Global Deduplication
```bash
npm run dedupe:global
```

### Step 2: Review the Output
The script will show:
- How many duplicates were found
- Which files had duplicates
- Details of the first 20 duplicates (name, phone, address, original file, duplicate file)

### Step 3: Rebuild the Site
```bash
npm run build:fast
```

### Step 4: Test
- Check city pages to ensure duplicates are gone
- Verify no legitimate listings were removed
- Test search functionality

### Step 5: Deploy
If everything looks good, deploy the changes:
```bash
npm run build:full
```

## When to Run Deduplication

Run deduplication when:
- ✅ Adding new CSV files with professional data
- ✅ Merging data from multiple sources
- ✅ Users report seeing duplicate listings
- ✅ After bulk data imports
- ✅ Periodically (monthly) as maintenance

Don't run deduplication:
- ❌ During active development (wait until stable)
- ❌ Right before a critical deployment (test first)
- ❌ If you're not sure what it does (read this guide first)

## Technical Details

### Script Locations
- Single-file: `scripts/deduplicate-professionals.js`
- Global: `scripts/deduplicate-professionals-global.js`

### Dependencies
- `papaparse` - CSV parsing and generation
- Node.js built-in `fs` and `path` modules

### How It Works

1. **Read all CSV files** into memory
2. **Create a global map** of seen records (key = name + phone + address)
3. **Process each file** in order:
   - For each record, create a normalized key
   - If key exists in global map → mark as duplicate
   - If key is new → add to global map and keep record
4. **Write deduplicated data** back to each file
5. **Generate report** showing what was removed

### Performance
- Processes ~28,000 records in ~2 seconds
- Memory usage: ~50MB for all files
- Safe for files up to 100,000 records

## Troubleshooting

### Issue: Script removes legitimate listings
**Cause:** Two different businesses with the same name, phone, and address (rare but possible)

**Solution:** 
1. Restore from backup
2. Manually review the duplicates in the output
3. If needed, modify one of the records slightly (e.g., add "Suite A" to address)
4. Run deduplication again

### Issue: Script doesn't catch a duplicate
**Cause:** Name, phone, or address differs slightly

**Solution:**
1. Check the exact values in both records
2. Normalize them manually to match
3. Run deduplication again

### Issue: Build fails after deduplication
**Cause:** CSV format issue or missing required fields

**Solution:**
1. Restore from backup
2. Check the error message
3. Fix the CSV format issue
4. Run deduplication again

## Future Improvements

Potential enhancements:
- [ ] Fuzzy matching for similar names (e.g., "Dr. Smith" vs "Smith DVM")
- [ ] Address normalization (e.g., "St" vs "Street")
- [ ] Interactive mode to review duplicates before removal
- [ ] Merge duplicate records (combine services, hours, etc.)
- [ ] Detect near-duplicates (same phone, different address)

## Questions?

If you're unsure about running deduplication:
1. Read this guide thoroughly
2. Run the script and review the output (it shows what will be removed)
3. Check the backups are created
4. Test on a small subset first if concerned

The script is safe and reversible - backups are always created automatically.
