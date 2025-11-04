# Mobile Responsive Patterns for Directory Sites

This document contains proven mobile-friendly UI patterns that should be applied consistently across all directory sites (vetlist.org, dentistlist.org, chirolist.org, etc.).

## 🔧 Hours of Operation Mobile Fix

### Problem
The hours section in claim forms gets cut off on mobile devices. Users see:
```
Monday [✓] Open 12:00AM to [cut off]
```

### Solution Pattern
Replace single-line flex layouts with responsive two-line layouts on mobile:

**Before (Desktop-only):**
```html
<div class="flex items-center gap-4">
    <div class="w-24 text-sm font-medium text-gray-700">{day}</div>
    <label class="flex items-center">
        <input type="checkbox" class="day-checkbox" />
        <span class="ml-2 text-sm text-gray-600">Open</span>
    </label>
    <input type="time" class="day-open" />
    <span class="text-gray-500">to</span>
    <input type="time" class="day-close" />
</div>
```

**After (Mobile-responsive):**
```html
<div class="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
    <div class="flex items-center gap-4 sm:gap-4">
        <div class="w-20 sm:w-24 text-sm font-medium text-gray-700">{day}</div>
        <label class="flex items-center">
            <input type="checkbox" class="day-checkbox" />
            <span class="ml-2 text-sm text-gray-600">Open</span>
        </label>
    </div>
    <div class="flex items-center gap-2 ml-24 sm:ml-0">
        <input type="time" class="day-open px-3 py-2 border border-gray-300 rounded-md text-sm flex-1 sm:flex-none" />
        <span class="text-gray-500 text-sm">to</span>
        <input type="time" class="day-close px-3 py-2 border border-gray-300 rounded-md text-sm flex-1 sm:flex-none" />
    </div>
</div>
```

### Key Changes
1. **Container**: `flex-col sm:flex-row sm:items-center` - stacks on mobile, horizontal on desktop
2. **Spacing**: `gap-2 sm:gap-4` - tighter spacing on mobile
3. **Width**: `w-20 sm:w-24` - narrower day labels on mobile
4. **Time inputs**: `flex-1 sm:flex-none` - expand to fill space on mobile
5. **Indentation**: `ml-24 sm:ml-0` - indent time inputs under day name on mobile

### Result
**Mobile display:**
```
Monday [✓] Open
        9:00 AM to 5:00 PM
```

**Desktop display:**
```
Monday [✓] Open 9:00 AM to 5:00 PM
```

## 📋 Implementation Checklist for New Sites

When applying this pattern to dentistlist.org, chirolist.org, etc.:

1. **Find the hours section** in `src/pages/claim-clinic.astro`
2. **Search for**: `"Hours of Operation"` or `class="flex items-center gap-4"`
3. **Replace** the hours container HTML with the responsive version above
4. **Update profession terms**:
   - Change "veterinary practice" → "dental practice" / "chiropractic clinic" etc.
   - Update email subjects and form labels accordingly
5. **Test on mobile** - verify the two-line layout works
6. **Deploy** and verify in production

## 🎯 General Mobile-First Principles

Apply these patterns consistently across all directory sites:

### Form Layouts
- Use `flex-col sm:flex-row` for form rows that might overflow
- Implement `gap-2 sm:gap-4` for responsive spacing
- Add `flex-1 sm:flex-none` for inputs that should expand on mobile

### Text and Labels
- Use `text-sm` for mobile, larger sizes for desktop when needed
- Implement `w-20 sm:w-24` for responsive label widths
- Add proper indentation with `ml-X sm:ml-0` patterns

### Interactive Elements
- Ensure touch targets are at least 44px on mobile
- Use `px-3 py-2` minimum for input padding
- Implement proper focus states for accessibility

## 🔄 Replication Instructions

When working with Kiro on a new directory site:

1. **Reference this file**: "Apply the mobile hours fix from the steering guidelines"
2. **Specify the profession**: "Update for dental practices" or "Update for chiropractic clinics"
3. **Test instruction**: "Verify the mobile layout shows day/checkbox on first line, times on second line"

This ensures consistent, mobile-friendly implementations across all directory sites without needing complex automation.