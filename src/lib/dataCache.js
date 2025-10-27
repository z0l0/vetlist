// Data caching module to optimize build performance
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
let Papa; // We'll import this dynamically to prevent build failures

// --- BUILD OPTIMIZATION SETTINGS ---
// Set to true for faster builds (uses only 1 CSV file each), false for full production build
const IS_FAST_BUILD = process.env.FAST_BUILD === 'true';

// Limit profiles per file during build to reduce memory usage
const MAX_PROFILES_PER_BUILD = process.env.MAX_PROFILES_PER_BUILD ? parseInt(process.env.MAX_PROFILES_PER_BUILD) : (IS_FAST_BUILD ? 100 : Infinity);

// Safely get dirname
let __dirname;
try {
    __dirname = path.dirname(fileURLToPath(import.meta.url));
} catch (error) {
    console.warn("Could not determine dirname:", error.message);
    __dirname = process.cwd();
}

// --- Data Storage ---
let _professionals = null;
let _locations = null;
let _isUsingFallback = false;

// --- Build Cache ---
const CACHE_FILE = path.join(process.cwd(), '.astro', 'data-cache.json');
let _cacheEnabled = process.env.DISABLE_DATA_CACHE !== 'true';

// --- Lookup Maps ---
let _profilesByCity = new Map();
let _profilesByRegion = new Map();
let _profilesByCountry = new Map();
let _profilesById = new Map();
let _citiesByRegion = new Map();
let _nearbyCitiesMap = new Map();
let _relatedVetsMap = new Map();
let _dataLoaded = false;
let _dataLoading = false;

/**
 * Try to load data from cache file
 */
async function loadFromCache() {
    if (!_cacheEnabled) return false;
    
    try {
        const cacheData = JSON.parse(await fs.readFile(CACHE_FILE, 'utf-8'));
        
        // Check if cache is still valid (you can add timestamp checks here)
        if (cacheData.professionals && cacheData.locations) {
            _professionals = cacheData.professionals;
            _locations = cacheData.locations;
            
            // Rebuild lookup tables from cached data
            buildLookups();
            
            console.log(`dataCache: Loaded ${_professionals.length} professionals from cache`);
            return true;
        }
    } catch (error) {
        console.log('dataCache: No valid cache found, loading fresh data');
    }
    
    return false;
}

/**
 * Save data to cache file
 */
async function saveToCache() {
    if (!_cacheEnabled || !_professionals || !_locations) return;
    
    try {
        const cacheData = {
            professionals: _professionals,
            locations: _locations,
            timestamp: Date.now()
        };
        
        await fs.writeFile(CACHE_FILE, JSON.stringify(cacheData), 'utf-8');
        console.log('dataCache: Saved data to cache');
    } catch (error) {
        console.warn('dataCache: Failed to save cache:', error.message);
    }
}

/**
 * Loads all data and builds lookup tables for faster access
 * This is called once at the start of the build process
 */
async function loadData() {
    if (_dataLoaded || _dataLoading) return; // Already loaded or loading
    _dataLoading = true;

    console.log('dataCache: Loading data...');
    
    // Try to load from cache first
    if (await loadFromCache()) {
        _dataLoaded = true;
        _dataLoading = false;
        return;
    }

    // Try the direct import method first
    try {
        console.log("dataCache: Using direct import from supabase.js");
        const { fetchAllProfessionals, fetchLocationsDetails, configureDataLoading } = await import('./supabase.js');

        // Configure the data loading options for build performance
        configureDataLoading({
            CACHE_ENABLED: true,
            MAX_PROFILES_PER_FILE: IS_FAST_BUILD ? 100 : 5000, // Limit for static page generation
            LOAD_ALL_FOR_RELATIONSHIPS: false // Keep it simple - use same data for both
        });

        _professionals = await fetchAllProfessionals();
        try {
            _locations = await fetchLocationsDetails();
        } catch (locErr) {
            console.warn("dataCache: Error loading locations:", locErr.message);
            _locations = [];
        }

        console.log(`dataCache: Loaded ${_professionals?.length || 0} professionals and ${_locations?.length || 0} locations.`);
        _isUsingFallback = false;

        // Build lookup tables
        buildLookups();
        
        // Save to cache for next build
        await saveToCache();
        
        _dataLoaded = true;
        _dataLoading = false;
        return;
    } catch (importError) {
        console.error("dataCache: Could not import from supabase.js:", importError.message);
        // Continue to try file-based method
    }

    // Only try file-based loading if the import method failed
    try {
        // Dynamically import Papa to prevent build failures
        try {
            Papa = (await import('papaparse')).default;
        } catch (papaError) {
            console.error("dataCache: Failed to import papaparse:", papaError.message);
            throw new Error("Required module papaparse is not available");
        }

        console.log("dataCache: Attempting file-based loading...");
        const dataDir = path.join(__dirname, '..', '..', 'data');

        // Define all CSV files
        const allProfessionalFiles = [
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
        const allLocationFiles = [
            path.join(dataDir, 'locations_details.csv'),
            path.join(dataDir, 'locations_details2.csv'),
            path.join(dataDir, 'locations_details3.csv'),
            path.join(dataDir, 'locations_details4.csv'),
            path.join(dataDir, 'locations_details5.csv'),
            path.join(dataDir, 'locations_details6.csv'),
            path.join(dataDir, 'locations_details7.csv'),
            path.join(dataDir, 'locations_details8.csv'),
            path.join(dataDir, 'locations_details9.csv'),
            path.join(dataDir, 'locations_details10.csv')
        ];

        // Use only first file in fast build mode, all files in production mode
        const professionalFiles = IS_FAST_BUILD ? [allProfessionalFiles[0]] : allProfessionalFiles;
        const locationFiles = IS_FAST_BUILD ? [allLocationFiles[0]] : allLocationFiles;

        console.log(`dataCache: ${IS_FAST_BUILD ? 'FAST BUILD MODE' : 'FULL BUILD MODE'} - Loading ${professionalFiles.length} professional files and ${locationFiles.length} location files`);

        // Load professionals from all files with build optimization
        _professionals = [];
        let totalLoaded = 0;
        
        for (const filePath of professionalFiles) {
            try {
                const profCsv = await fs.readFile(filePath, 'utf-8');
                const { data: profData } = Papa.parse(profCsv, { header: true, skipEmptyLines: true });
                
                // Apply build limit if set
                const dataToProcess = MAX_PROFILES_PER_BUILD !== Infinity ? 
                    profData.slice(0, Math.max(0, MAX_PROFILES_PER_BUILD - totalLoaded)) : 
                    profData;
                
                const transformed = transformProfessionals(dataToProcess);
                _professionals.push(...transformed);
                totalLoaded += transformed.length;
                
                // Stop loading if we've hit our build limit
                if (MAX_PROFILES_PER_BUILD !== Infinity && totalLoaded >= MAX_PROFILES_PER_BUILD) {
                    console.log(`dataCache: Reached build limit of ${MAX_PROFILES_PER_BUILD} profiles for faster builds`);
                    break;
                }
            } catch (profError) {
                console.error(`dataCache: Error loading professionals CSV ${filePath}:`, profError.message);
                // Continue with other files
            }
        }

        // Load locations from all files
        _locations = [];
        for (const filePath of locationFiles) {
            try {
                const locCsv = await fs.readFile(filePath, 'utf-8');
                const { data: locData } = Papa.parse(locCsv, { header: true, skipEmptyLines: true });
                _locations.push(...locData);
            } catch (locError) {
                console.error(`dataCache: Error loading locations CSV ${filePath}:`, locError.message);
                // Continue with other files
            }
        }

        console.log(`dataCache: Loaded ${_professionals?.length || 0} professionals and ${_locations?.length || 0} locations via CSV method.`);
        _isUsingFallback = true;

        // Build lookup tables
        buildLookups();
        
        // Save to cache for next build
        await saveToCache();
        
        _dataLoaded = true;
        _dataLoading = false;
    } catch (fileError) {
        console.error("dataCache: File-based loading failed:", fileError.message);
        // If both methods failed, set empty arrays
        _professionals = [];
        _locations = [];
        _dataLoaded = true;
        _dataLoading = false;
    }
}

/**
 * Transform raw CSV data into the expected professionals format
 */
function transformProfessionals(data) {
    // Slugify function from supabase.js
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

    // Generate a starting synthetic ID if needed (use a high number to avoid conflicts)
    let syntheticIdCounter = 9000000;

    // Process the data
    const transformed = data.map(profile => {
        // Generate a synthetic ID if missing
        const profileId = profile.id || `synthetic-${syntheticIdCounter++}`;

        // Normalize country and province to ensure consistent slugs
        const normalizedCountry = normalizeCountry(profile.country);
        const normalizedProvince = normalizeProvince(profile.province, profile.country);
        const normalizedCitySlug = slugify(profile.city || '');
        const cleanNameSlug = slugify(profile.name);

        // Skip profiles with missing location data in fast build mode
        if (IS_FAST_BUILD && (!normalizedCountry || !normalizedProvince || !normalizedCitySlug)) {
            return null; // Will be filtered out
        }

        // Generate a composite ID for the profile if original ID is missing
        // This ensures each profile has a unique identifier
        const compositeId = profileId || `${normalizedCountry}-${normalizedProvince}-${normalizedCitySlug}-${cleanNameSlug}`;

        return {
            id: profileId,
            composite_id: compositeId, // Store both IDs for flexible lookups
            country_slug: normalizedCountry,
            province_slug: normalizedProvince,
            city_slug: normalizedCitySlug,
            name_slug: cleanNameSlug,
            name: profile.name,
            picture: profile.picture,
            description: profile.description,
            specialization: JSON.parse(profile.specialization || '[]'),
            city: profile.city,
            province: profile.province,
            country: profile.country,
            detailed_description: profile.detailed_description,
            address: profile.address,
            phone_number: profile.phone_number,
            website: profile.website,
            hours_of_operation: profile.hours_of_operation,
            faqs: JSON.parse(profile.faqs || '[]'),
            rating: parseFloat(profile.rating) || null,
            is_verified: profile.is_verified === 'true',
            source_file: profile.id ?
                (profile.id < 4000 ? 'professionals.csv' :
                    profile.id < 8000 ? 'professionals2.csv' :
                        profile.id < 12000 ? 'professionals3.csv' :
                            profile.id < 16000 ? 'professionals4.csv' :
                                profile.id < 20000 ? 'professionals5.csv' :
                                    'professionals6.csv')
                : 'professionals2.csv' // Detect source file
        };
    });

    // Filter out null entries (profiles with missing data in fast build mode)
    const validTransformed = transformed.filter(p => p !== null);
    
    if (!IS_FAST_BUILD) {
        // Only log detailed stats in full build mode
        const syntheticIds = validTransformed.filter(p => String(p.id).startsWith('synthetic-')).length;
        const usProfiles = validTransformed.filter(p => p.country_slug === 'united-states');
        const missingLocation = validTransformed.filter(p => !p.country_slug || !p.province_slug || !p.city_slug);
        
        console.log(`transformProfessionals: Processed ${data.length} -> ${validTransformed.length} profiles (${syntheticIds} synthetic IDs, ${usProfiles.length} US profiles, ${missingLocation.length} missing location data)`);
    }

    return validTransformed;
}

/**
 * Build lookup tables for faster data access
 */
function buildLookups() {
    const startTime = Date.now();
    console.log('dataCache: Building lookup tables...');

    // Clear existing maps
    _profilesByCity.clear();
    _profilesByRegion.clear();
    _profilesByCountry.clear();
    _profilesById.clear();
    _citiesByRegion.clear();
    _nearbyCitiesMap.clear();
    _relatedVetsMap.clear();

    // No data to process
    if (!_professionals || _professionals.length === 0) {
        console.log('dataCache: No professionals data to build lookups');
        return;
    }

    console.log(`dataCache: Building lookups for ${_professionals.length} profiles...`);

    // Build lookup maps
    _professionals.forEach(profile => {
        // Index by ID
        _profilesById.set(String(profile.id), profile);

        // Index by city
        const cityKey = `${profile.country_slug}/${profile.province_slug}/${profile.city_slug}`;
        if (!_profilesByCity.has(cityKey)) {
            _profilesByCity.set(cityKey, []);
        }
        _profilesByCity.get(cityKey).push(profile);

        // Index by region
        const regionKey = `${profile.country_slug}/${profile.province_slug}`;
        if (!_profilesByRegion.has(regionKey)) {
            _profilesByRegion.set(regionKey, []);
        }
        _profilesByRegion.get(regionKey).push(profile);

        // Index by country
        const countryKey = profile.country_slug;
        if (!_profilesByCountry.has(countryKey)) {
            _profilesByCountry.set(countryKey, []);
        }
        _profilesByCountry.get(countryKey).push(profile);

        // Build cities by region
        if (!_citiesByRegion.has(regionKey)) {
            _citiesByRegion.set(regionKey, new Map());
        }
        const cityMap = _citiesByRegion.get(regionKey);
        if (!cityMap.has(profile.city_slug)) {
            cityMap.set(profile.city_slug, {
                city: profile.city,
                city_slug: profile.city_slug,
                count: 0
            });
        }
        cityMap.get(profile.city_slug).count++;
    });

    // Build lookup tables efficiently

    // Pre-compute nearby cities for each city
    for (const [regionKey, cityMap] of _citiesByRegion.entries()) {
        const [country, region] = regionKey.split('/');

        for (const [citySlug, cityData] of cityMap.entries()) {
            // For each city, all other cities in the same region are nearby
            const nearbyCities = [];

            for (const [otherCitySlug, otherCityData] of cityMap.entries()) {
                if (otherCitySlug !== citySlug) {
                    nearbyCities.push(otherCityData);
                }
            }

            // Sort by count (most to fewest)
            nearbyCities.sort((a, b) => b.count - a.count);

            // Store in nearby cities map
            const cityKey = `${country}/${region}/${citySlug}`;
            _nearbyCitiesMap.set(cityKey, nearbyCities);
        }
    }

    // Pre-compute related vets efficiently

    // Pre-compute related vets for each profile
    _professionals.forEach(profile => {
        // Make sure we have an ID (original or synthetic)
        const profileId = profile.id || profile.composite_id || 'unknown';

        const countrySlug = profile.country_slug;
        const regionSlug = profile.province_slug;
        const citySlug = profile.city_slug;

        const cityKey = `${countrySlug}/${regionSlug}/${citySlug}`;
        const regionKey = `${countrySlug}/${regionSlug}`;
        const countryKey = countrySlug;

        // Skip profiles with missing location data
        if (!countrySlug || !regionSlug || !citySlug) {
            _relatedVetsMap.set(profileId, []);
            return;
        }

        // Calculate related vets efficiently
        let relatedVets = [];

        // 1. Get vets from other cities in the same region
        const otherCityVets = (_profilesByRegion.get(regionKey) || [])
            .filter(p => p.city_slug !== citySlug &&
                p.id !== profileId &&
                p.composite_id !== profileId);

        relatedVets = [...otherCityVets];

        // 2. Add vets from the same city (excluding self)
        const sameCity = (_profilesByCity.get(cityKey) || [])
            .filter(p => p.id !== profileId && p.composite_id !== profileId);

        if (sameCity.length > 0) {
            relatedVets = [...sameCity, ...relatedVets];
        }

        // 3. If no related vets, try country level
        if (relatedVets.length === 0) {
            const countryVets = (_profilesByCountry.get(countryKey) || [])
                .filter(p => p.id !== profileId &&
                    p.composite_id !== profileId &&
                    p.province_slug !== regionSlug);

            relatedVets = countryVets;
        }

        // 4. Deduplicate and limit to 9 vets
        const uniqueVetsMap = new Map();
        relatedVets.forEach(vet => {
            const vetId = vet.id || vet.composite_id || 'unknown';
            if (!uniqueVetsMap.has(vetId) && vetId !== 'unknown') {
                uniqueVetsMap.set(vetId, vet);
            }
        });

        const finalRelatedVets = Array.from(uniqueVetsMap.values()).slice(0, 9);

        // Store in the map using both the original ID and the composite ID for reliable lookups
        _relatedVetsMap.set(profileId, finalRelatedVets);
        if (profile.composite_id && profile.composite_id !== profileId) {
            _relatedVetsMap.set(profile.composite_id, finalRelatedVets);
        }
    });

    // Stats after processing
    const buildTime = Date.now() - startTime;
    console.log(`dataCache: Built lookup tables in ${buildTime}ms for ${_profilesByCity.size} cities, ${_profilesByRegion.size} regions, ${_profilesByCountry.size} countries, and ${_relatedVetsMap.size} related vet lists`);
}

// --- Public API ---

/**
 * Get all professionals (triggers data loading if needed)
 */
export async function getProfessionals() {
    if (!_dataLoaded) await loadData();
    return _professionals || [];
}

/**
 * Get all locations (triggers data loading if needed)
 */
export async function getLocations() {
    if (!_dataLoaded) await loadData();
    return _locations || [];
}

/**
 * Get a professional by ID
 */
export async function getProfessionalById(id) {
    if (!_dataLoaded) await loadData();

    // Convert ID to string for consistent comparison
    const idStr = String(id);

    // First try the lookup map with the raw ID
    if (_profilesById.has(idStr)) {
        return _profilesById.get(idStr);
    }

    // Fallback to checking both ID and composite_id fields
    return _professionals?.find(p =>
        p.id === id ||
        p.id === parseInt(id) ||
        p.id === idStr ||
        `${p.id}` === idStr ||
        p.composite_id === idStr
    ) || null;
}

/**
 * Get all professionals for a specific city
 */
export async function getProfilesForCity(country, region, city) {
    if (!_dataLoaded) await loadData();

    const cityKey = `${country}/${region}/${city}`;
    return _profilesByCity.get(cityKey) || [];
}

/**
 * Get all professionals for a specific region
 */
export async function getProfilesForRegion(country, region) {
    if (!_dataLoaded) await loadData();

    const regionKey = `${country}/${region}`;
    return _profilesByRegion.get(regionKey) || [];
}

/**
 * Get all professionals for a specific country
 */
export async function getProfilesForCountry(country) {
    if (!_dataLoaded) await loadData();

    return _profilesByCountry.get(country) || [];
}

/**
 * Get nearby cities for a specific city
 */
export async function getNearbyCitiesForCity(country, region, city) {
    if (!_dataLoaded) await loadData();

    const cityKey = `${country}/${region}/${city}`;
    return _nearbyCitiesMap.get(cityKey) || [];
}

/**
 * Get location details for a specific city
 */
export async function getLocationDetails(country, region, city) {
    if (!_dataLoaded) await loadData();

    return _locations?.find(l =>
        l.country_slug === country &&
        l.province_slug === region &&
        l.city_slug === city
    ) || null;
}

/**
 * Get related vets for a specific profile
 */
export async function getRelatedVetsForProfile(profileId) {
    if (!_dataLoaded) await loadData();

    // First try with the provided ID
    const relatedVets = _relatedVetsMap.get(String(profileId));
    if (relatedVets) return relatedVets;

    // If that fails, try looking up the profile first to get its composite/synthetic ID
    const profile = await getProfessionalById(profileId);
    if (profile && profile.composite_id) {
        const relatedVetsWithComposite = _relatedVetsMap.get(profile.composite_id);
        if (relatedVetsWithComposite) return relatedVetsWithComposite;
    }

    // If all else fails, return empty array
    return [];
}

// Trigger initial data loading
loadData().catch(err => {
    console.error("dataCache: Initial data loading failed:", err.message);
}); 