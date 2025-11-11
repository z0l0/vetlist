# CRM Email Import Enhancement

## Problem Fixed
The email import feature wasn't searching for existing profiles before creating new ones, which could lead to duplicate entries. Users also couldn't see which profile would be updated.

## Solution Implemented

### 1. Automatic Profile Matching
When you paste an email and click "Parse Email", the system now:
- **Searches ALL CSV files** automatically (all 10 professionals*.csv files)
- Finds matching profiles based on:
  - Exact name match (10 points)
  - Phone number match (8 points)
  - Address match (5 points)
  - City + Province match (3 points)
- Shows top 5 matches with match scores

### 2. Visual Match Display
The preview now shows:
- **Warning banner** if matches are found
- **Match cards** for each potential duplicate with:
  - Profile name and details
  - Source CSV file (e.g., "professionals3.csv")
  - Match score and reasons (e.g., "Exact name match, Phone number match")
  - Current data (phone, address, location)
- **Select button** on each match card
- **Create New Profile** button if you want to add a new entry instead

### 3. Update or Create Options
You can now:
- **Click on a match card** to select it for updating
  - Button changes to "Update Existing Profile" (yellow)
  - Selected card highlights in green
- **Click "Create New Profile"** to add as new entry
  - Button changes to "Create New Profile" (blue)
  - All selections cleared
- **Save** performs the chosen action

## Example Usage

### Scenario: Claiming Sissiboo Veterinary Services

1. **Paste the email** with practice details
2. **Click "Parse Email"**
3. **System searches** all 10 CSV files automatically
4. **If match found:**
   - Shows warning: "⚠️ Found 1 Matching Profile"
   - Displays match card with current data
   - Shows which CSV file contains it
   - Shows why it matched (e.g., "Exact name match, Phone number match")
5. **You choose:**
   - Click the match card → Updates existing profile
   - Click "Create New Profile" → Adds new entry
6. **Click Save** → Done!

## Technical Details

### Match Scoring Algorithm
```javascript
- Exact name match: +10 points
- Phone number match: +8 points
- Address match: +5 points
- City + Province match: +3 points
- Minimum threshold: 8 points to show as match
```

### Files Modified
- `crm/server.js`:
  - Enhanced `/import/parse` endpoint to search all CSV files
  - Updated `/import/save` endpoint to handle updates vs creates
  - Added match scoring and ranking logic
  - Improved frontend JavaScript for match selection UI

## Benefits

✅ **No more duplicates** - System warns you if profile already exists
✅ **Search all files** - Automatically checks all 10 CSV files
✅ **Visual confirmation** - See exactly which profile will be updated
✅ **Flexible choice** - Update existing or create new
✅ **Smart matching** - Multiple criteria for accurate detection
✅ **Clear feedback** - Match scores and reasons displayed

## Testing

To test with your example:
1. Start CRM: `npm run crm` or `./start-crm.sh`
2. Go to "Import from Email"
3. Paste the Sissiboo Veterinary Services email
4. Click "Parse Email"
5. Should show matched profile if it exists in any CSV file
6. Select match to update or create new

The system will now properly identify existing profiles and let you choose whether to update them or create new entries.
