# Data Maintenance Guide

This document covers common data maintenance tasks for VetList.org.

## Table of Contents
- [Hours of Operation Issues](#hours-of-operation-issues)
- [Data Cache Management](#data-cache-management)
- [Running the Scraper](#running-the-scraper)
- [CSV File Structure](#csv-file-structure)

---

## Hours of Operation Issues

### Problem: Incorrect Split Hours

**Symptom:** Clinics showing "Closes at 11:59 PM" when they actually close much earlier (e.g., 5:00 PM or 6:00 PM).

**Root Cause:** The scraper incorrectly interprets hours like "7:30 AM - 5:00 PM" as split overnight hours:
```json
// WRONG - Split overnight hours
{"1": ["07:30-23:59", "00:00-05:00"]}

// CORRECT - Single daytime range
{"1": ["07:30-17:00"]}
```

**How to Fix:**

1. **Identify the problem:**
   ```bash
   # Check for split hours pattern
   grep -E '23:59.*00:00' data/professionals.csv | wc -l
   ```

2. **Fix split hours across all CSV files:**
   
   Create a Python script `fix-split-hours.py`:
   ```python
   #!/usr/bin/env python3
   import csv
   import json
   import os
   
   def fix_hours_object(hours_obj):
       """Fix hours by merging split ranges and converting PM times."""
       if not isinstance(hours_obj, dict):
           return hours_obj
       
       fixed = {}
       changed = False
       
       for day, ranges in hours_obj.items():
           if not ranges or not isinstance(ranges, list):
               fixed[day] = ranges
               continue
           
           # Check for split hours: ["HH:MM-23:59", "00:00-HH:MM"]
           if len(ranges) == 2:
               range1, range2 = ranges[0], ranges[1]
               
               if (isinstance(range1, str) and isinstance(range2, str) and
                   range1.endswith('-23:59') and range2.startswith('00:00-')):
                   
                   start_time = range1.split('-')[0]
                   end_time_str = range2.split('-')[1]
                   
                   # Convert end time: "05:00" -> "17:00" (5 PM)
                   end_parts = end_time_str.split(':')
                   end_hour = int(end_parts[0])
                   end_min = end_parts[1] if len(end_parts) > 1 else '00'
                   
                   start_hour = int(start_time.split(':')[0])
                   if end_hour < 12 and start_hour >= 7:
                       end_hour += 12
                   
                   end_time = f"{end_hour:02d}:{end_min}"
                   merged = f"{start_time}-{end_time}"
                   fixed[day] = [merged]
                   changed = True
                   continue
           
           fixed[day] = ranges
       
       return fixed if changed else None
   
   def process_csv_file(filepath):
       """Process a single CSV file."""
       if not os.path.exists(filepath):
           return 0
       
       print(f"\nProcessing {filepath}...")
       
       with open(filepath, 'r', encoding='utf-8') as f:
           reader = csv.reader(f)
           rows = list(reader)
       
       fixed_count = 0
       
       for i, row in enumerate(rows):
           if len(row) < 3 or not row[2].strip().startswith('{'):
               continue
           
           try:
               hours_obj = json.loads(row[2])
               fixed_hours = fix_hours_object(hours_obj)
               
               if fixed_hours:
                   row[2] = json.dumps(fixed_hours)
                   fixed_count += 1
           except:
               continue
       
       if fixed_count > 0:
           with open(filepath, 'w', encoding='utf-8', newline='') as f:
               writer = csv.writer(f)
               writer.writerows(rows)
           print(f"  ✓ Fixed {fixed_count} clinics")
       else:
           print(f"  - No fixes needed")
       
       return fixed_count
   
   # Process all CSV files
   csv_files = [
       'data/professionals.csv',
       'data/professionals-enriched.csv',
       'data/enriched-professionals.csv',
       'data/enriched-professionals-v3.csv',
       'data/ontario-all.csv',
       'data/toronto-vets.csv',
       'data/.scraper-progress-v2.csv'
   ]
   
   total_fixed = 0
   for csv_file in csv_files:
       total_fixed += process_csv_file(csv_file)
   
   print(f"\n✓ Fixed {total_fixed} clinics with split hours")
   ```

3. **Run the fix:**
   ```bash
   python3 fix-split-hours.py
   ```

4. **Fix PM time conversions:**
   
   Create `fix-pm-times.py`:
   ```python
   #!/usr/bin/env python3
   import csv
   import json
   import os
   
   def fix_pm_times(hours_obj):
       """Fix hours where end time should be PM (add 12 hours)."""
       if not isinstance(hours_obj, dict):
           return hours_obj
       
       fixed = {}
       changed = False
       
       for day, ranges in hours_obj.items():
           if not ranges or not isinstance(ranges, list):
               fixed[day] = ranges
               continue
           
           fixed_ranges = []
           for time_range in ranges:
               if not isinstance(time_range, str) or '-' not in time_range:
                   fixed_ranges.append(time_range)
                   continue
               
               start_str, end_str = time_range.split('-')
               start_hour = int(start_str.split(':')[0])
               end_hour = int(end_str.split(':')[0])
               end_min = end_str.split(':')[1] if ':' in end_str else '00'
               
               # If start is morning (7-11) and end is early (1-11), end is PM
               if 7 <= start_hour <= 11 and 1 <= end_hour <= 11 and end_hour < start_hour:
                   new_end_hour = end_hour + 12
                   new_range = f"{start_str}-{new_end_hour:02d}:{end_min}"
                   fixed_ranges.append(new_range)
                   changed = True
               else:
                   fixed_ranges.append(time_range)
           
           fixed[day] = fixed_ranges
       
       return fixed if changed else None
   
   def process_csv_file(filepath):
       if not os.path.exists(filepath):
           return 0
       
       print(f"\nProcessing {filepath}...")
       
       with open(filepath, 'r', encoding='utf-8') as f:
           reader = csv.reader(f)
           rows = list(reader)
       
       fixed_count = 0
       
       for i, row in enumerate(rows):
           if len(row) < 3 or not row[2].strip().startswith('{'):
               continue
           
           try:
               hours_obj = json.loads(row[2])
               fixed_hours = fix_pm_times(hours_obj)
               
               if fixed_hours:
                   row[2] = json.dumps(fixed_hours)
                   fixed_count += 1
           except:
               continue
       
       if fixed_count > 0:
           with open(filepath, 'w', encoding='utf-8', newline='') as f:
               writer = csv.writer(f)
               writer.writerows(rows)
           print(f"  ✓ Fixed {fixed_count} clinics")
       else:
           print(f"  - No fixes needed")
       
       return fixed_count
   
   csv_files = [
       'data/professionals.csv',
       'data/professionals-enriched.csv',
       'data/enriched-professionals.csv',
       'data/enriched-professionals-v3.csv',
       'data/ontario-all.csv',
       'data/toronto-vets.csv',
       'data/.scraper-progress-v2.csv'
   ]
   
   total_fixed = 0
   for csv_file in csv_files:
       total_fixed += process_csv_file(csv_file)
   
   print(f"\n✓ Fixed {total_fixed} clinics with PM time issues")
   ```

5. **Run the PM fix:**
   ```bash
   python3 fix-pm-times.py
   ```

6. **Clear the cache and rebuild:**
   ```bash
   rm -f .astro/data-cache.json
   npm run build:fast
   ```

### Verification

Check a specific clinic's hours:
```bash
python3 -c "
import csv, json
with open('data/professionals.csv', 'r') as f:
    reader = csv.reader(f)
    for row in reader:
        if 'Clinic Name' in str(row):
            hours = json.loads(row[2])
            print(json.dumps(hours, indent=2))
            break
"
```

---

## Data Cache Management

### Cache Location
The build system caches processed data in `.astro/data-cache.json` to speed up subsequent builds.

### When to Clear Cache

Clear the cache when:
- CSV data has been updated
- Hours of operation have been fixed
- You see stale data on the site
- Build is using old data

### How to Clear Cache

**Option 1: Use npm script**
```bash
npm run clear-cache
```

**Option 2: Manual deletion**
```bash
rm -f .astro/data-cache.json
```

**Option 3: Clear cache and rebuild**
```bash
rm -f .astro/data-cache.json && npm run build:fast
```

### Cache Behavior

- Cache is automatically created on first build
- Cache is reused on subsequent builds for speed
- Cache includes:
  - All professional profiles
  - Location details
  - Lookup tables for fast queries
  - Timestamp of cache creation

---

## Running the Scraper

### Overview

The scraper enriches professional profiles by extracting data from their websites:
- Emergency services availability
- Online booking options
- Pricing information
- Services offered
- And more...

### Scraper Version

**Current:** `production-scraper-v3.js` (with pricing extraction)

**Location:** `scripts/production-scraper-v3.js`

### Prerequisites

Required API keys in `.env`:
```bash
JINA_AI_API_KEY=your_jina_key
GROQ_API_KEY=your_groq_key
OPENAI_API_KEY=your_openai_key  # Optional backup
```

### Dataset Overview

```bash
# Check profile counts
python3 -c "
import csv

files = [
    'data/professionals.csv',
    'data/professionals2.csv',
    'data/professionals3.csv',
    'data/professionals4.csv',
    'data/professionals5.csv',
    'data/professionals6.csv',
    'data/professionals7.csv',
    'data/professionals8.csv',
    'data/professionals9.csv',
    'data/professionals10.csv'
]

total = 0
for f in files:
    try:
        with open(f, 'r') as file:
            reader = csv.DictReader(file)
            count = sum(1 for row in reader)
            print(f'{f}: {count:,} profiles')
            total += count
    except FileNotFoundError:
        print(f'{f}: NOT FOUND')

print(f'\nTotal: {total:,} profiles')
"
```

**Expected output:**
- Total: ~27,893 profiles
- Canada: ~3,737 profiles (13.4%)
- United States: ~24,155 profiles (86.6%)

### Running the Scraper

**Option 1: Scrape all files sequentially**
```bash
./scrape-all-canada.sh
```

**Option 2: Scrape specific file**
```bash
node scripts/production-scraper-v3.js data/professionals.csv --resume
```

**Option 3: Scrape specific city/province**
```bash
node scripts/production-scraper-v3.js data/professionals.csv --city="Toronto"
```

**Option 4: Test with sample**
```bash
node scripts/production-scraper-v3.js data/professionals.csv --sample=10
```

### Scraper Options

- `--resume` - Resume from checkpoint (recommended)
- `--city="Name"` - Filter by city or province
- `--sample=N` - Process only N random profiles
- `--dry-run` - Show what would be processed without scraping

### Monitoring Progress

The scraper shows real-time progress:
```
🔄 1234/5000 (24%) | ✅987 ❌12 💰234
```
- First number: Current / Total
- ✅ Success count
- ❌ Failed count
- 💰 Pricing data found

### Output Files

- **Progress file:** `data/.scraper-progress-v3.csv` (incremental saves)
- **Final output:** `data/enriched-professionals-v3.csv`
- **Checkpoint:** `data/.scraper-checkpoint-v3.json` (for resume)
- **Cache:** `data/.scraper-cache-v3/` (website content cache)

### Running in Background

```bash
# Run in background with logging
nohup ./scrape-all-canada.sh > scraper-all.log 2>&1 &

# Monitor progress
tail -f scraper-all.log

# Check if still running
ps aux | grep production-scraper
```

### Scraper Performance

- **Speed:** ~20 profiles per minute
- **Parallel:** 20 concurrent requests
- **Checkpoints:** Every 50 profiles
- **Retry:** 2 attempts per profile
- **Cost:** ~$0.0002 per profile (Jina) + LLM costs

### Troubleshooting

**Scraper hangs:**
- Check API keys are valid
- Check internet connection
- Look for rate limiting errors

**High failure rate:**
- Many clinics may not have websites
- Some websites may be down
- Jina API may be rate limited

**Resume not working:**
- Check if checkpoint file exists: `data/.scraper-checkpoint-v3.json`
- Delete checkpoint to start fresh

---

## CSV File Structure

### Professional Files

**Main files:**
- `data/professionals.csv` through `data/professionals10.csv` (27,893 total)
- `data/professionals-enriched.csv` (enriched data)
- `data/enriched-professionals-v3.csv` (latest enriched data)

**Key columns:**
- `id` - Unique identifier
- `name` - Business name
- `hours_of_operation` - JSON object with hours
- `country` - Country name
- `province` - Province/State name
- `city` - City name
- `website` - Website URL
- `phone_number` - Phone number
- `address` - Full address
- `rating` - Rating (0-5)
- `claimed` - Whether listing is claimed

### Hours Format

Hours are stored as JSON in the `hours_of_operation` column:

```json
{
  "1": ["08:00-18:00"],  // Monday
  "2": ["08:00-18:00"],  // Tuesday
  "3": ["08:00-18:00"],  // Wednesday
  "4": ["08:00-18:00"],  // Thursday
  "5": ["08:00-18:00"],  // Friday
  "6": ["08:30-17:30"],  // Saturday
  "7": ["08:30-13:30"]   // Sunday
}
```

**Day mapping:**
- 1 = Monday
- 2 = Tuesday
- 3 = Wednesday
- 4 = Thursday
- 5 = Friday
- 6 = Saturday
- 7 = Sunday

**Special values:**
- `null` - Closed that day
- `[]` - Closed that day
- `["00:00-23:59"]` - Open 24 hours

---

## Common Tasks

### Update a Single Clinic's Hours

```python
import csv
import json

# Read CSV
with open('data/professionals.csv', 'r') as f:
    reader = csv.reader(f)
    rows = list(reader)

# Find and update clinic
for row in rows:
    if 'Clinic Name' in row[1]:  # row[1] is name column
        hours = {
            "1": ["08:00-18:00"],
            "2": ["08:00-18:00"],
            "3": ["08:00-18:00"],
            "4": ["08:00-18:00"],
            "5": ["08:00-18:00"],
            "6": ["08:30-17:30"],
            "7": ["08:30-13:30"]
        }
        row[2] = json.dumps(hours)  # row[2] is hours column
        break

# Write back
with open('data/professionals.csv', 'w', newline='') as f:
    writer = csv.writer(f)
    writer.writerows(rows)
```

### Count Profiles by Province

```bash
python3 -c "
import csv
provinces = {}
with open('data/professionals.csv', 'r') as f:
    reader = csv.DictReader(f)
    for row in reader:
        prov = row.get('province', 'Unknown')
        provinces[prov] = provinces.get(prov, 0) + 1

for prov, count in sorted(provinces.items(), key=lambda x: x[1], reverse=True):
    print(f'{prov}: {count:,}')
"
```

### Find Clinics with Pricing Data

```bash
grep -l "has_pricing.*true" data/enriched-professionals-v3.csv | wc -l
```

---

## Best Practices

1. **Always backup before bulk changes:**
   ```bash
   cp data/professionals.csv data/professionals.csv.backup
   ```

2. **Clear cache after data changes:**
   ```bash
   rm -f .astro/data-cache.json
   ```

3. **Test with fast build first:**
   ```bash
   npm run build:fast
   ```

4. **Use resume flag for scraper:**
   ```bash
   node scripts/production-scraper-v3.js data/professionals.csv --resume
   ```

5. **Monitor scraper progress:**
   - Watch for high failure rates
   - Check pricing data extraction rate
   - Verify checkpoint saves are working

---

## Related Documentation

- `README.md` - General project documentation
- `BUILD_OPTIMIZATION.md` - Build performance optimization
- `SCRAPER_V2_IMPROVEMENTS.md` - Scraper version history
- `.kiro/steering/google-search-console-schema-fixes.md` - Schema fixes
