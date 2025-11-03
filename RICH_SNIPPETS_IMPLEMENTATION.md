# Rich Snippets Implementation Guide

## 🚀 Ready-to-Use Code Improvements

### 1. Enhanced Profile Schema (src/pages/[country]/[region]/[city]/[profile].astro)

Replace your existing schemaData object with this enhanced version:

```javascript
const schemaData = {
  "@context": "https://schema.org",
  "@type": "VeterinaryCare",
  "@id": canonicalURL.toString(),
  "name": profileData.name,
  "description": shortDescription,
  "url": canonicalURL.toString(),
  "telephone": profileData.phone_number || "",
  "image": imageUrl,
  
  // Enhanced address with proper formatting
  "address": {
    "@type": "PostalAddress",
    "streetAddress": addressComponents.streetAddress || profileData.address || "",
    "addressLocality": addressComponents.addressLocality || profileData.city || "",
    "addressRegion": addressComponents.addressRegion || "",
    "postalCode": addressComponents.postalCode || "",
    "addressCountry": addressComponents.addressCountry || ""
  },
  
  // Geo coordinates for map integration
  ...(profileData.latitude && profileData.longitude ? {
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": profileData.latitude,
      "longitude": profileData.longitude
    },
    "hasMap": `https://maps.google.com/?q=${profileData.latitude},${profileData.longitude}`
  } : {}),
  
  // Service area for local SEO
  "areaServed": {
    "@type": "City",
    "name": profileData.city,
    "containedInPlace": {
      "@type": "State",
      "name": profileData.province
    }
  },
  
  // Enhanced business info for rich snippets
  "priceRange": "$$",
  "currenciesAccepted": "USD, CAD",
  "paymentAccepted": ["Cash", "Credit Card", "Debit Card", "Pet Insurance"],
  
  // Opening hours with enhanced format
  ...(hoursData ? {
    "openingHoursSpecification": Object.entries(hoursData || {})
      .filter(([_, hours]) => hours && Array.isArray(hours) && hours.length > 0)
      .map(([day, hours]) => {
        return Array.isArray(hours) ? hours.map((timeRange) => {
          if (!timeRange || !timeRange.includes('-')) return null;
          const [opens, closes] = timeRange.split('-').map((t) => t.trim());
          return {
            "@type": "OpeningHoursSpecification",
            "dayOfWeek": `https://schema.org/${day}`,
            "opens": formatSchemaTime(opens),
            "closes": formatSchemaTime(closes)
          };
        }).filter(Boolean) : [];
      }).flat()
  } : {}),
  
  // Services offered for better categorization
  ...(Array.isArray(profileData.specialization) && profileData.specialization.length > 0 ? {
    "makesOffer": profileData.specialization.map((service) => ({
      "@type": "Offer",
      "itemOffered": {
        "@type": "Service",
        "name": service,
        "category": "Veterinary Care"
      }
    })),
    "medicalSpecialty": profileData.specialization
  } : {}),
  
  // Enhanced rating with review count
  ...(ratingData?.rating !== null ? {
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": ratingData.rating,
      "bestRating": "5",
      "worstRating": "1",
      "ratingCount": profileData.rating_count || "1",
      "reviewCount": profileData.review_count || profileData.rating_count || "1"
    }
  } : {}),
  
  // Contact points for better business info
  "contactPoint": [
    {
      "@type": "ContactPoint",
      "telephone": profileData.phone_number || "",
      "contactType": "customer service",
      "availableLanguage": ["English"]
    }
  ],
  
  // Same as relationship for franchise/chain vets
  ...(profileData.parent_organization ? {
    "parentOrganization": {
      "@type": "Organization",
      "name": profileData.parent_organization
    }
  } : {})
};
```

### 2. Add Geo Meta Tags to Profile Pages

Add this to the `<head>` section of profile pages:

```astro
<!-- Geo meta tags for local SEO -->
{profileData.latitude && profileData.longitude && (
  <>
    <meta name="geo.region" content={`${profileData.country_code || 'US'}-${profileData.province_code || profileData.province?.substring(0,2).toUpperCase()}`} slot="head" />
    <meta name="geo.placename" content={profileData.city} slot="head" />
    <meta name="geo.position" content={`${profileData.latitude};${profileData.longitude}`} slot="head" />
    <meta name="ICBM" content={`${profileData.latitude}, ${profileData.longitude}`} slot="head" />
  </>
)}

<!-- Business-specific Open Graph -->
<meta property="business:contact_data:street_address" content={addressComponents.streetAddress} slot="head" />
<meta property="business:contact_data:locality" content={profileData.city} slot="head" />
<meta property="business:contact_data:region" content={profileData.province} slot="head" />
<meta property="business:contact_data:country_name" content={profileData.country} slot="head" />
{profileData.phone_number && (
  <meta property="business:contact_data:phone_number" content={profileData.phone_number} slot="head" />
)}
```

### 3. Enhanced City Page Schema (src/pages/[country]/[region]/[city]/index.astro)

Add this schema to city pages for local business listings:

```javascript
// Add this script tag to city pages
const citySchemaData = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  "name": `Veterinarians in ${cityName}`,
  "description": `Complete directory of veterinary clinics and animal hospitals in ${cityName}`,
  "numberOfItems": profiles.length,
  "itemListOrder": "https://schema.org/ItemListOrderDescending",
  "itemListElement": profiles.slice(0, 20).map((profile, index) => ({
    "@type": "ListItem",
    "position": index + 1,
    "item": {
      "@type": "VeterinaryCare",
      "@id": `https://vetlist.org/${country}/${region}/${city}/${profile.name_slug}`,
      "name": profile.name,
      "address": {
        "@type": "PostalAddress",
        "addressLocality": profile.city,
        "addressRegion": profile.province,
        "addressCountry": profile.country
      },
      "telephone": profile.phone_number || "",
      "url": `https://vetlist.org/${country}/${region}/${city}/${profile.name_slug}`,
      ...(profile.rating ? {
        "aggregateRating": {
          "@type": "AggregateRating",
          "ratingValue": profile.rating,
          "bestRating": "5"
        }
      } : {})
    }
  })),
  "mainEntity": {
    "@type": "City",
    "name": cityName,
    "containedInPlace": {
      "@type": "State", 
      "name": toTitleCase(region)
    }
  }
};
```

### 4. Enhanced FAQ Schema (src/components/home/FAQ.astro)

Your FAQ component already has good schema! Enhance it with this addition:

```astro
<!-- Add this script to pages with FAQs -->
<script type="application/ld+json" set:html={JSON.stringify({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": faqItems.map(item => ({
    "@type": "Question",
    "name": item.question,
    "acceptedAnswer": {
      "@type": "Answer",
      "text": item.answer
    }
  }))
})} />
```

### 5. Organization Schema for Homepage (src/pages/index.astro)

Add this to your homepage:

```javascript
const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "VetList.org",
  "url": "https://vetlist.org",
  "logo": "https://vetlist.org/logo.png",
  "description": "Find the best veterinarians and animal hospitals near you",
  "foundingDate": "2024",
  "contactPoint": {
    "@type": "ContactPoint",
    "contactType": "customer service",
    "email": "info@vetlist.org"
  },
  "sameAs": [
    "https://facebook.com/vetlist",
    "https://twitter.com/vetlist"
  ],
  "potentialAction": {
    "@type": "SearchAction",
    "target": {
      "@type": "EntryPoint",
      "urlTemplate": "https://vetlist.org/search?q={search_term_string}"
    },
    "query-input": "required name=search_term_string"
  }
};
```

### 6. Breadcrumb Schema Enhancement

Update your Breadcrumbs component to include schema:

```astro
<!-- Add to Breadcrumbs.astro -->
<script type="application/ld+json" set:html={JSON.stringify({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": breadcrumbs.map((crumb, index) => ({
    "@type": "ListItem",
    "position": index + 1,
    "name": crumb.name,
    "item": `https://vetlist.org${crumb.url}`
  }))
})} />
```

## 🔧 Implementation Steps

### Step 1: Update Profile Pages
1. Replace the schemaData object in `[profile].astro`
2. Add geo meta tags to the head section
3. Test with Google Rich Results Test

### Step 2: Enhance City Pages  
1. Add the ItemList schema to city index pages
2. Test local business rich snippets

### Step 3: Add Organization Schema
1. Add to homepage for brand recognition
2. Include sitelinks search box schema

### Step 4: Test Everything
1. Use Google Rich Results Test for each page type
2. Submit updated sitemap to Google Search Console
3. Monitor for rich snippet appearances (can take 1-2 weeks)

## 📱 Mobile-Specific Enhancements

Add these mobile-optimized meta tags:

```html
<meta name="format-detection" content="telephone=yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
```

## 🎯 Expected Results

After implementation:
- ⭐ Star ratings in search results
- 📞 Clickable phone buttons (already working!)
- 🕒 Business hours display
- 📍 Location and directions
- ❓ FAQ rich snippets
- 🔍 Enhanced local search visibility

**Timeline**: Rich snippets typically appear within 1-2 weeks of implementation and Google re-crawling your pages.