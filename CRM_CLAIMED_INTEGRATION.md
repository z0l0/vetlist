# CRM + Claimed Listings Integration

## Overview

The CRM now automatically marks profiles as "claimed" when you import or edit them. This means **you don't need to manually update CSV files** - just use the CRM as normal!

## What Changed

### 1. Automatic Claiming on Import ✅

When you import a profile from a claim email:
- The profile is automatically marked with `claimed: 'true'`
- Whether creating new or updating existing profiles
- No manual intervention needed

### 2. Manual Claiming on Edit ✅

When you edit any profile:
- New checkbox: "Mark as Claimed/Verified Listing"
- Check it to mark as claimed
- Uncheck it to remove claimed status
- Saves with the profile

### 3. Updated Files

**crm/server.js** - Modified 3 sections:
1. `/import/save` POST endpoint - Sets `claimed: 'true'` for new profiles
2. `/import/save` POST endpoint - Sets `claimed: 'true'` when updating existing profiles
3. `/edit` GET endpoint - Added claimed checkbox to edit form
4. `/edit` POST endpoint - Handles claimed checkbox value

## Your Workflow Now

### When You Receive a Claim Email:

1. **Start CRM:**
   ```bash
   ./start-crm.sh
   ```

2. **Import the Email:**
   - Go to http://localhost:3030/import
   - Paste the entire claim email
   - Click "Parse Email"
   - The system searches all 10 CSV files automatically

3. **Choose Action:**
   - **If match found:** Click "Select This" to update existing profile
   - **If no match:** Click "Create New Profile"
   - Click "Save to CSV"

4. **Rebuild Site:**
   ```bash
   npm run build:fast  # For testing
   npm run build       # For production
   ```

5. **Verify:**
   - Check homepage - should appear in "Popular Veterinarians"
   - Check city page - should appear first with verified badge
   - Check profile page - should show verified badge

### When You Want to Manually Mark as Claimed:

1. **Start CRM:**
   ```bash
   ./start-crm.sh
   ```

2. **Find Profile:**
   - Go to http://localhost:3030
   - Search for the profile
   - Click "Edit"

3. **Mark as Claimed:**
   - Check the "Mark as Claimed/Verified Listing" checkbox
   - Click "Save Changes"

4. **Rebuild Site:**
   ```bash
   npm run build:fast
   ```

## Benefits

✅ **No manual CSV editing** - Everything through the CRM
✅ **Automatic** - Import/edit automatically marks as claimed
✅ **Visual feedback** - Checkbox shows claimed status
✅ **Consistent** - All claimed profiles handled the same way
✅ **Fast** - No need to run scripts or edit CSV files manually

## Technical Details

### Database Schema

The `claimed` column in CSV files:
- `'true'` = Claimed listing (shows on homepage, gets badge, appears first)
- `'false'` = Not claimed (normal listing)

### CRM Changes

**Import endpoint (`/import/save`):**
```javascript
// For new profiles
claimed: 'true',

// For updating existing profiles
claimed: 'true',
```

**Edit form:**
```html
<input type="checkbox" name="claimed" value="true" 
  ${profile.claimed === 'true' || profile.claimed === '1' ? 'checked' : ''}>
```

**Edit handler:**
```javascript
// Handle claimed checkbox (if not checked, it won't be in formData)
if (!cleanData.claimed) {
  cleanData.claimed = 'false';
}
```

## Testing

After importing/editing a profile:

1. **Check CSV file:**
   ```bash
   node -e "const fs = require('fs'); const Papa = require('papaparse'); const csv = fs.readFileSync('data/professionals.csv', 'utf-8'); const {data} = Papa.parse(csv, {header: true}); const claimed = data.filter(r => r.claimed === 'true'); console.log('Claimed:', claimed.length); claimed.forEach(r => console.log('-', r.name));"
   ```

2. **Check homepage:**
   - Build: `npm run build:fast`
   - Preview: `npm run preview`
   - Visit: http://localhost:4323
   - Look for profile in "Popular Veterinarians"

3. **Check city page:**
   - Visit the city page
   - Profile should appear first
   - Should have verified badge

4. **Check profile page:**
   - Visit the profile page
   - Should have verified badge next to name

## Troubleshooting

**Profile not showing as claimed after import:**
1. Check the CSV file - is `claimed` column set to `'true'`?
2. Clear cache: `npm run clear-cache`
3. Rebuild: `npm run build:fast`

**Checkbox not saving:**
1. Check browser console for errors
2. Verify CRM server is running
3. Check file permissions on CSV files

**Profile not appearing on homepage:**
1. Verify `claimed: 'true'` in CSV
2. Check `fetchClaimedVets()` function
3. Rebuild the site
4. Check browser console for errors

## Migration Notes

If you have existing claimed profiles (marked using the script):
- They will continue to work
- You can now edit them through the CRM
- The checkbox will show their current claimed status
- No migration needed

## Future Enhancements

Potential improvements:
- Add "claimed_date" field to track when claimed
- Add "claimed_by" field to track who claimed it
- Add bulk claim/unclaim feature
- Add claimed status filter in browse view
- Add claimed count to stats

## Support

For questions or issues:
- See `CLAIMED_LISTINGS_GUIDE.md` for complete documentation
- See `CRM_START_HERE.md` for CRM basics
- Check `crm/server.js` for implementation details
