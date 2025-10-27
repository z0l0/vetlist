# Listing Removal Guide

This guide provides step-by-step instructions for removing veterinary listings from the VetList.org database while maintaining data integrity and compliance with removal requests.

## Overview

When a veterinary clinic requests removal from the directory, we follow a privacy-compliant approach that:
- Removes all business details and contact information
- Preserves the listing structure to maintain database integrity
- Shows a clear removal message to visitors
- Minimizes visibility in search results

## Step-by-Step Removal Process

### 1. Locate the Listing

First, find the listing in the professionals.csv file:

```bash
# Search for the business name
grep -n "Business Name" data/professionals.csv

# Or search by ID if known
grep -n "^1388," data/professionals.csv
```

### 2. Update the Record

Use this Python script to update the listing (replace `BUSINESS_ID` and `BUSINESS_NAME`):

```python
import csv

# Configuration
BUSINESS_ID = "1388"  # Replace with actual ID
BUSINESS_NAME = "Seaforth Animal Hospital"  # Replace with actual name

# Read and update the CSV file
with open('data/professionals.csv', 'r', encoding='utf-8') as f:
    reader = csv.reader(f)
    header = next(reader)
    rows = list(reader)

# Find and update the target record
for i, row in enumerate(rows):
    if len(row) > 1 and row[0] == BUSINESS_ID and BUSINESS_NAME in row[1]:
        print(f'Found {BUSINESS_NAME} record at row {i+2}')
        
        # Create the removal record
        new_row = [
            BUSINESS_ID,  # id - preserve original ID
            BUSINESS_NAME,  # name - preserve business name
            'This listing has been removed at the request of the owner.',  # description
            'This listing has been removed at the request of the owner.',  # detailed_description
            'null',  # hours_of_operation
            '[]',    # specialization
            'null',  # picture
            '',      # location (empty string)
            '',      # country (empty string)
            '',      # province (empty string)
            '',      # city (empty string)
            'null',  # phone_number
            'null',  # email_address
            'null',  # address
            'null',  # website
            'null',  # social_media
            'null',  # latitude
            'null',  # longitude
            'false', # is_verified
            '0',     # profile_weight (minimizes visibility)
            row[20] if len(row) > 20 else '2025-03-26 19:32:35.249624+00',  # created_at (preserve original)
            '2025-10-27 12:00:00.000000+00',  # updated_at (current timestamp)
            '[]',    # faqs
            'null'   # rating
        ]
        
        # Replace the record
        rows[i] = new_row
        
        # Write back the file
        with open('data/professionals.csv', 'w', encoding='utf-8', newline='') as f:
            writer = csv.writer(f)
            writer.writerow(header)
            writer.writerows(rows)
        
        print(f'{BUSINESS_NAME} listing successfully removed')
        break
else:
    print(f'{BUSINESS_NAME} record not found')
```

### 3. Clean Up Scattered Content

Some listings may have scattered description fragments throughout the file. Clean these up:

```python
# Clean up scattered content
with open('data/professionals.csv', 'r', encoding='utf-8') as f:
    lines = f.readlines()

cleaned_lines = []

for line in lines:
    # Skip lines that contain scattered business content (but keep the main record)
    if BUSINESS_NAME in line and not line.startswith(f'{BUSINESS_ID},{BUSINESS_NAME},This listing'):
        continue
    # Add other specific phrases to skip if needed
    elif any(phrase in line for phrase in [
        f'The clinic\'s offerings extend beyond routine check-ups. {BUSINESS_NAME}',
        f'In addition to their emergency services, {BUSINESS_NAME}',
        f'The atmosphere at {BUSINESS_NAME}',
        f'For pet owners with senior animals, {BUSINESS_NAME}',
        f'In conclusion, {BUSINESS_NAME} is a cornerstone'
    ]):
        continue
    else:
        cleaned_lines.append(line)

# Write the cleaned file
with open('data/professionals.csv', 'w', encoding='utf-8') as f:
    f.writelines(cleaned_lines)

print('Scattered content cleaned up')
```

### 4. Validate the Changes

Run this validation script to ensure the file is properly formatted:

```python
import csv
import json

# Validate the CSV file
error_count = 0
total_records = 0

with open('data/professionals.csv', 'r', encoding='utf-8') as f:
    reader = csv.reader(f)
    header = next(reader)
    expected_fields = len(header)
    
    for i, row in enumerate(reader):
        total_records += 1
        
        # Check field count
        if len(row) != expected_fields:
            print(f'Field count mismatch at line {i+2}: got {len(row)}, expected {expected_fields}')
            error_count += 1
            continue
        
        # Check the removed record specifically
        if len(row) > 1 and BUSINESS_NAME in row[1] and 'removed at the request' in row[2]:
            print(f'Validation for {BUSINESS_NAME}:')
            print(f'  ID: {row[0]}')
            print(f'  Name: {row[1]}')
            print(f'  Description: {row[2]}')
            print(f'  Profile weight: {row[19]}')
            print(f'  City: "{row[header.index("city")]}"')
            
            # Test JSON fields
            try:
                if row[4] and row[4] != 'null':
                    json.loads(row[4])
                if row[5] and row[5] != '[]':
                    json.loads(row[5])
                if row[15] and row[15] != 'null':
                    json.loads(row[15])
                if row[22] and row[22] != '[]':
                    json.loads(row[22])
                print('  JSON validation: PASSED')
            except Exception as e:
                print(f'  JSON validation: FAILED - {e}')
                error_count += 1

print(f'\nValidation complete:')
print(f'Total records: {total_records:,}')
print(f'Errors: {error_count}')
print(f'Status: {"VALID" if error_count == 0 else "HAS ERRORS"}')
```

## What Gets Removed

### ✅ Information Removed:
- Detailed business description
- Contact information (phone, email, address)
- Website and social media links
- Business hours
- Services and specializations
- Customer reviews and FAQs
- Photos/images
- Location coordinates
- Rating information

### ✅ Information Preserved:
- Business ID (for database integrity)
- Business name (for identification)
- Removal notice message
- Original creation timestamp

## Technical Considerations

### Database Integrity
- Never delete records completely - this can break relationships and cause errors
- Always preserve the ID field to maintain referential integrity
- Use empty strings for location fields (not "N/A") to prevent sorting errors

### Search Visibility
- Set `profile_weight` to `0` to minimize search visibility
- Empty location fields exclude the listing from location-based features
- The removal message clearly communicates the status to visitors

### File Format
- Maintain proper CSV structure with correct field count
- Use `null` for JSON fields that should be empty
- Use `[]` for array fields that should be empty
- Use empty strings `""` for text fields that should be blank

## Troubleshooting

### Common Issues:

1. **localeCompare Error**: Caused by null/undefined values in sorting
   - Solution: Use empty strings for location fields, not "N/A" or null

2. **JSON Parse Error**: Malformed JSON in specialization, faqs, or social_media fields
   - Solution: Use proper JSON format (`null`, `[]`, `{}`)

3. **Field Count Mismatch**: Record has wrong number of fields
   - Solution: Ensure all 24 fields are present in the correct order

4. **Scattered Content**: Old description fragments remain in file
   - Solution: Run the cleanup script to remove scattered content

### Verification Commands:

```bash
# Check record exists and is properly formatted
grep -n "This listing has been removed" data/professionals.csv

# Verify no scattered content remains
grep -n "BUSINESS_NAME" data/professionals.csv

# Count total records
wc -l data/professionals.csv
```

## Example: Complete Removal Script

Here's a complete script that handles the entire removal process:

```python
#!/usr/bin/env python3
"""
Complete listing removal script for VetList.org
Usage: python remove_listing.py --id 1388 --name "Seaforth Animal Hospital"
"""

import csv
import json
import argparse
from datetime import datetime

def remove_listing(business_id, business_name):
    """Remove a business listing while maintaining database integrity"""
    
    print(f"Starting removal process for: {business_name} (ID: {business_id})")
    
    # Step 1: Update the main record
    with open('data/professionals.csv', 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        header = next(reader)
        rows = list(reader)
    
    record_found = False
    for i, row in enumerate(rows):
        if len(row) > 1 and row[0] == business_id and business_name in row[1]:
            print(f'Found {business_name} record at row {i+2}')
            record_found = True
            
            # Create the removal record
            current_timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S.%f+00')
            new_row = [
                business_id,
                business_name,
                'This listing has been removed at the request of the owner.',
                'This listing has been removed at the request of the owner.',
                'null', '[]', 'null', '', '', '', '', 'null', 'null', 'null', 'null',
                'null', 'null', 'null', 'false', '0',
                row[20] if len(row) > 20 else '2025-03-26 19:32:35.249624+00',
                current_timestamp, '[]', 'null'
            ]
            
            rows[i] = new_row
            break
    
    if not record_found:
        print(f"ERROR: {business_name} record not found")
        return False
    
    # Step 2: Clean up scattered content
    print("Cleaning up scattered content...")
    with open('data/professionals.csv', 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    cleaned_lines = []
    for line in lines:
        if business_name in line and not line.startswith(f'{business_id},{business_name},This listing'):
            continue
        cleaned_lines.append(line)
    
    # Step 3: Write the cleaned file
    with open('data/professionals.csv', 'w', encoding='utf-8', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(header)
        writer.writerows(rows)
    
    # Step 4: Validate
    print("Validating changes...")
    error_count = 0
    with open('data/professionals.csv', 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        header = next(reader)
        for i, row in enumerate(reader):
            if len(row) != len(header):
                error_count += 1
            if len(row) > 1 and business_name in row[1] and 'removed at the request' in row[2]:
                print(f"✅ {business_name} successfully updated")
                print(f"   Profile weight: {row[19]}")
                print(f"   City field: '{row[header.index('city')]}'")
    
    if error_count == 0:
        print(f"✅ Removal completed successfully. No validation errors found.")
        return True
    else:
        print(f"❌ Validation found {error_count} errors. Please review the file.")
        return False

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Remove a veterinary listing')
    parser.add_argument('--id', required=True, help='Business ID')
    parser.add_argument('--name', required=True, help='Business name')
    
    args = parser.parse_args()
    remove_listing(args.id, args.name)
```

## Usage Examples

### Quick Removal (Manual):
```python
# Set these variables
BUSINESS_ID = "1388"
BUSINESS_NAME = "Seaforth Animal Hospital"

# Run the update script above
```

### Command Line Usage:
```bash
python remove_listing.py --id 1388 --name "Seaforth Animal Hospital"
```

## Post-Removal Checklist

- [ ] Record shows removal message instead of business details
- [ ] All contact information removed
- [ ] Profile weight set to 0
- [ ] Location fields are empty strings
- [ ] No scattered content remains in file
- [ ] CSV validation passes with 0 errors
- [ ] Site loads without JavaScript errors
- [ ] Listing excluded from location-based features

## Notes

- Always backup the professionals.csv file before making changes
- Test changes on a development environment first
- Document the removal request and date for compliance records
- The removal is reversible if the business changes their mind (restore from backup)

---

*Last updated: October 2025*