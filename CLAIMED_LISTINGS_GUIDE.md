# Claimed Listings Feature Guide

This guide explains how the claimed listings feature works and how to manage it.

## Overview

The claimed listings feature allows veterinary clinics to "claim" their listing on VetList.org. Claimed listings receive special treatment:

1. **Homepage Prominence**: Latest 10 claimed listings appear in the "Popular Veterinarians" section on the homepage
2. **Verified Badge**: A blue shield checkmark badge appears next to the clinic name
3. **Priority Sorting**: Claimed listings appear first in city pages (sorted by rating within claimed status)
4. **No Claim Link**: The "Claim this listing" link is hidden for already-claimed profiles

## How It Works

### CSV Structure

Each professional CSV file now includes a `claimed` column:
- `true` = Listing is claimed and verified
- `false` = Listing is not claimed (default)

### Currently Claimed Listings

As of now, these listings are marked as claimed:

1. **Colchester Veterinary Hospital** - Truro, Nova Scotia, Canada
   - URL: https://vetlist.org/canada/nova-scotia/truro/colchester-veterinary-hospital/

2. **Sissiboo Veterinary Services Ltd** - Plympton, Nova Scotia, Canada
   - URL: https://vetlist.org/canada/nova-scotia/plympton/sissiboo-veterinary-services-ltd/

3. **Waterside Veterinary Services** - Myrtle Beach, South Carolina, USA
   - URL: https://vetlist.org/united-states/south-carolina/myrtle-beach/waterside-veterinary-services/

## Adding New Claimed Listings

### Method 1: Using the CRM (Automatic - Recommended) ⭐

**When you import or edit a profile through the CRM, it's automatically marked as claimed!**

1. Start the CRM:
   ```bash
   ./start-crm.sh
   ```

2. **Import from Email** (http://localhost:3030/import):
   - Paste the claim email
   - Click "Parse Email"
   - Select existing profile to update OR create new
   - Click "Save to CSV"
   - ✅ **Automatically marked as claimed!**

3. **Manual Edit** (http://localhost:3030):
   - Search for the profile
   - Click "Edit"
   - Check/uncheck the "Mark as Claimed/Verified Listing" checkbox
   - Click "Save Changes"

4. Rebuild the site:
   ```bash
   npm run build:fast  # For testing
   npm run build       # For production
   ```

### Method 2: Using the Script

1. Edit `scripts/add-claimed-column.js`
2. Add the clinic's name slug to the `claimedListings` array:
   ```javascript
   const claimedListings = [
     'colchester-veterinary-hospital',
     'sissiboo-veterinary-services-ltd',
     'waterside-veterinary-services',
     'your-new-clinic-name-slug'  // Add here
   ];
   ```
3. Run the script:
   ```bash
   node scripts/add-claimed-column.js
   ```

### Method 3: Manual CSV Edit

1. Open the appropriate `data/professionalsX.csv` file
2. Find the row for the clinic you want to mark as claimed
3. Change the `claimed` column from `false` to `true`
4. Save the file

### Finding the Name Slug

The name slug is the URL-friendly version of the clinic name:
- Remove special characters
- Convert to lowercase
- Replace spaces with hyphens
- Remove trailing numbers

Example: "Colchester Veterinary Hospital" → "colchester-veterinary-hospital"

## Verified Badge Design

The verified badge uses a shield with checkmark icon:
- Color: Primary blue (#0066CC)
- Size: Responsive (4px on cards, 6-7px on profile pages)
- Position: Next to clinic name
- Tooltip: "Verified Listing"

## Homepage Display

The "Popular Veterinarians" section on the homepage shows:
- Latest 10 claimed listings (sorted by ID descending = most recent first)
- Falls back to popular_vets.csv if no claimed listings exist
- Each listing shows the verified badge

## City Page Sorting

Profiles on city pages are sorted in this order:
1. Claimed listings first (with verified badge)
2. Then by rating (highest first)
3. Non-claimed listings follow

## Profile Page Display

On individual profile pages:
- Verified badge appears next to the clinic name (both desktop and mobile)
- Badge is larger and more prominent (6-7px)
- No "Claim this listing" link is shown (feature to be implemented)

## Technical Implementation

### Files Modified

1. **src/lib/supabase.js**
   - Added `claimed` field parsing
   - Added `fetchClaimedVets()` function

2. **src/pages/index.astro**
   - Uses `fetchClaimedVets()` for homepage display

3. **src/components/home/Hero.astro**
   - Displays verified badge for claimed listings

4. **src/pages/[country]/[region]/[city]/index.astro**
   - Sorts claimed listings first
   - Shows verified badge on profile cards

5. **src/pages/[country]/[region]/[city]/[profile].astro**
   - Displays verified badge on profile page

6. **src/components/VerifiedBadge.astro**
   - Reusable verified badge component

7. **public/verified-badge.svg**
   - SVG icon for verified badge

### Data Flow

```
CSV Files (claimed=true)
    ↓
fetchClaimedVets() / fetchAllProfessionals()
    ↓
Homepage / City Pages / Profile Pages
    ↓
Display with Verified Badge
```

## Testing

After adding a new claimed listing:

1. **Clear cache** (if using data caching):
   ```bash
   npm run clear-cache
   ```

2. **Build the site**:
   ```bash
   npm run build:fast  # For testing
   npm run build       # For production
   ```

3. **Check the homepage**:
   - Visit http://localhost:4321/
   - Look for the clinic in "Popular Veterinarians"
   - Verify the badge appears

4. **Check the city page**:
   - Visit the city page where the clinic is located
   - Verify it appears first in the list
   - Verify the badge appears

5. **Check the profile page**:
   - Visit the clinic's profile page
   - Verify the badge appears next to the name

## Future Enhancements

Potential improvements to consider:

1. **Claim Form Integration**: Automatically mark listings as claimed when claim form is submitted
2. **Admin Dashboard**: Manage claimed listings through CRM interface
3. **Claim Date**: Track when a listing was claimed
4. **Verification Levels**: Different badge types for different verification levels
5. **Analytics**: Track performance of claimed vs non-claimed listings
6. **Email Notifications**: Notify clinic owners when their listing is claimed

## Troubleshooting

### Badge Not Showing

1. Check if `claimed` column exists in CSV:
   ```bash
   head -n 1 data/professionals.csv | grep claimed
   ```

2. Check if listing is marked as claimed:
   ```bash
   node -e "const fs = require('fs'); const Papa = require('papaparse'); const csv = fs.readFileSync('data/professionals.csv', 'utf-8'); const {data} = Papa.parse(csv, {header: true}); const claimed = data.filter(r => r.claimed === 'true'); console.log('Claimed:', claimed.length); claimed.forEach(r => console.log('-', r.name));"
   ```

3. Clear cache and rebuild:
   ```bash
   npm run clear-cache
   npm run build:fast
   ```

### Listing Not Appearing on Homepage

1. Verify the listing is marked as claimed in CSV
2. Check that `fetchClaimedVets()` is being called in `src/pages/index.astro`
3. Rebuild the site

### Sorting Not Working on City Page

1. Check that the sorting logic is in place in city page
2. Verify the `claimed` field is being parsed correctly
3. Clear cache and rebuild

## Support

For questions or issues with the claimed listings feature, refer to:
- This documentation
- `scripts/add-claimed-column.js` for implementation details
- `src/lib/supabase.js` for data fetching logic
