import fs from 'fs/promises';
import Papa from 'papaparse';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// --- BUILD OPTIMIZATION SETTINGS ---
// Set to true for faster builds (uses only 1 CSV file each), false for full production build
const IS_FAST_BUILD = process.env.FAST_BUILD === 'true';

// Updated slugify function to properly handle trailing numbers
function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')       // Replace spaces with -
    .replace(/[^\w-]+/g, '')    // Remove non-word chars except -
    .replace(/--+/g, '-')       // Replace multiple - with single -
    .replace(/-?\d+$/, '');     // Remove any trailing numbers, with or without dash
}

// Configuration options for data loading
const DEFAULT_CONFIG = {
  MAX_PROFILES_PER_FILE: process.env.MAX_PROFILES_PER_BUILD ? parseInt(process.env.MAX_PROFILES_PER_BUILD) : (IS_FAST_BUILD ? 100 : 5000), // Limit profiles for static page generation
  LOAD_ALL_FOR_RELATIONSHIPS: false, // Whether to load all profiles for relationships
  CACHE_ENABLED: true,
  CACHE_TTL: 1000 * 60 * 60 // 1 hour in milliseconds
};

// Cache storage
const _cache = {
  professionals: {
    data: null,
    timestamp: 0
  },
  locations: {
    data: null,
    timestamp: 0
  }
};

/**
 * Check if cached data is still valid
 * @param {string} cacheKey - The cache key to check
 * @returns {boolean} - Whether the cache is valid
 */
function isCacheValid(cacheKey) {
  if (!DEFAULT_CONFIG.CACHE_ENABLED) return false;
  
  const cache = _cache[cacheKey];
  if (!cache.data) return false;
  
  const now = Date.now();
  return now - cache.timestamp < DEFAULT_CONFIG.CACHE_TTL;
}

/**
 * Set cached data
 * @param {string} cacheKey - The cache key
 * @param {any} data - The data to cache
 */
function setCache(cacheKey, data) {
  if (!DEFAULT_CONFIG.CACHE_ENABLED) return;
  
  _cache[cacheKey] = {
    data,
    timestamp: Date.now()
  };
}

/**
 * Load CSV file and parse it
 * @param {string} filePath - Path to the CSV file
 * @returns {Promise<Array>} - Parsed CSV data
 */
async function loadCsvFile(filePath) {
  try {
    const csv = await fs.readFile(filePath, 'utf-8');
    const { data } = Papa.parse(csv, { header: true, skipEmptyLines: true });
    return data;
  } catch (error) {
    console.warn(`Failed to load CSV file: ${filePath}`, error.message);
    return [];
  }
}

/**
 * Fetch all professionals from both CSV files
 * @param {number} maxPerFile - Maximum number of rows to process from each CSV file
 * @returns {Promise<Array>} - Combined and processed professionals data
 */
export async function fetchAllProfessionals(maxPerFile = DEFAULT_CONFIG.MAX_PROFILES_PER_FILE) {
  // Check cache first
  if (isCacheValid('professionals')) {
    return _cache.professionals.data;
  }
  
  // File paths
  const dataDir = path.join(__dirname, '..', '..', 'data');
  const allFilePaths = [
    path.join(dataDir, 'professionals.csv'),
    path.join(dataDir, 'professionals2.csv'),
    path.join(dataDir, 'professionals3.csv'),
    path.join(dataDir, 'professionals4.csv'),
    path.join(dataDir, 'professionals5.csv'),
    path.join(dataDir, 'professionals6.csv'),
    path.join(dataDir, 'professionals7.csv'),
    path.join(dataDir, 'professionals8.csv'),
    path.join(dataDir, 'professionals9.csv'),
    path.join(dataDir, 'professionals10.csv')
  ];
  
  // Use only first file in fast build mode, all files in full build mode
  const filePaths = IS_FAST_BUILD ? [allFilePaths[0]] : allFilePaths;
  
  console.log(`supabase.js: ${IS_FAST_BUILD ? 'FAST BUILD MODE' : 'FULL BUILD MODE'} - Using ${filePaths.length} professional files`);
  
  // Step 1: Load all profiles for relationships if configured
  let allProfiles = [];
  if (DEFAULT_CONFIG.LOAD_ALL_FOR_RELATIONSHIPS) {
    console.log(`supabase.js: Loading ALL profiles for relationships`);
    
    for (const filePath of filePaths) {
      const fileData = await loadCsvFile(filePath);
      console.log(`supabase.js: Found ${fileData.length} profiles in ${filePath} (for relationships)`);
      allProfiles.push(...fileData);
    }
    
    console.log(`supabase.js: Total of ${allProfiles.length} profiles loaded for relationships`);
  }
  
  // Step 2: Load limited profiles for page generation
  // Load and parse all files
  const allData = [];
  for (const filePath of filePaths) {
    console.log(`supabase.js: Loading profiles from ${filePath} for page generation`);
    const fileData = await loadCsvFile(filePath);
    console.log(`supabase.js: Found ${fileData.length} profiles in ${filePath}`);
    
    // Apply the limit to each file for page generation
    const limitedData = maxPerFile > 0 ? fileData.slice(0, maxPerFile) : fileData;
    console.log(`supabase.js: Using ${limitedData.length} profiles from ${filePath} for page generation (limit: ${maxPerFile})`);
    
    allData.push(...limitedData);
  }
  
  console.log(`supabase.js: Total of ${allData.length} profiles will be used for page generation`);
  
  // Count US profiles before normalization
  const usProfiles = allData.filter(p => 
    /^(us|usa|united\s*states(\s*of\s*america)?)$/i.test(p.country)
  );
  console.log(`supabase.js: Found ${usProfiles.length} US profiles for page generation`);
  
  // Log Alabama profiles specifically
  const alabamaProfiles = usProfiles.filter(p => 
    p.province === "Alabama" || p.province === "AL" || p.province === "alabama"
  );
  console.log(`supabase.js: Found ${alabamaProfiles.length} Alabama profiles for page generation`);
  if (alabamaProfiles.length > 0) {
    console.log(`supabase.js: First few Alabama profiles for page generation:`);
    alabamaProfiles.slice(0, 5).forEach(p => {
      console.log(`  - ${p.name} in ${p.city}, ${p.province}`);
    });
  }
  
  // The data to transform will be either allData (limited) or allProfiles (all)
  const dataToTransform = DEFAULT_CONFIG.LOAD_ALL_FOR_RELATIONSHIPS ? allProfiles : allData;
  console.log(`supabase.js: Transforming ${dataToTransform.length} profiles (includes all for relationships: ${DEFAULT_CONFIG.LOAD_ALL_FOR_RELATIONSHIPS})`);
  
  // Check for missing IDs
  const missingIds = dataToTransform.filter(p => !p.id).length;
  console.log(`supabase.js: Found ${missingIds} profiles with missing IDs`);
  
  // Generate a starting synthetic ID if needed (use a high number to avoid conflicts)
  let syntheticIdCounter = 9000000;
  
  // Transform professionals data to match professionals_slugs structure
  const transformedData = dataToTransform.map(profile => {
    // Generate synthetic ID if missing
    const profileId = profile.id || `synthetic-${syntheticIdCounter++}`;
    
    // Create clean slugs without numbers
    const cleanNameSlug = slugify(profile.name);
    
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
    
    // Normalize country and province to ensure consistent slugs
    const normalizedCountry = normalizeCountry(profile.country);
    const normalizedProvince = normalizeProvince(profile.province, profile.country);
    const normalizedCitySlug = slugify(profile.city || '');
    
    // Generate a composite ID
    const compositeId = profileId || `${normalizedCountry}-${normalizedProvince}-${normalizedCitySlug}-${cleanNameSlug}`;
    
    return {
      id: profileId,
      composite_id: compositeId, // Add composite ID for flexible lookups
      country_slug: normalizedCountry,
      province_slug: normalizedProvince,
      city_slug: normalizedCitySlug,
      name_slug: cleanNameSlug,  // Use the clean slug without numbers
      name: profile.name,
      picture: profile.picture,
      description: profile.description,
      specialization: JSON.parse(profile.specialization || '[]'), // Parse JSON string
      city: profile.city,
      province: profile.province, // Added for region-level pages
      country: profile.country, // Added for country-level pages
      detailed_description: profile.detailed_description, // Added for profile pages
      address: profile.address, // Added for profile pages
      phone_number: profile.phone_number, // Added for profile pages
      website: profile.website, // Added for profile pages
      hours_of_operation: profile.hours_of_operation, // Added for profile pages
      faqs: JSON.parse(profile.faqs || '[]'), // Added for profile pages, parsed as array
      rating: parseFloat(profile.rating) || null, // Added for profile pages, parsed as float
      is_verified: profile.is_verified === 'true', // Added for related vets in profile pages
      include_in_pages: DEFAULT_CONFIG.LOAD_ALL_FOR_RELATIONSHIPS ? 
        // When loading all for relationships, include profiles from the limited dataset
        allData.some(p => 
          p.id === profile.id || 
          (!p.id && !profile.id && p.name === profile.name && p.city === profile.city)
        ) :
        // When not loading all, include all profiles
        true, // Flag to indicate if this profile should be included in page generation
      source_file: profile.id ? 
        (profile.id < 4000 ? 'professionals.csv' : 
          profile.id < 8000 ? 'professionals2.csv' : 
            profile.id < 12000 ? 'professionals3.csv' : 'professionals4.csv') 
        : 'professionals2.csv' // Track source file
    };
  });
  
  // Log profiles with synthetic IDs
  const syntheticIds = transformedData.filter(p => String(p.id).startsWith('synthetic-')).length;
  console.log(`supabase.js: Generated synthetic IDs for ${syntheticIds} profiles`);
  
  // Cache the result
  setCache('professionals', transformedData);
  
  // Verify US profiles after transformation
  const normalizedUSProfiles = transformedData.filter(p => p.country_slug === 'united-states');
  console.log(`supabase.js: After transformation, found ${normalizedUSProfiles.length} total US profiles`);
  
  // Verify Alabama profiles after transformation
  const normalizedAlabamaProfiles = normalizedUSProfiles.filter(p => 
    p.province_slug === 'alabama'
  );
  console.log(`supabase.js: After transformation, found ${normalizedAlabamaProfiles.length} total Alabama profiles`);
  if (normalizedAlabamaProfiles.length > 0) {
    // Count unique cities in Alabama
    const uniqueCities = new Set(normalizedAlabamaProfiles.map(p => p.city_slug));
    console.log(`supabase.js: Found ${uniqueCities.size} unique cities in Alabama`);
    
    // Log a few Alabama profiles
    console.log(`supabase.js: Sample of normalized Alabama profiles:`);
    normalizedAlabamaProfiles.slice(0, 5).forEach(p => {
      console.log(`  - ${p.name} (${p.id}) in ${p.city}, ${p.province} → ${p.country_slug}/${p.province_slug}/${p.city_slug}`);
    });
  }
  
  // If LOAD_ALL_FOR_RELATIONSHIPS is true, return only the profiles flagged for page generation
  // Otherwise return all transformed profiles (backward compatibility)
  const result = DEFAULT_CONFIG.LOAD_ALL_FOR_RELATIONSHIPS
    ? transformedData.filter(p => p.include_in_pages)
    : transformedData;
  
  console.log(`supabase.js: Returning ${result.length} profiles for page generation (out of ${transformedData.length} total)`);
  
  // Return the filtered data for page generation (but lookup tables will use all data)
  return result;
}

/**
 * Fetch all location details from both CSV files
 * @returns {Promise<Array>} - Combined locations data
 */
export async function fetchLocationsDetails() {
  // Check cache first
  if (isCacheValid('locations')) {
    return _cache.locations.data;
  }
  
  // File paths
  const dataDir = path.join(__dirname, '..', '..', 'data');
  const allLocationFilePaths = [
    path.join(dataDir, 'locations_details.csv'),
    path.join(dataDir, 'locations_details2.csv'),
    path.join(dataDir, 'locations_details3.csv'),
    path.join(dataDir, 'locations_details4.csv'),
    path.join(dataDir, 'locations_details5.csv'),
    path.join(dataDir, 'locations_details6.csv'),
    path.join(dataDir, 'locations_details7.csv'),
    path.join(dataDir, 'locations_details8.csv'),
    path.join(dataDir, 'locations_details9.csv')
  ];
  
  // Use only first file in fast build mode, all files in full build mode
  const filePaths = IS_FAST_BUILD ? [allLocationFilePaths[0]] : allLocationFilePaths;
  
  console.log(`supabase.js: ${IS_FAST_BUILD ? 'FAST BUILD MODE' : 'FULL BUILD MODE'} - Using ${filePaths.length} location files`);
  
  // Load and parse all files
  const allData = [];
  for (const filePath of filePaths) {
    const fileData = await loadCsvFile(filePath);
    allData.push(...fileData);
  }
  
  // Cache the result
  setCache('locations', allData);
  
  return allData;
}

/**
 * Fetch popular veterinarians from CSV file
 * @returns {Promise<Array>} - Popular vets data
 */
export async function fetchPopularVets() {
  const dataDir = path.join(__dirname, '..', '..', 'data');
  const popularVetsPath = path.join(dataDir, 'popular_vets.csv');
  
  try {
    const popularVetsData = await loadCsvFile(popularVetsPath);
    console.log(`supabase.js: Loaded ${popularVetsData.length} popular vets from CSV`);
    
    // Get all professionals to match with popular vets for complete data
    const allProfiles = await fetchAllProfessionals();
    
    // Match popular vets with full profile data
    const popularVetsWithData = popularVetsData.map(popularVet => {
      // Find matching profile in the main data
      const matchingProfile = allProfiles.find(profile => 
        profile.id == popularVet.id || 
        profile.name === popularVet.name ||
        (profile.city?.toLowerCase() === popularVet.city?.toLowerCase() && 
         profile.name?.toLowerCase().includes(popularVet.name?.toLowerCase().split(' ')[0]))
      );
      
      return {
        name: popularVet.name,
        slug: popularVet.slug,
        picture: matchingProfile?.picture || popularVet.picture || null,
        rating: parseFloat(popularVet.rating) || matchingProfile?.rating || 4.8,
        city: popularVet.city,
        state: popularVet.state || popularVet.province,
        province: popularVet.province,
        country: popularVet.country
      };
    });
    
    console.log(`supabase.js: Matched ${popularVetsWithData.filter(v => v.picture).length} popular vets with pictures`);
    return popularVetsWithData;
  } catch (error) {
    console.warn('Failed to load popular vets CSV:', error.message);
    return [];
  }
}

/**
 * Configure the data loading options
 * @param {Object} config - Configuration options
 */
export function configureDataLoading(config = {}) {
  Object.assign(DEFAULT_CONFIG, config);
}