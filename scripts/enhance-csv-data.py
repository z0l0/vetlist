#!/usr/bin/env python3
"""
CSV Data Enhancement Script
1. Adds 'animals_treated' column by parsing specializations
2. Cleans up specializations to be more useful and standardized
"""

import csv
import os
import glob
import json

# Animal keywords to search for in specializations
ANIMAL_KEYWORDS = {
    'dogs': ['Dog', 'Canine', 'Puppy'],
    'cats': ['Cat', 'Feline', 'Kitten'],
    'horses': ['Horse', 'Equine', 'Pony'],
    'exotic': ['Exotic', 'Reptile', 'Lizard', 'Snake', 'Turtle', 'Tortoise'],
    'birds': ['Bird', 'Avian', 'Parrot', 'Chicken'],
    'small_animals': ['Rabbit', 'Hamster', 'Guinea Pig', 'Ferret', 'Rodent', 'Small Animal'],
    'farm_animals': ['Farm Animal', 'Cattle', 'Cow', 'Pig', 'Goat', 'Sheep', 'Livestock'],
    'fish': ['Fish', 'Aquatic', 'Koi']
}

# Standardized service names (clean up variations)
SERVICE_STANDARDIZATION = {
    # Emergency
    'Emergency Care': 'Emergency Care',
    'Emergency': 'Emergency Care',
    '24/7 Emergency': '24/7 Emergency',
    'Urgent Care': 'Emergency Care',
    
    # Surgery
    'Surgery': 'Surgery',
    'Pet Surgery': 'Surgery',
    'Surgical': 'Surgery',
    'Orthopedic Surgery': 'Orthopedic Surgery',
    'Soft Tissue Surgery': 'Surgery',
    
    # Dental
    'Dental': 'Dental Care',
    'Pet Dental Care': 'Dental Care',
    'Teeth Cleaning': 'Dental Care',
    'Dentistry': 'Dental Care',
    
    # Diagnostics
    'Diagnostics': 'Diagnostics',
    'Lab Testing': 'Diagnostics',
    'X-Ray': 'Diagnostics',
    'Ultrasound': 'Ultrasound',
    'Radiology': 'Diagnostics',
    
    # Wellness
    'Wellness Exams': 'Wellness Exams',
    'Checkup': 'Wellness Exams',
    'Physical Exam': 'Wellness Exams',
    'Preventive Care': 'Wellness Exams',
    
    # Specialized
    'Spay & Neuter': 'Spay & Neuter',
    'Spay/Neuter': 'Spay & Neuter',
    'Neutering': 'Spay & Neuter',
    'Vaccination': 'Vaccinations',
    'Vaccines': 'Vaccinations',
    'Microchipping': 'Microchipping',
    'Grooming': 'Grooming',
    'Boarding': 'Boarding',
    'Euthanasia': 'Euthanasia',
    'End of Life Care': 'Euthanasia',
    
    # Medical specialties
    'Oncology': 'Oncology',
    'Cancer Treatment': 'Oncology',
    'Cardiology': 'Cardiology',
    'Dermatology': 'Dermatology',
    'Skin Care': 'Dermatology',
    'Ophthalmology': 'Ophthalmology',
    'Eye Care': 'Ophthalmology',
    'Behavior Counseling': 'Behavior Counseling',
    'Training': 'Behavior Counseling',
    
    # Other
    'Nutrition Advice': 'Nutrition Counseling',
    'Diet': 'Nutrition Counseling',
    'Allergy Care': 'Allergy Treatment',
    'Allergies': 'Allergy Treatment',
    'Flea & Tick Control': 'Flea & Tick Control',
    'Parasite Control': 'Flea & Tick Control',
}

def detect_animals(specializations):
    """Detect which animals are treated based on specializations"""
    animals = set()
    
    if not specializations:
        # Default to dogs and cats if no info
        return ['dogs', 'cats']
    
    spec_text = ' '.join(specializations)
    
    for animal_type, keywords in ANIMAL_KEYWORDS.items():
        for keyword in keywords:
            if keyword.lower() in spec_text.lower():
                animals.add(animal_type)
                break
    
    # If no animals detected, default to dogs and cats
    if not animals:
        animals = {'dogs', 'cats'}
    
    return sorted(list(animals))

def standardize_specializations(specializations):
    """Clean up and standardize specialization names"""
    if not specializations:
        return []
    
    standardized = set()
    
    for spec in specializations:
        # Try to find a standardized version
        found = False
        for original, standard in SERVICE_STANDARDIZATION.items():
            if original.lower() in spec.lower():
                standardized.add(standard)
                found = True
                break
        
        # If no match found, keep original if it's useful
        if not found and len(spec) > 3 and not any(animal in spec for animals in ANIMAL_KEYWORDS.values() for animal in animals):
            standardized.add(spec)
    
    return sorted(list(standardized))

def enhance_csv_file(input_path, output_path):
    """Enhance a single CSV file with animals and cleaned specializations"""
    print(f"Processing: {input_path}")
    
    with open(input_path, 'r', encoding='utf-8') as infile:
        reader = csv.DictReader(infile)
        fieldnames = reader.fieldnames
        
        # Add animals_treated column if not present
        if 'animals_treated' not in fieldnames:
            fieldnames = list(fieldnames)
            # Insert after specialization
            spec_index = fieldnames.index('specialization') if 'specialization' in fieldnames else len(fieldnames)
            fieldnames.insert(spec_index + 1, 'animals_treated')
        
        rows = []
        for row in reader:
            # Parse specializations
            try:
                specializations = json.loads(row.get('specialization', '[]'))
            except:
                specializations = []
            
            # Detect animals
            animals = detect_animals(specializations)
            row['animals_treated'] = json.dumps(animals)
            
            # Standardize specializations
            cleaned_specs = standardize_specializations(specializations)
            row['specialization'] = json.dumps(cleaned_specs)
            
            rows.append(row)
    
    # Write enhanced data
    with open(output_path, 'w', encoding='utf-8', newline='') as outfile:
        writer = csv.DictWriter(outfile, fieldnames=fieldnames, quoting=csv.QUOTE_ALL)
        writer.writeheader()
        writer.writerows(rows)
    
    print(f"  ✓ Added animals_treated column")
    print(f"  ✓ Cleaned {len(rows)} specialization entries")
    print(f"  ✓ Saved to: {output_path}\n")

def main():
    """Process all professional CSV files"""
    data_dir = 'data'
    
    # Find all professional CSV files
    csv_files = glob.glob(os.path.join(data_dir, 'professionals*.csv'))
    
    if not csv_files:
        print(f"No professional CSV files found in {data_dir}/")
        return
    
    print(f"Found {len(csv_files)} CSV files to enhance\n")
    print("=" * 60)
    
    for csv_file in csv_files:
        # Skip if it's already an enhanced file
        if '_enhanced' in csv_file:
            continue
        
        # Create output filename
        base_name = os.path.basename(csv_file)
        name_without_ext = os.path.splitext(base_name)[0]
        output_file = os.path.join(data_dir, f"{name_without_ext}_enhanced.csv")
        
        try:
            enhance_csv_file(csv_file, output_file)
        except Exception as e:
            print(f"  ✗ Error processing {csv_file}: {e}\n")
    
    print("=" * 60)
    print("\n✓ CSV enhancement complete!")
    print("\nNext steps:")
    print("1. Review the *_enhanced.csv files")
    print("2. If they look good, replace the originals:")
    print("   - Delete old CSV files")
    print("   - Rename *_enhanced.csv files to remove '_enhanced' suffix")

if __name__ == '__main__':
    main()
