#!/usr/bin/env python3
"""
Fix Juno Veterinary Bloor West hours
Replace incorrect split hours with correct business hours
"""

import csv
import json
import sys

def fix_juno_hours():
    """Fix Juno Veterinary Bloor West hours to correct business hours"""
    
    # Correct hours based on their website: Mon-Fri 8AM-6PM, Sat closed, Sun 8AM-6PM
    correct_hours = {
        "1": ["08:00-18:00"],  # Monday
        "2": ["08:00-18:00"],  # Tuesday  
        "3": ["08:00-18:00"],  # Wednesday
        "4": ["08:00-18:00"],  # Thursday
        "5": ["08:00-18:00"],  # Friday
        "6": None,             # Saturday - closed
        "7": ["08:00-18:00"]   # Sunday
    }
    
    input_file = 'data/professionals.csv'
    output_file = 'data/professionals.csv'
    
    rows = []
    fixed_count = 0
    
    print("Reading professionals.csv...")
    
    with open(input_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames
        
        for row in reader:
            # Check if this is Juno Veterinary Bloor West
            if row.get('name') == 'Juno Veterinary Bloor West' and row.get('id') == '2095':
                print(f"Found Juno Veterinary Bloor West (ID: {row.get('id')})")
                print(f"Current hours: {row.get('hours_of_operation')}")
                
                # Update hours
                row['hours_of_operation'] = json.dumps(correct_hours)
                fixed_count += 1
                
                print(f"Fixed hours: {row['hours_of_operation']}")
            
            rows.append(row)
    
    print(f"\nWriting updated data to {output_file}...")
    
    with open(output_file, 'w', encoding='utf-8', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
    
    print(f"✅ Fixed {fixed_count} entries")
    print(f"✅ Updated {len(rows)} total rows")
    
    return fixed_count > 0

if __name__ == '__main__':
    success = fix_juno_hours()
    sys.exit(0 if success else 1)