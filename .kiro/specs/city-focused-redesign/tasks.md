# Implementation Plan: City-Focused VetList Redesign

## Overview
Transform VetList from 30K+ profile pages to ~500 city pages with enhanced filtering, search, and card-based layout. Build time target: < 60 seconds.

---

## Tasks

- [x] 1. Update data loading to use enhanced CSV structure
  - Update `src/lib/dataCache.js` to read `animals_treated` column
  - Parse `animals_treated` JSON array for each profile
  - Ensure specializations are parsed as cleaned/standardized values
  - _Requirements: 1.2, 1.3, 1.4_

- [x] 2. Create utility functions for data processing
- [x] 2.1 Create Open Now calculator
  - Implement `src/lib/openNowCalculator.ts` with `isOpenNow()` function
  - Parse hours_of_operation JSON to check current time
  - Return status object with `isOpen`, `status`, and `nextChange` fields
  - Handle edge cases (closed all day, 24/7, split hours)
  - _Requirements: 2.6, 3.2_

- [x] 2.2 Create service/animal icon mapper
  - Implement `src/lib/iconMapper.ts` with service and animal emoji mappings
  - Map standardized service names to emoji icons (🚑 💉 🦷 🔬 🏠 📹)
  - Map animal types to emoji icons (🐕 🐈 🐴 🦎 🐹 🐦 🐠)
  - Export helper functions `getServiceIcon()` and `getAnimalEmoji()`
  - _Requirements: 1.3, 1.4, 3.3, 3.4_


- [x] 3. Create VetCard component
- [x] 3.1 Build card layout structure
  - Create `src/components/VetCard.astro` with props interface
  - Implement card HTML structure (name, contact, hours, services, animals, actions)
  - Add verified badge for claimed listings
  - Include data attributes for filtering (data-animals, data-services, data-open-now, data-search-text)
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8_

- [x] 3.2 Style the vet card
  - Add Tailwind CSS classes for responsive card layout
  - Style verified badge with green gradient and shield icon
  - Implement hover effects and transitions
  - Ensure mobile responsiveness (single column on mobile)
  - _Requirements: 2.1, 3.1, 8.1_

- [x] 4. Create filter and search system
- [x] 4.1 Build filter bar component
  - Create `src/components/VetFilters.astro` with search input and filter buttons
  - Implement sticky positioning (stays at top on scroll)
  - Add status filters (Open Now, 24/7 Emergency)
  - Add animal filters (Dogs, Cats, Horses, Exotic, Birds, Small Animals)
  - Add service filters (Surgery, Dental, Boarding, + More expandable)
  - Include results count display and Clear All button
  - _Requirements: 2.7, 4.1, 4.2, 4.3, 4.7_

- [x] 4.2 Implement client-side filtering logic
  - Add JavaScript for filter button click handlers
  - Implement multi-select filter logic with AND operation
  - Show/hide vet cards based on active filters
  - Update results count dynamically
  - Toggle Clear All button visibility
  - _Requirements: 4.4, 4.5, 4.6_

- [x] 4.3 Implement client-side search
  - Add search input event listener
  - Filter cards by search query (name, address, services, specialties)
  - Combine search with filters (both must match)
  - Update results count to reflect search + filters
  - _Requirements: 2.7, 4.4, 4.5_


- [x] 5. Create map component with OpenStreetMap
- [x] 5.1 Build map component structure
  - Create `src/components/VetMap.astro` with Leaflet integration
  - Add toggle button to show/hide map
  - Load Leaflet CSS and JS from CDN
  - Initialize map with city center coordinates
  - Add OpenStreetMap tile layer (free, no API key)
  - _Requirements: 9.1, 9.6_

- [x] 5.2 Add markers and popups
  - Create circle markers for each vet with lat/long
  - Color-code markers (gold=verified, green=open, red=closed)
  - Add popup with clinic name, address, phone, and "View Details" link
  - Implement click handler to scroll to corresponding card
  - _Requirements: 9.2, 9.3, 9.4_

- [x] 6. Enhance city page template
- [x] 6.1 Update city page layout
  - Modify `src/pages/[country]/[region]/[city]/index.astro`
  - Add VetFilters component at top (sticky)
  - Add VetMap component (collapsible)
  - Replace existing profile cards with new VetCard components
  - Sort profiles: claimed first, then by rating
  - Display first 36 cards in grid, remaining in simplified list
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.7_

- [x] 6.2 Add quick stats bar
  - Calculate and display total vet count
  - Count and display "Open Now" clinics
  - Count and display 24/7 emergency clinics
  - Count clinics by animal type (dogs, cats, exotic)
  - _Requirements: 2.1_

- [x] 6.3 Add sort options
  - Implement sort dropdown (Recommended, Open Now, Rating, A-Z)
  - Add client-side sort logic
  - Default to "Recommended" (claimed first, then rating)
  - _Requirements: 2.3_


- [x] 7. Update schema and SEO
- [x] 7.1 Fix city page schema
  - Update ItemList schema in city page template
  - Ensure VeterinaryCare items have complete address structure
  - Use numeric values for ratingCount and reviewCount (not strings)
  - Include only one time range per day in openingHoursSpecification
  - Add animals_treated and cleaned specializations to schema
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 7.2 Update meta tags
  - Optimize title tag for city pages
  - Write compelling meta description mentioning filters and features
  - Ensure canonical URLs have trailing slashes
  - Add Open Graph tags for social sharing
  - _Requirements: 6.5, 6.6_

- [x] 8. Eliminate profile pages and add redirects
- [x] 8.1 Remove profile page template
  - Delete `src/pages/[country]/[region]/[city]/[profile].astro`
  - Verify no other files reference this template
  - _Requirements: 5.5_

- [x] 8.2 Configure 301 redirects
  - Add redirect rules in `vercel.json` or `astro.config.mjs`
  - Redirect `/[country]/[region]/[city]/[profile]/` to `/[country]/[region]/[city]/#[profile]`
  - Use 301 (permanent) redirect status
  - Test with sample profile URLs
  - _Requirements: 5.1, 5.2_

- [x] 8.3 Update sitemap generation
  - Modify sitemap config to exclude profile page URLs
  - Include only city page URLs
  - Verify sitemap.xml is generated correctly
  - _Requirements: 5.3, 5.4_


- [x] 9. Update claim system integration
- [x] 9.1 Update claim form
  - Modify `src/pages/claim-clinic.astro` to accept vet slug from query param
  - Pre-populate form with clinic information from slug
  - Ensure form works when accessed from city page card
  - _Requirements: 7.1, 7.2_

- [x] 9.2 Ensure verified badge displays correctly
  - Verify claimed listings show verified badge on cards
  - Test badge styling and positioning
  - Ensure claimed listings sort to top of list
  - _Requirements: 7.3, 7.4_

- [x] 10. Performance optimization
- [x] 10.1 Optimize build process
  - Clear data cache before build: `npm run clear-cache`
  - Run full build: `npm run build`
  - Measure build time (target: < 60 seconds)
  - Verify ~500 city pages generated (not 30K+ profiles)
  - _Requirements: 10.1, 10.2_

- [x] 10.2 Optimize runtime performance
  - Ensure map loads only when toggled (lazy loading)
  - Verify filter/search JavaScript is minimal (< 50KB)
  - Test page load speed on 3G connection
  - Validate no render-blocking resources
  - _Requirements: 10.3, 10.4, 10.5_

- [x] 11. Mobile responsiveness
- [x] 11.1 Test mobile layout
  - Verify vet cards stack in single column on mobile
  - Test filter bar on mobile (horizontal scroll or collapse)
  - Ensure action buttons are tappable (44px minimum)
  - Test map on mobile (smaller size, expandable)
  - Verify search input is usable on mobile keyboards
  - _Requirements: 8.1, 8.2, 8.3, 8.4_


- [x] 12. Testing and validation
- [x] 12.1 Test city page functionality
  - Test filters work correctly (status, animals, services)
  - Test search finds clinics by name, address, services
  - Test combined search + filters
  - Test sort options change card order
  - Test map markers and popups
  - Test "View Details" scrolls to correct card
  - _Requirements: 2.7, 4.1-4.7, 9.1-9.6_

- [x] 12.2 Validate schema markup
  - Use Google Rich Results Test on sample city pages
  - Verify ItemList schema is valid
  - Verify VeterinaryCare items have no errors
  - Check that rating counts are numeric
  - Ensure opening hours have no conflicts
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 12.3 Test redirects
  - Test 5-10 sample profile URLs redirect to city pages
  - Verify 301 status code is returned
  - Test anchor links scroll to correct card
  - Verify no broken links
  - _Requirements: 5.1, 5.2_

- [ ] 13. Deployment
- [ ] 13.1 Deploy to Vercel
  - Run final build locally to verify
  - Commit all changes to git
  - Push to main branch
  - Verify Vercel deployment succeeds
  - Check build time in Vercel logs (should be < 2 minutes)
  - _Requirements: 10.1_

- [ ] 13.2 Post-deployment validation
  - Test 5 random city pages in production
  - Verify filters and search work
  - Test map loads correctly
  - Check mobile responsiveness
  - Validate schema with Google Rich Results Test
  - Submit updated sitemap to Google Search Console
  - _Requirements: 6.1, 6.6, 10.1_

---

## Notes

- No unit tests required (keep it fast and simple)
- Focus on core functionality and user experience
- Test manually on 3-5 sample cities during development
- Build time is critical - monitor throughout implementation
- Mobile testing is essential - use Chrome DevTools device emulation
