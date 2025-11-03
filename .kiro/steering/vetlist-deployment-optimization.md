# VetList.org Deployment & Optimization Guide

This steering document provides essential guidelines for deploying new directories, maintaining site optimization, and avoiding common issues with the VetList.org Astro project.

## 🚀 Build & Deployment Commands

### Development Workflow
```bash
# ✅ CORRECT: Use these commands
npm run build              # Full production build (8GB memory allocation)
npm run build:fast         # Fast development build (100 profiles max)
npm run preview            # Preview built site locally
npm run clear-cache        # Clear data cache when needed

# ❌ NEVER USE: These will hang/block execution
npm run dev                # Hangs and causes issues
npm start                  # Same as npm run dev
```

### Build Types
- **Fast Build** (`npm run build:fast`): 1 CSV file, 100 profiles max, ~80% faster
- **Full Build** (`npm run build`): All 10 CSV files, all profiles, production-ready
- **Memory**: Builds use `--max-old-space-size=8192` for large datasets (35k+ pages)

## 🔧 Critical Technical Requirements

### URL Structure & SEO
- **Trailing Slashes**: ALWAYS enforced (`trailingSlash: 'always'` in astro.config.mjs)
- **Canonical URLs**: Must include trailing slashes to match actual URLs
- **Internal Links**: All links must end with `/` for consistency
- **Breadcrumbs**: Must generate URLs with trailing slashes

### Content Quality Standards
Only generate pages for profiles meeting these criteria:
- Description > 50 characters
- Contact info (phone/website/email)
- Address > 10 characters
- Business hours (preferred)
- Service specializations (preferred)
- Minimum quality score: 3/7 points

### Schema.org Requirements
All pages must include proper structured data:
- **Profiles**: VeterinaryCare schema with geo coordinates, services, hours
- **Cities**: ItemList schema for local business listings
- **Homepage**: Organization schema with sitelinks search box
- **Breadcrumbs**: BreadcrumbList schema for navigation

## 📊 Performance Optimization

### Data Loading Strategy
- Use data caching (`.astro/data-cache.json`) for faster builds
- Fast builds: Load only first CSV file with 100 profiles
- Production builds: Load all CSV files with full dataset
- Clear cache when CSV data is updated

### Bundle Optimization
- Minimize JavaScript: Remove unused Algolia integrations on location pages
- CSS optimization: Eliminate duplicate rules and unnecessary animations
- Deferred loading: Analytics and non-critical resources load after interaction
- Font strategy: Use fallbacks and async loading

## 🎯 SEO Best Practices

### Indexing Strategy
- **Quality over Quantity**: Better 15k indexed pages than 50k ignored ones
- **Noindex Low Quality**: Add `noindex` meta tag for profiles with quality score < 4
- **Sitemap Priority**: Homepage (1.0), Countries (0.9), Regions (0.8), Cities (0.7), Profiles (0.6)
- **Robots.txt**: Include crawl delay and prioritize important sections

### Rich Snippets Implementation
- **Phone Numbers**: Use `tel:` links for clickable call buttons ✅
- **Business Hours**: Proper OpeningHoursSpecification schema
- **Ratings**: AggregateRating schema when available
- **Location**: Geo coordinates and service area definitions
- **Services**: Medical specialty and service offer schemas

### Meta Tags Requirements
```html
<!-- Geo targeting for location pages -->
<meta name="geo.region" content="US-TX">
<meta name="geo.placename" content="Dallas">
<meta name="geo.position" content="32.7767;-96.7970">

<!-- Business Open Graph -->
<meta property="business:contact_data:street_address" content="123 Main St">
<meta property="business:contact_data:locality" content="Dallas">
<meta property="business:contact_data:phone_number" content="+1-555-123-4567">
```

## 🚨 Common Issues & Solutions

### Indexing Problems
**Symptoms**: "Crawled - currently not indexed" errors, low indexing rates
**Causes**: Canonical URL mismatch, too many low-quality pages, URL inconsistency
**Solutions**: 
- Ensure canonical URLs match actual URLs (with trailing slashes)
- Implement content quality filtering
- Add noindex to thin content pages
- Submit updated sitemap after fixes

### Build Performance Issues
**Symptoms**: Slow builds, memory errors, timeouts
**Solutions**:
- Use `npm run build:fast` for development
- Clear cache with `npm run clear-cache` if builds are inconsistent
- Monitor memory usage (builds need 8GB allocation)
- Use data caching for faster subsequent builds

### URL Structure Problems
**Symptoms**: Redirect errors, duplicate content issues
**Solutions**:
- Verify `trailingSlash: 'always'` in astro.config.mjs
- Check Vercel config has `"trailingSlash": true`
- Ensure all internal links end with `/`
- Update breadcrumb generation to include trailing slashes

## 📁 File Structure Guidelines

### Critical Files to Monitor
- `src/layouts/Layout.astro`: Canonical URL generation, meta tags
- `src/components/Breadcrumbs.astro`: URL consistency
- `src/pages/[country]/[region]/[city]/[profile].astro`: Quality filtering
- `astro.config.mjs`: Trailing slash enforcement, sitemap config
- `vercel.json`: Deployment configuration
- `data/professionals.csv`: Source data quality

### Data Management
- **CSV Updates**: Clear cache after data changes
- **Profile Removal**: Use removal script to maintain database integrity
- **Quality Control**: Validate CSV structure before deployment

## 🔍 Testing & Validation

### Pre-Deployment Checklist
- [ ] Run `npm run build` successfully
- [ ] Test canonical URLs include trailing slashes
- [ ] Validate schema.org markup with Google Rich Results Test
- [ ] Check internal links for consistency
- [ ] Verify no JavaScript errors in console
- [ ] Test mobile responsiveness

### Post-Deployment Monitoring
- [ ] Submit updated sitemap to Google Search Console
- [ ] Monitor "Alternative page with proper canonical tag" errors
- [ ] Track indexing improvements in Coverage report
- [ ] Verify rich snippets appear in search results
- [ ] Monitor Core Web Vitals performance

### Validation Tools
- Google Rich Results Test: https://search.google.com/test/rich-results
- Schema.org Validator: https://validator.schema.org/
- Google Search Console: Coverage and Performance reports
- URL Inspection Tool: Verify canonical URLs and indexing status

## 🎯 Deployment Strategy

### New Directory Setup
1. **Data Preparation**: Ensure CSV data meets quality standards
2. **Build Testing**: Run fast build first, then full build
3. **Schema Validation**: Test structured data implementation
4. **SEO Verification**: Check canonical URLs and meta tags
5. **Performance Testing**: Monitor build times and memory usage
6. **Gradual Rollout**: Deploy to staging first, then production

### Environment Variables
```bash
# Algolia Search (required)
ALGOLIA_APP_ID=G13RPGTX1B
ALGOLIA_SEARCH_KEY=3733aa7e0b81cfc61dc8e4122fe93c6a
ALGOLIA_INDEX_NAME=vetlist_locations

# Build Optimization
FAST_BUILD=true                    # Enable fast build mode
MAX_PROFILES_PER_BUILD=100         # Limit profiles in fast mode
DISABLE_DATA_CACHE=false           # Enable caching
NODE_ENV=production                # Force production mode
```

## 📈 Success Metrics

### Technical Performance
- Build time: <60 seconds (fast), <10 minutes (full)
- Memory usage: <8GB during build
- Page generation: 35k+ pages successfully
- JavaScript errors: 0 in console

### SEO Performance
- Indexed pages: >80% of quality content
- Canonical errors: <100 (down from 1,701)
- Rich snippets: Phone, hours, ratings visible
- Core Web Vitals: All metrics in green

### User Experience
- Phone click-through rate: +20-40%
- Search result CTR: +15-30%
- Page load speed: <3 seconds
- Mobile usability: 100% score

## 🛠️ Emergency Procedures

### Build Failures
1. Check memory allocation (increase if needed)
2. Clear data cache: `npm run clear-cache`
3. Validate CSV data structure
4. Check for JavaScript syntax errors
5. Revert to last known good build

### Indexing Issues
1. Verify canonical URL consistency
2. Check for URL structure changes
3. Submit updated sitemap immediately
4. Request indexing for critical pages
5. Monitor Search Console for error patterns

### Performance Degradation
1. Switch to fast build mode for development
2. Check for data cache corruption
3. Monitor memory usage during builds
4. Validate CSV data hasn't grown unexpectedly
5. Consider implementing additional quality filters

---

*This document should be updated whenever new optimization strategies are discovered or deployment procedures change.*