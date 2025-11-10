# VetList CRM - Quick Start

## 🎯 What You Got

A simple, clean, local-only CRM for managing your VetList CSV data. Standalone Express app - no database, no cloud, just files.

## 🚀 Start Using It

**Option 1 - Simple:**
```bash
./start-crm.sh
```

**Option 2 - Manual:**
```bash
cd crm
npm start
```

Then open: **http://localhost:3030**

## 📱 Four Simple Tools

### 1. **Browse** (`/admin/`)
Search and view all profiles. Click Edit or View.

### 2. **Edit** (`/admin/edit`)
Update any profile field. Saves directly to CSV.

### 3. **Import** (`/admin/import`)
Paste claim emails → Auto-parse → Save to CSV.

**Example email format:**
```
PRACTICE INFORMATION:
Practice Name: Sissiboo Veterinary Services Ltd
Phone: (902) 837-1009
Email: office@sissiboovet.com
Website: http://www.sissiboovet.com/

ADDRESS:
5 French Rd, Plympton, NS B0W 2R0
Plympton, Nova Scotia
Canada

SERVICES OFFERED:
General Veterinary Care, Emergency Care, Surgery

HOURS OF OPERATION:
Monday: 08:00 - 05:00
Tuesday: 08:00 - 05:00
...
```

Just paste the whole email, click "Parse Email", review, then "Save to CSV".

### 4. **Bulk Edit** (`/admin/bulk-edit`)
Direct CSV editing. For advanced users only.

## 💡 Quick Tips

- **Search**: Type name, city, province, or phone
- **Multiple CSVs**: Switch between professionals.csv, professionals2.csv, etc.
- **Rebuild after changes**: `npm run build:fast` to see updates on site
- **Local only**: Only works in dev mode, not production

## ⚠️ Remember

- Changes are immediate (no undo)
- Backup CSVs before bulk operations
- Invalid JSON in hours/services will cause errors
- Rebuild site after making changes

## 📖 Full Guide

See `ADMIN_CRM_GUIDE.md` for detailed documentation.

---

**That's it!** Simple, minimal, effective. Just what you asked for.
