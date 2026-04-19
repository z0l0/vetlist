#!/usr/bin/env python3
"""
VetList Outreach CRM Generator

Generates a CRM report for each city showing:
1. Current #1 clinic and their VetScore
2. Clinics that could jump to #1 by linking back (8% multiplier)
3. Contact info (email, phone) for outreach
4. Potential score improvement calculations

This helps prioritize outreach to clinics that have the most to gain.
"""

import csv
import json
import os
from collections import defaultdict
from datetime import datetime

def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    input_file = os.path.join(script_dir, '../data/professionals.csv')
    crm_file = os.path.join(script_dir, '../data/outreach-crm.json')
    crm_csv = os.path.join(script_dir, '../data/outreach-crm.csv')
    
    print('📧 VetList Outreach CRM Generator')
    print('==================================\n')
    
    # Read all profiles
    with open(input_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        profiles = list(reader)
    
    print(f'📊 Analyzing {len(profiles)} clinics...\n')
    
    # Group by city
    cities = defaultdict(list)
    for p in profiles:
        city_key = f"{p.get('city', '')}, {p.get('province', '')}"
        if p.get('city') and p.get('province'):
            cities[city_key].append(p)
    
    # Analyze each city
    city_reports = []
    outreach_targets = []
    
    BACKLINK_MULTIPLIER = 1.08  # 8% bonus
    
    for city_name, city_profiles in cities.items():
        # Sort by VetScore
        sorted_profiles = sorted(
            city_profiles, 
            key=lambda x: float(x.get('vetscore', 0) or 0), 
            reverse=True
        )
        
        if len(sorted_profiles) < 2:
            continue
        
        current_leader = sorted_profiles[0]
        leader_score = float(current_leader.get('vetscore', 0) or 0)
        
        # Find clinics that could overtake with backlink
        potential_leaders = []
        for p in sorted_profiles[1:]:  # Skip current leader
            current_score = float(p.get('vetscore', 0) or 0)
            potential_score = round(current_score * BACKLINK_MULTIPLIER, 1)
            
            if potential_score > leader_score:
                gap = leader_score - current_score
                potential_leaders.append({
                    'id': p.get('id'),
                    'name': p.get('name'),
                    'current_score': current_score,
                    'potential_score': potential_score,
                    'gap_to_close': round(gap, 1),
                    'would_gain': round(potential_score - current_score, 1),
                    'phone': p.get('phone_number', ''),
                    'email': p.get('email_address', ''),
                    'website': p.get('website', ''),
                    'current_rank': sorted_profiles.index(p) + 1,
                })
                
                # Add to outreach targets
                outreach_targets.append({
                    'city': city_name,
                    'clinic_name': p.get('name'),
                    'current_rank': sorted_profiles.index(p) + 1,
                    'current_score': current_score,
                    'potential_score': potential_score,
                    'would_become_rank': 1,
                    'gap_to_leader': round(gap, 1),
                    'phone': p.get('phone_number', ''),
                    'email': p.get('email_address', ''),
                    'website': p.get('website', ''),
                    'leader_name': current_leader.get('name'),
                    'leader_score': leader_score,
                })
        
        city_reports.append({
            'city': city_name,
            'total_clinics': len(city_profiles),
            'current_leader': {
                'name': current_leader.get('name'),
                'score': leader_score,
                'phone': current_leader.get('phone_number', ''),
                'email': current_leader.get('email_address', ''),
            },
            'potential_leaders_with_backlink': potential_leaders,
            'opportunity_count': len(potential_leaders),
        })
    
    # Sort cities by opportunity count
    city_reports.sort(key=lambda x: x['opportunity_count'], reverse=True)
    
    # Sort outreach targets by potential gain
    outreach_targets.sort(key=lambda x: x['potential_score'] - x['current_score'], reverse=True)
    
    # Statistics
    total_opportunities = sum(c['opportunity_count'] for c in city_reports)
    cities_with_opportunities = len([c for c in city_reports if c['opportunity_count'] > 0])
    
    print('📈 OUTREACH OPPORTUNITY SUMMARY')
    print('-------------------------------')
    print(f'Total cities analyzed: {len(city_reports)}')
    print(f'Cities with backlink opportunities: {cities_with_opportunities}')
    print(f'Total clinics that could become #1: {total_opportunities}')
    print(f'Clinics with email for outreach: {len([t for t in outreach_targets if t["email"]])}')
    
    print('\n🎯 TOP 20 OUTREACH TARGETS (Could become #1 with backlink)')
    print('-----------------------------------------------------------')
    for i, t in enumerate(outreach_targets[:20]):
        email_status = '📧' if t['email'] else '📞'
        print(f'{i+1:>2}. {t["clinic_name"][:40]:<40} | {t["city"][:25]:<25}')
        print(f'    Score: {t["current_score"]} → {t["potential_score"]} (+{t["potential_score"]-t["current_score"]:.1f}) | Rank: #{t["current_rank"]} → #1')
        print(f'    {email_status} {t["email"] or t["phone"] or "No contact"}')
        print()
    
    print('\n🏙️ TOP 10 CITIES BY OPPORTUNITY')
    print('--------------------------------')
    for i, c in enumerate(city_reports[:10]):
        print(f'{i+1:>2}. {c["city"]:<35} | {c["opportunity_count"]} clinics could become #1')
        print(f'    Current leader: {c["current_leader"]["name"][:40]} (Score: {c["current_leader"]["score"]})')
    
    # Generate CRM JSON
    crm_data = {
        'generated': datetime.now().isoformat(),
        'summary': {
            'total_cities': len(city_reports),
            'cities_with_opportunities': cities_with_opportunities,
            'total_outreach_targets': total_opportunities,
            'targets_with_email': len([t for t in outreach_targets if t['email']]),
            'targets_with_phone': len([t for t in outreach_targets if t['phone']]),
        },
        'backlink_multiplier': BACKLINK_MULTIPLIER,
        'outreach_targets': outreach_targets,
        'city_reports': city_reports,
    }
    
    with open(crm_file, 'w') as f:
        json.dump(crm_data, f, indent=2)
    print(f'\n✅ Generated CRM JSON: {crm_file}')
    
    # Generate CSV for easy import
    csv_headers = [
        'city', 'clinic_name', 'current_rank', 'current_score', 'potential_score',
        'score_gain', 'gap_to_leader', 'leader_name', 'leader_score',
        'phone', 'email', 'website'
    ]
    
    with open(crm_csv, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=csv_headers)
        writer.writeheader()
        for t in outreach_targets:
            writer.writerow({
                'city': t['city'],
                'clinic_name': t['clinic_name'],
                'current_rank': t['current_rank'],
                'current_score': t['current_score'],
                'potential_score': t['potential_score'],
                'score_gain': round(t['potential_score'] - t['current_score'], 1),
                'gap_to_leader': t['gap_to_leader'],
                'leader_name': t['leader_name'],
                'leader_score': t['leader_score'],
                'phone': t['phone'],
                'email': t['email'],
                'website': t['website'],
            })
    
    print(f'✅ Generated CRM CSV: {crm_csv}')
    
    # Generate per-city contact lists
    print('\n📋 SAMPLE OUTREACH EMAIL TEMPLATE')
    print('----------------------------------')
    print('''
Subject: Boost Your VetList Ranking - Become #1 in [CITY]

Hi [CLINIC NAME] Team,

I noticed your clinic is currently ranked #[RANK] on VetList.org for [CITY].

Here's an opportunity: By adding a simple link to VetList on your website, 
your VetScore would increase from [CURRENT] to [POTENTIAL], making you the 
#1 ranked veterinary clinic in [CITY]!

Benefits of being #1:
• More visibility to pet owners searching for vets
• Higher placement in our directory
• VetList badge for your website

To claim this boost, simply add this link anywhere on your site:
<a href="https://vetlist.org">Find us on VetList</a>

Let me know if you have any questions!

Best,
VetList Team
''')

if __name__ == '__main__':
    main()
