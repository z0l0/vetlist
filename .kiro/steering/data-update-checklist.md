---
inclusion: always
---

# Data Update Checklist - CRITICAL

When updating CSV data (scraping, enriching, merging), ALWAYS follow this checklist to avoid wasting time:

## 1. Check for Duplicate CSV Files

**Problem:** The site loads ALL CSV files in `data/` directory. If you have `professionals.csv`, `professionals2.csv`, `professionals3.csv`, etc., they ALL get loaded and cause data conflicts.

**Solution:**
```bash
# Check for duplicates
ls -1 data/professionals*.csv

# Move old files to backup
mkdir -p data/old-files
mv data/professionals[2-9]*.csv data/old-files/
mv data/professionals-*.csv data/old-files/  # except professionals.csv
```

**Keep ONLY:**
- `data/professionals.csv` (main file)
- `data/locations_details.csv` (if needed)
- `data/popular_vets.csv` (if needed)

## 2. Clear ALL Caches After Data Changes

**Problem:** Astro caches data in multiple places. Old data persists even after updating CSV files.

**Solution - Clear EVERYTHING:**
```bash
# Delete Astro cache
rm -rf .astro

# Delete build output
rm -rf dist

# Rebuild from scratch
npm run build
```

**NEVER skip cache clearing** when you've updated CSV data!

## 3. Dev Server vs Built Site

**Problem:** Dev server caches data separately from build. You might see old data in dev even after rebuilding.

**Solution:**
```bash
# After rebuilding, RESTART dev server
# Stop current server (Ctrl+C)
npm run dev

# Or check built HTML directly
open dist/canada/ontario/toronto/index.html
```

## 4. Verify Data Merge Success

After merging enriched data, ALWAYS verify:

```bash
# Check row count
wc -l data/professionals.csv

# Check for enriched fields
head -1 data/professionals.csv | tr ',' '\n' | grep emergency_services

# Check actual data
python3 -c "
import csv
with open('data/professionals.csv', 'r') as f:
    reader = csv.DictReader(f)
    ontario = [r for r in reader if r.get('province') == 'Ontario']
    with_emergency = [r for r in ontario if r.get('emergency_services') == 'true']
    print(f'Ontario: {len(ontario)}, With emergency: {len(with_emergency)}')
"
```

## 5. Common Issues Checklist

Before asking for help, check:

- [ ] Only ONE `professionals.csv` file exists (no professionals2.csv, etc.)
- [ ] `.astro` directory deleted
- [ ] `dist` directory deleted
- [ ] Full rebuild completed (`npm run build`)
- [ ] Dev server restarted (if using dev mode)
- [ ] Verified data in CSV file directly (not just in browser)

## 6. Data Update Workflow

**Correct order:**
1. Backup current data: `cp data/professionals.csv data/backups/professionals-$(date +%Y%m%d).csv`
2. Run scraper/enrichment
3. Merge enriched data into professionals.csv
4. **Check for duplicate CSV files** (step 1 above)
5. **Clear all caches** (step 2 above)
6. Rebuild site
7. Restart dev server
8. Verify in browser

## 7. Quick Debug Commands

```bash
# How many CSV files?
ls -1 data/*.csv | wc -l

# Which professionals files exist?
ls -1 data/professionals*.csv

# How many profiles in main file?
wc -l data/professionals.csv

# How many Toronto profiles?
grep -c "Toronto" data/professionals.csv

# Check cache exists
ls -la .astro/data-cache.json
```

## Remember

**If you see wrong data in browser:**
1. First check: Multiple CSV files?
2. Second check: Cache cleared? (`.astro/` AND `dist/`)
3. Third check: Dev server restarted?
4. Fourth check: BOTH transform files updated? (`supabase.js` AND `dataCache.js`)

**Don't waste time debugging code if it's a cache/duplicate file issue!**

## See Also
- **data-integrity-rules.md** - Critical rules for data safety and debugging
