#!/usr/bin/env python3
"""
VetScore Calculator - VetList.org's Competitive Differentiator

Calculates a comprehensive quality score (0-100) for each veterinary clinic
based on completeness, accessibility, transparency, and engagement.

SCORING PHILOSOPHY:
- Base score rewards having essential information
- Rare/valuable features get bonus points (emergency, 24hr, exotic animals)
- Transparency bonuses (pricing, languages, accessibility)
- Engagement multipliers (backlinks, claimed listings)

MAX POSSIBLE: ~95 without backlink, 100+ with backlink multiplier
"""

import csv
import json
import os
from datetime import datetime
from collections import Counter

# ============================================================================
# SCORING CONFIGURATION
# ============================================================================

SCORING_CONFIG = {
    # CATEGORY 1: ESSENTIAL INFORMATION (Max: 30 points)
    'essential': {
        'phone_number': 5,           # Critical for contact
        'address': 3,                # Location verification
        'website': 4,                # Online presence
        'email_address': 3,          # Alternative contact
        'description': 2,            # Basic info
        'detailed_description': 3,   # Rich content
        'picture': 2,                # Visual presence
        'rating': 3,                 # Social proof (any rating)
        'high_rating': 5,            # Bonus for 4.5+ rating
    },
    
    # CATEGORY 2: HOURS & AVAILABILITY (Max: 20 points)
    'availability': {
        'has_hours': 3,              # Any hours listed
        'days_open_5': 2,            # Open 5 days
        'days_open_6': 4,            # Open 6 days
        'days_open_7': 6,            # Open 7 days (rare, valuable)
        'weekend_hours': 4,          # Saturday or Sunday
        'extended_hours': 3,         # Open past 7pm or before 8am
        'accepts_new_patients': 2,   # Explicitly accepting
        'walk_ins_welcome': 2,       # Convenience
        'online_booking': 3,         # Modern convenience
    },
    
    # CATEGORY 3: EMERGENCY & SPECIALTY (Max: 20 points)
    'emergency': {
        'emergency_services': 6,     # Any emergency care
        'emergency_24_hour': 10,     # 24/7 availability (very rare: 6%)
        'after_hours_phone': 3,      # Emergency contact
        'telehealth': 4,             # Remote consultations (rare: 5%)
        'house_calls': 5,            # Mobile service (rare: 7%)
        'mobile_vet': 5,             # Mobile clinic
    },
    
    # CATEGORY 4: SERVICES & ANIMALS (Max: 15 points)
    'services': {
        'services_4_6': 2,           # 4-6 services
        'services_7_9': 4,           # 7-9 services
        'services_10_plus': 6,       # 10+ services
        'exotic_animals': 4,         # Birds, fish, exotic, horses, farm
        'multiple_pet_types': 3,     # 3+ pet types
        'specialty_services': 2,     # Boarding, grooming, daycare, training
    },
    
    # CATEGORY 5: TRANSPARENCY & TRUST (Max: 15 points)
    'transparency': {
        'has_pricing': 8,            # Price transparency (very rare: 1.3%)
        'pricing_detailed': 4,       # Multiple prices listed
        'accepts_insurance': 3,      # Insurance accepted
        'payment_plans': 3,          # Financing options
        'year_established': 2,       # History/longevity
        'established_10_plus': 3,    # 10+ years (trust)
        'veterinarian_count': 2,     # Team size
        'accreditations': 4,         # Professional certifications
        'languages': 3,              # Multilingual (accessibility)
        'languages_3_plus': 2,       # 3+ languages
    },
    
    # CATEGORY 6: DIGITAL PRESENCE (Max: 10 points)
    'digital': {
        'social_facebook': 2,        # Facebook presence
        'social_instagram': 2,       # Instagram presence
        'social_multiple': 3,        # 3+ social platforms
        'has_blog': 2,               # Content marketing
        'client_portal': 2,          # Modern tech
        'online_pharmacy': 2,        # Convenience
    },
    
    # CATEGORY 7: TRUST, INCENTIVES & COMMUNITY (Max: 53 points)
    'community': {
        'claimed_listing': 5,        # Owner has claimed the listing
        'verified_listing': 6,       # Verified ownership/trust signal
        'backlink_vetlist': 12,      # Strong network trust + distribution signal
        'trusted_network_tier': 6,   # Verified + backlink clinics enter a higher trust tier
        'featured_network_tier': 9,  # Claimed + verified + backlink clinics get top-tier priority
        'military_discount': 2,      # Supporting military
        'senior_discount': 1,        # Senior care
        'rescue_discount': 2,        # Supporting rescues
        'free_first_visit': 2,       # New patient incentive
    },
    
    # MULTIPLIERS (Applied after base score)
    'multipliers': {
        'claimed_listing': 1.12,     # Modest bonus for claimed
        'backlink_vetlist': 1.18,    # Strong but restrained bonus for linking back to us
        'verified': 1.08,            # Modest verified-owner bonus
    },
    'floors': {
        'verified_tier': 48,         # Claim + verify should create an obvious jump
        'trusted_network': 66,       # Verified + backlink should feel strong without auto-winning
        'featured_network': 74,      # Claimed + verified + backlink can reach a high-trust tier
    }
}

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def safe_parse_json(s, default=None):
    if not s or s in ('null', '', '[]', '{}'):
        return default
    try:
        return json.loads(s)
    except:
        return default

def count_days_open(hours_obj):
    if not hours_obj or not isinstance(hours_obj, dict):
        return 0
    count = 0
    for d in ['1', '2', '3', '4', '5', '6', '7']:
        day_hours = hours_obj.get(d)
        if day_hours and isinstance(day_hours, list) and len(day_hours) > 0:
            count += 1
    return count

def has_weekend_hours(hours_obj):
    if not hours_obj or not isinstance(hours_obj, dict):
        return False
    sat = hours_obj.get('6')
    sun = hours_obj.get('7')
    return (sat and isinstance(sat, list) and len(sat) > 0) or \
           (sun and isinstance(sun, list) and len(sun) > 0)

def has_extended_hours(hours_obj):
    if not hours_obj or not isinstance(hours_obj, dict):
        return False
    for day_hours in hours_obj.values():
        if not day_hours or not isinstance(day_hours, list):
            continue
        for time_range in day_hours:
            if not time_range or '-' not in time_range:
                continue
            parts = time_range.split('-')
            if len(parts) != 2:
                continue
            try:
                open_hour = int(parts[0].strip().split(':')[0])
                close_hour = int(parts[1].strip().split(':')[0])
                if open_hour < 8 or close_hour >= 19:
                    return True
            except:
                continue
    return False

def has_exotic_animals(pet_types):
    if not pet_types or not isinstance(pet_types, list):
        return False
    exotic = ['exotic', 'birds', 'fish', 'horses', 'farm_animals', 'small_animals']
    return any(p.lower() in exotic for p in pet_types if p)

def count_social_platforms(profile):
    count = 0
    social_fields = ['social_facebook', 'social_instagram', 'social_twitter', 
                     'social_youtube', 'social_tiktok', 'social_linkedin',
                     'social_yelp', 'social_nextdoor']
    for field in social_fields:
        if profile.get(field) and profile[field].strip():
            count += 1
    return count

def count_pricing_fields(profile):
    pricing_fields = [
        'pricing_exam', 'pricing_vaccine', 'pricing_rabies', 'pricing_spay_dog',
        'pricing_spay_cat', 'pricing_neuter_dog', 'pricing_neuter_cat', 'pricing_dental',
        'pricing_blood_panel', 'pricing_fecal', 'pricing_microchip', 'pricing_xray',
        'pricing_nail_trim', 'pricing_anal_gland', 'pricing_ear_clean'
    ]
    return sum(1 for f in pricing_fields if profile.get(f) and profile[f].strip())

def is_truthy(val):
    if not val:
        return False
    v = str(val).lower().strip()
    return v in ('true', 'yes', '1')

# ============================================================================
# MAIN SCORING FUNCTION
# ============================================================================

def calculate_vetscore(profile):
    scores = {
        'essential': 0,
        'availability': 0,
        'emergency': 0,
        'services': 0,
        'transparency': 0,
        'digital': 0,
        'community': 0,
    }
    
    breakdown = {}
    cfg = SCORING_CONFIG
    
    # Helper to safely get string value
    def get_str(key):
        val = profile.get(key)
        return str(val).strip() if val else ''
    
    # --- ESSENTIAL INFORMATION ---
    if get_str('phone_number'):
        scores['essential'] += cfg['essential']['phone_number']
        breakdown['phone_number'] = cfg['essential']['phone_number']
    if get_str('address'):
        scores['essential'] += cfg['essential']['address']
        breakdown['address'] = cfg['essential']['address']
    if get_str('website'):
        scores['essential'] += cfg['essential']['website']
        breakdown['website'] = cfg['essential']['website']
    if get_str('email_address'):
        scores['essential'] += cfg['essential']['email_address']
        breakdown['email_address'] = cfg['essential']['email_address']
    if get_str('description'):
        scores['essential'] += cfg['essential']['description']
        breakdown['description'] = cfg['essential']['description']
    if get_str('detailed_description') and len(get_str('detailed_description')) > 100:
        scores['essential'] += cfg['essential']['detailed_description']
        breakdown['detailed_description'] = cfg['essential']['detailed_description']
    if get_str('picture'):
        scores['essential'] += cfg['essential']['picture']
        breakdown['picture'] = cfg['essential']['picture']
    
    try:
        rating = float(profile.get('rating', 0) or 0)
        if rating > 0:
            scores['essential'] += cfg['essential']['rating']
            breakdown['rating'] = cfg['essential']['rating']
            if rating >= 4.5:
                scores['essential'] += cfg['essential']['high_rating']
                breakdown['high_rating'] = cfg['essential']['high_rating']
    except:
        pass
    
    # --- AVAILABILITY ---
    hours = safe_parse_json(profile.get('hours_of_operation'), {})
    days_open = count_days_open(hours)
    
    if days_open > 0:
        scores['availability'] += cfg['availability']['has_hours']
        breakdown['has_hours'] = cfg['availability']['has_hours']
    if days_open >= 5:
        scores['availability'] += cfg['availability']['days_open_5']
        breakdown['days_open_5'] = cfg['availability']['days_open_5']
    if days_open >= 6:
        scores['availability'] += cfg['availability']['days_open_6']
        breakdown['days_open_6'] = cfg['availability']['days_open_6']
    if days_open == 7:
        scores['availability'] += cfg['availability']['days_open_7']
        breakdown['days_open_7'] = cfg['availability']['days_open_7']
    if has_weekend_hours(hours):
        scores['availability'] += cfg['availability']['weekend_hours']
        breakdown['weekend_hours'] = cfg['availability']['weekend_hours']
    if has_extended_hours(hours):
        scores['availability'] += cfg['availability']['extended_hours']
        breakdown['extended_hours'] = cfg['availability']['extended_hours']
    if is_truthy(profile.get('accepts_new_patients')):
        scores['availability'] += cfg['availability']['accepts_new_patients']
        breakdown['accepts_new_patients'] = cfg['availability']['accepts_new_patients']
    if is_truthy(profile.get('walk_ins_welcome')):
        scores['availability'] += cfg['availability']['walk_ins_welcome']
        breakdown['walk_ins_welcome'] = cfg['availability']['walk_ins_welcome']
    if is_truthy(profile.get('online_booking')):
        scores['availability'] += cfg['availability']['online_booking']
        breakdown['online_booking'] = cfg['availability']['online_booking']
    
    # --- EMERGENCY & SPECIALTY ---
    if is_truthy(profile.get('emergency_services')):
        scores['emergency'] += cfg['emergency']['emergency_services']
        breakdown['emergency_services'] = cfg['emergency']['emergency_services']
    if is_truthy(profile.get('emergency_24_hour')):
        scores['emergency'] += cfg['emergency']['emergency_24_hour']
        breakdown['emergency_24_hour'] = cfg['emergency']['emergency_24_hour']
    if get_str('after_hours_emergency_phone'):
        scores['emergency'] += cfg['emergency']['after_hours_phone']
        breakdown['after_hours_phone'] = cfg['emergency']['after_hours_phone']
    if is_truthy(profile.get('telehealth_available')):
        scores['emergency'] += cfg['emergency']['telehealth']
        breakdown['telehealth'] = cfg['emergency']['telehealth']
    if is_truthy(profile.get('house_calls_available')):
        scores['emergency'] += cfg['emergency']['house_calls']
        breakdown['house_calls'] = cfg['emergency']['house_calls']
    if is_truthy(profile.get('mobile_vet_service')):
        scores['emergency'] += cfg['emergency']['mobile_vet']
        breakdown['mobile_vet'] = cfg['emergency']['mobile_vet']
    
    # --- SERVICES & ANIMALS ---
    services = safe_parse_json(profile.get('specialization'), [])
    service_count = len(services) if isinstance(services, list) else 0
    
    if 4 <= service_count <= 6:
        scores['services'] += cfg['services']['services_4_6']
        breakdown['services_4_6'] = cfg['services']['services_4_6']
    elif 7 <= service_count <= 9:
        scores['services'] += cfg['services']['services_7_9']
        breakdown['services_7_9'] = cfg['services']['services_7_9']
    elif service_count >= 10:
        scores['services'] += cfg['services']['services_10_plus']
        breakdown['services_10_plus'] = cfg['services']['services_10_plus']
    
    pet_types = safe_parse_json(profile.get('pet_types_served'), [])
    if has_exotic_animals(pet_types):
        scores['services'] += cfg['services']['exotic_animals']
        breakdown['exotic_animals'] = cfg['services']['exotic_animals']
    if isinstance(pet_types, list) and len(pet_types) >= 3:
        scores['services'] += cfg['services']['multiple_pet_types']
        breakdown['multiple_pet_types'] = cfg['services']['multiple_pet_types']
    
    # Specialty services
    has_specialty = any(is_truthy(profile.get(f)) for f in 
                        ['boarding_available', 'grooming_available', 'daycare_available', 'training_available'])
    if has_specialty:
        scores['services'] += cfg['services']['specialty_services']
        breakdown['specialty_services'] = cfg['services']['specialty_services']
    
    # --- TRANSPARENCY & TRUST ---
    if is_truthy(profile.get('has_pricing')):
        scores['transparency'] += cfg['transparency']['has_pricing']
        breakdown['has_pricing'] = cfg['transparency']['has_pricing']
        
        pricing_count = count_pricing_fields(profile)
        if pricing_count >= 3:
            scores['transparency'] += cfg['transparency']['pricing_detailed']
            breakdown['pricing_detailed'] = cfg['transparency']['pricing_detailed']
    
    if is_truthy(profile.get('accepts_pet_insurance')):
        scores['transparency'] += cfg['transparency']['accepts_insurance']
        breakdown['accepts_insurance'] = cfg['transparency']['accepts_insurance']
    if is_truthy(profile.get('payment_plans')):
        scores['transparency'] += cfg['transparency']['payment_plans']
        breakdown['payment_plans'] = cfg['transparency']['payment_plans']
    
    try:
        year_established = int(profile.get('year_established', 0) or 0)
        current_year = datetime.now().year
        if 1900 < year_established <= current_year:
            scores['transparency'] += cfg['transparency']['year_established']
            breakdown['year_established'] = cfg['transparency']['year_established']
            
            years_in_business = current_year - year_established
            if years_in_business >= 10:
                scores['transparency'] += cfg['transparency']['established_10_plus']
                breakdown['established_10_plus'] = cfg['transparency']['established_10_plus']
    except:
        pass
    
    try:
        vet_count = int(profile.get('veterinarian_count', 0) or 0)
        if vet_count > 0:
            scores['transparency'] += cfg['transparency']['veterinarian_count']
            breakdown['veterinarian_count'] = cfg['transparency']['veterinarian_count']
    except:
        pass
    
    accreditations = safe_parse_json(profile.get('accreditations'), [])
    if isinstance(accreditations, list) and len(accreditations) > 0:
        scores['transparency'] += cfg['transparency']['accreditations']
        breakdown['accreditations'] = cfg['transparency']['accreditations']
    
    languages = safe_parse_json(profile.get('languages_spoken'), [])
    if isinstance(languages, list) and len(languages) > 1:
        scores['transparency'] += cfg['transparency']['languages']
        breakdown['languages'] = cfg['transparency']['languages']
        if len(languages) >= 3:
            scores['transparency'] += cfg['transparency']['languages_3_plus']
            breakdown['languages_3_plus'] = cfg['transparency']['languages_3_plus']
    
    # --- DIGITAL PRESENCE ---
    if get_str('social_facebook'):
        scores['digital'] += cfg['digital']['social_facebook']
        breakdown['social_facebook'] = cfg['digital']['social_facebook']
    if get_str('social_instagram'):
        scores['digital'] += cfg['digital']['social_instagram']
        breakdown['social_instagram'] = cfg['digital']['social_instagram']
    
    social_count = count_social_platforms(profile)
    if social_count >= 3:
        scores['digital'] += cfg['digital']['social_multiple']
        breakdown['social_multiple'] = cfg['digital']['social_multiple']
    
    if is_truthy(profile.get('has_blog')):
        scores['digital'] += cfg['digital']['has_blog']
        breakdown['has_blog'] = cfg['digital']['has_blog']
    if is_truthy(profile.get('has_client_portal')):
        scores['digital'] += cfg['digital']['client_portal']
        breakdown['client_portal'] = cfg['digital']['client_portal']
    if get_str('online_pharmacy_url'):
        scores['digital'] += cfg['digital']['online_pharmacy']
        breakdown['online_pharmacy'] = cfg['digital']['online_pharmacy']
    
    # --- COMMUNITY ---
    claimed_listing = is_truthy(profile.get('claimed'))
    verified_listing = is_truthy(profile.get('is_verified'))
    has_backlink = is_truthy(profile.get('backlink_vetlist'))

    if claimed_listing:
        scores['community'] += cfg['community']['claimed_listing']
        breakdown['claimed_listing'] = cfg['community']['claimed_listing']
    if verified_listing:
        scores['community'] += cfg['community']['verified_listing']
        breakdown['verified_listing'] = cfg['community']['verified_listing']
    if has_backlink:
        scores['community'] += cfg['community']['backlink_vetlist']
        breakdown['backlink_vetlist'] = cfg['community']['backlink_vetlist']
    if verified_listing and has_backlink:
        scores['community'] += cfg['community']['trusted_network_tier']
        breakdown['trusted_network_tier'] = cfg['community']['trusted_network_tier']
    if claimed_listing and verified_listing and has_backlink:
        scores['community'] += cfg['community']['featured_network_tier']
        breakdown['featured_network_tier'] = cfg['community']['featured_network_tier']
    if is_truthy(profile.get('military_discount')):
        scores['community'] += cfg['community']['military_discount']
        breakdown['military_discount'] = cfg['community']['military_discount']
    if is_truthy(profile.get('senior_discount')):
        scores['community'] += cfg['community']['senior_discount']
        breakdown['senior_discount'] = cfg['community']['senior_discount']
    if is_truthy(profile.get('rescue_discount')):
        scores['community'] += cfg['community']['rescue_discount']
        breakdown['rescue_discount'] = cfg['community']['rescue_discount']
    if is_truthy(profile.get('free_first_visit')):
        scores['community'] += cfg['community']['free_first_visit']
        breakdown['free_first_visit'] = cfg['community']['free_first_visit']
    
    # --- CALCULATE BASE SCORE ---
    base_score = sum(scores.values())
    
    # --- APPLY MULTIPLIERS ---
    multiplier = 1.0
    multipliers = []
    
    if claimed_listing:
        multiplier *= cfg['multipliers']['claimed_listing']
        multipliers.append('claimed')
    if verified_listing:
        multiplier *= cfg['multipliers']['verified']
        multipliers.append('verified')
    if has_backlink:
        multiplier *= cfg['multipliers']['backlink_vetlist']
        multipliers.append('backlink')
    
    # Final score (capped at 100)
    final_score = round(base_score * multiplier, 1)
    if claimed_listing and verified_listing and has_backlink:
        final_score = max(final_score, cfg['floors']['featured_network'])
        multipliers.append('featured-tier')
    elif verified_listing and has_backlink:
        final_score = max(final_score, cfg['floors']['trusted_network'])
        multipliers.append('trusted-tier')
    elif claimed_listing and verified_listing:
        final_score = max(final_score, cfg['floors']['verified_tier'])
        multipliers.append('verified-tier')
    final_score = min(100, final_score)
    
    return {
        'score': final_score,
        'base_score': base_score,
        'multiplier': multiplier,
        'multipliers': multipliers,
        'category_scores': scores,
        'breakdown': breakdown,
    }

# ============================================================================
# MAIN EXECUTION
# ============================================================================

def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    input_file = os.path.join(script_dir, '../data/professionals-canada.csv')
    output_file = os.path.join(script_dir, '../data/professionals-canada.csv')
    report_file = os.path.join(script_dir, '../data/vetscore-canada-report.json')
    
    print('🏆 VetScore Calculator - VetList.org')
    print('=====================================\n')
    
    # Read all profiles
    with open(input_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        profiles = list(reader)
        fieldnames = reader.fieldnames
    
    print(f'📊 Processing {len(profiles)} clinics...\n')
    
    # Add new columns if not present
    new_fields = ['claimed', 'is_verified', 'backlink_vetlist', 'vetscore', 'vetscore_breakdown', 'vetscore_multipliers']
    for field in new_fields:
        if field not in fieldnames:
            fieldnames.append(field)
    
    # Calculate scores for all profiles
    for profile in profiles:
        result = calculate_vetscore(profile)
        profile['vetscore'] = result['score']
        profile['vetscore_breakdown'] = json.dumps(result['category_scores'])
        profile['vetscore_multipliers'] = json.dumps(result['multipliers'])
    
    # Sort by score for analysis
    sorted_profiles = sorted(profiles, key=lambda p: float(p['vetscore']), reverse=True)
    
    # Generate statistics
    scores = [float(p['vetscore']) for p in profiles]
    avg_score = sum(scores) / len(scores)
    max_score = max(scores)
    min_score = min(scores)
    
    # Distribution
    distribution = {
        '90-100': len([s for s in scores if s >= 90]),
        '80-89': len([s for s in scores if 80 <= s < 90]),
        '70-79': len([s for s in scores if 70 <= s < 80]),
        '60-69': len([s for s in scores if 60 <= s < 70]),
        '50-59': len([s for s in scores if 50 <= s < 60]),
        '40-49': len([s for s in scores if 40 <= s < 50]),
        '30-39': len([s for s in scores if 30 <= s < 40]),
        '20-29': len([s for s in scores if 20 <= s < 30]),
        '10-19': len([s for s in scores if 10 <= s < 20]),
        '0-9': len([s for s in scores if s < 10]),
    }
    
    print('📈 SCORE DISTRIBUTION')
    print('---------------------')
    for range_name, count in distribution.items():
        bar = '█' * (count // 50 + (1 if count > 0 else 0))
        print(f'{range_name}: {count:>5} {bar}')
    
    print('\n📊 STATISTICS')
    print('-------------')
    print(f'Average Score: {avg_score:.1f}')
    print(f'Highest Score: {max_score}')
    print(f'Lowest Score:  {min_score}')
    
    print('\n🏆 TOP 20 CLINICS')
    print('-----------------')
    for i, p in enumerate(sorted_profiles[:20]):
        print(f'{i+1:>2}. {float(p["vetscore"]):>5.1f} - {p["name"][:50]} ({p["city"]}, {p["province"]})')
    
    # Write updated CSV
    with open(output_file, 'w', encoding='utf-8', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, quoting=csv.QUOTE_ALL)
        writer.writeheader()
        writer.writerows(profiles)
    
    print(f'\n✅ Updated {output_file} with VetScore column')
    
    # Write detailed report
    report = {
        'generated': datetime.now().isoformat(),
        'total_clinics': len(profiles),
        'statistics': {
            'average': round(avg_score, 1),
            'max': max_score,
            'min': min_score,
            'median': sorted(scores)[len(scores) // 2],
        },
        'distribution': distribution,
        'top50': [{
            'id': p['id'],
            'name': p['name'],
            'city': p['city'],
            'province': p['province'],
            'score': float(p['vetscore']),
            'breakdown': json.loads(p['vetscore_breakdown']),
            'phone': p.get('phone_number', ''),
            'email': p.get('email_address', ''),
            'website': p.get('website', ''),
        } for p in sorted_profiles[:50]],
        'scoring_config': SCORING_CONFIG,
    }
    
    with open(report_file, 'w') as f:
        json.dump(report, f, indent=2)
    
    print(f'✅ Generated detailed report: {report_file}')
    
    print('\n🎯 SCORING BREAKDOWN (Max Points)')
    print('----------------------------------')
    print('Essential Info:    30 pts (phone, website, email, description, rating)')
    print('Availability:      20 pts (hours, days open, weekend, online booking)')
    print('Emergency:         20 pts (24hr, emergency, telehealth, house calls)')
    print('Services:          15 pts (service count, exotic animals, specialty)')
    print('Transparency:      15 pts (pricing, insurance, languages, accreditations)')
    print('Digital:           10 pts (social media, blog, client portal)')
    print('Community:         53 pts (claiming, verification, backlink tiers, local incentives)')
    print('----------------------------------')
    print('Base Max:         163 pts')
    print('With Multipliers: significantly higher (still capped at 100)')
    print('\nMultipliers:')
    print('  Claimed listing: +12%')
    print('  Verified:        +8%')
    print('  Backlink to us:  +18%')

if __name__ == '__main__':
    main()
