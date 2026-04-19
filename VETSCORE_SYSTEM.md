# VetScore™ - VetList's Competitive Differentiator

VetScore is a comprehensive quality rating system (0-100) that evaluates veterinary clinics based on completeness, accessibility, transparency, and engagement.

## Why VetScore Matters

- **For Pet Owners**: Quickly identify the most complete, accessible, and transparent clinics
- **For Clinics**: Clear path to improve their ranking and visibility
- **For VetList**: Unique differentiator that competitors can't easily replicate

## Scoring Categories (115 Base Points Max)

### 1. Essential Information (30 pts)
| Factor | Points | Why It Matters |
|--------|--------|----------------|
| Phone number | 5 | Critical for contact |
| Address | 3 | Location verification |
| Website | 4 | Online presence |
| Email | 3 | Alternative contact |
| Description | 2 | Basic info |
| Detailed description (100+ chars) | 3 | Rich content |
| Picture | 2 | Visual presence |
| Any rating | 3 | Social proof |
| Rating 4.5+ | 5 | Excellence bonus |

### 2. Hours & Availability (20 pts)
| Factor | Points | Why It Matters |
|--------|--------|----------------|
| Has hours listed | 3 | Basic availability |
| Open 5+ days | 2 | Standard availability |
| Open 6+ days | 4 | Extended availability |
| Open 7 days | 6 | Maximum availability (rare) |
| Weekend hours | 4 | When pet emergencies happen |
| Extended hours (before 8am/after 7pm) | 3 | Convenience |
| Accepts new patients | 2 | Capacity |
| Walk-ins welcome | 2 | Convenience |
| Online booking | 3 | Modern convenience |

### 3. Emergency & Specialty (20 pts)
| Factor | Points | Why It Matters |
|--------|--------|----------------|
| Emergency services | 6 | Critical care |
| 24-hour emergency | 10 | Very rare (6% of clinics) |
| After-hours phone | 3 | Emergency contact |
| Telehealth | 4 | Remote consultations (5% rare) |
| House calls | 5 | Mobile service (7% rare) |
| Mobile vet service | 5 | Mobile clinic |

### 4. Services & Animals (15 pts)
| Factor | Points | Why It Matters |
|--------|--------|----------------|
| 4-6 services | 2 | Basic range |
| 7-9 services | 4 | Good range |
| 10+ services | 6 | Comprehensive |
| Exotic animals | 4 | Birds, fish, horses, farm, exotic |
| 3+ pet types | 3 | Versatility |
| Specialty services | 2 | Boarding, grooming, daycare, training |

### 5. Transparency & Trust (15 pts)
| Factor | Points | Why It Matters |
|--------|--------|----------------|
| Has pricing | 8 | Very rare (1.3%), highly valued |
| Detailed pricing (3+ items) | 4 | Full transparency |
| Accepts insurance | 3 | Financial accessibility |
| Payment plans | 3 | Financial flexibility |
| Year established | 2 | History |
| 10+ years in business | 3 | Trust/longevity |
| Veterinarian count | 2 | Team size |
| Accreditations | 4 | Professional certifications |
| Multiple languages | 3 | Accessibility |
| 3+ languages | 2 | Exceptional accessibility |

### 6. Digital Presence (10 pts)
| Factor | Points | Why It Matters |
|--------|--------|----------------|
| Facebook | 2 | Social presence |
| Instagram | 2 | Visual engagement |
| 3+ social platforms | 3 | Strong digital presence |
| Blog | 2 | Content marketing |
| Client portal | 2 | Modern tech |
| Online pharmacy | 2 | Convenience |

### 7. Community (5 pts)
| Factor | Points | Why It Matters |
|--------|--------|----------------|
| Military discount | 2 | Supporting military |
| Senior discount | 1 | Senior care |
| Rescue discount | 2 | Supporting rescues |
| Free first visit | 2 | New patient incentive |

## Multipliers (Applied After Base Score)

| Factor | Multiplier | Effect |
|--------|------------|--------|
| Claimed listing | 1.05x | +5% bonus |
| Verified | 1.03x | +3% bonus |
| **Backlink to VetList** | **1.08x** | **+8% bonus** |

### Example Calculation
- Base score: 85 points
- With backlink: 85 × 1.08 = 91.8 points
- Final score: 92 (capped at 100)

## Score Distribution (Current Data)

| Range | Count | Percentage |
|-------|-------|------------|
| 90-100 | 2 | 0.1% |
| 80-89 | 58 | 1.6% |
| 70-79 | 306 | 8.5% |
| 60-69 | 826 | 22.9% |
| 50-59 | 1,097 | 30.4% |
| 40-49 | 756 | 20.9% |
| 30-39 | 328 | 9.1% |
| 20-29 | 200 | 5.5% |
| 10-19 | 36 | 1.0% |

**Average Score: 53.1** | **Highest: 91** | **Lowest: 12**

## Top Clinics (Current Leaders)

1. **Mildmay Veterinary Clinic** (Mildmay, ON) - 91
2. **King Hopkins Pet Hospital** (Whitby, ON) - 90
3. **Watrous Animal Hospital** (Watrous, SK) - 89
4. **A Niu Veterinary Hospital** (Richmond, BC) - 88
5. **WCVM Large Animal Clinic** (Saskatoon, SK) - 88

## Outreach Opportunity

**206 clinics** could become #1 in their city by adding a backlink to VetList.

### Top Opportunities:
1. Juno Veterinary Summerhill (Toronto) - 85 → 92 with backlink
2. Tele-Vet (Vancouver) - 84 → 91 with backlink
3. VCA Calgary North (Calgary) - 83 → 90 with backlink

## Scripts

### Calculate VetScore
```bash
python3 scripts/calculate-vetscore.py
```
- Updates `data/professionals.csv` with `vetscore` column
- Generates `data/vetscore-report.json` with detailed analysis

### Generate Outreach CRM
```bash
python3 scripts/generate-outreach-crm.py
```
- Generates `data/outreach-crm.json` with full analysis
- Generates `data/outreach-crm.csv` for easy import to CRM tools
- Shows clinics that could become #1 with backlink

## Future Enhancements

### Phase 2: Profile Pages (Coming Soon)
- Individual profile pages breaking down VetScore
- Visual graphs showing category scores
- Comparison to city/regional averages
- "How to improve your score" recommendations

### Phase 3: Analytics Dashboard
- Provide clinics with traffic analytics
- Show search impressions and clicks
- Track ranking changes over time
- Additional multiplier for analytics users

### Phase 4: Badges & Widgets
- "Top Rated on VetList" badge
- Embeddable VetScore widget
- QR codes for in-clinic display
- Social sharing cards

## Data Fields Used

The VetScore calculation uses these CSV fields:
- `phone_number`, `address`, `website`, `email_address`
- `description`, `detailed_description`, `picture`
- `rating`, `hours_of_operation`
- `emergency_services`, `emergency_24_hour`, `after_hours_emergency_phone`
- `telehealth_available`, `house_calls_available`, `mobile_vet_service`
- `specialization`, `pet_types_served`
- `has_pricing`, `pricing_*` fields
- `accepts_pet_insurance`, `payment_plans`
- `year_established`, `veterinarian_count`, `accreditations`
- `languages_spoken`
- `social_facebook`, `social_instagram`, etc.
- `has_blog`, `has_client_portal`, `online_pharmacy_url`
- `military_discount`, `senior_discount`, `rescue_discount`, `free_first_visit`
- `claimed`, `is_verified`, `backlink_vetlist`

## Adding New Scoring Factors

To add new factors, edit `scripts/calculate-vetscore.py`:

1. Add the factor to `SCORING_CONFIG` under the appropriate category
2. Add the scoring logic in `calculate_vetscore()` function
3. Run the script to recalculate all scores
4. Update this documentation

---

*VetScore™ is a trademark of VetList.org*
