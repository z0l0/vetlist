# VetList CRM - Standalone Local App

Simple, clean CRM for managing VetList CSV profiles. Runs completely separate from the main Astro site.

## 🚀 Quick Start

```bash
cd crm
npm install
npm start
```

Then open: **http://localhost:3030**

## ✨ Features

- **Browse Profiles** - Search and view all profiles
- **Edit Profiles** - Update any field, saves to CSV
- **Import from Email** - Paste claim emails, auto-extract data
- **Bulk Edit** - Direct CSV editing

## 📧 Email Import

Just paste your claim emails:

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

Click "Parse Email" → Review → "Save to CSV"

## 💾 How It Works

- Standalone Express.js server
- Reads/writes CSV files in `../data` directory
- No database, just files
- Changes are immediate
- Runs on port 3030 (separate from Astro on 4323)

## 🔧 After Making Changes

Rebuild your Astro site to see updates:

```bash
cd ..
npm run build:fast
```

## 📝 Notes

- Local only (doesn't work online)
- Backup CSVs before bulk operations
- Changes are immediate (no undo)
- Works with all 10 professionals CSV files

---

**Simple. Clean. Effective.**
