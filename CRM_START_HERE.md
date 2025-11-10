# 🏥 VetList CRM - Start Here

## What Is This?

A **standalone local CRM** for managing your VetList CSV profiles. Completely separate from your Astro site - just a simple Express server that reads and writes CSV files.

## 🚀 How to Start

**Easy way:**
```bash
./start-crm.sh
```

**Manual way:**
```bash
cd crm
npm start
```

Then open in your browser: **http://localhost:3030**

## 📱 What You Can Do

### 1. Browse & Search
- View all profiles from any CSV file
- Search by name, city, province, or phone
- Quick edit or view links

### 2. Edit Profiles
- Click "Edit" on any profile
- Update all fields (name, phone, email, address, hours, services, FAQs)
- Saves directly to CSV

### 3. Import from Email ⭐
**This is the magic feature!**

Just paste your claim emails like this:

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
General Veterinary Care, Emergency Care, Surgery, Dental Care

HOURS OF OPERATION:
Monday: 08:00 - 05:00
Tuesday: 08:00 - 05:00
Wednesday: 08:00 - 05:00
Thursday: 08:00 - 05:00
Friday: 08:00 - 05:00
Saturday: Closed
Sunday: Closed

FREQUENTLY ASKED QUESTIONS:
1. Are walk-in appointments available?
   No, appointments are required.
2. Is emergency care provided?
   Yes, this service is available.
```

**Steps:**
1. Paste the entire email
2. Click "Parse Email"
3. Review the extracted data
4. Select which CSV file to save to
5. Click "Save to CSV"

Done! The profile is added with a new ID.

### 4. Bulk Edit
- Direct CSV editing for advanced users
- Good for find/replace operations
- ⚠️ Be careful - backup first!

## 💾 How It Works

- **Standalone app** - Runs on port 3030 (separate from Astro on 4323)
- **No database** - Reads/writes CSV files in `/data` directory
- **Immediate changes** - Updates are instant
- **Local only** - Doesn't work online, only on your machine

## 🔄 After Making Changes

When you add or edit profiles, rebuild your Astro site to see them:

```bash
npm run build:fast    # Quick test build
npm run build         # Full production build
```

## 📂 File Structure

```
crm/
├── server.js         # Main Express server
├── package.json      # Dependencies
├── public/
│   └── styles.css    # Clean, minimal CSS
└── README.md         # Detailed docs

data/                 # Your CSV files (shared with Astro)
├── professionals.csv
├── professionals2.csv
├── ...
└── professionals10.csv
```

## ⚠️ Important Notes

- **Backup CSVs** before bulk operations
- **Changes are immediate** - no undo feature
- **Local only** - Won't work in production/online
- **Port 3030** - Make sure it's not in use

## 🎯 Common Tasks

### Add a new profile from email
1. Start CRM: `./start-crm.sh`
2. Go to http://localhost:3030/import
3. Paste email → Parse → Save

### Update existing profile
1. Start CRM
2. Search for the profile
3. Click "Edit"
4. Make changes → Save

### Search for a profile
1. Start CRM
2. Type in search box (name, city, province, or phone)
3. Hit Search

## 🆘 Troubleshooting

**"Port 3030 already in use"**
- Stop any other CRM instances
- Or change PORT in `crm/server.js`

**"Cannot find module"**
- Run `cd crm && npm install`

**Changes not showing on site**
- Remember to rebuild: `npm run build:fast`

**CSV parsing errors**
- Check JSON format in hours/services/FAQs fields
- Use the import feature instead of manual editing

## 📚 More Info

- **Quick Start**: `CRM_QUICK_START.md`
- **Full Guide**: `ADMIN_CRM_GUIDE.md`
- **CRM Docs**: `crm/README.md`

---

**That's it!** Simple, clean, effective. Just what you asked for.

Run `./start-crm.sh` and start managing your profiles at http://localhost:3030
