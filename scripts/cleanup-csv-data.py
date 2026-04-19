#!/usr/bin/env python3
"""
CSV Data Cleanup Script
Removes AI-generated slop columns and optimizes data for faster builds
"""

import csv
import os
import glob

# Columns to remove (AI slop)
COLUMNS_TO_REMOVE = [
    'detailed_description',  # Long AI-generated descriptions
    'description',  # Short AI-generated descriptions
    'faqs',  # AI-generated FAQs
]

# Columns to keep
ESSENTIAL_COLUMNS = [
    'id', 'name', 'hours_of_operation', 'specialization', 'picture',
    'location', 'country', 'province', 'city', 'phone_number',
    'email_address', 'address', 'website', 'social_media',
    'latitude', 'longitude', 'is_verified', 'profile_weight',
    'created_at', 'updated_at', 'rating', 'claimed'
]

def cleanup_csv_file(input_path, output_path):
    """Clean up a single CSV file by removing AI slop columns"""
    print(f"Processing: {input_path}")
    
    with open(input_path, 'r', encoding='utf-8') as infile:
        reader = csv.DictReader(infile)
        
        # Get original fieldnames and filter out columns to remove
        original_fields = reader.fieldnames
        new_fields = [f for f in original_fields if f not in COLUMNS_TO_REMOVE]
        
        rows = []
        for row in reader:
            # Create new row with only essential columns
            new_row = {k: v for k, v in row.items() if k in new_fields}
            rows.append(new_row)
    
    # Write cleaned data
    with open(output_path, 'w', encoding='utf-8', newline='') as outfile:
        writer = csv.DictWriter(outfile, fieldnames=new_fields, quoting=csv.QUOTE_ALL)
        writer.writeheader()
        writer.writerows(rows)
    
    print(f"  ✓ Removed {len(original_fields) - len(new_fields)} columns")
    print(f"  ✓ Processed {len(rows)} rows")
    print(f"  ✓ Saved to: {output_path}\n")

def main():
    """Process all CSV files in the data directory"""
    data_dir = 'data'
    
    # Find all CSV files
    csv_files = glob.glob(os.path.join(data_dir, '*.csv'))
    
    if not csv_files:
        print(f"No CSV files found in {data_dir}/")
        return
    
    print(f"Found {len(csv_files)} CSV files to process\n")
    print("=" * 60)
    
    for csv_file in csv_files:
        # Skip if it's already a cleaned file
        if '_cleaned' in csv_file:
            continue
        
        # Create output filename
        base_name = os.path.basename(csv_file)
        name_without_ext = os.path.splitext(base_name)[0]
        output_file = os.path.join(data_dir, f"{name_without_ext}_cleaned.csv")
        
        try:
            cleanup_csv_file(csv_file, output_file)
        except Exception as e:
            print(f"  ✗ Error processing {csv_file}: {e}\n")
    
    print("=" * 60)
    print("\n✓ CSV cleanup complete!")
    print("\nNext steps:")
    print("1. Review the *_cleaned.csv files")
    print("2. If they look good, replace the originals:")
    print("   - Delete old CSV files")
    print("   - Rename *_cleaned.csv files to remove '_cleaned' suffix")
    print("3. Update dataCache.js to use the new column structure")

if __name__ == '__main__':
    main()
