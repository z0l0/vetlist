# VetList Build Speed Strategy

## Current Situation

| Metric | Value |
|--------|-------|
| Total profiles | 26,597 |
| Profile pages | 26,329 |
| City pages | 7,415 |
| Region pages | 63 |
| Country pages | 2 |
| Static pages | ~10 |
| **Total output files** | **~33,819** |
| CSV data (Canada) | 4.7 MB / 3,610 rows |
| CSV data (USA) | 20 MB / 22,989 rows |
| Precomputed site-data.json | 75 MB |
| Astro data-cache.json | 61 MB |
| Fast build (100 profiles) | ~16 seconds |
| Full build (all profiles) | estimated 15-25 minutes |

## Platform Limits

| Platform | Build Timeout | File Limit (Free) | File Limit (Paid) | Cost |
|----------|--------------|-------------------|-------------------|------|
| Cloudflare Pages | 20 min | 20,000 files | 100,000 files ($5/mo Workers Paid) | Free / $5/mo |
| Vercel | 45 min (Hobby) | 100,000 files | 100,000 files | Free / $20/mo |
| Netlify | 15 min (Free), 30 min (Pro) | No hard limit | No hard limit | Free / $19/mo |

**Your 33,819 pages exceed Cloudflare's free 20,000 file limit.** You'd need the $5/mo Workers Paid plan for the 100,000 limit. Vercel and Netlify both handle 33K files on free tiers.

The real constraint is build time. At 26K+ profile pages where each one runs comparison logic against every other clinic in the city, you're doing millions of computations during the Astro build.

---

## The Core Problem

Right now, every profile page recalculates everything at build time:

1. `getProfilesForCity()` — loads all profiles in the city
2. `getProfilesForRegion()` — loads all profiles in the region
3. `buildProfileMetrics()` — runs on every city peer
4. `buildComparisonRows()` — computes averages, percentiles, ranks
5. `buildBreakdownRows()` — parses VetScore breakdowns for all peers
6. `buildMarketRows()` — counts emergency/booking/telehealth across city
7. `buildLeaderboardRows()` — sorts and ranks all city profiles
8. `buildStrengthRows()` / `buildOpportunityRows()` — derives from above
9. `buildRadarChart()` — geometry calculations for SVG

For a city like Toronto with 500+ clinics, this means each of the 500 profile pages independently:
- Loads 500 profiles
- Runs `buildProfileMetrics()` 500 times
- Sorts 500 profiles for the leaderboard
- Computes averages across 500 values

That's 500 × 500 = 250,000 metric calculations just for Toronto. Multiply across 7,415 cities and you see the problem.

---

## The Fix: Precompute Everything Into JSON

### Phase 1: Precompute City-Level Data (Biggest Win)

Create a script that runs ONCE before the build and produces a JSON file per city with all the comparative data already calculated.

**New file: `scripts/precompute-city-data.js`**

This script would:

1. Load all profiles from CSV
2. For each city, compute:
   - City average VetScore, rating, capabilities, completeness
   - Region averages for the same metrics
   - Market signal counts (emergency %, booking %, telehealth %, etc.)
   - Sorted leaderboard (top 5 + each profile's rank)
   - VetScore breakdown averages
3. For each profile, compute:
   - Its rank in the city
   - Its percentile
   - Comparison rows (vs city avg, vs region avg)
   - Strength rows and opportunity rows
   - Radar chart data points
   - Snapshot card values
   - The factual summary text
   - Hero highlights
4. Write one JSON file per city: `data/derived/cities/{country}/{region}/{city}.json`
5. Each file contains the city-level stats plus a map of profile slug → precomputed data

**Expected output structure:**
```json
{
  "cityStats": {
    "totalProfiles": 146,
    "avgVetscore": 39,
    "avgRating": 4.3,
    "emergencyCount": 21,
    "bookingCount": 22,
    "telehealthCount": 1,
    "multilingualCount": 15,
    "pricingCount": 5
  },
  "regionStats": {
    "totalProfiles": 2633,
    "avgVetscore": 40,
    "avgRating": 4.3
  },
  "leaderboard": [
    { "slug": "james-b-bogdansky-dvm", "name": "James B. Bogdansky, DVM", "vetscore": 72, "rank": 1 },
    ...
  ],
  "profiles": {
    "james-b-bogdansky-dvm": {
      "comparisonRows": [...],
      "breakdownRows": [...],
      "marketRows": [...],
      "strengthRows": [...],
      "opportunityRows": [...],
      "radarChart": { ... },
      "snapshotCards": [...],
      "heroHighlights": [...],
      "factualSummary": "...",
      "footprintRows": [...]
    }
  }
}
```

**Impact:** The profile page template becomes a pure renderer. No computation. Just read the JSON and output HTML. Build time drops from O(n²) to O(n).

### Phase 2: Precompute Profile-Level Data

Extend the precompute script to also generate per-profile JSON:

`data/derived/profiles/{country}/{region}/{city}/{slug}.json`

Each file contains everything the template needs:
- All the precomputed comparison data from Phase 1
- Parsed hours, open status (at build time)
- Capability chips
- Pricing rows
- Timeline items (review dates)
- Related vets list
- Nearby cities list

The profile template then does zero computation — just reads one JSON file and renders.

### Phase 3: Build Locally, Deploy Output Only

Since you're updating once a week or less:

1. Run the precompute script locally (takes 2-3 minutes, no timeout concern)
2. Run `astro build` locally (with precomputed data, should be 5-10 minutes)
3. Deploy only the `dist/` folder to Cloudflare Pages via direct upload (Wrangler CLI)

This completely bypasses the platform build timeout because you're not building on their servers.

```bash
# Local workflow
npm run precompute        # 2-3 min — generates all JSON
npm run build             # 5-10 min — Astro just renders templates
npx wrangler pages deploy dist/  # 1-2 min — uploads static files
```

**No build timeout. No CI/CD timeout. You control everything.**

---

## Implementation Plan

### Step 1: Create the precompute script

```bash
# New npm scripts
"precompute": "node scripts/precompute-city-data.js",
"precompute:profiles": "node scripts/precompute-profile-data.js",
"build:optimized": "npm run precompute && npm run precompute:profiles && npm run build"
```

The precompute script does all the heavy math once. It reads the CSVs, computes everything, and writes JSON files. This is a Node.js script with no timeout — it runs on your machine.

### Step 2: Simplify the profile template

The `[profile].astro` template changes from:

```javascript
// BEFORE: Heavy computation per page
const cityProfiles = await getProfilesForCity(country, region, city);
const regionProfiles = await getProfilesForRegion(country, region);
const metrics = buildProfileMetrics(profileData);
const cityPeerMetrics = cityPeersRaw.map(item => buildProfileMetrics(item));
const comparisonRows = buildComparisonRows(metrics, cityPeerMetrics, regionPeerMetrics);
// ... 20 more computation functions
```

To:

```javascript
// AFTER: Just read precomputed JSON
import { getPrecomputedProfileData } from '../../../../lib/precomputed.js';
const precomputed = await getPrecomputedProfileData(country, region, city, profile);
const { comparisonRows, breakdownRows, marketRows, radarChart, ... } = precomputed;
```

### Step 3: Deploy via Wrangler (skip platform builds entirely)

```bash
npm install -g wrangler
wrangler pages project create vetlist
wrangler pages deploy dist/ --project-name=vetlist
```

This uploads your pre-built static files directly. No build step on Cloudflare's servers. No timeout.

---

## Expected Build Times After Optimization

| Step | Current | After Phase 1 | After Phase 2 |
|------|---------|---------------|---------------|
| Precompute | N/A | ~3 min | ~3 min |
| CSV parsing | ~3 sec | ~3 sec (in precompute) | ~3 sec (in precompute) |
| Profile page generation | ~15-25 min | ~5-8 min | ~3-5 min |
| City page generation | ~3-5 min | ~2-3 min | ~1-2 min |
| **Total** | **~20-30 min** | **~10-14 min** | **~7-10 min** |

The key insight: precomputing moves the O(n²) work out of the Astro build (which has timeouts) into a standalone script (which doesn't).

---

## Cloudflare Specifics

### Free Plan (20,000 files)
You'd need to either:
- Only deploy Canada (~3,610 profiles + ~2,000 cities = ~5,610 pages) — fits easily
- Or use quality filtering to reduce to under 20K total pages

### Workers Paid ($5/month, 100,000 files)
Your 33,819 pages fit comfortably. This is the recommended option.

### Direct Upload (No Build Timeout)
```bash
# Install Wrangler
npm install -g wrangler

# Login
wrangler login

# Create project (once)
wrangler pages project create vetlist-org

# Deploy (every time)
wrangler pages deploy dist/ --project-name=vetlist-org
```

Upload takes 1-2 minutes for 33K files. No build step on their servers.

### Custom Domain
After first deploy, add your domain in the Cloudflare Pages dashboard under Custom Domains. Since your DNS is already on Cloudflare (presumably), it's instant.

---

## Alternative: Incremental / Chunked Builds

If you want to stay on free tiers everywhere, you could split the build:

1. **Build Canada only** → deploy to Cloudflare Pages (free, ~5K files)
2. **Build USA only** → deploy to a second Cloudflare Pages project (free, ~28K files — needs paid)

Or split by state:
- Build each US state as a separate deployment
- Use Cloudflare Workers to route requests to the right deployment

This is more complex but keeps everything free. Not recommended unless $5/month is a dealbreaker.

---

## Quick Wins (Do These Now, No Code Changes)

### 1. Build locally, deploy output
Stop using platform CI/CD for builds. Build on your Mac, deploy the `dist/` folder.

### 2. Use the existing precomputed site-data.json better
Your `precompute-site-data.js` already loads all profiles and writes them to JSON. The profile template could read directly from this instead of re-parsing CSVs.

### 3. Reduce console.log noise
The build logs show hundreds of debug messages. Each `console.log` in a hot path (called 26K times) adds up. Strip them for production builds.

### 4. Skip the data-cache.json write during build
The 61MB cache file is written during build but only useful for subsequent builds. If you're building from precomputed data, you don't need it.

---

## Recommended Order

1. **Now:** Build locally + deploy via Wrangler ($5/mo CF Workers Paid)
2. **This week:** Write the precompute-city-data.js script (Phase 1)
3. **Next week:** Simplify profile template to use precomputed data (Phase 2)
4. **Result:** 7-10 minute builds with zero platform dependency

This gets you off Vercel/Netlify entirely, removes all timeout concerns, and makes the build fast enough to run on any machine.
