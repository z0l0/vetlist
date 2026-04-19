import { fetchAllProfessionals, configureDataLoading } from '../../lib/supabase.js';

function parseJSONField(value) {
  if (value == null || value === '') return null;
  if (Array.isArray(value) || typeof value === 'object') return value;
  if (typeof value !== 'string') return null;

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function toClaimRecord(profile) {
  const phone = profile.phone_number || profile.phone || '';
  const address = profile.address || '';
  const city = profile.city || '';
  const province = profile.province || '';
  const country = profile.country || '';
  const website = profile.website || '';

  const record = {
    practiceName: profile.name,
  };

  if (phone) record.phone = phone;
  if (address) record.address = address;
  if (city) record.city = city;
  if (province) record.province = province;
  if (country) record.country = country;
  if (website) record.website = website;
  if (profile.vetscore != null && profile.vetscore !== '') {
    record.vetscore = Number.parseFloat(profile.vetscore);
  }

  if (Array.isArray(profile.specialization) && profile.specialization.length > 0) {
    record.services = profile.specialization;
  } else {
    const parsedSpecializations = parseJSONField(profile.specialization);
    if (Array.isArray(parsedSpecializations) && parsedSpecializations.length > 0) {
      record.services = parsedSpecializations;
    }
  }

  const animals = profile.pet_types_served || profile.animals_treated;
  if (Array.isArray(animals) && animals.length > 0) {
    record.animals = animals;
  } else {
    const parsedAnimals = parseJSONField(animals);
    if (Array.isArray(parsedAnimals) && parsedAnimals.length > 0) {
      record.animals = parsedAnimals;
    }
  }

  const parsedHours = parseJSONField(profile.hours_of_operation);
  if (parsedHours && typeof parsedHours === 'object' && !Array.isArray(parsedHours)) {
    record.hours = parsedHours;
  }

  if (profile.claimed === true || profile.claimed === false) {
    record.claimed = profile.claimed;
  } else {
    record.claimed = profile.claimed === 'true';
  }

  if (profile.is_verified === true || profile.is_verified === false) {
    record.isVerified = profile.is_verified;
  } else {
    record.isVerified = profile.is_verified === 'true';
  }

  if (profile.backlink_vetlist === true || profile.backlink_vetlist === false) {
    record.hasBacklink = profile.backlink_vetlist;
  } else {
    record.hasBacklink = profile.backlink_vetlist === 'true';
  }

  return record;
}

function buildCityStats(profile, allProfiles) {
  if (!profile?.country_slug || !profile?.province_slug || !profile?.city_slug) return null;

  const cityProfiles = allProfiles
    .filter(
      (item) =>
        item.country_slug === profile.country_slug &&
        item.province_slug === profile.province_slug &&
        item.city_slug === profile.city_slug,
    )
    .map((item) => ({
      id: item.id != null ? String(item.id).trim() : '',
      name: item.name || '',
      score: Number.parseFloat(item.vetscore) || 0,
    }))
    .filter((item) => item.id);

  if (!cityProfiles.length) return null;

  cityProfiles.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));

  const currentId = String(profile.id).trim();
  const currentIndex = cityProfiles.findIndex((item) => item.id === currentId);
  const leader = cityProfiles[0] || null;

  return {
    cityRank: currentIndex >= 0 ? currentIndex + 1 : null,
    cityTotal: cityProfiles.length,
    cityScores: cityProfiles.map((item) => item.score),
    cityLeaderName: leader?.name || '',
    cityLeaderScore: leader ? Math.round(leader.score) : null,
    cityPageHref: `/${profile.country_slug}/${profile.province_slug}/${profile.city_slug}/`,
    profilePageHref: profile.name_slug
      ? `/${profile.country_slug}/${profile.province_slug}/${profile.city_slug}/${profile.name_slug}/`
      : '',
  };
}

export async function GET(context = {}) {
  const contextUrl =
    context.url ||
    (context.request?.url ? new URL(context.request.url) : null);
  const requestedClinicId = contextUrl?.searchParams?.get('clinic')?.trim() || '';
  const previousFastBuild = process.env.FAST_BUILD;

  try {
    // This endpoint should always resolve the full dataset, even in FAST_BUILD dev mode.
    process.env.FAST_BUILD = 'false';
    configureDataLoading({ CACHE_ENABLED: false });

    const allProfiles = await fetchAllProfessionals(0);

    if (requestedClinicId) {
      const match = allProfiles.find(
        (profile) =>
          profile.id != null && String(profile.id).trim() === requestedClinicId,
      );
      const cityStats = match ? buildCityStats(match, allProfiles) : null;

      return new Response(
        JSON.stringify({
          clinic: requestedClinicId,
          record:
            match && match.name
              ? {
                  ...toClaimRecord(match),
                  ...(cityStats || {}),
                }
              : null,
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=300',
          },
        },
      );
    }

    const prefillIndex = {};
    allProfiles.forEach((profile) => {
      const clinicId = profile.id != null ? String(profile.id).trim() : '';
      if (!clinicId || !profile.name) return;
      prefillIndex[clinicId] = toClaimRecord(profile);
    });

    return new Response(JSON.stringify(prefillIndex), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Error generating claim clinic prefill data:', error);
    return new Response(JSON.stringify({ error: 'Failed to generate claim prefill data' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } finally {
    if (typeof previousFastBuild === 'undefined') {
      delete process.env.FAST_BUILD;
    } else {
      process.env.FAST_BUILD = previousFastBuild;
    }
    configureDataLoading({ CACHE_ENABLED: true });
  }
}
