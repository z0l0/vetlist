# CRITICAL: CSV Data Management Rules

## ⚠️ ABSOLUTE RULES - NEVER BREAK THESE

### 1. NEVER MERGE SPLIT CSV FILES WITHOUT CHECKING COLUMNS
**Problem:** Canada and USA CSV files have different column structures:
- `professionals-canada.csv`: Has `description`, `detailed_description`, `vetscore` columns
- `professionals-usa.csv`: Missing `description`, `detailed_description` columns initially

**Rule:** Always check column headers before merging:
```bash
head -1 data/professionals-canada.csv | tr ',' '\n' | wc -l
head -1 data/professionals-usa.csv | tr ',' '\n' | wc -l
```

### 2. FAST_BUILD vs FULL_BUILD BEHAVIOR
**Critical Understanding:**
- `FAST_BUILD=true`: Only processes first 100 profiles (all Canadian)
- Full build: Processes all 77K+ profiles (Canada + USA)

**Why US pages don't appear in FAST_BUILD:**
- Canadian profiles are first in the dataset
- FAST_BUILD only takes first 100 profiles
- No US profiles = no US pages generated

**Rule:** Always test with full build for US functionality

### 3. SPLIT FILES ARE REQUIRED
**Why we use split files:**
- Different column structures between countries
- Canada: 54K profiles with full data
- USA: 23K profiles with different schema
- Merging breaks data integrity

**Files that MUST exist:**
- `data/professionals-canada.csv` (with vetscore columns)
- `data/professionals-usa.csv` (with vetscore columns added)

### 4. VETSCORE COLUMNS MUST BE IN BOTH FILES
**Required columns in BOTH files:**
- `vetscore` (numeric score 0-100)
- `vetscore_breakdown` (JSON object)
- `vetscore_multipliers` (JSON object)

**How to add to USA file if missing:**
```python
import csv
with open('data/professionals-usa.csv', 'r') as f:
    reader = csv.DictReader(f)
    fieldnames = reader.fieldnames + ['vetscore', 'vetscore_breakdown', 'vetscore_multipliers']
    rows = []
    for row in reader:
        row['vetscore'] = '50'  # Default score
        row['vetscore_breakdown'] = '{}'
        row['vetscore_multipliers'] = '{}'
        rows.append(row)

with open('data/professionals-usa.csv', 'w', newline='') as f:
    writer = csv.DictWriter(f, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(rows)
```

### 5. SUPABASE.JS AND DATACACHE.JS MUST MATCH
**Both files must load the same CSV files:**

In `src/lib/supabase.js`:
```javascript
const allFilePaths = [
  path.join(dataDir, 'professionals-canada.csv'),
  path.join(dataDir, 'professionals-usa.csv')
];
```

In `src/lib/dataCache.js`:
```javascript
const allProfessionalFiles = [
  path.join(dataDir, 'professionals-canada.csv'),
  path.join(dataDir, 'professionals-usa.csv')
];
```

### 6. US STATE DETECTION LOGIC
**US profiles have:**
- `country`: "United States"
- `province`: State name (Alabama, Alaska, etc.)
- `city`: City name

**Required normalization in supabase.js:**
```javascript
const usStates = ['Alabama', 'Alaska', 'Arizona', ...]; // All 50 states + DC
if (/^(us|usa|united\s*states(\s*of\s*america)?)$/i.test(country) || usStates.includes(country)) {
    return 'united-states';
}
```

## 🚨 DEBUGGING CHECKLIST

When US pages don't work:

1. **Check if using FAST_BUILD:**
   ```bash
   echo $FAST_BUILD  # Should be empty for full build
   ```

2. **Verify split files exist:**
   ```bash
   ls -la data/professionals-*.csv
   ```

3. **Check vetscore columns in both files:**
   ```bash
   head -1 data/professionals-canada.csv | tr ',' '\n' | grep vetscore
   head -1 data/professionals-usa.csv | tr ',' '\n' | grep vetscore
   ```

4. **Verify supabase.js loads both files:**
   ```bash
   grep -A5 "allFilePaths.*=" src/lib/supabase.js
   ```

5. **Check build logs for US detection:**
   ```bash
   npm run build 2>&1 | grep "US profiles"
   ```

6. **Clear cache and rebuild:**
   ```bash
   rm -rf .astro dist
   npm run build
   ```

## 🔧 COMMON FIXES

### Fix 1: Missing US vetscore columns
```bash
python3 -c "
import csv
with open('data/professionals-usa.csv', 'r') as f:
    reader = csv.DictReader(f)
    if 'vetscore' not in reader.fieldnames:
        print('MISSING: vetscore columns in USA file')
        # Add columns as shown above
"
```

### Fix 2: Wrong file loading in code
```bash
# Check both files load split CSVs
grep "professionals-canada.csv" src/lib/supabase.js
grep "professionals-usa.csv" src/lib/supabase.js
grep "professionals-canada.csv" src/lib/dataCache.js  
grep "professionals-usa.csv" src/lib/dataCache.js
```

### Fix 3: US country page missing
```bash
# Full build required for US pages
rm -rf .astro dist
npm run build  # NOT FAST_BUILD=true
ls dist/united-states/index.html  # Should exist
```

## 📋 DEPLOYMENT CHECKLIST

Before deploying changes:

- [ ] Both CSV files have same number of columns
- [ ] Both files have vetscore columns
- [ ] supabase.js loads both files
- [ ] dataCache.js loads both files
- [ ] Full build generates US pages
- [ ] US profiles show vet scores
- [ ] Homepage shows correct US/Canada counts

## 🚫 NEVER DO THESE

1. **Never merge split CSV files** - They have different schemas
2. **Never test US functionality with FAST_BUILD** - Only shows Canadian data
3. **Never deploy without full build test** - FAST_BUILD hides US issues
4. **Never modify one data loader without the other** - Keep supabase.js and dataCache.js in sync
5. **Never assume vetscore columns exist** - Always verify both files have them

## 💡 WHY THIS ARCHITECTURE EXISTS

- **Split files**: Different data sources with different schemas
- **FAST_BUILD**: Development speed (100 profiles vs 77K)
- **Dual loaders**: supabase.js for page generation, dataCache.js for runtime
- **State normalization**: US data has states as countries, needs conversion

This architecture works when all pieces are in sync. Breaking any rule causes cascading failures.