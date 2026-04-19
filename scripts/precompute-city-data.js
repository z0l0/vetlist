import fs from 'fs/promises';
import path from 'path';
import { fetchAllProfessionals, configureDataLoading } from '../src/lib/supabase.js';

const cwd = process.cwd();
const derivedDir = path.join(cwd, 'data', 'derived', 'cities');

// Helper math
const average = (arr) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
const rankForValue = (value, values) => {
  if (value == null || !values.length) return null;
  const sorted = [...values].sort((a, b) => b - a);
  const index = sorted.findIndex(item => value >= item);
  return index === -1 ? sorted.length : index + 1;
};

async function main() {
  await fs.mkdir(derivedDir, { recursive: true });

  // Disable caching to load fresh from CSVs
  configureDataLoading({ CACHE_ENABLED: false, MAX_PROFILES_PER_FILE: 0 });
  
  console.log('Loading all profiles...');
  const profiles = await fetchAllProfessionals(0);

  // Group by city
  const cityGroups = {};
  for (const profile of profiles) {
    if (!profile.country_slug || !profile.province_slug || !profile.city_slug) continue;
    
    const key = `${profile.country_slug}/${profile.province_slug}/${profile.city_slug}`;
    if (!cityGroups[key]) cityGroups[key] = [];
    cityGroups[key].push(profile);
  }

  console.log(`Grouped into ${Object.keys(cityGroups).length} cities. Calculating stats...`);

  let count = 0;
  for (const [cityKey, cityProfiles] of Object.entries(cityGroups)) {
    const vetscores = cityProfiles.map(p => Number(p.vetscore)).filter(n => !isNaN(n) && n > 0);
    const ratings = cityProfiles.map(p => Number(p.rating)).filter(n => !isNaN(n) && n > 0);

    const cityStats = {
      totalProfiles: cityProfiles.length,
      avgVetscore: average(vetscores),
      avgRating: average(ratings),
    };

    const leaderboard = cityProfiles
      .filter(p => p.vetscore)
      .map(p => ({
        slug: p.name_slug,
        name: p.name,
        vetscore: Number(p.vetscore),
        rating: p.rating ? Number(p.rating) : null,
        rank: rankForValue(Number(p.vetscore), vetscores)
      }))
      .sort((a, b) => (a.rank || 9999) - (b.rank || 9999));

    const payload = {
      cityKey,
      cityStats,
      leaderboard
    };

    const outputPath = path.join(derivedDir, ...cityKey.split('/')) + '.json';
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, JSON.stringify(payload, null, 2), 'utf-8');
    
    count++;
    if (count % 500 === 0) console.log(`Processed ${count} cities...`);
  }

  console.log('Precomputation complete! JSON files are in data/derived/cities/');
}

main().catch(console.error);
