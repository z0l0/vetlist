# CRITICAL: Data Integrity Rules

## NEVER DO THESE THINGS

### 1. NEVER Overwrite Data Without Backup
Before ANY script that modifies CSV data:
```bash
# ALWAYS backup first
cp data/professionals.csv data/backups/professionals-$(date +%Y%m%d-%H%M%S).csv
```

### 2. NEVER Delete Enriched Files Without Confirmation
- `data/enriched-professionals*.csv` contains scraped data that costs money
- ALWAYS ask user before deleting
- If deleting, backup to `data/backups/` first

### 3. NEVER Set Default Values That Overwrite Real Data
BAD: Setting all profiles to `["dogs","cats"]` overwrites exotic/birds/farm data
GOOD: Only set defaults for profiles that have EMPTY pet_types_served

---

## Cache Clearing Checklist (MANDATORY)

When data changes, you MUST clear ALL caches:

```bash
# 1. Delete Astro cache
rm -rf .astro

# 2. Delete dist
rm -rf dist

# 3. Kill any running astro processes
pkill -f "astro" 2>/dev/null || true

# 4. User must restart dev server manually
echo "Now run: npm run dev"
```

**The `.astro/data-cache.json` file (50MB+) caches ALL profile data. If you don't delete it, changes won't appear!**

---

## Data Field Mapping

### Pet/Animal Types
There are TWO fields that store animal data:

| Field | Source | Priority |
|-------|--------|----------|
| `pet_types_served` | Enriched by scraper | CHECK FIRST |
| `animals_treated` | Original scraped data | FALLBACK |

**Both `supabase.js` AND `dataCache.js` must check BOTH fields:**
```javascript
const petData = profile.pet_types_served || profile.animals_treated || '[]';
```

### Files That Transform Data
These files BOTH transform CSV data and MUST stay in sync:

1. **`src/lib/supabase.js`** - Primary transform (line ~245)
2. **`src/lib/dataCache.js`** - Secondary transform (line ~337)

If you change one, CHANGE BOTH!

---

## Scraper Output Fields

The scraper (`production-scraper-v3.js`) outputs to `pet_types_served`, NOT `animals_treated`.

The scraper prompt asks for:
```
"pet_types_served":[]
```

Valid values: `"dogs"`, `"cats"`, `"birds"`, `"fish"`, `"horses"`, `"farm_animals"`, `"exotic"`, `"small_animals"`

---

## Filter Matching

The VetFilters component uses SINGULAR filter values:
- Button: `data-filter="dog"` 
- Data: `data-animals="dogs,cats"`

The filter code must handle singular/plural:
```javascript
return cardAnimals.includes(filterValue) || cardAnimals.includes(filterValue + 's');
```

---

## Backup Locations

| Location | Purpose |
|----------|---------|
| `data/backups/` | Long-term backups with timestamps |
| `data/professionals-backup-*.csv` | Quick backups before operations |
| `data/old-files/` | Archived CSV files (professionals2-10.csv) |

**The Nov 12 backups in `data/backups/` have the ORIGINAL animals_treated data with exotic/birds/farm!**

---

## Before Running Scraper

1. **Backup current data:**
   ```bash
   cp data/professionals.csv data/backups/professionals-$(date +%Y%m%d-%H%M%S).csv
   ```

2. **Verify scraper prompt includes pet_types_served:**
   ```bash
   grep "pet_types_served" scripts/production-scraper-v3.js
   ```

3. **After scraping, MERGE don't REPLACE:**
   - Use `scripts/merge-enriched-data.js` to merge new data
   - Don't overwrite the entire professionals.csv

---

## Debugging Data Issues

### Step 1: Check CSV has data
```bash
python3 -c "
import csv
with open('data/professionals.csv', 'r') as f:
    reader = csv.DictReader(f)
    rows = list(reader)
    sample = rows[0]
    print('pet_types_served:', sample.get('pet_types_served', 'MISSING'))
    print('animals_treated:', sample.get('animals_treated', 'MISSING'))
"
```

### Step 2: Check cache has data
```bash
head -c 5000 .astro/data-cache.json | grep -o '"animals_treated":\[[^]]*\]' | head -3
```

### Step 3: Check HTML output
```bash
curl -s "http://localhost:4323/canada/ontario/toronto/" | grep -o 'data-animals="[^"]*"' | head -3
```

If Step 1 has data but Step 2 doesn't → Cache is stale, delete `.astro/`
If Step 2 has data but Step 3 doesn't → Transform code is broken in supabase.js or dataCache.js

---

## What Went Wrong (Dec 5, 2024)

1. **Ran `add-default-pet-types.js`** which set ALL profiles to `["dogs","cats"]`, overwriting exotic/birds/farm data
2. **Didn't realize** there were TWO transform files (supabase.js AND dataCache.js)
3. **Cache kept serving old data** even after code fixes
4. **Deleted enriched files** without checking if they had useful data
5. **Filter used singular** ("dog") but data had plural ("dogs")

### The Fix:
- Restored original `animals_treated` data from Nov 12 backup
- Fixed BOTH supabase.js AND dataCache.js to check `pet_types_served` first
- Fixed filter to match singular/plural
- Cleared all caches

---

## Golden Rules

1. **BACKUP BEFORE MODIFY** - Always backup CSV before any script
2. **CLEAR ALL CACHES** - Delete `.astro/` AND restart dev server
3. **CHECK BOTH TRANSFORM FILES** - supabase.js AND dataCache.js
4. **MERGE DON'T REPLACE** - Use merge scripts, don't overwrite
5. **TEST BEFORE CONFIRMING** - Verify data in CSV, cache, AND HTML output
