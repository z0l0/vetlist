# Quick Start: Claimed Listings

## Add a New Claimed Listing in 2 Steps (Using CRM) ⭐

### Step 1: Import/Edit in CRM
```bash
# Start the CRM
./start-crm.sh
```

Then go to http://localhost:3030/import and:
1. Paste the claim email
2. Click "Parse Email"
3. Select existing profile OR create new
4. Click "Save to CSV"
5. ✅ **Done! Automatically marked as claimed**

### Step 2: Build the Site
```bash
npm run build:fast  # For testing
npm run build       # For production
```

---

## Alternative: Add Claimed Listing Using Script

### Step 1: Get the Clinic Name Slug
Convert the clinic name to a URL-friendly slug:
- Lowercase everything
- Replace spaces with hyphens
- Remove special characters
- Remove trailing numbers

**Examples:**
- "Colchester Veterinary Hospital" → `colchester-veterinary-hospital`
- "Dr. Smith's Pet Clinic" → `dr-smiths-pet-clinic`
- "ABC Animal Hospital 123" → `abc-animal-hospital`

### Step 2: Add to Script
Edit `scripts/add-claimed-column.js` and add the slug:

```javascript
const claimedListings = [
  'colchester-veterinary-hospital',
  'sissiboo-veterinary-services-ltd',
  'waterside-veterinary-services',
  'your-new-clinic-slug-here'  // ← Add here
];
```

### Step 3: Run Script and Build
```bash
# Add the claimed column
node scripts/add-claimed-column.js

# Build the site
npm run build:fast  # For testing
npm run build       # For production
```

## What You'll See

✅ **Homepage**: Clinic appears in "Popular Veterinarians" with blue verified badge

✅ **City Page**: Clinic appears first in the list with verified badge

✅ **Profile Page**: Verified badge appears next to clinic name

## Verify It Worked

```bash
# Check if listing is marked as claimed
node -e "import('./src/lib/supabase.js').then(async m => { const claimed = await m.fetchClaimedVets(); console.log('Claimed:', claimed.length); claimed.forEach(v => console.log('-', v.name)); });"
```

## Troubleshooting

**Badge not showing?**
```bash
npm run clear-cache
npm run build:fast
```

**Can't find the clinic?**
- Check the CSV files for the exact name
- Verify the slug matches the name exactly
- Look in all 10 professionals CSV files

## Need More Help?

See `CLAIMED_LISTINGS_GUIDE.md` for complete documentation.
