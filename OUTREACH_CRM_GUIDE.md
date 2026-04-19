# VetList Outreach CRM Guide

A simple system to identify and contact veterinary clinics that could benefit from partnering with VetList.

## Quick Start

```bash
# Generate the outreach CRM data
python3 scripts/generate-outreach-crm.py
```

This creates two files:
- `data/outreach-crm.csv` - Import into any CRM or spreadsheet
- `data/outreach-crm.json` - Detailed data for programmatic use

## What It Does

The outreach CRM identifies clinics that could **become #1 in their city** by adding a backlink to VetList. It calculates:

1. **Current VetScore** - Their quality ranking now
2. **Potential VetScore** - What they'd get with a backlink (+8% boost)
3. **Gap to Leader** - How far behind the current #1 they are
4. **Contact Info** - Email and phone for outreach

## Output Files

### outreach-crm.csv

Perfect for importing into Google Sheets, Airtable, HubSpot, or any CRM:

| Column | Description |
|--------|-------------|
| city | City and province |
| clinic_name | Name of the clinic |
| current_rank | Their current position in the city |
| current_score | Current VetScore |
| potential_score | Score with backlink |
| score_gain | Points they'd gain |
| gap_to_leader | How far behind #1 |
| leader_name | Current #1 clinic |
| leader_score | #1's VetScore |
| phone | Phone number |
| email | Email address |
| website | Website URL |

### outreach-crm.json

Contains:
- Summary statistics
- All outreach targets sorted by opportunity
- Per-city breakdowns
- Full scoring configuration

## Outreach Strategy

### Priority Targets

Focus on clinics where:
1. **Has email** - Easier to reach
2. **High score gain** - More compelling offer
3. **Close to #1** - Small gap means easy win
4. **Competitive cities** - Toronto, Vancouver, Calgary

### Email Template

```
Subject: Become the #1 Ranked Vet Clinic in [CITY]

Hi [CLINIC NAME] Team,

I noticed your clinic is currently ranked #[RANK] on VetList.org for [CITY], 
with a VetScore of [CURRENT_SCORE].

Here's an opportunity: By adding a simple link to VetList on your website, 
your VetScore would increase to [POTENTIAL_SCORE], making you the #1 ranked 
veterinary clinic in [CITY]!

Benefits of being #1:
• Top placement when pet owners search for vets in [CITY]
• VetScore badge to display on your website
• Increased visibility to thousands of pet owners

To claim this boost, simply add this link anywhere on your site:
<a href="https://vetlist.org">Find us on VetList</a>

Or use our badge (we can send you the code).

Questions? Just reply to this email.

Best,
[Your Name]
VetList Team
```

### Phone Script

> "Hi, I'm calling from VetList.org - we're a veterinary directory. I noticed 
> [CLINIC NAME] is ranked #[RANK] in [CITY] on our site. We have a quick way 
> for you to become #1 - would you have 2 minutes to hear about it?"

## Tracking Outreach

Add columns to your CRM:
- **Contacted Date** - When you reached out
- **Response** - Yes/No/Pending
- **Backlink Added** - Date they added the link
- **Verified** - Confirmed the backlink works

## Re-running the CRM

After VetScores are recalculated (e.g., after scraping new data):

```bash
# Recalculate all VetScores
python3 scripts/calculate-vetscore.py

# Regenerate outreach targets
python3 scripts/generate-outreach-crm.py
```

## Current Statistics

As of the last run:
- **206 clinics** could become #1 with a backlink
- **130 clinics** have email addresses for outreach
- **146 cities** have backlink opportunities

## Tips

1. **Start with email** - Higher response rate than cold calls
2. **Personalize** - Mention their city and current rank
3. **Follow up** - Send a reminder after 1 week
4. **Track everything** - Know who you've contacted
5. **Verify backlinks** - Check that links are actually added

## Files

| File | Purpose |
|------|---------|
| `scripts/generate-outreach-crm.py` | Generates CRM data |
| `scripts/calculate-vetscore.py` | Calculates VetScores |
| `data/outreach-crm.csv` | CRM export (spreadsheet) |
| `data/outreach-crm.json` | CRM export (JSON) |
| `data/vetscore-report.json` | Full VetScore analysis |
