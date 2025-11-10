# VetList Local CRM Guide

A simple, local-only CRM system for managing VetList profile data stored in CSV files.

## 🚀 Getting Started

### Access the CRM

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Open your browser to:
   ```
   http://localhost:4321/admin/
   ```

## 📋 Features

### 1. Browse Profiles (`/admin/`)
- View all profiles from any CSV file
- Search by name, city, province, or phone number
- Quick edit and view links for each profile
- Shows first 50 results (use search to narrow down)

### 2. Edit Profile (`/admin/edit`)
- Edit individual profile information
- Update contact details, hours, services, FAQs
- Changes are saved directly to the CSV file
- Automatic timestamp updates

### 3. Import from Email (`/admin/import`)
- Paste claim emails directly
- Automatic parsing of:
  - Practice name, phone, email, website
  - Full address (street, city, province, country)
  - Services offered
  - Hours of operation
  - FAQs
- Preview parsed data before saving
- Choose which CSV file to save to

### 4. Bulk Edit (`/admin/bulk-edit`)
- Direct CSV editing for advanced users
- Edit raw CSV content
- Validation before saving
- ⚠️ Use with caution - invalid CSV will cause errors

## 📧 Email Import Format

The CRM can parse claim emails in this format:

```
Dear VetList Team,

I would like to claim my veterinary practice profile on VetList.org.

PRACTICE INFORMATION:
Practice Name: Example Vet Clinic
Phone: (555) 123-4567
Email: info@example.com
Website: https://example.com

ADDRESS:
123 Main Street
Toronto, Ontario
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

## 🔧 How It Works

### Data Storage
- All profile data is stored in CSV files in the `/data` directory
- Multiple CSV files: `professionals.csv`, `professionals2.csv`, etc.
- Changes are written directly to the CSV files
- No database required - everything is file-based

### CSV Structure
Each profile has these fields:
- `id` - Unique identifier
- `name` - Practice name
- `phone_number` - Contact phone
- `email_address` - Contact email
- `website` - Website URL
- `address` - Street address
- `city` - City name
- `province` - Province/state
- `country` - Country
- `hours_of_operation` - JSON object with hours
- `specialization` - JSON array of services
- `description` - Short description
- `detailed_description` - Long description
- `faqs` - JSON array of Q&A pairs
- Plus other fields for location, ratings, etc.

### Email Parser
The import feature uses regex patterns to extract:
1. **Practice Info**: Name, phone, email, website
2. **Address**: Parses multi-line address format
3. **Services**: Comma-separated list → JSON array
4. **Hours**: Day/time pairs → JSON object
5. **FAQs**: Question/answer pairs → JSON array

## 💡 Tips

### Searching
- Search works across name, city, province, and phone
- Use partial matches (e.g., "Toronto" finds all Toronto clinics)
- Clear search to see all profiles again

### Editing
- JSON fields (hours, services, FAQs) must be valid JSON
- Use the import feature for complex data entry
- Manual edit is best for simple text changes

### Importing
1. Copy the entire claim email
2. Paste into the import form
3. Click "Parse Email" to preview
4. Review the extracted data
5. Click "Save to CSV" to add the profile

### Bulk Editing
- Only use if you're comfortable with CSV format
- Always backup your CSV files first
- Invalid CSV will be rejected with error message
- Good for find/replace operations across many profiles

## 🚨 Important Notes

### Local Only
- This CRM only works in development mode (`npm run dev`)
- It will NOT work in production builds
- File system access is required (Node.js environment)

### Data Safety
- Changes are immediate - no undo feature
- Backup your CSV files before bulk operations
- Test with a single profile first

### Build Process
- After making changes, rebuild the site to see updates:
  ```bash
  npm run build:fast  # For testing
  npm run build       # For production
  ```

### CSV File Selection
- Choose the appropriate CSV file when importing
- Profiles are distributed across multiple CSV files
- Each file can have thousands of profiles

## 🎯 Common Workflows

### Adding a New Profile from Email
1. Go to `/admin/import`
2. Paste the claim email
3. Click "Parse Email"
4. Review the preview
5. Select target CSV file
6. Click "Save to CSV"
7. Rebuild the site to see the new profile

### Updating Existing Profile
1. Go to `/admin/`
2. Search for the profile
3. Click "Edit"
4. Make your changes
5. Click "Save Changes"
6. Rebuild the site

### Finding a Profile
1. Go to `/admin/`
2. Use the search box
3. Search by name, city, province, or phone
4. Click "View" to see the live page
5. Click "Edit" to modify

## 🔍 Troubleshooting

### "Profile not found"
- Check if you're looking in the right CSV file
- Try searching from the main admin page

### "CSV parsing errors"
- Check for invalid JSON in hours/services/FAQs fields
- Ensure all required fields are present
- Validate CSV format in bulk edit mode

### Changes not showing on site
- Remember to rebuild: `npm run build:fast`
- Clear browser cache
- Check if you edited the correct CSV file

### Import not working
- Ensure email format matches expected structure
- Check for missing sections (ADDRESS, HOURS, etc.)
- Try parsing first to see what was extracted

---

**Built for VetList.org** - Simple, local, effective profile management.
