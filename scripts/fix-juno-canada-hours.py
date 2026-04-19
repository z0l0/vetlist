#!/usr/bin/env python3

import csv
import json
import sys

def fix_juno_hours_canada():
    """Fix hours for ALL Juno Veterinary locations in professionals-canada.csv"""
    
    # Read the CSV file
    rows = []
    with open('data/professionals-canada.csv', 'r', encoding='utf-8') as file:
        reader = csv.DictReader(file)
        fieldnames = reader.fieldnames
        
        for row in reader:
            # Check if this is a Juno Veterinary location
            if 'Juno Veterinary' in row.get('name', '') or 'Juno Vet' in row.get('name', ''):
                print(f"Found Juno location: {row['name']}")
                
                # Parse current hours
                hours_str = row.get('hours_of_operation', '{}')
                if hours_str and hours_str != '{}':
                    try:
                        hours = json.loads(hours_str)
                        print(f"  Current hours: {hours}")
                        
                        # Fix any split hours (like "08:00-23:59","00:00-06:00")
                        fixed_hours = {}
                        for day, times in hours.items():
                            if times and isinstance(times, list):
                                # Check if this has split hours format
                                if len(times) == 2 and times[1].startswith('00:00'):
                                    # This is split hours - convert to normal business hours
                                    fixed_hours[day] = ["08:00-18:00"]
                                    print(f"  Fixed day {day}: {times} -> ['08:00-18:00']")
                                else:
                                    # Keep existing format
                                    fixed_hours[day] = times
                            else:
                                fixed_hours[day] = times
                        
                        # Update the row
                        row['hours_of_operation'] = json.dumps(fixed_hours)
                        print(f"  New hours: {fixed_hours}")
                        
                    except json.JSONDecodeError:
                        print(f"  Error parsing hours JSON: {hours_str}")
                
            rows.append(row)
    
    # Write back to CSV
    with open('data/professionals-canada.csv', 'w', encoding='utf-8', newline='') as file:
        writer = csv.DictWriter(file, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
    
    print("✅ Fixed hours for all Juno Veterinary locations in professionals-canada.csv")

if __name__ == "__main__":
    fix_juno_hours_canada()