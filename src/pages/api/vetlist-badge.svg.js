import { fetchAllProfessionals, configureDataLoading } from '../../lib/supabase.js';

function escapeXml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function getTheme(themeName) {
  const themes = {
    light: {
      bg: '#ffffff',
      border: '#cbd5e1',
      accent: '#0f766e',
      accentSoft: '#ccfbf1',
      title: '#0f172a',
      body: '#334155',
    },
    dark: {
      bg: '#0f172a',
      border: '#1e293b',
      accent: '#22c55e',
      accentSoft: '#052e16',
      title: '#f8fafc',
      body: '#cbd5e1',
    },
    mint: {
      bg: '#f0fdf4',
      border: '#bbf7d0',
      accent: '#15803d',
      accentSoft: '#dcfce7',
      title: '#14532d',
      body: '#166534',
    },
  };

  return themes[themeName] || themes.light;
}

function getSize(sizeName) {
  const sizes = {
    md: {
      width: 320,
      height: 104,
      titleSize: 18,
      nameSize: 13,
      subtitleSize: 12,
      iconSize: 42,
      iconX: 16,
      iconY: 16,
      textX: 72,
      titleY: 35,
      nameY: 58,
      subtitleY: 79,
      labelMax: 24,
      clinicMax: 28,
      subtitleMax: 28,
      layout: 'standard',
    },
    sm: {
      width: 304,
      height: 88,
      titleSize: 13,
      nameSize: 11,
      subtitleSize: 10,
      iconSize: 30,
      iconX: 22,
      iconY: 29,
      textX: 58,
      titleY: 35,
      nameY: 53,
      subtitleY: 67,
      labelMax: 18,
      clinicMax: 18,
      subtitleMax: 12,
      panelX: 10,
      panelY: 10,
      panelWidth: 284,
      panelHeight: 68,
      scoreX: 274,
      scoreLabelY: 42,
      scoreValueY: 58,
      layout: 'small',
    },
  };

  return sizes[sizeName] || sizes.md;
}

function truncateDisplayText(value, maxLength) {
  const text = String(value || '').trim();
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 1)).trim()}…`;
}

function getCompactBadgeLabel(cityName, cityRank, fallbackLabel = '') {
  const cleanedFallback = String(fallbackLabel || '')
    .replace(/\bVeterinarian\b/gi, 'Vet')
    .replace(/\bVeterinary Clinics\b/gi, 'Vets')
    .replace(/\bVeterinary\b/gi, 'Vet')
    .trim();

  if (cityName && cityRank === 1) return `#1 ${cityName} Vet`;
  if (cityName && Number.isFinite(cityRank) && cityRank > 1) {
    return `Top ${cityName} Vet`;
  }
  if (cityName) return `${cityName} Vet`;
  return cleanedFallback || 'Top Vet';
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
    .filter((item) => item.id)
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));

  const currentId = String(profile.id || '').trim();
  const currentIndex = cityProfiles.findIndex((item) => item.id === currentId);

  return {
    cityRank: currentIndex >= 0 ? currentIndex + 1 : null,
    cityTotal: cityProfiles.length,
  };
}

export async function GET(context = {}) {
  const contextUrl =
    context.url ||
    (context.request?.url ? new URL(context.request.url) : null);
  const clinicId = contextUrl?.searchParams?.get('clinic')?.trim() || '';
  const themeName = contextUrl?.searchParams?.get('theme')?.trim() || 'light';
  const sizeName = contextUrl?.searchParams?.get('size')?.trim() || 'md';
  const rounded = contextUrl?.searchParams?.get('shape')?.trim() !== 'square';
  const label = (contextUrl?.searchParams?.get('label')?.trim() || 'Top Veterinarian').slice(0, 34);
  const previousFastBuild = process.env.FAST_BUILD;

  if (!clinicId) {
    return new Response('Missing clinic id', { status: 400 });
  }

  try {
    process.env.FAST_BUILD = 'false';
    configureDataLoading({ CACHE_ENABLED: false });

    const allProfiles = await fetchAllProfessionals(0);
    const profile = allProfiles.find(
      (item) => item.id != null && String(item.id).trim() === clinicId,
    );

    if (!profile) {
      return new Response('Clinic not found', { status: 404 });
    }

    const theme = getTheme(themeName);
    const size = getSize(sizeName);
    const cityStats = buildCityStats(profile, allProfiles);
    const score = Math.round(Number.parseFloat(profile.vetscore) || 0);
    const cityName = profile.city || 'your city';
    const displayLabel =
      size.layout === 'small'
        ? getCompactBadgeLabel(cityName, cityStats?.cityRank || null, label)
        : label;
    const title = escapeXml(truncateDisplayText(displayLabel, size.labelMax));
    const subtitleText =
      size.layout === 'small'
        ? `VetScore ${score}`
        : cityStats?.cityRank && cityStats?.cityTotal
          ? `VetScore ${score} | #${cityStats.cityRank} in ${cityName}`
          : `VetScore ${score} | ${cityName}`;
    const subtitle = escapeXml(
      truncateDisplayText(subtitleText, size.subtitleMax),
    );
    const clinicName = escapeXml(truncateDisplayText(profile.name || '', size.clinicMax));
    const radius = rounded ? 20 : 8;
    const iconRadius = rounded ? 16 : 10;
    const checkStartX = size.iconX + Math.round(size.iconSize * 0.26);
    const checkStartY = size.iconY + Math.round(size.iconSize * 0.55);
    const checkMidX = size.iconX + Math.round(size.iconSize * 0.47);
    const checkMidY = size.iconY + Math.round(size.iconSize * 0.75);
    const checkEndX = size.iconX + Math.round(size.iconSize * 0.78);
    const checkEndY = size.iconY + Math.round(size.iconSize * 0.34);
    const checkStroke = 4.5;
    const bodyMarkup =
      size.layout === 'small'
        ? `<rect x="${size.panelX}" y="${size.panelY}" width="${size.panelWidth}" height="${size.panelHeight}" rx="${rounded ? 22 : 10}" fill="${theme.bg}" stroke="${theme.border}" stroke-width="2"/>
  <circle cx="${size.iconX + (size.iconSize / 2)}" cy="${size.iconY + (size.iconSize / 2)}" r="${size.iconSize / 2}" fill="${theme.accentSoft}"/>
  <path d="M${checkStartX} ${checkStartY} L${checkMidX} ${checkMidY} L${checkEndX} ${checkEndY}" stroke="${theme.accent}" stroke-width="${checkStroke}" stroke-linecap="round" stroke-linejoin="round"/>
  <text x="${size.textX}" y="${size.titleY}" fill="${theme.title}" font-family="Arial, sans-serif" font-size="${size.titleSize}" font-weight="800">${title}</text>
  <text x="${size.textX}" y="${size.nameY}" fill="${theme.body}" font-family="Arial, sans-serif" font-size="${size.nameSize}" font-weight="600">${clinicName}</text>
  <text x="${size.scoreX}" y="${size.scoreLabelY}" text-anchor="end" fill="${theme.accent}" font-family="Arial, sans-serif" font-size="${size.subtitleSize}" font-weight="700">VetScore</text>
  <text x="${size.scoreX}" y="${size.scoreValueY}" text-anchor="end" fill="${theme.accent}" font-family="Arial, sans-serif" font-size="18" font-weight="800">${score}</text>`
        : `<rect x="1" y="1" width="${size.width - 2}" height="${size.height - 2}" rx="${radius}" fill="${theme.bg}" stroke="${theme.border}" stroke-width="2"/>
  <rect x="${size.iconX}" y="${size.iconY}" width="${size.iconSize}" height="${size.iconSize}" rx="${iconRadius}" fill="${theme.accentSoft}"/>
  <path d="M${checkStartX} ${checkStartY} L${checkMidX} ${checkMidY} L${checkEndX} ${checkEndY}" stroke="${theme.accent}" stroke-width="${checkStroke}" stroke-linecap="round" stroke-linejoin="round"/>
  <text x="${size.textX}" y="${size.titleY}" fill="${theme.title}" font-family="Arial, sans-serif" font-size="${size.titleSize}" font-weight="700">${title}</text>
  <text x="${size.textX}" y="${size.nameY}" fill="${theme.body}" font-family="Arial, sans-serif" font-size="${size.nameSize}" font-weight="600">${clinicName}</text>
  <text x="${size.textX}" y="${size.subtitleY}" fill="${theme.body}" font-family="Arial, sans-serif" font-size="${size.subtitleSize}">${subtitle}</text>`;

    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size.width}" height="${size.height}" viewBox="0 0 ${size.width} ${size.height}" fill="none" role="img" aria-label="${title}">
  ${bodyMarkup}
</svg>`;

    return new Response(svg, {
      status: 200,
      headers: {
        'Content-Type': 'image/svg+xml; charset=utf-8',
        'Cache-Control': 'public, max-age=300',
      },
    });
  } catch (error) {
    console.error('Error generating VetList badge:', error);
    return new Response('Failed to generate badge', { status: 500 });
  } finally {
    if (typeof previousFastBuild === 'undefined') {
      delete process.env.FAST_BUILD;
    } else {
      process.env.FAST_BUILD = previousFastBuild;
    }
    configureDataLoading({ CACHE_ENABLED: true });
  }
}
