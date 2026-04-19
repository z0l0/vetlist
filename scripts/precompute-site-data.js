import fs from 'fs/promises';
import path from 'path';
import { fetchAllProfessionals, configureDataLoading } from '../src/lib/supabase.js';

const cwd = process.cwd();
const derivedDir = path.join(cwd, 'data', 'derived');
const siteDataPath = path.join(derivedDir, 'site-data.json');

function dedupeBy(items, getKey) {
  const map = new Map();
  for (const item of items) {
    const key = getKey(item);
    if (!map.has(key)) {
      map.set(key, item);
    }
  }
  return Array.from(map.values());
}

function sortByPath(a, b) {
  return a.path.localeCompare(b.path);
}

async function main() {
  await fs.mkdir(derivedDir, { recursive: true });

  // Derived route data should always be complete, even if a fast build was run earlier.
  process.env.FAST_BUILD = 'false';
  delete process.env.MAX_PROFILES_PER_BUILD;

  configureDataLoading({
    CACHE_ENABLED: false,
    MAX_PROFILES_PER_FILE: 0,
    LOAD_ALL_FOR_RELATIONSHIPS: false,
  });

  const startedAt = Date.now();
  const profiles = await fetchAllProfessionals(0);

  const routeIndex = {
    countries: [],
    regions: [],
    cities: [],
    profiles: [],
  };

  for (const profile of profiles) {
    if (!profile.country_slug) continue;

    routeIndex.countries.push({
      country: profile.country_slug,
      name: profile.country || profile.country_slug,
      path: `/${profile.country_slug}/`,
    });

    if (!profile.province_slug) continue;
    routeIndex.regions.push({
      country: profile.country_slug,
      region: profile.province_slug,
      name: profile.province || profile.province_slug,
      path: `/${profile.country_slug}/${profile.province_slug}/`,
    });

    if (!profile.city_slug) continue;
    routeIndex.cities.push({
      country: profile.country_slug,
      region: profile.province_slug,
      city: profile.city_slug,
      name: profile.city || profile.city_slug,
      path: `/${profile.country_slug}/${profile.province_slug}/${profile.city_slug}/`,
    });

    if (!profile.name_slug) continue;
    routeIndex.profiles.push({
      id: String(profile.id),
      country: profile.country_slug,
      region: profile.province_slug,
      city: profile.city_slug,
      profile: profile.name_slug,
      name: profile.name || profile.name_slug,
      path: `/${profile.country_slug}/${profile.province_slug}/${profile.city_slug}/${profile.name_slug}/`,
    });
  }

  routeIndex.countries = dedupeBy(routeIndex.countries, (item) => item.path).sort(sortByPath);
  routeIndex.regions = dedupeBy(routeIndex.regions, (item) => item.path).sort(sortByPath);
  routeIndex.cities = dedupeBy(routeIndex.cities, (item) => item.path).sort(sortByPath);
  routeIndex.profiles = dedupeBy(routeIndex.profiles, (item) => item.path).sort(sortByPath);

  const payload = {
    generatedAt: new Date().toISOString(),
    generationMs: Date.now() - startedAt,
    stats: {
      profiles: profiles.length,
      countries: routeIndex.countries.length,
      regions: routeIndex.regions.length,
      cities: routeIndex.cities.length,
      profilePaths: routeIndex.profiles.length,
    },
    routeIndex,
    professionals: profiles,
    locations: [],
  };

  await fs.writeFile(siteDataPath, JSON.stringify(payload), 'utf-8');

  console.log(
    `precompute-site-data: wrote ${siteDataPath} with ${payload.stats.profiles} profiles, ${payload.stats.cities} cities, and ${payload.stats.profilePaths} profile paths`
  );
}

main().catch((error) => {
  console.error('precompute-site-data: failed', error);
  process.exitCode = 1;
});
