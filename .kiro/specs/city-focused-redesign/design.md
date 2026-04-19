# Design Document: City-Focused VetList Redesign

## Overview

This design transforms VetList from 30,000+ profile pages to ~500 city pages with rich filtering, card-based layouts, and better UX. The design leverages the existing Astro build system and fast data caching to maintain sub-1-minute build times while dramatically improving user experience.

## Architecture

### High-Level Flow

```
User visits city page
    ↓
Static city page loads (Astro SSG)
    ↓
Display all vet cards (claimed first, then by rating)
    ↓
Client-side filters activate (no page reload)
    ↓
Map loads (lazy, optional)
    ↓
User clicks action buttons (call, directions, website)
```

### Build Process Changes

**Current (30K+ pages):**
- Generate profile pages: `[country]/[region]/[city]/[profile].astro`
- Generate city pages: `[country]/[region]/[city]/index.astro`
- Build time: ~8-10 minutes

**New (~500 pages):**
- ❌ Delete profile page template
- ✅ Enhance city page template only
- ✅ Add 301 redirects from profiles → cities
- Build time: **~1 minute** (estimated)

## Components and Interfaces

### 1. Enhanced City Page (`[city]/index.astro`)

**Layout Structure:**
```
┌─────────────────────────────────────┐
│ Header (existing)                   │
├─────────────────────────────────────┤
│ Breadcrumbs                         │
├─────────────────────────────────────┤
│ Hero Section (collapsible)          │
│ - City name                         │
│ - Vet count                         │
├─────────────────────────────────────┤
│ Filter Bar (sticky)                 │
│ [🟢 Open Now] [🚑 Emergency]        │
│ [🐕 Dogs] [🐈 Cats] [More...]       │
├─────────────────────────────────────┤
│ Map (collapsible, lazy load)        │
├─────────────────────────────────────┤
│ Vet Cards Grid (3 cols desktop)     │
│ ┌──────┐ ┌──────┐ ┌──────┐         │
│ │Card 1│ │Card 2│ │Card 3│         │
│ └──────┘ └──────┘ └──────┘         │
│ (Claimed listings first)            │
├─────────────────────────────────────┤
│ More Clinics (simplified list)      │
├─────────────────────────────────────┤
│ Nearby Cities                       │
├─────────────────────────────────────┤
│ Footer (existing)                   │
└─────────────────────────────────────┘
```

### 2. Vet Card Component

**New Component:** `src/components/VetCard.astro`

```astro
---
interface Props {
  name: string;
  address: string;
  phone: string;
  website?: string;
  hours: object;
  services: string[];
  animals: string[];
  specialties: string[];
  rating?: number;
  claimed: boolean;
  slug: string;
}
---

<div class="vet-card" id={slug}>
  <!-- Verified badge if claimed -->
  {claimed && <VerifiedBadge />}
  
  <!-- Name & Rating -->
  <h3>{name}</h3>
  {rating && <StarRating value={rating} />}
  
  <!-- Contact Info -->
  <div class="contact">
    <Icon name="phone" /> {phone}
    <Icon name="location" /> {streetAddress}
    {website && <Icon name="globe" /> {website}}
  </div>
  
  <!-- Open Now Status -->
  <OpenNowIndicator hours={hours} />
  
  <!-- Services (max 6 with icons) -->
  <div class="services">
    {services.slice(0, 6).map(s => (
      <span><Icon name={serviceIcon(s)} /> {s}</span>
    ))}
  </div>
  
  <!-- Animals (icons only) -->
  <div class="animals">
    {animals.map(a => <span title={a}>{animalEmoji(a)}</span>)}
  </div>
  
  <!-- Specialties (max 5) -->
  {specialties.length > 0 && (
    <ul class="specialties">
      {specialties.slice(0, 5).map(s => <li>{s}</li>)}
    </ul>
  )}
  
  <!-- Action Buttons -->
  <div class="actions">
    <a href={`tel:${phone}`} class="btn-primary">📞 Call Now</a>
    <a href={`https://maps.google.com/?q=${address}`} class="btn-secondary">🗺️ Directions</a>
    {website && <a href={website} class="btn-secondary">🌐 Website</a>}
  </div>
  
  <!-- Claim/Report Links -->
  <div class="meta-actions">
    <a href={`/claim-clinic?vet=${slug}`}>🏷️ Claim</a>
    <a href={`/report?vet=${slug}`}>⚠️ Report</a>
  </div>
</div>
```

### 3. Filter & Search System Component

**New Component:** `src/components/VetFilters.astro`

```astro
<div class="filter-search-bar sticky top-0 z-40 bg-white shadow-md">
  <div class="container">
    <!-- Search Box -->
    <div class="search-box">
      <input 
        type="text" 
        id="vetSearch" 
        placeholder="🔍 Search by name, address, or services..."
        class="search-input"
      />
      <span class="search-results-count" id="resultsCount"></span>
    </div>
    
    <!-- Quick Filters -->
    <div class="quick-filters">
      <!-- Status Filters -->
      <div class="filter-group">
        <span class="filter-label">Status:</span>
        <button data-filter="open-now" data-filter-type="status">🟢 Open Now</button>
        <button data-filter="emergency" data-filter-type="status">🚑 24/7</button>
      </div>
      
      <!-- Animal Filters -->
      <div class="filter-group">
        <span class="filter-label">Animals:</span>
        <button data-filter="dogs" data-filter-type="animal">🐕 Dogs</button>
        <button data-filter="cats" data-filter-type="animal">🐈 Cats</button>
        <button data-filter="horses" data-filter-type="animal">🐴 Horses</button>
        <button data-filter="exotic" data-filter-type="animal">🦎 Exotic</button>
        <button data-filter="birds" data-filter-type="animal">🐦 Birds</button>
        <button data-filter="small_animals" data-filter-type="animal">🐹 Small</button>
      </div>
      
      <!-- Service Filters (Expandable) -->
      <div class="filter-group">
        <span class="filter-label">Services:</span>
        <button data-filter="surgery" data-filter-type="service">💉 Surgery</button>
        <button data-filter="dental" data-filter-type="service">🦷 Dental</button>
        <button data-filter="boarding" data-filter-type="service">🛏️ Boarding</button>
        <button class="more-filters-btn" id="moreFiltersBtn">+ More</button>
      </div>
      
      <!-- Clear All -->
      <button class="clear-all-btn" id="clearAllBtn" style="display: none;">✕ Clear All</button>
    </div>
    
    <!-- Expanded Filters (Hidden by default) -->
    <div class="expanded-filters hidden" id="expandedFilters">
      <div class="filter-group">
        <span class="filter-label">More Services:</span>
        <button data-filter="emergency-care" data-filter-type="service">🚑 Emergency</button>
        <button data-filter="grooming" data-filter-type="service">🛁 Grooming</button>
        <button data-filter="ultrasound" data-filter-type="service">🔬 Ultrasound</button>
        <button data-filter="spay-neuter" data-filter-type="service">💉 Spay/Neuter</button>
        <button data-filter="vaccinations" data-filter-type="service">💉 Vaccines</button>
        <button data-filter="euthanasia" data-filter-type="service">💔 Euthanasia</button>
      </div>
    </div>
  </div>
</div>

<script>
  // Combined search and filter logic
  const filters = new Set();
  let searchQuery = '';
  
  // Search functionality
  const searchInput = document.getElementById('vetSearch');
  const resultsCount = document.getElementById('resultsCount');
  
  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value.toLowerCase();
    applyFiltersAndSearch();
  });
  
  // Filter functionality
  document.querySelectorAll('[data-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      const filter = btn.dataset.filter;
      if (filters.has(filter)) {
        filters.delete(filter);
        btn.classList.remove('active');
      } else {
        filters.add(filter);
        btn.classList.add('active');
      }
      
      // Show/hide clear all button
      document.getElementById('clearAllBtn').style.display = 
        filters.size > 0 || searchQuery ? 'inline-block' : 'none';
      
      applyFiltersAndSearch();
    });
  });
  
  // Clear all
  document.getElementById('clearAllBtn').addEventListener('click', () => {
    filters.clear();
    searchQuery = '';
    searchInput.value = '';
    document.querySelectorAll('[data-filter]').forEach(btn => {
      btn.classList.remove('active');
    });
    document.getElementById('clearAllBtn').style.display = 'none';
    applyFiltersAndSearch();
  });
  
  // More filters toggle
  document.getElementById('moreFiltersBtn').addEventListener('click', () => {
    const expanded = document.getElementById('expandedFilters');
    expanded.classList.toggle('hidden');
  });
  
  // Combined filter and search logic
  function applyFiltersAndSearch() {
    const cards = document.querySelectorAll('.vet-card');
    let visibleCount = 0;
    
    cards.forEach(card => {
      // Check filters
      const matchesFilters = Array.from(filters).every(f => {
        const filterType = document.querySelector(`[data-filter="${f}"]`).dataset.filterType;
        if (filterType === 'animal') {
          return card.dataset.animals?.includes(f);
        } else if (filterType === 'service') {
          return card.dataset.services?.includes(f);
        } else if (filterType === 'status') {
          return card.dataset[f] === 'true';
        }
        return true;
      });
      
      // Check search query
      const matchesSearch = !searchQuery || 
        card.dataset.searchText?.toLowerCase().includes(searchQuery);
      
      // Show/hide card
      const isVisible = (matchesFilters || filters.size === 0) && matchesSearch;
      card.style.display = isVisible ? 'block' : 'none';
      
      if (isVisible) visibleCount++;
    });
    
    // Update results count
    resultsCount.textContent = `${visibleCount} clinic${visibleCount !== 1 ? 's' : ''}`;
  }
</script>

<style>
  .filter-search-bar {
    padding: 1rem 0;
    border-bottom: 1px solid #e5e7eb;
  }
  
  .search-box {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1rem;
  }
  
  .search-input {
    flex: 1;
    padding: 0.75rem 1rem;
    border: 2px solid #e5e7eb;
    border-radius: 0.5rem;
    font-size: 1rem;
    transition: border-color 0.2s;
  }
  
  .search-input:focus {
    outline: none;
    border-color: #3b82f6;
  }
  
  .search-results-count {
    font-size: 0.875rem;
    color: #6b7280;
    white-space: nowrap;
  }
  
  .quick-filters {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    align-items: center;
  }
  
  .filter-group {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  
  .filter-label {
    font-size: 0.875rem;
    font-weight: 600;
    color: #374151;
  }
  
  .filter-group button {
    padding: 0.5rem 1rem;
    border: 1px solid #e5e7eb;
    border-radius: 9999px;
    background: white;
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .filter-group button:hover {
    background: #f3f4f6;
  }
  
  .filter-group button.active {
    background: #3b82f6;
    color: white;
    border-color: #3b82f6;
  }
  
  .clear-all-btn {
    padding: 0.5rem 1rem;
    background: #ef4444;
    color: white;
    border: none;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
  }
  
  .expanded-filters {
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid #e5e7eb;
  }
  
  .hidden {
    display: none;
  }
</style>
```

### 4. Open Now Calculator

**New Utility:** `src/lib/openNowCalculator.ts`

```typescript
export function isOpenNow(hours: Record<string, string[]>): {
  isOpen: boolean;
  status: string;
  nextChange?: string;
} {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const currentTime = now.getHours() * 60 + now.getMinutes();
  
  // Convert day number to hours object key (1-7 or day names)
  const todayHours = hours[dayOfWeek.toString()] || hours[getDayName(dayOfWeek)];
  
  if (!todayHours || todayHours.length === 0) {
    return { isOpen: false, status: 'Closed' };
  }
  
  // Check if current time falls within any time range
  for (const range of todayHours) {
    const [open, close] = range.split('-').map(parseTime);
    if (currentTime >= open && currentTime < close) {
      return { 
        isOpen: true, 
        status: 'Open Now',
        nextChange: `Closes at ${formatTime(close)}`
      };
    }
  }
  
  return { isOpen: false, status: 'Closed' };
}

function parseTime(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

function formatTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
  return `${displayHours}:${mins.toString().padStart(2, '0')} ${period}`;
}

function getDayName(day: number): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[day];
}
```

### 5. Map Component (OpenStreetMap/Leaflet)

**New Component:** `src/components/VetMap.astro`

```astro
---
interface Props {
  vets: Array<{
    name: string;
    address: string;
    phone: string;
    latitude: number;
    longitude: number;
    isOpen: boolean;
    claimed: boolean;
    slug: string;
  }>;
  cityCenter: { lat: number; lng: number };
}
---

<div class="map-container">
  <button class="map-toggle" id="mapToggle">
    <span class="show-map">🗺️ Show Map</span>
    <span class="hide-map hidden">✕ Hide Map</span>
  </button>
  
  <div id="vetMap" class="hidden" style="height: 400px;"></div>
</div>

<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>

<script define:vars={{ vets, cityCenter }}>
  let map = null;
  
  document.getElementById('mapToggle').addEventListener('click', () => {
    const mapEl = document.getElementById('vetMap');
    const showText = document.querySelector('.show-map');
    const hideText = document.querySelector('.hide-map');
    
    if (mapEl.classList.contains('hidden')) {
      // Show map
      mapEl.classList.remove('hidden');
      showText.classList.add('hidden');
      hideText.classList.remove('hidden');
      
      // Initialize map if not already done
      if (!map) {
        map = L.map('vetMap').setView([cityCenter.lat, cityCenter.lng], 12);
        
        // Use OpenStreetMap tiles (free!)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 19
        }).addTo(map);
        
        // Add markers for each vet
        vets.forEach(vet => {
          if (vet.latitude && vet.longitude) {
            // Color code markers
            const markerColor = vet.claimed ? 'gold' : vet.isOpen ? 'green' : 'red';
            
            const marker = L.circleMarker([vet.latitude, vet.longitude], {
              radius: 8,
              fillColor: markerColor,
              color: '#fff',
              weight: 2,
              opacity: 1,
              fillOpacity: 0.8
            }).addTo(map);
            
            // Popup with clinic info
            marker.bindPopup(`
              <div class="map-popup">
                <strong>${vet.name}</strong><br>
                ${vet.address}<br>
                ${vet.phone ? `📞 ${vet.phone}<br>` : ''}
                <a href="#${vet.slug}" onclick="document.getElementById('${vet.slug}').scrollIntoView({behavior:'smooth'})">
                  View Details →
                </a>
              </div>
            `);
          }
        });
      }
    } else {
      // Hide map
      mapEl.classList.add('hidden');
      showText.classList.remove('hidden');
      hideText.classList.add('hidden');
    }
  });
</script>

<style>
  .map-container {
    margin: 2rem 0;
  }
  
  .map-toggle {
    width: 100%;
    padding: 1rem;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    border-radius: 0.5rem;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: transform 0.2s;
  }
  
  .map-toggle:hover {
    transform: translateY(-2px);
  }
  
  #vetMap {
    border-radius: 0.75rem;
    margin-top: 1rem;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  }
  
  .map-popup {
    font-size: 14px;
    line-height: 1.6;
  }
  
  .map-popup strong {
    font-size: 15px;
    color: #1F2937;
  }
  
  .map-popup a {
    color: #3B82F6;
    text-decoration: none;
    font-weight: 600;
  }
  
  .map-popup a:hover {
    text-decoration: underline;
  }
</style>
```

### 6. Service & Animal Parser

**New Utility:** `src/lib/dataParser.ts`

```typescript
// Service mapping with icons
const SERVICE_MAP = {
  'Emergency Care': { icon: '🚑', category: 'emergency' },
  '24/7 Emergency': { icon: '🚑', category: 'emergency' },
  'Surgery': { icon: '💉', category: 'surgery' },
  'Pet Surgery': { icon: '💉', category: 'surgery' },
  'Dental': { icon: '🦷', category: 'dental' },
  'Pet Dental Care': { icon: '🦷', category: 'dental' },
  'Teeth Cleaning': { icon: '🦷', category: 'dental' },
  'Diagnostics': { icon: '🔬', category: 'diagnostics' },
  'Lab Testing': { icon: '🔬', category: 'diagnostics' },
  'Ultrasound': { icon: '🔬', category: 'diagnostics' },
  'House Calls': { icon: '🏠', category: 'house-calls' },
  'Mobile': { icon: '🏠', category: 'house-calls' },
  'Virtual Visits': { icon: '📹', category: 'virtual' },
  'Telemedicine': { icon: '📹', category: 'virtual' },
  'Boarding': { icon: '🛏️', category: 'boarding' },
  'Grooming': { icon: '🛁', category: 'grooming' },
  'Euthanasia': { icon: '💔', category: 'euthanasia' },
  'Wellness Exams': { icon: '🩺', category: 'wellness' },
  'Spay & Neuter': { icon: '💉', category: 'surgery' },
};

// Animal mapping with emojis
const ANIMAL_MAP = {
  'Dog': '🐕',
  'Cat': '🐈',
  'Horse': '🐴',
  'Equine': '🐴',
  'Exotic': '🦎',
  'Reptile': '🦎',
  'Bird': '🐦',
  'Avian': '🐦',
  'Fish': '🐠',
  'Aquatic': '🐠',
  'Small Animal': '🐹',
  'Rabbit': '🐰',
  'Farm Animal': '🐷',
  'Cattle': '🐄',
};

export function parseServices(specializations: string[]): {
  services: Array<{ name: string; icon: string; category: string }>;
  animals: Array<{ name: string; emoji: string }>;
} {
  const services = [];
  const animals = [];
  
  for (const spec of specializations) {
    // Check if it's a service
    for (const [key, value] of Object.entries(SERVICE_MAP)) {
      if (spec.includes(key)) {
        services.push({ name: key, ...value });
        break;
      }
    }
    
    // Check if it mentions an animal
    for (const [key, emoji] of Object.entries(ANIMAL_MAP)) {
      if (spec.includes(key)) {
        animals.push({ name: key, emoji });
        break;
      }
    }
  }
  
  // Deduplicate
  return {
    services: Array.from(new Map(services.map(s => [s.category, s])).values()),
    animals: Array.from(new Map(animals.map(a => [a.name, a])).values()),
  };
}
```

## Data Models

### Enhanced Profile Data Structure

```typescript
interface VetProfile {
  // Existing fields
  id: string;
  name: string;
  hours_of_operation: Record<string, string[]>;
  specialization: string[];
  picture?: string;
  country: string;
  province: string;
  city: string;
  phone_number?: string;
  email_address?: string;
  address?: string;
  website?: string;
  latitude?: number;
  longitude?: number;
  rating?: number;
  claimed: boolean;
  
  // Computed fields (derived from specialization)
  services?: Array<{ name: string; icon: string; category: string }>;
  animals?: Array<{ name: string; emoji: string }>;
  isOpenNow?: boolean;
  openStatus?: string;
}
```

### Filter State

```typescript
interface FilterState {
  status: Set<'open-now' | 'emergency' | 'new-patients'>;
  services: Set<'house-calls' | 'virtual' | 'surgery' | 'dental' | 'boarding'>;
  animals: Set<'dogs' | 'cats' | 'horses' | 'exotic' | 'birds'>;
}
```

## Error Handling

### Missing Data Handling

1. **No phone number**: Show "Contact via website" button only
2. **No address**: Hide "Get Directions" button
3. **No hours**: Show "Hours not available" instead of open/closed status
4. **No services**: Show "General veterinary care" as default
5. **No animals**: Show "All animals" as default

### Build-Time Validation

```typescript
// In getStaticPaths()
const validProfiles = profiles.filter(p => {
  // Must have essential data
  return p.name && 
         p.city && 
         (p.phone_number || p.website || p.address) &&
         p.name_slug;
});
```

## Testing Strategy

### Manual Testing Checklist

1. **City Page Load**
   - [ ] Page loads in < 2 seconds
   - [ ] All vet cards display correctly
   - [ ] Claimed listings appear first
   - [ ] Map loads (if enabled)

2. **Filters**
   - [ ] Clicking filter toggles active state
   - [ ] Multiple filters work together (AND logic)
   - [ ] Clear all resets filters
   - [ ] Filter bar stays sticky on scroll

3. **Vet Cards**
   - [ ] Phone links work (tel:)
   - [ ] Directions links open Google Maps
   - [ ] Website links open in new tab
   - [ ] Verified badge shows for claimed listings
   - [ ] Open/closed status is accurate

4. **Mobile**
   - [ ] Cards stack in single column
   - [ ] Filters are accessible (scroll or collapse)
   - [ ] Action buttons are tappable (44px min)
   - [ ] Map is responsive

5. **Redirects**
   - [ ] Profile URLs redirect to city page
   - [ ] Anchor links scroll to correct card
   - [ ] 301 status code is returned

### Performance Testing

```bash
# Build time test
time npm run build

# Expected: < 90 seconds for ~500 city pages

# Page size test
ls -lh dist/canada/ontario/toronto/index.html

# Expected: < 200KB per city page
```

## Deployment Strategy

### Phase 1: Preparation (Day 1)
1. ✅ Clean CSV data (DONE)
2. Create new components (VetCard, VetFilters)
3. Update city page template
4. Test on 5 sample cities

### Phase 2: Build & Test (Day 2)
1. Run full build
2. Verify build time < 2 minutes
3. Test filters on multiple cities
4. Check mobile responsiveness
5. Validate schema with Google Rich Results Test

### Phase 3: Redirects (Day 3)
1. Configure 301 redirects in vercel.json
2. Test sample profile URLs redirect correctly
3. Verify anchor links work

### Phase 4: Deploy (Day 4)
1. Deploy to Vercel
2. Submit new sitemap to Google Search Console
3. Monitor for errors in first 24 hours
4. Request re-indexing for top 50 city pages

## Performance Optimizations

### Build Performance (BLAZING FAST 🔥)
- ✅ Removed AI slop columns (3 columns × 28K rows = ~70% file size reduction)
- ✅ Eliminated 25K+ profile pages (30K → 500 pages = 98% fewer pages)
- Use existing data caching system
- Static generation only (no SSR overhead)
- **Target: < 60 seconds build time** (down from 8-10 minutes)

### Runtime Performance (INSTANT ⚡)
- **Zero JavaScript for initial render** - pure HTML/CSS
- Client-side filtering with vanilla JS (no framework overhead)
- Lazy load map only when user clicks "Show Map"
- SVG icons (inline, no HTTP requests)
- No external fonts (system fonts only)
- No images (emoji icons instead)
- **Target: < 1 second page load on 3G**

### Additional Speed Optimizations
1. **Inline critical CSS** - no render-blocking stylesheets
2. **Preconnect to OpenStreetMap** - faster map tiles
3. **Defer non-critical scripts** - filters load after content
4. **Minimize DOM nodes** - efficient card structure
5. **Use CSS Grid** - hardware-accelerated layout
6. **Compress HTML** - Astro's built-in minification

### SEO Performance
- Proper schema markup (ItemList + VeterinaryCare)
- Canonical URLs with trailing slashes
- Meta tags optimized for city pages
- Internal linking to nearby cities
- **Faster pages = better rankings** 📈

### Additional Useful Features

#### 1. Quick Stats Bar
Show at-a-glance city statistics:
```
┌─────────────────────────────────────────────┐
│ 47 Vets | 12 Open Now | 8 24/7 Emergency   │
│ 23 Accept Dogs | 19 Accept Cats | 5 Exotic │
└─────────────────────────────────────────────┘
```

#### 2. Sort Options
```
Sort by: [Recommended ▼] [Open Now] [Rating] [A-Z]
```
- Recommended = Claimed first, then rating
- Open Now = Currently open clinics first
- Rating = Highest rated first
- A-Z = Alphabetical

#### 3. Distance Calculator (if user allows location)
```
📍 2.3 miles away
```
Show distance from user's location to each clinic

#### 4. Emergency Banner
If user searches at night or weekends:
```
┌─────────────────────────────────────────────┐
│ 🚑 Need emergency care? 3 clinics open 24/7 │
│ [Show Emergency Clinics Only]               │
└─────────────────────────────────────────────┘
```

#### 5. On-Page Search (City Pages)
Fast, client-side search within the current city:
```
┌─────────────────────────────────────────────┐
│ 🔍 Search clinics on this page...          │
│ (Search by name, address, or services)     │
└─────────────────────────────────────────────┘
```
- Instant results (no page reload)
- Searches name, address, services, specialties
- Works with filters (AND logic)
- Highlights matching text

#### 6. AI Search Integration (Homepage & City Pages)
Keep the existing AI search but enhance it:

**Homepage:** 
- Existing AI search stays as-is
- Answers questions about vets
- Links to relevant city pages

**City Pages:**
- Smaller AI search widget in sidebar
- Context-aware: "Ask about vets in [City]"
- Can answer: "Which vets are open now?", "Who does exotic pets?", etc.
- Provides direct answers + highlights matching cards

## Migration Notes

### Breaking Changes
- Profile page URLs will 301 redirect
- No more individual profile pages
- Claim form needs to work from city page context

### Backward Compatibility
- Existing claimed listings still show verified badge
- CRM system continues to work (updates claimed field)
- Sitemap generation updated to exclude profiles

### Rollback Plan
If issues arise:
1. Revert to previous commit
2. Restore profile page template
3. Remove redirect rules
4. Rebuild and redeploy

Estimated rollback time: 15 minutes
