import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import algoliasearch from 'algoliasearch';
import dotenv from 'dotenv';
import Papa from 'papaparse';
import { slugify } from '../src/lib/slugify.js';

// Load environment variables
dotenv.config();

// Algolia configuration for build script
const ALGOLIA_APP_ID = process.env.ALGOLIA_APP_ID;
const ALGOLIA_API_KEY = process.env.ALGOLIA_API_KEY; // Admin API Key
const ALGOLIA_INDEX_NAME = process.env.ALGOLIA_INDEX_NAME || 'vetlist_locations';

if (!ALGOLIA_APP_ID || !ALGOLIA_API_KEY) {
  console.error('❌ Missing Algolia credentials. Please check your .env file.');
  console.error('Required: ALGOLIA_APP_ID, ALGOLIA_API_KEY');
  process.exit(1);
}

// Initialize Algolia client with admin key for indexing
const algoliaClient = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_API_KEY);
const algoliaIndex = algoliaClient.initIndex(ALGOLIA_INDEX_NAME);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Normalize country values
function normalizeCountry(country) {
    if (!country) return '';
    country = country.trim();
    
    // Normalize United States variants
    if (/^(us|usa|united\s*states(\s*of\s*america)?)$/i.test(country)) {
        return 'united-states';
    }
    return slugify(country);
}

// Normalize state/province values
function normalizeProvince(province, country) {
    if (!province) return '';
    province = province.trim();
    
    // Only process US states
    if (country && /^(us|usa|united\s*states(\s*of\s*america)?)$/i.test(country)) {
        // Replace state abbreviations with full names for consistency
        const stateMap = {
            'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas',
            'CA': 'California', 'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware',
            'FL': 'Florida', 'GA': 'Georgia', 'HI': 'Hawaii', 'ID': 'Idaho',
            'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa', 'KS': 'Kansas',
            'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
            'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi',
            'MO': 'Missouri', 'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada',
            'NH': 'New Hampshire', 'NJ': 'New Jersey', 'NM': 'New Mexico', 'NY': 'New York',
            'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio', 'OK': 'Oklahoma',
            'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
            'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah',
            'VT': 'Vermont', 'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia',
            'WI': 'Wisconsin', 'WY': 'Wyoming', 'DC': 'District of Columbia'
        };
        
        // Check if it's a state abbreviation (2 uppercase letters)
        if (/^[A-Z]{2}$/.test(province)) {
            return slugify(stateMap[province] || province);
        }
    }
    
    return slugify(province);
}

// Load vet profiles from the main professionals CSV files
async function loadVetProfilesFromCSV() {
  const profiles = [];
  
  // Load from all professionals CSV files
  const csvFiles = [
    '../data/professionals.csv',
    '../data/professionals2.csv',
    '../data/professionals3.csv',
    '../data/professionals4.csv',
    '../data/professionals5.csv',
    '../data/professionals6.csv',
    '../data/professionals7.csv',
    '../data/professionals8.csv',
    '../data/professionals9.csv',
    '../data/professionals10.csv'
  ];
  
  console.log(`📁 Loading vet profiles from main CSV files...`);
  
  for (const csvFile of csvFiles) {
    const csvPath = path.join(__dirname, csvFile);
    
    if (!fs.existsSync(csvPath)) {
      console.log(`   ⚠️  Skipping missing file: ${csvFile}`);
      continue;
    }
    
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    
    const parseResult = Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim()
    });
    
    if (parseResult.errors.length > 0) {
      console.warn(`   ⚠️  Parsing errors in ${csvFile}:`, parseResult.errors.slice(0, 3));
    }
    
    console.log(`   ✓ Loaded ${parseResult.data.length} profiles from ${csvFile}`);
    profiles.push(...parseResult.data);
  }
  
  // Transform CSV data for Algolia indexing
  const vetProfiles = profiles.map((row, index) => {
    // Parse specializations from JSON string
    let specializations = [];
    try {
      specializations = JSON.parse(row.specialization || '[]');
    } catch (e) {
      specializations = [];
    }
    
    // Create geo coordinates object for Algolia
    const lat = parseFloat(row.latitude);
    const lng = parseFloat(row.longitude);
    const hasValidCoords = !isNaN(lat) && !isNaN(lng);
    
    // Generate slugs using the same logic as supabase.js
    const normalizedCountry = normalizeCountry(row.country);
    const normalizedProvince = normalizeProvince(row.province, row.country);
    const normalizedCitySlug = slugify(row.city || '');
    const cleanNameSlug = slugify(row.name);
    
    return {
      objectID: `vet-${row.id || index}`,
      name: row.name || '',
      specializations: specializations,
      city: row.city || '',
      province: row.province || '',
      country: row.country || '',
      // Add slug fields for URL generation
      country_slug: normalizedCountry,
      province_slug: normalizedProvince,
      city_slug: normalizedCitySlug,
      name_slug: cleanNameSlug,
      location: `${row.city}, ${row.province}`,
      fullLocation: `${row.city}, ${row.province}, ${row.country}`,
      phone: row.phone_number || '',
      address: row.address || '',
      website: row.website || '',
      picture: row.picture || '',
      rating: parseFloat(row.rating) || 0,
      // Geo coordinates for location-based search
      _geoloc: hasValidCoords ? {
        lat: lat,
        lng: lng
      } : null,
      // Search-friendly text combinations
      searchText: [
        row.name || '',
        row.city || '',
        row.province || '',
        ...(specializations || []),
        `${row.name} ${row.city}`,
        `${row.city} ${row.province}`,
        specializations.join(' ')
      ].filter(Boolean).join(' ').toLowerCase(),
      // Correct URL format matching your site structure
      url: `/${normalizedCountry}/${normalizedProvince}/${normalizedCitySlug}/${cleanNameSlug}`
    };
  }).filter(profile => 
    profile.name && 
    profile.city && 
    profile.province &&
    profile.country_slug &&
    profile.province_slug &&
    profile.city_slug &&
    profile.name_slug
  );
  
  console.log(`   ✓ Processed ${vetProfiles.length} vet profiles with valid slugs`);
  console.log(`   ✓ ${vetProfiles.filter(p => p._geoloc).length} profiles have geo coordinates`);
  
  return vetProfiles;
}



// Build and upload unified vet search index
async function buildAlgoliaIndex() {
  try {
    console.log('🔍 Loading vet profiles from simplified CSV...');
    const vetProfiles = await loadVetProfilesFromCSV();
    
    if (vetProfiles.length === 0) {
      console.error('❌ No vet profiles loaded. Check CSV file path and format.');
      process.exit(1);
    }
    
    console.log(`📊 Found ${vetProfiles.length} vet profiles to index`);
    
    // Clear existing index
    console.log('🗑️  Clearing existing Algolia index...');
    await algoliaIndex.clearObjects();
    
    // Upload vet profiles
    console.log('⬆️  Uploading vet profiles to Algolia...');
    const { objectIDs } = await algoliaIndex.saveObjects(vetProfiles);
    
    // Configure index settings for unified search with geo
    console.log('⚙️  Configuring search settings...');
    await algoliaIndex.setSettings({
      // Searchable attributes (order matters for ranking)
      searchableAttributes: [
        'name',                    // Vet/clinic name (highest priority)
        'specializations',         // Services offered
        'city',                   // City name
        'province',               // Province/state
        'location',               // "City, Province"
        'fullLocation',           // "City, Province, Country"
        'searchText'              // Combined search text
      ],
      
      // Attributes for faceting/filtering
      attributesForFaceting: [
        'country',
        'province', 
        'city',
        'specializations',
        'rating'
      ],
      
      // Custom ranking (secondary sorting)
      customRanking: [
        'desc(rating)',           // Higher rated first
        'asc(name)'              // Then alphabetical
      ],
      

      
      // Highlighting
      highlightPreTag: '<mark>',
      highlightPostTag: '</mark>',
      
      // Search behavior
      hitsPerPage: 20,
      maxValuesPerFacet: 100,
      typoTolerance: true,
      minWordSizefor1Typo: 4,
      minWordSizefor2Typos: 8,
      allowTyposOnNumericTokens: false,
      removeWordsIfNoResults: 'lastWords',
      queryType: 'prefixLast',
      
      // Advanced settings
      separatorsToIndex: '',
      disableTypoToleranceOnAttributes: []
    });
    
    console.log(`✅ Successfully uploaded ${objectIDs.length} vet profiles to Algolia!`);
    
    // Log statistics
    const withGeo = vetProfiles.filter(p => p._geoloc).length;
    const specialtyCount = new Set(vetProfiles.flatMap(p => p.specializations)).size;
    const cityCount = new Set(vetProfiles.map(p => p.city)).size;
    
    console.log('\n📊 Index Statistics:');
    console.log(`   • ${vetProfiles.length} total vet profiles`);
    console.log(`   • ${withGeo} profiles with geo coordinates (${Math.round(withGeo/vetProfiles.length*100)}%)`);
    console.log(`   • ${cityCount} unique cities`);
    console.log(`   • ${specialtyCount} unique specializations`);
    
    // Log some sample profiles
    console.log('\n📋 Sample profiles:');
    vetProfiles.slice(0, 5).forEach(vet => {
      const geoStatus = vet._geoloc ? '📍' : '❌';
      console.log(`   ${geoStatus} ${vet.name} in ${vet.location} (${vet.rating}⭐)`);
    });
    
  } catch (error) {
    console.error('❌ Error building Algolia index:', error);
    process.exit(1);
  }
}

// Run the build function
buildAlgoliaIndex();

export { buildAlgoliaIndex, loadVetProfilesFromCSV };
