# Directory Engine PRD — The Complete Build Plan

> **Goal:** A reusable Astro-based directory site generator. One repo per niche. CSV is source of truth. Static output. SEO-dominant city pages. Automated scraping pipeline. Profile claiming via Supabase. Monetization via premium listings.
>
> **Stack:** Astro 5 (static) + Tailwind CSS + Supabase (auth/edits overlay) + DeepSeek (AI extraction) + Jina AI (web scraping) + Lobstr.io (Google Maps data) + Cloudflare R2 + Workers (serving) + cheap VPS (builds only)
>
> **First niche:** VetList (existing, to be rebuilt clean). Second: PilatesQ.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Project Structure](#2-project-structure)
3. [Niche Configuration System](#3-niche-configuration-system)
4. [Data Pipeline](#4-data-pipeline)
5. [CSV Schema & Data Model](#5-csv-schema--data-model)
6. [Astro Page Generation](#6-astro-page-generation)
7. [SEO Engine](#7-seo-engine)
8. [Scoring Engine](#8-scoring-engine)
9. [Profile Pages (The Money Pages)](#9-profile-pages-the-money-pages)
10. [City Pages (The Ranking Pages)](#10-city-pages-the-ranking-pages)
11. [Profile Claiming & Supabase Auth](#11-profile-claiming--supabase-auth)
12. [Backlink Verification System](#12-backlink-verification-system)
13. [Premium Listings & Monetization](#13-premium-listings--monetization)
14. [Trickle Publishing](#14-trickle-publishing)
15. [Theming & Niche Customization](#15-theming--niche-customization)
16. [Analytics (Built-in, Lightweight)](#16-analytics-built-in-lightweight)
17. [Community Forum (Phase 2)](#17-community-forum-phase-2)
18. [Deployment & Infrastructure](#18-deployment--infrastructure)
19. [New Niche Launch Checklist](#19-new-niche-launch-checklist)
20. [Migration Plan (VetList → New Engine)](#20-migration-plan-vetlist--new-engine)

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    DIRECTORY ENGINE                          │
│                                                             │
│  ┌──────────┐    ┌──────────┐    ┌──────────────────────┐  │
│  │ Lobstr.io│───▶│ Raw CSV  │───▶│ Scraper Pipeline     │  │
│  │ (Maps)   │    │ (names,  │    │ Jina AI → DeepSeek   │  │
│  └──────────┘    │ addresses│    │ Extract niche data   │  │
│                  │ phones)  │    └──────────┬───────────┘  │
│                  └──────────┘               │              │
│                                             ▼              │
│                              ┌──────────────────────┐      │
│                              │ professionals.csv     │      │
│                              │ (SOURCE OF TRUTH)     │      │
│                              └──────────┬───────────┘      │
│                                         │                  │
│                    ┌────────────────────┼──────────┐       │
│                    ▼                    ▼          ▼       │
│            ┌──────────────┐  ┌────────────┐ ┌──────────┐  │
│            │ Astro Build  │  │ Supabase   │ │ Scoring  │  │
│            │ Static HTML  │  │ Auth/Edits │ │ Engine   │  │
│            │ City + Profile│  │ (overlay)  │ │ (Python) │  │
│            └──────┬───────┘  └─────┬──────┘ └──────────┘  │
│                   │                │                       │
│                   ▼                ▼                       │
│            ┌──────────────┐  ┌────────────┐               │
│            │ Cloudflare   │  │ CSV Export  │               │
│            │ R2 + Workers │  │ (weekly)    │──▶ Git commit │
│            └──────────────┘  └────────────┘    + rebuild  │
│                                                            │
└─────────────────────────────────────────────────────────────┘
```

### Key Decisions
- **No WordPress.** Too slow, too fragile, too many plugins. Astro builds fast, deploys anywhere, zero runtime dependencies.
- **CSV = source of truth.** Simple, version-controlled, diffable, no database lock-in.
- **Supabase = thin overlay.** Only for: (a) Google/email auth for profile owners, (b) storing edits that get exported back to CSV weekly, (c) claim verification status.
- **One repo per niche.** Clone template, change `site.config.ts`, upload CSV, deploy. Each site is independent.
- **Cheap VPS for builds only.** No serving traffic. Cloudflare R2 + Workers handles all serving with unlimited bandwidth, global edge CDN, and zero egress costs. For smaller sites (<20K profiles), Cloudflare Pages works out of the box.

---

## 2. Project Structure

```
directory-engine/
├── site.config.ts                 # THE ONLY FILE YOU CHANGE PER NICHE
├── astro.config.mjs               # Astro config (reads from site.config.ts)
├── package.json
├── tailwind.config.mjs
├── tsconfig.json
│
├── data/
│   ├── professionals.csv          # Source of truth (all profiles)
│   ├── locations.csv              # City/region metadata (lat/lng, population, descriptions)
│   └── backups/                   # Timestamped backups before any modification
│
├── scripts/
│   ├── 01-fetch-from-lobstr.ts    # Pull raw Google Maps data from Lobstr.io
│   ├── 02-scrape-websites.ts      # Jina AI → get website content
│   ├── 03-extract-with-ai.ts      # DeepSeek → structured niche data
│   ├── 04-merge-enriched.ts       # Merge AI output into professionals.csv
│   ├── 05-calculate-scores.ts     # Run scoring engine, write scores to CSV
│   ├── 06-trickle-publish.ts      # Move N drafts to published status
│   ├── 07-check-backlinks.ts      # Verify backlinks for image/premium eligibility
│   ├── 08-export-supabase-edits.ts# Pull edits from Supabase → merge into CSV
│   └── utils/
│       ├── csv-helpers.ts         # Read/write/merge CSV safely
│       ├── rate-limiter.ts        # API call rate limiting
│       └── backup.ts              # Auto-backup before any CSV modification
│
├── src/
│   ├── components/
│   │   ├── layout/
│   │   │   ├── BaseLayout.astro   # HTML shell, meta tags, schema injection
│   │   │   ├── Header.astro       # Nav bar (niche-aware)
│   │   │   ├── Footer.astro       # Footer with internal links
│   │   │   └── Breadcrumbs.astro  # Geo breadcrumbs with schema
│   │   ├── cards/
│   │   │   ├── ProfileCard.astro  # Full card for top 36 on city page
│   │   │   ├── ProfileCardCompact.astro  # Simplified list for remaining
│   │   │   └── ProfileCardMini.astro     # Sidebar/related profiles
│   │   ├── profile/
│   │   │   ├── ProfileHero.astro         # Name, rating, badges, CTA
│   │   │   ├── ProfileContact.astro      # Phone, address, map, hours
│   │   │   ├── ProfileNicheData.astro    # Niche-specific fields (dynamic)
│   │   │   ├── ProfilePricing.astro      # Pricing table
│   │   │   ├── ProfileScore.astro        # Score breakdown visualization
│   │   │   └── ProfileSchema.astro       # JSON-LD for this profile
│   │   ├── city/
│   │   │   ├── CityHero.astro            # H1, stats, intro text
│   │   │   ├── CityFilters.astro         # Filter buttons (CSS-only)
│   │   │   ├── CityListings.astro        # Profile cards grid
│   │   │   ├── CityNearby.astro          # Nearby cities links
│   │   │   └── CitySchema.astro          # ItemList + BreadcrumbList JSON-LD
│   │   ├── seo/
│   │   │   ├── MetaTags.astro            # Title, description, OG, Twitter, geo
│   │   │   ├── SchemaOrg.astro           # Schema.org injection helper
│   │   │   └── CanonicalUrl.astro        # Canonical with trailing slash
│   │   └── claim/
│   │       ├── ClaimButton.astro         # "Claim this profile" CTA
│   │       ├── ClaimForm.astro           # Client-side Supabase auth form
│   │       └── EditProfile.astro         # Client-side edit form (post-claim)
│   │
│   ├── lib/
│   │   ├── data-loader.ts         # SINGLE data loader (replaces dual supabase.js/dataCache.js)
│   │   ├── scoring.ts             # Score calculation logic
│   │   ├── seo-helpers.ts         # Title/description/schema generators
│   │   ├── geo-helpers.ts         # Slug normalization, nearby city calc
│   │   ├── niche-fields.ts        # Niche-specific field definitions
│   │   └── supabase-client.ts     # Supabase client (client-side only, for claiming)
│   │
│   ├── pages/
│   │   ├── index.astro                          # Homepage
│   │   ├── about.astro
│   │   ├── claim.astro                          # Claim landing page
│   │   ├── privacy.astro
│   │   ├── terms.astro
│   │   ├── [country]/
│   │   │   ├── index.astro                      # Country page
│   │   │   └── [region]/
│   │   │       ├── index.astro                  # Region/state page
│   │   │       └── [city]/
│   │   │           ├── index.astro              # City page (THE RANKING PAGE)
│   │   │           └── [profile].astro          # Profile page (THE MONEY PAGE)
│   │   └── api/
│   │       └── claim.ts                         # API endpoint for claim verification
│   │
│   └── styles/
│       ├── global.css             # Base styles + CSS custom properties
│       └── components.css         # Component-specific styles
│
├── public/
│   ├── favicon.svg
│   ├── robots.txt
│   └── images/                    # Only for premium/verified profiles
│
└── supabase/
    ├── migrations/
    │   └── 001_claims_and_edits.sql  # Supabase schema
    └── seed.sql                       # Optional test data
```

### Why This Structure

- **Single data loader** (`data-loader.ts`): The old VetList had `supabase.js` AND `dataCache.js` that had to stay in sync. Never again. One file loads CSV, transforms data, exports helpers. Period.
- **Niche-specific components are data-driven**, not code-driven. `ProfileNicheData.astro` reads field definitions from `site.config.ts` and renders whatever fields exist. No per-niche component files.
- **Scripts are numbered** in pipeline order. Run them 01 through 08. Each is idempotent.
- **No `dist/` or `.astro/` in the repo.** These are build artifacts on the server.

---

## 3. Niche Configuration System

This is the heart of the "clone and launch" model. One file defines everything niche-specific.

```typescript
// site.config.ts — THE ONLY FILE YOU CHANGE PER NICHE

export const siteConfig = {
  // ─── Identity ───
  name: "VetList",
  domain: "vetlist.org",
  tagline: "Find the best veterinarians near you",
  profession: "Veterinarians",           // Used in titles: "Best {profession} in {city}"
  professionSingular: "Veterinarian",
  professionSlug: "veterinarians",       // URL-friendly
  schemaType: "VeterinaryCare",          // schema.org @type for profiles

  // ─── Geography ───
  countries: ["canada", "united-states"],
  defaultCountry: "canada",
  currency: "CAD",                       // For pricing display

  // ─── Theming ───
  theme: {
    primaryColor: "#2563eb",             // Blue for vets
    accentColor: "#10b981",
    logo: "/images/logo.svg",            // Or null for text-only
    colorScheme: "light",                // "light" | "dark"
  },

  // ─── Niche-Specific Fields ───
  // These define what the AI scraper extracts AND what the profile page displays.
  // Each field has: key, label, type, icon, filterable, scorable
  nicheFields: [
    {
      key: "emergency_services",
      label: "Emergency Services",
      type: "boolean",
      icon: "🚨",
      filterable: true,                  // Shows as filter button on city page
      scorable: true,                    // Contributes to profile score
      scoreWeight: 15,                   // Out of 100
      aiPrompt: "Does this clinic offer emergency or after-hours services?",
    },
    {
      key: "animals_treated",
      label: "Animals Treated",
      type: "tags",                      // Array of strings
      icon: "🐾",
      filterable: true,
      scorable: true,
      scoreWeight: 10,
      aiPrompt: "What types of animals does this clinic treat? (dogs, cats, birds, exotic, horses, farm animals)",
      filterOptions: ["dogs", "cats", "birds", "exotic", "horses", "farm"],
    },
    {
      key: "services_offered",
      label: "Services",
      type: "tags",
      icon: "💉",
      filterable: false,
      scorable: true,
      scoreWeight: 10,
      aiPrompt: "What veterinary services are offered? (surgery, dental, imaging, boarding, grooming, pharmacy)",
    },
    {
      key: "accepts_new_patients",
      label: "Accepting New Patients",
      type: "boolean",
      icon: "✅",
      filterable: true,
      scorable: false,
      aiPrompt: "Is this clinic currently accepting new patients or clients?",
    },
  ],

  // ─── Pricing Fields ───
  // What pricing data to extract and display
  pricingFields: [
    { key: "exam_fee", label: "Exam Fee", aiPrompt: "What is the standard examination fee?" },
    { key: "vaccination_cost", label: "Vaccination", aiPrompt: "What do vaccinations typically cost?" },
    { key: "spay_neuter_cost", label: "Spay/Neuter", aiPrompt: "What does spay or neuter surgery cost?" },
    { key: "dental_cleaning_cost", label: "Dental Cleaning", aiPrompt: "What does a dental cleaning cost?" },
  ],

  // ─── Scoring Weights ───
  // How the overall score is calculated (must sum to 100)
  scoring: {
    dataCompleteness: 25,      // How many fields are filled
    contactInfo: 20,           // Phone, email, address, hours
    onlinePresence: 15,        // Website, social media links
    nicheData: 20,             // Niche-specific fields filled
    pricingTransparency: 10,   // Has pricing info
    communityRating: 10,       // Votes (future)
  },

  // ─── AI Scraper Prompt ───
  // The master prompt sent to DeepSeek for data extraction.
  // nicheFields and pricingFields are auto-injected.
  scraperSystemPrompt: `You are extracting data about a veterinary clinic from their website.
Focus on: emergency services, types of animals treated, specific services offered,
pricing transparency, and whether they accept new patients.
Only extract what is explicitly stated. Use null for anything uncertain.`,

  // ─── Content Templates ───
  // Used for generating unique city page content
  cityIntroTemplate: "Find the best {profession} in {city}, {region}. Compare {count} top-rated clinics with verified reviews, hours, and services.",
  cityMetaDescTemplate: "Compare {count} {profession} in {city}, {region}. Verified hours, services, emergency availability, and pricing. Find your perfect vet today.",

  // ─── Feature Flags ───
  features: {
    claiming: true,            // Enable profile claiming
    pricing: true,             // Show pricing data
    scoring: true,             // Show scores on profiles
    backlinks: true,           // Backlink verification for images
    tricklePublish: true,      // Gradual profile publishing
    analytics: true,           // Built-in analytics
    community: false,          // Forum (Phase 2)
  },

  // ─── External Services ───
  supabase: {
    url: "SUPABASE_URL",       // From .env
    anonKey: "SUPABASE_ANON_KEY",
  },
};
```

### Pilates Example

```typescript
// site.config.ts for PilatesQ

export const siteConfig = {
  name: "PilatesQ",
  domain: "pilatesq.com",
  tagline: "Find the best Pilates studios near you",
  profession: "Pilates Studios",
  professionSingular: "Pilates Studio",
  professionSlug: "pilates",
  schemaType: "SportsActivityLocation",

  nicheFields: [
    {
      key: "has_reformer",
      label: "Reformer Classes",
      type: "boolean",
      icon: "🏋️",
      filterable: true,
      scorable: true,
      scoreWeight: 20,
      aiPrompt: "Does this studio offer Reformer Pilates classes?",
    },
    {
      key: "class_types",
      label: "Class Types",
      type: "tags",
      icon: "🧘",
      filterable: true,
      scorable: true,
      scoreWeight: 10,
      aiPrompt: "What types of Pilates classes are offered? (Mat, Reformer, Tower, Cadillac, Chair, Barre, Prenatal, Postnatal)",
      filterOptions: ["mat", "reformer", "tower", "barre", "prenatal"],
    },
    {
      key: "female_only",
      label: "Women-Only Classes",
      type: "boolean",
      icon: "👩",
      filterable: true,
      scorable: false,
      aiPrompt: "Does this studio offer women-only or female-only classes?",
    },
    {
      key: "max_class_size",
      label: "Max Class Size",
      type: "number",
      icon: "👥",
      filterable: false,
      scorable: true,
      scoreWeight: 10,
      aiPrompt: "What is the maximum class size or average number of students per class?",
    },
    {
      key: "injury_rehab",
      label: "Injury Rehabilitation",
      type: "boolean",
      icon: "🩹",
      filterable: true,
      scorable: true,
      scoreWeight: 15,
      aiPrompt: "Does this studio offer injury rehabilitation or physical therapy Pilates?",
    },
  ],

  pricingFields: [
    { key: "drop_in_price", label: "Drop-in Class", aiPrompt: "What is the drop-in single class price?" },
    { key: "monthly_unlimited", label: "Monthly Unlimited", aiPrompt: "What is the monthly unlimited membership price?" },
    { key: "private_session", label: "Private Session", aiPrompt: "What does a private 1-on-1 session cost?" },
    { key: "intro_offer", label: "Intro Offer", aiPrompt: "Is there an introductory offer for new students? What is the price?" },
    { key: "class_pack_5", label: "5-Class Pack", aiPrompt: "What does a 5-class pack cost?" },
    { key: "class_pack_10", label: "10-Class Pack", aiPrompt: "What does a 10-class pack cost?" },
  ],

  // ...rest same structure as vet example
};
```

### How This Drives Everything

| What reads `site.config.ts` | What it does |
|---|---|
| `03-extract-with-ai.ts` | Builds the DeepSeek prompt from `nicheFields[].aiPrompt` + `pricingFields[].aiPrompt` |
| `05-calculate-scores.ts` | Uses `scoring` weights + `nicheFields[].scoreWeight` |
| `ProfileNicheData.astro` | Renders fields from `nicheFields` that have data |
| `CityFilters.astro` | Creates filter buttons from `nicheFields.filter(f => f.filterable)` |
| `MetaTags.astro` | Uses `profession`, `cityIntroTemplate`, etc. |
| `SchemaOrg.astro` | Uses `schemaType` for JSON-LD |
| `Header.astro` / `Footer.astro` | Uses `name`, `theme`, `logo` |
| `ProfilePricing.astro` | Renders pricing from `pricingFields` |

---

## 4. Data Pipeline

The pipeline runs in numbered steps. Each step is idempotent (safe to re-run).

### Step 1: Fetch from Lobstr.io (Google Maps)

```
Input:  Lobstr.io task ID (configured per niche)
Output: data/raw/lobstr-export-{date}.csv

Fields from Lobstr:
  - name, address, city, state/province, country, postal_code
  - phone, website, google_maps_url
  - latitude, longitude
  - rating, review_count
  - category (Google Maps category)
  - place_id (Google's unique ID — use for deduplication)
```

Lobstr gives you the base data: names, addresses, phones, websites, coordinates, Google ratings. This is cheap and fast. ~$0.002 per result.

### Step 2: Scrape Websites (Jina AI)

```
Input:  professionals.csv (rows with website URLs)
Output: data/scraped/website-content-{date}.jsonl

For each profile with a website:
  1. Send URL to Jina AI Reader (https://r.jina.ai/{url})
  2. Get clean markdown/text back
  3. Discover sub-pages (pricing, about, services, contact)
  4. Scrape those too (max 4 sub-pages per site)
  5. Concatenate all content
  6. Save to JSONL: { place_id, url, content, pages_scraped, method }

Rate limit: 2 seconds between requests
Cost: ~$0.001 per page (Jina free tier: 1M tokens/month)
Fallback: Direct fetch with residential proxy if Jina fails
```

### Step 3: Extract with AI (DeepSeek)

```
Input:  data/scraped/website-content-{date}.jsonl
Output: data/enriched/ai-extracted-{date}.jsonl

For each scraped website:
  1. Build prompt from site.config.ts nicheFields + pricingFields
  2. Send to DeepSeek API (deepseek-chat model)
  3. Parse JSON response
  4. Validate data types (boolean is boolean, number is number)
  5. Save to JSONL: { place_id, ...extracted_fields }

Rate limit: 1 second between requests
Cost: ~$0.001 per extraction (DeepSeek is very cheap)
Fallback: OpenAI gpt-4o-mini if DeepSeek fails
```

The AI prompt is auto-generated from `site.config.ts`:

```typescript
function buildExtractionPrompt(content: string, config: SiteConfig): string {
  const nicheFields = config.nicheFields.map(f =>
    `"${f.key}": ${f.type === 'boolean' ? 'boolean' : f.type === 'number' ? 'number' : f.type === 'tags' ? 'string[]' : 'string'} — ${f.aiPrompt}`
  ).join('\n  ');

  const pricingFields = config.pricingFields.map(f =>
    `"${f.key}": number or null — ${f.aiPrompt}`
  ).join('\n  ');

  return `${config.scraperSystemPrompt}

Extract ALL business information from this website content.
Return ONLY valid JSON. Use null for any field you cannot confidently determine.

{
  "description": "2-3 sentence summary of the business",
  "hours": {"mon":"","tue":"","wed":"","thu":"","fri":"","sat":"","sun":""},
  "email": "string or null",
  "social": {
    "instagram": "string or null",
    "facebook": "string or null",
    "tiktok": "string or null",
    "youtube": "string or null"
  },
  "amenities": ["string array"],
  "booking_platform": "string or null (e.g. Mindbody, Jane App, Momoyoga)",
  "year_established": "number or null",

  // Niche-specific fields:
  ${nicheFields}

  // Pricing:
  "pricing": {
    ${pricingFields}
  }
}

Website content:
${content.substring(0, 25000)}

JSON:`;
}
```

### Step 4: Merge Enriched Data

```
Input:  data/enriched/ai-extracted-{date}.jsonl + data/professionals.csv
Output: data/professionals.csv (updated in place, backup first)

Rules:
  - ALWAYS backup before modifying: cp professionals.csv backups/professionals-{timestamp}.csv
  - Match on place_id (primary) or name+city (fallback)
  - MERGE, don't REPLACE: only fill empty fields, never overwrite existing data
  - Validate all data types before writing
  - Log: "{N} profiles enriched, {M} fields updated, {K} skipped (already had data)"
```

### Step 5: Calculate Scores

```
Input:  data/professionals.csv
Output: data/professionals.csv (score columns updated)

Adds/updates columns:
  - score (0-100 overall)
  - score_breakdown (JSON: { dataCompleteness: 85, contactInfo: 90, ... })
  - city_rank (1, 2, 3... within city)
  - region_rank
  - country_rank
```

### Step 6-8: Trickle Publish, Backlink Check, Supabase Export

(Detailed in their own sections below)

---

## 5. CSV Schema & Data Model

One CSV file per site. No split files. No dual loaders. One file, one loader.

```
Column Name              | Type     | Source          | Example
─────────────────────────┼──────────┼─────────────────┼──────────────────────────
place_id                 | string   | Lobstr          | ChIJpTvG15DL1IkRd8S0KlBVNTI
name                     | string   | Lobstr          | Bloor Animal Hospital
slug                     | string   | Generated       | bloor-animal-hospital
status                   | string   | Pipeline        | published | draft | hidden
country                  | string   | Lobstr          | Canada
country_slug             | string   | Generated       | canada
region                   | string   | Lobstr          | Ontario
region_slug              | string   | Generated       | ontario
city                     | string   | Lobstr          | Toronto
city_slug                | string   | Generated       | toronto
address                  | string   | Lobstr          | 123 Bloor St W
postal_code              | string   | Lobstr          | M5S 1R1
latitude                 | float    | Lobstr          | 43.6532
longitude                | float    | Lobstr          | -79.3832
phone                    | string   | Lobstr          | (416) 555-0123
website                  | string   | Lobstr          | https://bloorvet.com
email                    | string   | AI Extract      | info@bloorvet.com
google_rating            | float    | Lobstr          | 4.7
google_review_count      | int      | Lobstr          | 234
description              | string   | AI Extract      | Full-service vet clinic...
hours                    | JSON str | AI Extract      | {"mon":"8am-6pm",...}
social_instagram         | string   | AI Extract      | @bloorvet
social_facebook          | string   | AI Extract      | facebook.com/bloorvet
social_tiktok            | string   | AI Extract      |
social_youtube           | string   | AI Extract      |
booking_platform         | string   | AI Extract      | Jane App
year_established         | int      | AI Extract      | 2005
amenities                | JSON str | AI Extract      | ["parking","wifi"]
─── Niche fields (from site.config.ts nicheFields) ───
emergency_services       | boolean  | AI Extract      | true
animals_treated          | JSON str | AI Extract      | ["dogs","cats","birds"]
services_offered         | JSON str | AI Extract      | ["surgery","dental"]
accepts_new_patients     | boolean  | AI Extract      |
─── Pricing fields (from site.config.ts pricingFields) ───
pricing_exam_fee         | float    | AI Extract      | 75.00
pricing_vaccination_cost | float    | AI Extract      | 45.00
pricing_spay_neuter_cost | float    | AI Extract      |
pricing_dental_cleaning  | float    | AI Extract      |
─── Scoring (calculated) ───
score                    | int      | Scoring Engine  | 78
score_breakdown          | JSON str | Scoring Engine  | {"dataCompleteness":85,...}
city_rank                | int      | Scoring Engine  | 3
region_rank              | int      | Scoring Engine  | 45
country_rank             | int      | Scoring Engine  | 312
─── Claiming & Monetization ───
claimed                  | boolean  | Supabase        | false
claimed_by_email         | string   | Supabase        |
claimed_at               | datetime | Supabase        |
verified                 | boolean  | Supabase        | false
tier                     | string   | Manual/Stripe   | free | claimed | premium
has_backlink             | boolean  | Backlink Check  | false
backlink_verified_at     | datetime | Backlink Check  |
show_images              | boolean  | Derived         | false (true if has_backlink or premium)
─── Pipeline metadata ───
scraped_at               | datetime | Pipeline        | 2026-01-15T10:30:00Z
enriched_at              | datetime | Pipeline        | 2026-01-16T14:00:00Z
published_at             | datetime | Trickle Pub     | 2026-01-20T08:00:00Z
last_modified            | datetime | Any update      | 2026-02-01T12:00:00Z
```

### Key Rules

1. **Niche fields are prefixed by their key** from `site.config.ts`. The data loader reads the config to know which columns are niche-specific.
2. **Pricing fields are prefixed with `pricing_`** for easy identification.
3. **JSON fields** (hours, amenities, animals_treated, etc.) are stored as JSON strings in CSV. The data loader parses them.
4. **Slugs are generated once** during import and never change (URL stability for SEO).
5. **`status` field** controls visibility: `published` = live on site, `draft` = not yet published (trickle), `hidden` = removed by owner or admin.

---

## 6. Astro Page Generation

### Single Data Loader (The Fix for VetList's Biggest Problem)

```typescript
// src/lib/data-loader.ts — ONE loader to rule them all

import { siteConfig } from '../../site.config';
import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'csv-parse/sync';

interface Profile { [key: string]: any; }
interface CityData { slug: string; name: string; region: string; regionSlug: string; country: string; countrySlug: string; profiles: Profile[]; lat: number; lng: number; }
interface RegionData { slug: string; name: string; country: string; countrySlug: string; cities: CityData[]; profileCount: number; }
interface CountryData { slug: string; name: string; regions: RegionData[]; profileCount: number; }

let _cache: { profiles: Profile[]; countries: CountryData[] } | null = null;

export function loadAllData() {
  if (_cache) return _cache;

  const csvPath = path.join(process.cwd(), 'data', 'professionals.csv');
  const raw = fs.readFileSync(csvPath, 'utf-8');
  const records = parse(raw, { columns: true, skip_empty_lines: true, relax_column_count: true });

  // Only published profiles
  const profiles = records
    .filter((r: any) => r.status === 'published')
    .map((r: any) => transformProfile(r));

  // Build geographic hierarchy
  const countries = buildHierarchy(profiles);

  _cache = { profiles, countries };
  return _cache;
}

function transformProfile(raw: any): Profile {
  // Parse JSON fields
  const jsonFields = ['hours', 'amenities', 'score_breakdown',
    ...siteConfig.nicheFields.filter(f => f.type === 'tags').map(f => f.key)
  ];

  const profile: Profile = { ...raw };
  for (const field of jsonFields) {
    if (profile[field] && typeof profile[field] === 'string') {
      try { profile[field] = JSON.parse(profile[field]); }
      catch { profile[field] = field.includes('hours') ? {} : []; }
    }
  }

  // Parse numbers
  profile.score = parseInt(profile.score) || 0;
  profile.google_rating = parseFloat(profile.google_rating) || 0;
  profile.google_review_count = parseInt(profile.google_review_count) || 0;
  profile.latitude = parseFloat(profile.latitude) || 0;
  profile.longitude = parseFloat(profile.longitude) || 0;
  profile.city_rank = parseInt(profile.city_rank) || 999;

  // Parse booleans
  const boolFields = ['claimed', 'verified', 'has_backlink', 'show_images',
    ...siteConfig.nicheFields.filter(f => f.type === 'boolean').map(f => f.key)
  ];
  for (const field of boolFields) {
    profile[field] = profile[field] === 'true' || profile[field] === '1';
  }

  // Parse pricing
  for (const pf of siteConfig.pricingFields) {
    const key = `pricing_${pf.key}`;
    profile[key] = parseFloat(profile[key]) || null;
  }

  return profile;
}

// Helper exports for page generation
export function getCountries() { return loadAllData().countries; }
export function getCountry(slug: string) { return getCountries().find(c => c.slug === slug); }
export function getRegion(countrySlug: string, regionSlug: string) { ... }
export function getCity(countrySlug: string, regionSlug: string, citySlug: string) { ... }
export function getProfile(countrySlug: string, regionSlug: string, citySlug: string, profileSlug: string) { ... }
export function getNearbyCities(lat: number, lng: number, limit: number) { ... }
```

### Page Generation (getStaticPaths)

```astro
---
// src/pages/[country]/[region]/[city]/index.astro — CITY PAGE

import { loadAllData } from '@/lib/data-loader';
import CityPage from '@/components/city/CityPage.astro';

export function getStaticPaths() {
  const { countries } = loadAllData();
  const paths = [];

  for (const country of countries) {
    for (const region of country.regions) {
      for (const city of region.cities) {
        paths.push({
          params: {
            country: country.slug,
            region: region.slug,
            city: city.slug,
          },
          props: { city, region, country },
        });
      }
    }
  }
  return paths;
}

const { city, region, country } = Astro.props;
---

<CityPage city={city} region={region} country={country} />
```

### FAST_BUILD Support

```typescript
// In data-loader.ts
const FAST_BUILD = process.env.FAST_BUILD === 'true';
const MAX_PROFILES = FAST_BUILD ? 500 : Infinity;

// Take first N profiles but ensure geographic diversity
if (FAST_BUILD) {
  // Take profiles from multiple cities, not just the first 500 alphabetically
  const citySample = new Map<string, Profile[]>();
  for (const p of profiles) {
    const key = p.city_slug;
    if (!citySample.has(key)) citySample.set(key, []);
    if (citySample.get(key)!.length < 10) citySample.get(key)!.push(p);
    if ([...citySample.values()].flat().length >= MAX_PROFILES) break;
  }
  profiles = [...citySample.values()].flat();
}
```

---

## 7. SEO Engine

Every page gets perfect SEO. No exceptions. This is the entire point.

### Meta Tag Generation

```typescript
// src/lib/seo-helpers.ts

import { siteConfig } from '../../site.config';

export function cityMeta(city: CityData, region: RegionData, country: CountryData) {
  const count = city.profiles.length;
  const prof = siteConfig.profession;
  const regionName = region.name;

  return {
    title: `Best ${prof} in ${city.name}, ${regionName} | ${count} Top-Rated | ${siteConfig.name}`,
    description: siteConfig.cityMetaDescTemplate
      .replace('{count}', String(count))
      .replace('{profession}', prof.toLowerCase())
      .replace('{city}', city.name)
      .replace('{region}', regionName),
    canonical: `https://${siteConfig.domain}/${country.slug}/${region.slug}/${city.slug}/`,
    ogType: 'website',
    geoRegion: `${country.slug === 'canada' ? 'CA' : 'US'}-${region.slug.toUpperCase().substring(0, 2)}`,
    geoPlacename: city.name,
    geoPosition: `${city.lat};${city.lng}`,
  };
}

export function profileMeta(profile: Profile, city: CityData, region: RegionData, country: CountryData) {
  return {
    title: `${profile.name} | ${siteConfig.professionSingular} in ${city.name} - Reviews & Info`,
    description: `${profile.name} in ${city.name}, ${region.name}. ${profile.google_rating ? `Rated ${profile.google_rating}/5 from ${profile.google_review_count} reviews.` : ''} Hours, services, pricing, and contact info.`,
    canonical: `https://${siteConfig.domain}/${country.slug}/${region.slug}/${city.slug}/${profile.slug}/`,
    ogType: 'business.business',
  };
}
```

### Schema.org Generation

```typescript
// City page: ItemList + BreadcrumbList
export function citySchema(city: CityData, region: RegionData, country: CountryData) {
  const baseUrl = `https://${siteConfig.domain}`;

  return [
    // BreadcrumbList
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${baseUrl}/` },
        { '@type': 'ListItem', position: 2, name: country.name, item: `${baseUrl}/${country.slug}/` },
        { '@type': 'ListItem', position: 3, name: region.name, item: `${baseUrl}/${country.slug}/${region.slug}/` },
        { '@type': 'ListItem', position: 4, name: city.name, item: `${baseUrl}/${country.slug}/${region.slug}/${city.slug}/` },
      ],
    },
    // ItemList
    {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: `Best ${siteConfig.profession} in ${city.name}`,
      numberOfItems: city.profiles.length,
      itemListElement: city.profiles.slice(0, 10).map((p, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        item: {
          '@type': siteConfig.schemaType,
          '@id': `${baseUrl}/${country.slug}/${region.slug}/${city.slug}/${p.slug}/`,
          name: p.name,
          address: {
            '@type': 'PostalAddress',
            streetAddress: p.address,
            addressLocality: city.name,
            addressRegion: region.name,
            addressCountry: country.name,
          },
          telephone: p.phone,
          url: `${baseUrl}/${country.slug}/${region.slug}/${city.slug}/${p.slug}/`,
          ...(p.google_rating > 0 ? {
            aggregateRating: {
              '@type': 'AggregateRating',
              ratingValue: p.google_rating,
              ratingCount: p.google_review_count,
              bestRating: 5,
            }
          } : {}),
        },
      })),
    },
  ];
}

// Profile page: LocalBusiness (or niche-specific type)
export function profileSchema(profile: Profile, city: CityData, region: RegionData, country: CountryData) {
  const baseUrl = `https://${siteConfig.domain}`;
  return {
    '@context': 'https://schema.org',
    '@type': siteConfig.schemaType,
    '@id': `${baseUrl}/${country.slug}/${region.slug}/${city.slug}/${profile.slug}/`,
    name: profile.name,
    description: profile.description || undefined,
    address: {
      '@type': 'PostalAddress',
      streetAddress: profile.address,
      addressLocality: city.name,
      addressRegion: region.name,
      postalCode: profile.postal_code,
      addressCountry: country.name,
    },
    telephone: profile.phone,
    url: `${baseUrl}/${country.slug}/${region.slug}/${city.slug}/${profile.slug}/`,
    ...(profile.google_rating > 0 ? {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: Number(profile.google_rating),
        ratingCount: Number(profile.google_review_count),
        bestRating: 5,
      }
    } : {}),
    ...(profile.hours ? { openingHoursSpecification: formatHoursSchema(profile.hours) } : {}),
    geo: profile.latitude ? {
      '@type': 'GeoCoordinates',
      latitude: Number(profile.latitude),
      longitude: Number(profile.longitude),
    } : undefined,
  };
}
```

### Geo Meta Tags (Auto-generated)

```astro
<!-- MetaTags.astro -->
<meta name="geo.region" content={geoRegion} />
<meta name="geo.placename" content={geoPlacename} />
<meta name="geo.position" content={geoPosition} />
<meta name="ICBM" content={geoPosition.replace(';', ', ')} />

<!-- OpenGraph -->
<meta property="og:title" content={title} />
<meta property="og:description" content={description} />
<meta property="og:url" content={canonical} />
<meta property="og:type" content={ogType} />
<meta property="og:locale" content="en_CA" />
<meta property="og:site_name" content={siteConfig.name} />

<!-- Twitter -->
<meta name="twitter:card" content="summary" />
<meta name="twitter:title" content={title} />
<meta name="twitter:description" content={description} />

<!-- Canonical (CRITICAL: trailing slash, https, lowercase) -->
<link rel="canonical" href={canonical} />
```

---

## 8. Scoring Engine

Config-driven. Reads weights from `site.config.ts`. Runs as a script, writes scores back to CSV.

```typescript
// scripts/05-calculate-scores.ts

import { siteConfig } from '../site.config';

function calculateScore(profile: Profile): { score: number; breakdown: Record<string, number> } {
  const weights = siteConfig.scoring;
  const breakdown: Record<string, number> = {};

  // Data completeness (0-100): what % of standard fields are filled
  const standardFields = ['phone', 'website', 'email', 'address', 'description', 'hours'];
  const filled = standardFields.filter(f => profile[f] && profile[f] !== '{}' && profile[f] !== '[]').length;
  breakdown.dataCompleteness = Math.round((filled / standardFields.length) * 100);

  // Contact info (0-100): phone + email + address + hours
  const contactFields = ['phone', 'email', 'address', 'hours'];
  const contactFilled = contactFields.filter(f => profile[f] && profile[f] !== '{}').length;
  breakdown.contactInfo = Math.round((contactFilled / contactFields.length) * 100);

  // Online presence (0-100): website + social media
  const socialFields = ['website', 'social_instagram', 'social_facebook', 'social_tiktok', 'social_youtube'];
  const socialFilled = socialFields.filter(f => profile[f]).length;
  breakdown.onlinePresence = Math.round((socialFilled / socialFields.length) * 100);

  // Niche data (0-100): niche-specific fields from config
  const nicheFieldKeys = siteConfig.nicheFields.map(f => f.key);
  const nicheFilled = nicheFieldKeys.filter(f => {
    const val = profile[f];
    return val && val !== 'null' && val !== '[]' && val !== 'false';
  }).length;
  breakdown.nicheData = nicheFieldKeys.length > 0
    ? Math.round((nicheFilled / nicheFieldKeys.length) * 100) : 0;

  // Pricing transparency (0-100): how many pricing fields have data
  const pricingKeys = siteConfig.pricingFields.map(f => `pricing_${f.key}`);
  const pricingFilled = pricingKeys.filter(f => profile[f] && parseFloat(profile[f]) > 0).length;
  breakdown.pricingTransparency = pricingKeys.length > 0
    ? Math.round((pricingFilled / pricingKeys.length) * 100) : 0;

  // Community rating (0-100): placeholder for future voting system
  breakdown.communityRating = 50; // Default neutral

  // Weighted overall score
  const score = Math.round(
    (breakdown.dataCompleteness * weights.dataCompleteness +
     breakdown.contactInfo * weights.contactInfo +
     breakdown.onlinePresence * weights.onlinePresence +
     breakdown.nicheData * weights.nicheData +
     breakdown.pricingTransparency * weights.pricingTransparency +
     breakdown.communityRating * weights.communityRating) / 100
  );

  return { score: Math.min(100, Math.max(0, score)), breakdown };
}
```

---

## 9. Profile Pages (The Money Pages)

Profile pages get the most traffic. They must be perfect.

### What a Profile Page Shows

```
┌─────────────────────────────────────────────────────────┐
│ Breadcrumbs: Home > Canada > Ontario > Toronto > Name   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  [Verified ✓]  [Premium ⭐]                             │
│  Bloor Animal Hospital                                  │
│  ★★★★★ 4.7 (234 reviews)  |  Score: 78/100            │
│                                                         │
│  📞 (416) 555-0123  [CALL NOW button]                  │
│  📍 123 Bloor St W, Toronto, ON M5S 1R1                │
│  🌐 bloorvet.com                                       │
│  🕐 Open Now — Closes at 6:00 PM                       │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ABOUT                                                  │
│  Full-service veterinary clinic serving Toronto since    │
│  2005. Specializing in small animal medicine...          │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  NICHE DATA (from site.config.ts nicheFields)           │
│  🚨 Emergency Services: Yes (24/7)                     │
│  🐾 Animals Treated: Dogs, Cats, Birds, Exotic         │
│  💉 Services: Surgery, Dental, Imaging, Pharmacy       │
│  ✅ Accepting New Patients: Yes                         │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  PRICING (if available)                                 │
│  Exam Fee: $75 | Vaccination: $45 | Dental: $350       │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  HOURS                                                  │
│  Mon-Fri: 8am-6pm | Sat: 9am-3pm | Sun: Closed        │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  SCORE BREAKDOWN                                        │
│  Data: ████████░░ 85%  Contact: █████████░ 90%         │
│  Online: ██████░░░░ 60%  Niche: ███████░░░ 70%         │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  [📷 Images — only if has_backlink or premium]          │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  NEARBY {PROFESSION}                                    │
│  [Card] [Card] [Card] [Card]                           │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  [Claim this profile] [Report incorrect info]           │
└─────────────────────────────────────────────────────────┘
```

### Profile Page Rules

1. **No images by default.** Images only show if `has_backlink === true` OR `tier === 'premium'`. This is the incentive for backlinks.
2. **Phone number is always a `tel:` link.** Click-to-call is the primary CTA.
3. **Niche data section is auto-generated** from `site.config.ts nicheFields`. No per-niche template code.
4. **Score breakdown is visual** (progress bars), not just numbers.
5. **"Claim this profile" button** links to the Supabase auth flow.
6. **Nearby profiles** are calculated by lat/lng distance, same city first.
7. **Zero JavaScript required** for the base page. Claiming/editing uses client-side JS loaded only when needed.

---

## 10. City Pages (The Ranking Pages)

City pages rank for "[profession] in [city]" searches. They must be flawless.

### Layout

```
┌─────────────────────────────────────────────────────────┐
│ Breadcrumbs: Home > Canada > Ontario > Toronto          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  <h1>Best Veterinarians in Toronto, Ontario</h1>       │
│  Compare 247 top-rated vet clinics with verified        │
│  reviews, hours, and services.                          │
│                                                         │
│  [Filter: Emergency 🚨] [Dogs 🐕] [Cats 🐈] [Exotic]  │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  TOP 36: Full ProfileCard components                    │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐                  │
│  │ Card 1  │ │ Card 2  │ │ Card 3  │  (3-col grid)    │
│  │ Name    │ │ Name    │ │ Name    │                   │
│  │ ★4.7    │ │ ★4.5    │ │ ★4.8    │                   │
│  │ Phone   │ │ Phone   │ │ Phone   │                   │
│  │ Score:78│ │ Score:72│ │ Score:85│                   │
│  └─────────┘ └─────────┘ └─────────┘                  │
│  ... (36 total)                                        │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  REMAINING: Compact list (40% fewer DOM nodes)          │
│  ┌─────────────────────────────────────────────┐       │
│  │ 37. Name — ★4.2 — (416) 555-0123 — Score:65│       │
│  │ 38. Name — ★4.0 — (416) 555-0124 — Score:62│       │
│  └─────────────────────────────────────────────┘       │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  NEARBY CITIES                                          │
│  Mississauga (89) | Brampton (67) | Markham (54)       │
│  Scarborough (43) | North York (38)                    │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  Internal links: Region page | Country page | Home     │
└─────────────────────────────────────────────────────────┘
```

### City Page Rules

1. **H1 format:** `Best {Profession} in {City}, {Region}` — always.
2. **Profiles sorted by score** (descending), then by Google rating as tiebreaker.
3. **Top 36 get full cards** with all data. Remaining get compact list format.
4. **Filters are CSS-only.** No JavaScript. Use `data-*` attributes and CSS `:has()` or adjacent sibling selectors. If CSS-only isn't feasible for the filter logic, use a tiny inline `<script>` (under 500 bytes) that toggles `hidden` attributes.
5. **Nearby cities** calculated by Haversine distance from city center lat/lng. Show top 5 with profile counts.
6. **Unique intro text per city.** Use `cityIntroTemplate` from config, but also pull from `locations.csv` if a custom description exists for that city.
7. **Schema: ItemList + BreadcrumbList.** Top 10 profiles in the ItemList schema. All profiles have proper `@type`, `address`, `telephone`.
8. **Page weight target: <40KB HTML.** Compact list format for profiles 37+ is critical for this.

### Filter Implementation (Minimal JS)

```html
<!-- Inline script: ~300 bytes minified -->
<script>
document.querySelectorAll('[data-filter-btn]').forEach(btn => {
  btn.addEventListener('click', () => {
    const filter = btn.dataset.filterBtn;
    const active = btn.classList.toggle('active');
    document.querySelectorAll('[data-profile-card]').forEach(card => {
      if (!active) { card.hidden = false; return; }
      const tags = card.dataset.tags || '';
      card.hidden = !tags.includes(filter);
    });
    // Deactivate other filters
    document.querySelectorAll('[data-filter-btn]').forEach(b => {
      if (b !== btn) b.classList.remove('active');
    });
  });
});
</script>
```

---

## 11. Profile Claiming & Supabase Auth

### Architecture

```
CSV (source of truth) ←── weekly export ←── Supabase (edits overlay)
                                                  ↑
                                            Profile owner
                                            logs in with Google
                                            edits their profile
                                            changes stored in Supabase
```

Supabase is NOT the source of truth. It's a staging area for edits. Weekly (or on-demand), a script exports approved edits back to CSV, commits to Git, and triggers a rebuild.

### Supabase Schema

```sql
-- supabase/migrations/001_claims_and_edits.sql

-- Claims table: tracks who claimed what
CREATE TABLE claims (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  place_id TEXT NOT NULL,                    -- Links to CSV place_id
  profile_name TEXT NOT NULL,                -- For display
  user_id UUID REFERENCES auth.users(id),    -- Supabase auth user
  user_email TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
  verification_method TEXT DEFAULT 'email' CHECK (verification_method IN ('email', 'phone', 'domain')),
  verification_code TEXT,
  claimed_at TIMESTAMPTZ DEFAULT NOW(),
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Edits table: stores profile changes from verified owners
CREATE TABLE profile_edits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  place_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  field_name TEXT NOT NULL,                  -- Which CSV column to update
  old_value TEXT,                            -- What it was
  new_value TEXT NOT NULL,                   -- What they want it to be
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ
);

-- Premium subscriptions
CREATE TABLE subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  place_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  tier TEXT DEFAULT 'claimed' CHECK (tier IN ('claimed', 'premium')),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'past_due')),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- RLS policies
ALTER TABLE claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_edits ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can only see/edit their own claims
CREATE POLICY "Users see own claims" ON claims
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users create own claims" ON claims
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can only edit profiles they've claimed and verified
CREATE POLICY "Verified owners edit profiles" ON profile_edits
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM claims
      WHERE claims.place_id = profile_edits.place_id
      AND claims.user_id = auth.uid()
      AND claims.status = 'verified'
    )
  );
```

### Claim Flow

```
1. User clicks "Claim this profile" on profile page
2. Redirected to /claim?place_id=xxx
3. Signs in with Google (Supabase Auth)
4. Enters their business email or phone
5. Verification:
   a. EMAIL: We send a code to the email listed on the profile (not the user's email).
      If the user can enter the code, they control that email = they own the business.
   b. PHONE: Same concept, SMS code to the phone on the profile.
   c. DOMAIN: User adds a TXT record or meta tag to their website. Script 07 verifies.
6. On verification: claim.status = 'verified', CSV updated on next export
7. Verified owner can now edit their profile via the Supabase-powered edit form
```

### Edit Form (Client-side, loads only on claimed profiles)

```astro
<!-- src/components/claim/EditProfile.astro -->
<!-- Only rendered if profile.claimed === true -->
<!-- Uses Supabase JS client for auth check + edit submission -->
<!-- Edits go to profile_edits table, NOT directly to CSV -->
<!-- Weekly export script merges approved edits into CSV -->

<div id="edit-profile" data-place-id={profile.place_id} style="display:none;">
  <!-- Form fields generated from site.config.ts -->
  <!-- Each field: current value (from CSV) + editable input -->
  <!-- Submit → Supabase profile_edits table -->
</div>

<script>
  // ~2KB: Supabase auth check + form submission
  // Only loads if user is logged in and has verified claim
  import { createClient } from '@supabase/supabase-js';
  // ... minimal client-side code
</script>
```

### Export Script (Supabase → CSV)

```typescript
// scripts/08-export-supabase-edits.ts

// 1. Connect to Supabase
// 2. Fetch all profile_edits where status = 'approved'
// 3. For each edit: find the row in professionals.csv by place_id
// 4. Update the field with new_value
// 5. Mark edit as 'applied' in Supabase
// 6. Write updated CSV
// 7. Git commit + push (triggers rebuild)

// Run weekly via cron, or manually after reviewing edits
```

---

## 12. Backlink Verification System

The growth engine. Free profiles get no images. Link back to us → get images and enhanced listing. Pay → get everything.

### How It Works

```
Tier 0 (Free):     Name, address, phone, hours, score, niche data. NO images.
Tier 1 (Backlink):  Everything above + images, social links displayed prominently, "Enhanced" badge.
Tier 2 (Premium):   Everything above + top of city results, premium badge, custom CTA button, analytics.
```

### Automated Backlink Checker

```typescript
// scripts/07-check-backlinks.ts

import { siteConfig } from '../site.config';

async function checkBacklink(profile: Profile): Promise<boolean> {
  if (!profile.website) return false;

  try {
    // Fetch the website homepage
    const response = await fetch(profile.website, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BacklinkBot/1.0)' },
      redirect: 'follow',
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) return false;
    const html = await response.text();

    // Check for a link to our domain
    const domain = siteConfig.domain;
    const patterns = [
      `href="https://${domain}`,
      `href="http://${domain}`,
      `href="//${domain}`,
      domain, // Even a text mention counts (generous)
    ];

    return patterns.some(p => html.toLowerCase().includes(p.toLowerCase()));
  } catch {
    return false; // Timeout, DNS failure, etc. = no backlink
  }
}

// Run for all profiles with websites
// Update CSV: has_backlink = true/false, backlink_verified_at = now
// Rate limit: 1 request per second, respect robots.txt
```

### Outreach Email (Automated)

When a profile has an email but no backlink, send a templated email:

```
Subject: Your {business_name} listing on {site_name}

Hi,

Your business "{business_name}" has a free listing on {site_name}:
{profile_url}

Want to enhance your listing with images and a featured badge?
Just add a link to your listing from your website.

Here's the link to add:
<a href="{profile_url}">{business_name} on {site_name}</a>

Once we detect the link (checked weekly), your listing will automatically
show images and get the "Enhanced" badge.

Questions? Reply to this email.

— {site_name} Team
```

This is the growth flywheel: more backlinks → more domain authority → higher rankings → more traffic → more claims → more backlinks.

---

## 13. Premium Listings & Monetization

### Pricing Model

```
Free (default):
  - Basic listing with all data
  - Score and ranking
  - No images
  - Standard position in city results

Claimed (free, requires verification):
  - Edit your profile info
  - "Verified" badge
  - Basic analytics (views, clicks)
  - Still no images unless backlink exists

Premium ($29/month or $249/year):
  - Everything in Claimed
  - "Premium" badge
  - Images displayed (no backlink needed)
  - Boosted to top of city results
  - Custom CTA button ("Book Now" with your URL)
  - Detailed analytics (referrers, trends)
  - Priority in "nearby" sections on other profiles
  - Direct booking link prominent
```

### Stripe Integration

```typescript
// Stripe Checkout for premium subscriptions
// Webhook updates Supabase subscriptions table
// Export script reads subscription status → updates CSV tier column
// Build renders premium features based on tier

// Stripe webhook → Supabase subscription table → CSV export → rebuild
// Latency: up to 1 week for changes to appear (weekly export)
// For faster updates: trigger rebuild on webhook (optional)
```

### Boost Logic in City Pages

```typescript
// In data-loader.ts, when sorting city profiles:
function sortCityProfiles(profiles: Profile[]): Profile[] {
  return profiles.sort((a, b) => {
    // Premium profiles first
    if (a.tier === 'premium' && b.tier !== 'premium') return -1;
    if (b.tier === 'premium' && a.tier !== 'premium') return 1;
    // Then by score
    return b.score - a.score;
  });
}
```

Premium profiles get boosted but don't completely dominate. They appear in the top section but organic high-scorers still show prominently. This keeps the directory trustworthy.

---

## 14. Trickle Publishing

Don't publish 12,000 profiles at once. Google will think you're spam.

### Strategy

```
Day 1:    Publish 200 profiles (seed content, diverse cities)
Day 2-7:  Publish 100/day (700 total by end of week 1)
Week 2-4: Publish 200/day (4,200 more, ~5,100 total by month 1)
Month 2+: Publish 300/day until all profiles are live

Total time to publish 12,000 profiles: ~6-8 weeks
```

### Implementation

```typescript
// scripts/06-trickle-publish.ts

const BATCH_SIZE = parseInt(process.env.TRICKLE_BATCH || '100');

function tricklePublish(csvPath: string) {
  const profiles = readCsv(csvPath);

  // Find draft profiles
  const drafts = profiles.filter(p => p.status === 'draft');
  if (drafts.length === 0) { console.log('No drafts remaining.'); return; }

  // Select batch: random selection across different cities for diversity
  const cityGroups = groupBy(drafts, 'city_slug');
  const selected: Profile[] = [];

  // Round-robin across cities to ensure geographic diversity
  const cityKeys = shuffle(Object.keys(cityGroups));
  let i = 0;
  while (selected.length < BATCH_SIZE && i < drafts.length) {
    for (const city of cityKeys) {
      if (selected.length >= BATCH_SIZE) break;
      const cityDrafts = cityGroups[city];
      if (cityDrafts && cityDrafts.length > 0) {
        selected.push(cityDrafts.shift()!);
      }
    }
    i++;
  }

  // Update status to published
  for (const profile of selected) {
    profile.status = 'published';
    profile.published_at = new Date().toISOString();
  }

  writeCsv(csvPath, profiles);
  console.log(`Published ${selected.length} profiles across ${new Set(selected.map(s => s.city_slug)).size} cities.`);
  console.log(`Remaining drafts: ${drafts.length - selected.length}`);
}
```

### Cron Setup (Hostinger VPS)

```bash
# /etc/cron.d/directory-engine

# Trickle publish: twice daily at random-ish times
0 8  * * * cd /var/www/vetlist && node scripts/06-trickle-publish.ts && npm run build && rsync ...
0 20 * * * cd /var/www/vetlist && node scripts/06-trickle-publish.ts && npm run build && rsync ...

# Backlink check: weekly on Sunday
0 3 * * 0 cd /var/www/vetlist && node scripts/07-check-backlinks.ts && npm run build && rsync ...

# Supabase export: weekly on Monday
0 4 * * 1 cd /var/www/vetlist && node scripts/08-export-supabase-edits.ts && npm run build && rsync ...
```

### Sitemap Updates

After each trickle publish + rebuild, the Astro sitemap integration automatically regenerates `sitemap.xml` with only published profiles. Submit sitemap to Google Search Console once. Google re-crawls it automatically.

---

## 15. Theming & Niche Customization

### CSS Custom Properties (Set by site.config.ts)

```css
/* src/styles/global.css */

:root {
  /* These are overridden by site.config.ts theme values at build time */
  --color-primary: #2563eb;
  --color-primary-light: #dbeafe;
  --color-primary-dark: #1d4ed8;
  --color-accent: #10b981;
  --color-accent-light: #d1fae5;

  --color-bg: #ffffff;
  --color-bg-alt: #f8fafc;
  --color-bg-card: #ffffff;
  --color-border: #e2e8f0;
  --color-text: #0f172a;
  --color-text-muted: #64748b;

  --color-score-high: #10b981;
  --color-score-mid: #f59e0b;
  --color-score-low: #ef4444;

  --radius: 0.5rem;
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
  --shadow-md: 0 4px 6px rgba(0,0,0,0.07);
}
```

### How Theming Works Per Niche

The `BaseLayout.astro` component reads `site.config.ts` and injects CSS custom properties:

```astro
---
import { siteConfig } from '../../../site.config';

// Generate color ramp from primary color
function hexToHSL(hex: string) { /* ... */ }
function generateShades(hex: string) { /* ... */ }

const shades = generateShades(siteConfig.theme.primaryColor);
---

<html>
<head>
  <style>
    :root {
      --color-primary: {siteConfig.theme.primaryColor};
      --color-primary-light: {shades.light};
      --color-primary-dark: {shades.dark};
      --color-accent: {siteConfig.theme.accentColor};
    }
  </style>
</head>
```

### Design Templates

For v1, ship one clean design that works for all niches. The color scheme and niche fields make each site feel different enough. Don't over-engineer multiple layout templates until you have 5+ niches running.

```
VetList:    Blue primary, green accent, emergency/animals niche fields
PilatesQ:   Purple primary, pink accent, reformer/class-types niche fields
DentistDir: Teal primary, blue accent, insurance/specialties niche fields
```

Same layout, different colors, different data. That's the factory.

---

## 16. Analytics (Built-in, Lightweight)

### Approach: Minimal Tracker + Server Logs

For static sites, you have two options:

**Option A: Plausible Analytics (recommended for v1)**
- Self-hosted on Hostinger VPS (free, open source)
- 1KB script, privacy-friendly, no cookies
- Dashboard shows pageviews, referrers, countries, devices
- Per-page analytics (which profiles get the most views)
- Cost: $0 (self-hosted) or $9/month (cloud)

**Option B: Custom beacon (from the WordPress PRD)**
- ~450 bytes inline JS
- Sends beacons to a tiny endpoint on your VPS
- Stores in SQLite (no database server needed)
- Build a simple dashboard later

Recommendation: Start with Plausible self-hosted. It's battle-tested and takes 10 minutes to set up with Docker. Build custom analytics only if you need per-profile stats for premium users.

```bash
# Plausible self-hosted on Hostinger VPS
docker-compose up -d  # plausible + clickhouse + postgres
# Add to BaseLayout.astro:
# <script defer data-domain="vetlist.org" src="https://analytics.yourvps.com/js/script.js"></script>
```

### Profile-Level Analytics (For Premium Users)

For premium profiles that need "how many people viewed my listing":

```typescript
// Simple approach: parse Plausible API or server access logs
// Plausible has an API: GET /api/v1/stats/breakdown?property=event:page&filters=event:page==/canada/ontario/toronto/bloor-animal-hospital/

// Expose to verified profile owners via their Supabase dashboard
// No need to build a custom analytics system for v1
```

---

## 17. Community Forum (Phase 2)

Build this AFTER you have 100 verified users. Not before.

### Concept

A LinkedIn-style feed for verified professionals in each niche. You can only post if your profile is verified on the site. This creates an exclusive "old boys club" feel that drives more claims.

### Architecture Options

**Option A: Supabase Realtime (simplest)**
- Posts table in Supabase with RLS (only verified users can post)
- Client-side rendering with Supabase JS
- Separate page: `/community/` on each site
- Real-time updates via Supabase subscriptions

**Option B: Discourse (most feature-rich)**
- Self-hosted Discourse instance on VPS
- SSO with Supabase auth
- Separate subdomain: `community.vetlist.org`
- Full forum features out of the box

**Option C: Simple static feed (most on-brand)**
- Posts stored in Supabase
- Exported to a JSON file weekly (like CSV export)
- Rendered as static pages during build
- New posts appear after next rebuild
- Keeps the "static-first" philosophy

Recommendation: Option A for launch. It's the fastest to build and gives real-time interaction. Move to Discourse if the community outgrows it.

### Data Model (Supabase)

```sql
-- Phase 2: Community tables

CREATE TABLE posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  place_id TEXT NOT NULL,              -- Author's business
  user_id UUID REFERENCES auth.users(id),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE post_replies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  place_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Only verified profile owners can post
CREATE POLICY "Verified users post" ON posts
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM claims
      WHERE claims.user_id = auth.uid()
      AND claims.status = 'verified'
    )
  );
```

---

## 18. Deployment & Infrastructure

### Architecture: Build VPS + Cloudflare R2/Workers (Serving)

The VPS only builds. Cloudflare serves everything. This gives you unlimited bandwidth, global edge CDN, and zero traffic costs.

```
┌─────────────────────────────────┐     ┌──────────────────────────────────┐
│  BUILD VPS ($5-10/mo)           │     │  CLOUDFLARE (free or $5/mo)      │
│                                 │     │                                  │
│  - Git repos for each site      │     │  R2 Bucket (per site):           │
│  - CSV data                     │ ──▶ │  - All static HTML/CSS/JS/images │
│  - npm run build                │     │  - No file count limit           │
│  - Cron jobs (trickle, backlink)│     │  - $0.015/GB storage             │
│  - Wrangler CLI uploads to R2   │     │  - $0 egress (free bandwidth)    │
│                                 │     │                                  │
│  Ubuntu 22.04, Node 20          │     │  Worker (per site):              │
│  2 vCPU, 4GB RAM is plenty      │     │  - Serves HTML from R2           │
│  Hetzner CX22: €4.35/mo         │     │  - Trailing slash redirects      │
│  DigitalOcean: $6/mo            │     │  - Cache headers                 │
│  Hostinger: ~$5/mo              │     │  - 100K free requests/day        │
│                                 │     │  - Unlimited on $5/mo plan       │
│  Docker: Plausible analytics    │     │                                  │
└─────────────────────────────────┘     │  DNS + SSL: automatic            │
                                        │  CDN: 300+ global edge locations │
                                        └──────────────────────────────────┘
```

### Why Not Just Cloudflare Pages?

Cloudflare Pages has a **20,000 file limit** (even on Pro at 25K). A 77K profile site generates 77K+ HTML files. That's a hard no.

**Cloudflare R2 + Workers** has no file limit. You upload files to R2 (object storage), and a Worker serves them. Same Cloudflare edge network, same speed, no limits.

### Cost Breakdown

```
Service                  | Cost/month  | What it does
─────────────────────────┼─────────────┼──────────────────────────────
Build VPS (Hetzner CX22) | €4.35       | Builds sites, runs crons
Cloudflare R2 storage    | ~$0.15      | 10GB of HTML files
Cloudflare Workers       | $0 (free)   | 100K requests/day free
  or Workers Paid         | $5          | 10M requests/month (if needed)
Cloudflare DNS + SSL     | $0          | Free
─────────────────────────┼─────────────┼──────────────────────────────
TOTAL per site           | ~$5-10/mo   | Unlimited bandwidth
```

Compare to Vercel: free tier caps at 100GB bandwidth, then $20/month for Pro, and you're already hitting limits from bots.

### Directory Structure on Build VPS

```
/var/www/
├── vetlist.org/
│   ├── repo/          # Git clone of vetlist repo
│   ├── dist/          # Built static files (uploaded to R2)
│   └── logs/
├── pilatesq.com/
│   ├── repo/
│   ├── dist/
│   └── logs/
└── shared/
    ├── plausible/     # Docker compose for analytics
    └── scripts/       # Shared deployment scripts
```

### Cloudflare Worker (Serves Static Files from R2)

```javascript
// worker.js — deployed via wrangler for each site
// Binds to R2 bucket, serves files, handles trailing slashes

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    let path = url.pathname;

    // Trailing slash redirect (SEO critical)
    if (path !== '/' && !path.endsWith('/') && !path.includes('.')) {
      return Response.redirect(`${url.origin}${path}/`, 301);
    }

    // Map URL to R2 key
    let key = path === '/' ? 'index.html' : path;
    if (key.endsWith('/')) key += 'index.html';
    if (key.startsWith('/')) key = key.slice(1);

    // Fetch from R2
    const object = await env.SITE_BUCKET.get(key);

    if (!object) {
      // Try 404 page
      const notFound = await env.SITE_BUCKET.get('404.html');
      return new Response(notFound?.body || 'Not Found', {
        status: 404,
        headers: { 'Content-Type': 'text/html' },
      });
    }

    // Content type detection
    const ext = key.split('.').pop();
    const types = {
      html: 'text/html', css: 'text/css', js: 'application/javascript',
      json: 'application/json', svg: 'image/svg+xml', png: 'image/png',
      jpg: 'image/jpeg', webp: 'image/webp', ico: 'image/x-icon',
      woff2: 'font/woff2', xml: 'application/xml', txt: 'text/plain',
    };

    const headers = new Headers();
    headers.set('Content-Type', types[ext] || 'application/octet-stream');

    // Cache: HTML gets 1 hour, assets get 1 year
    if (ext === 'html') {
      headers.set('Cache-Control', 'public, max-age=3600');
    } else {
      headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    }

    // Security headers
    headers.set('X-Frame-Options', 'SAMEORIGIN');
    headers.set('X-Content-Type-Options', 'nosniff');

    return new Response(object.body, { headers });
  },
};
```

### Wrangler Config (Per Site)

```toml
# wrangler.toml — in each site's repo

name = "vetlist-org"
main = "worker.js"
compatibility_date = "2025-01-01"

[[r2_buckets]]
binding = "SITE_BUCKET"
bucket_name = "vetlist-org"

[triggers]
# No cron triggers — builds happen on the VPS
```

### Build & Deploy Script

```bash
#!/bin/bash
# /var/www/shared/scripts/build-and-deploy.sh
# Usage: ./build-and-deploy.sh vetlist.org

SITE=$1
REPO_DIR="/var/www/${SITE}/repo"
BUCKET_NAME=$(echo "$SITE" | tr '.' '-')  # vetlist.org → vetlist-org

echo "Building ${SITE}..."

cd "$REPO_DIR"
git pull origin main

# Install deps (only if lockfile changed)
npm ci --prefer-offline

# Clear Astro cache
rm -rf .astro

# Build
npm run build

# Upload to Cloudflare R2
echo "Uploading to R2 bucket: ${BUCKET_NAME}..."

# Wrangler r2 object put — upload all files from dist/
# Using rclone for bulk upload (faster than wrangler for large sites)
rclone sync dist/ r2:${BUCKET_NAME}/ \
  --transfers=20 \
  --checkers=20 \
  --fast-list \
  --s3-provider=Cloudflare \
  --s3-access-key-id=$CF_R2_ACCESS_KEY \
  --s3-secret-access-key=$CF_R2_SECRET_KEY \
  --s3-endpoint=https://$CF_ACCOUNT_ID.r2.cloudflarestorage.com

echo "Deployed ${SITE} to Cloudflare R2 at $(date)"
```

### Why rclone Instead of Wrangler for Upload

Wrangler's `r2 object put` uploads one file at a time. For 77K files, that's painfully slow. `rclone sync` does parallel uploads (20 concurrent), only uploads changed files (checksums), and handles the entire dist/ directory in one command. A full 77K site upload takes ~5 minutes. Incremental updates (after trickle publish) take seconds.

### Cron Schedule (All Sites)

```bash
# Trickle publish + rebuild + deploy (twice daily)
0 8  * * * /var/www/shared/scripts/trickle-and-build.sh vetlist.org >> /var/www/vetlist.org/logs/cron.log 2>&1
0 20 * * * /var/www/shared/scripts/trickle-and-build.sh vetlist.org >> /var/www/vetlist.org/logs/cron.log 2>&1
0 9  * * * /var/www/shared/scripts/trickle-and-build.sh pilatesq.com >> /var/www/pilatesq.com/logs/cron.log 2>&1
0 21 * * * /var/www/shared/scripts/trickle-and-build.sh pilatesq.com >> /var/www/pilatesq.com/logs/cron.log 2>&1

# Backlink checks (weekly, staggered)
0 3 * * 0 cd /var/www/vetlist.org/repo && node scripts/07-check-backlinks.ts
0 3 * * 1 cd /var/www/pilatesq.com/repo && node scripts/07-check-backlinks.ts

# Supabase export (weekly)
0 4 * * 1 cd /var/www/vetlist.org/repo && node scripts/08-export-supabase-edits.ts
0 4 * * 2 cd /var/www/pilatesq.com/repo && node scripts/08-export-supabase-edits.ts

# Score recalculation (weekly, after exports)
0 5 * * 1 cd /var/www/vetlist.org/repo && node scripts/05-calculate-scores.ts
0 5 * * 2 cd /var/www/pilatesq.com/repo && node scripts/05-calculate-scores.ts
```

### Alternative: Cloudflare Pages for Smaller Sites

For niches under 20K profiles (most of them), Cloudflare Pages works fine and is even simpler — just `git push` and it builds + deploys automatically. Use R2 + Workers only for the big sites (VetList at 77K).

```
Site Size        | Hosting Choice
─────────────────┼──────────────────────────────
< 20K profiles   | Cloudflare Pages (free, auto-deploy on git push)
20K - 100K       | Cloudflare R2 + Workers (no file limit)
100K+            | Same R2 + Workers, just takes longer to build
```

You can even start a niche on Cloudflare Pages and migrate to R2 + Workers when it outgrows the file limit. The static HTML output is identical — only the upload target changes.

---

## 19. New Niche Launch Checklist

This is the step-by-step for launching a new directory site from scratch.

### Phase 1: Setup (Day 1)

```
□ Clone the directory-engine template repo
□ Buy domain (e.g., pilatesq.com)
□ Edit site.config.ts:
  - name, domain, tagline, profession
  - schemaType
  - nicheFields (the trojan horse data)
  - pricingFields
  - scoring weights
  - theme colors
  - scraperSystemPrompt
□ Set up DNS → Hostinger VPS
□ Set up SSL with Certbot
□ Set up Nginx config (copy from template, change domain)
□ Create Supabase project (or reuse shared instance)
□ Add .env file with API keys
```

### Phase 2: Data Collection (Days 2-5)

```
□ Set up Lobstr.io task for the niche + target geography
  - Search: "pilates studios" in each major city
  - Or: bulk search by state/province
  - Export CSV when complete
□ Run 01-fetch-from-lobstr.ts → raw data into professionals.csv
□ Run 02-scrape-websites.ts → scrape all websites with Jina AI
  - This takes time: ~2 seconds per site, 12,000 sites = ~7 hours
  - Run overnight, it's idempotent (safe to restart)
□ Run 03-extract-with-ai.ts → DeepSeek extracts niche data
  - ~1 second per profile, 12,000 = ~3.5 hours
  - Run overnight
□ Run 04-merge-enriched.ts → merge AI data into professionals.csv
□ Run 05-calculate-scores.ts → calculate all scores
□ Verify data quality:
  - How many profiles have phone numbers? (target: 90%+)
  - How many have websites? (target: 60%+)
  - How many have niche data? (target: 40%+ after scraping)
  - How many have pricing? (target: 20%+)
```

### Phase 3: Build & Test (Days 6-7)

```
□ Set all profiles to status: 'draft'
□ Run 06-trickle-publish.ts with TRICKLE_BATCH=200 (initial seed)
□ FAST_BUILD=true npm run build → test with 500 profiles
□ Check:
  - Homepage renders with correct counts
  - Country pages list regions
  - Region pages list cities
  - City pages show profiles sorted by score
  - Profile pages show all data correctly
  - Schema.org validates (Google Rich Results Test)
  - Meta tags are correct (title, description, OG, geo)
  - Canonical URLs have trailing slashes
  - Mobile layout is perfect
  - Page weight < 40KB for city pages
□ Full build (no FAST_BUILD) → verify all pages generate
□ Deploy to VPS
```

### Phase 4: Launch & Grow (Week 2+)

```
□ Submit sitemap to Google Search Console
□ Set up trickle publish cron (100-200/day)
□ Set up backlink checker cron (weekly)
□ Set up Plausible analytics
□ Monitor Google Search Console for:
  - Indexing status
  - Schema errors
  - Core Web Vitals
□ Start outreach emails to businesses with email addresses
□ Monitor claim requests in Supabase
□ After 2 weeks: check which city pages are ranking, optimize those first
```

### Phase 5: Monetize (Month 2+)

```
□ Set up Stripe for premium subscriptions
□ Add premium features to claimed profiles
□ Start outreach to high-traffic profiles about premium
□ Monitor conversion: claims → premium upgrades
```

---

## 20. Migration Plan (VetList → New Engine)

### What to Keep from Current VetList

```
✅ CSV data (professionals-canada.csv + professionals-usa.csv)
   → Merge into single professionals.csv with unified schema
   → Add missing columns (place_id, status, slug, tier, etc.)
   → Normalize country/region/city slugs

✅ Scoring logic (vetscore system)
   → Port to new scoring engine, driven by site.config.ts weights

✅ SEO patterns (title formats, schema structure, geo tags)
   → Already encoded in the new SEO engine

✅ Domain + Google Search Console history
   → Keep vetlist.org, just rebuild the site under it

✅ Existing Google rankings
   → CRITICAL: maintain exact same URL structure
   → /canada/ontario/toronto/ must still work
   → /canada/ontario/toronto/bloor-animal-hospital/ must still work
```

### What to Throw Away

```
❌ Dual data loaders (supabase.js + dataCache.js) → single data-loader.ts
❌ Split CSV files → single professionals.csv
❌ 50+ markdown documentation files → this PRD is the only doc
❌ CRM system (crm/) → replaced by Supabase claims
❌ Admin server (admin-server.js) → replaced by Supabase dashboard
❌ Algolia search → not needed for v1 (browser ctrl+F or simple JS filter)
❌ Complex build optimizations → clean build on VPS, no Vercel limits
```

### Migration Steps

```
1. Create new repo: vetlist-v2/
2. Set up directory-engine template
3. Configure site.config.ts for vets
4. Export current CSV data:
   - Merge canada + usa into one file
   - Add missing columns
   - Normalize all slugs to match current URLs (CRITICAL for SEO)
   - Set all existing profiles to status: 'published'
5. Build and test locally
6. Verify URL parity: every current URL must work in new build
7. Deploy to VPS alongside current site
8. Test thoroughly
9. Switch DNS from Vercel to VPS
10. Monitor Google Search Console for any indexing issues
11. Set up all crons (trickle, backlinks, exports)
```

### URL Parity Check Script

```typescript
// scripts/verify-url-parity.ts
// Reads current sitemap from vetlist.org
// Builds new site
// Checks every URL in old sitemap exists in new build
// Reports any missing URLs (these would be 404s = SEO disaster)
```

---

## Appendix A: API Keys & Services

```
Service          | Purpose                    | Cost
─────────────────┼────────────────────────────┼──────────────
Lobstr.io        | Google Maps data           | ~$0.002/result
Jina AI          | Website scraping           | Free tier: 1M tokens/mo
DeepSeek         | AI data extraction         | ~$0.001/extraction
Supabase         | Auth + edits overlay       | Free tier: 50K MAU
Stripe           | Premium payments           | 2.9% + $0.30/txn
Build VPS        | Builds + crons only        | ~$5/month (Hetzner/DO)
Cloudflare R2    | Static file storage        | ~$0.15/mo per site
Cloudflare Workers| Serves files from R2      | Free (100K req/day) or $5/mo
Cloudflare DNS   | DNS + SSL                  | Free
Plausible        | Analytics (self-hosted)    | Free (Docker on VPS)
```

## Appendix B: Niche Ideas & Their Trojan Horse Data

```
Niche              | Domain Idea        | Trojan Horse (what makes it useful)
───────────────────┼────────────────────┼─────────────────────────────────────
Veterinarians      | vetlist.org        | Emergency services, animals treated, exotic vet
Pilates Studios    | pilatesq.com       | Reformer classes, class size, female-only, pricing
Dentists           | dentistdir.com     | Insurance accepted, emergency dental, cosmetic
Optometrists       | eyedoc.directory   | Myopia control, ortho-k, pediatric, dry eye
Chiropractors      | chirolist.com      | Techniques (activator, diversified), sports chiro
HVAC Contractors   | hvacfind.com       | Emergency service, brands serviced, financing
Mechanics          | mechanicq.com      | Specialties (European, diesel, hybrid), warranty
Violin Shops       | violinshops.com    | Rental programs, repair, brands carried, lessons
Hotels             | hotelscout.com     | Pet-friendly, pool, breakfast, parking, EV charging
Yoga Studios       | yogafind.com       | Hot yoga, aerial, prenatal, teacher training
Martial Arts       | dojolist.com       | Styles (BJJ, Muay Thai, Karate), kids classes
Dog Groomers       | groomfind.com      | Breed specialties, mobile grooming, cat grooming
Tutors             | tutorscout.com     | Subjects, grade levels, online/in-person, rates
Music Schools      | musicschoolq.com   | Instruments taught, group vs private, recitals
```

## Appendix C: Build Time Estimates

```
Profiles    | Build Time (est.) | HTML Size
────────────┼───────────────────┼──────────
500         | ~30 seconds       | ~50MB
5,000       | ~3 minutes        | ~500MB
12,000      | ~8 minutes        | ~1.2GB
50,000      | ~30 minutes       | ~5GB
77,000      | ~45 minutes       | ~7.5GB
```

On a Hostinger VPS with 2 vCPU + 8GB RAM, even 77K profiles should build in under an hour. No Vercel timeout issues.

---

## Summary

This PRD defines a complete system for launching SEO-dominant directory sites across any professional niche. The key insight is that 90% of the code is shared — only `site.config.ts` and the CSV data change per niche.

**Build order:**
1. Directory engine template (Astro + data loader + SEO engine + scoring)
2. Scraper pipeline (Lobstr → Jina → DeepSeek → CSV)
3. Profile claiming (Supabase auth + edit forms + CSV export)
4. Trickle publishing + backlink checker
5. Premium monetization (Stripe)
6. Analytics (Plausible self-hosted)
7. Community forum (Phase 2, after 100 verified users)

**Time estimate to build from scratch:** 2-3 weeks for a senior dev working full-time, or 4-6 weeks at a sustainable pace. The scraper pipeline and data collection run in parallel with the frontend build.

**This document is the single source of truth for the project. No other documentation files needed.**
