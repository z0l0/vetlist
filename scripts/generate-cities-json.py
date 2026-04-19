#!/usr/bin/env python3
"""
Generate cities.json with top 500 cities by professional count
"""
import csv
import json
from collections import defaultdict
from pathlib import Path

def slugify(text):
    """Convert text to URL-friendly slug"""
    return text.lower().replace(' ', '-').replace('_', '-')

def main():
    data_dir = Path(__file__).parent.parent / 'data'
    
    # Count professionals per city
    city_counts = defaultdict(int)
    city_info = {}
    
    # Process both Canada and USA files
    csv_files = [
        data_dir / 'professionals-canada.csv',
        data_dir / 'professionals-usa.csv'
    ]
    
    for csv_file in csv_files:
        if not csv_file.exists():
            print(f"Warning: {csv_file} not found, skipping...")
            continue
            
        print(f"Processing {csv_file.name}...")
        
        with open(csv_file, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            
            for row in reader:
                city = row.get('city', '').strip()
                province = row.get('province', '').strip()
                country = row.get('country', '').strip()
                
                # Skip if missing required fields
                if not city or not province or not country:
                    continue
                
                # Normalize country name
                if country.lower() in ['us', 'usa', 'united states', 'united states of america']:
                    country = 'United States'
                elif country.lower() in ['ca', 'canada']:
                    country = 'Canada'
                
                # Create unique key
                key = f"{city}|{province}|{country}"
                
                # Count professionals
                city_counts[key] += 1
                
                # Store city info (first occurrence)
                if key not in city_info:
                    city_info[key] = {
                        'city': city,
                        'region': province,
                        'regionSlug': slugify(province),
                        'country': country,
                        'countrySlug': slugify(country)
                    }
    
    print(f"\nTotal unique cities: {len(city_counts)}")
    
    # Sort by count (descending) and get top 500
    sorted_cities = sorted(city_counts.items(), key=lambda x: x[1], reverse=True)
    top_500 = sorted_cities[:500]
    
    # Build output array
    cities_json = []
    for key, count in top_500:
        info = city_info[key]
        info['professionalCount'] = count  # Add count for reference
        cities_json.append(info)
    
    # Write to file
    output_file = data_dir.parent / 'cities.json'
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(cities_json, f, indent=2, ensure_ascii=False)
    
    print(f"\n✅ Generated {output_file}")
    print(f"   Top 500 cities written")
    print(f"\nTop 10 cities by professional count:")
    for i, (key, count) in enumerate(top_500[:10], 1):
        info = city_info[key]
        print(f"   {i}. {info['city']}, {info['region']}, {info['country']}: {count} professionals")
    
    # Print country breakdown
    country_counts = defaultdict(int)
    for info in cities_json:
        country_counts[info['country']] += 1
    
    print(f"\nCountry breakdown in top 500:")
    for country, count in sorted(country_counts.items(), key=lambda x: x[1], reverse=True):
        print(f"   {country}: {count} cities")

if __name__ == '__main__':
    main()
