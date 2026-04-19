import fs from 'fs/promises';
import path from 'path';

const siteDataPath = path.join(process.cwd(), 'data', 'derived', 'site-data.json');

let cachedSiteData = null;
let cachedMtimeMs = 0;
let loadPromise = null;

function shouldBypassPrecomputedSiteData() {
  return process.env.FAST_BUILD === 'true';
}

async function loadSiteData() {
  if (shouldBypassPrecomputedSiteData()) {
    return null;
  }

  if (loadPromise) return loadPromise;

  loadPromise = fs
    .stat(siteDataPath)
    .then(async (stat) => {
      if (cachedSiteData && cachedMtimeMs === stat.mtimeMs) {
        return cachedSiteData;
      }

      const raw = await fs.readFile(siteDataPath, 'utf-8');
      cachedSiteData = JSON.parse(raw);
      cachedMtimeMs = stat.mtimeMs;
      return cachedSiteData;
    })
    .catch(() => null)
    .finally(() => {
      loadPromise = null;
    });

  return loadPromise;
}

export async function getPrecomputedSiteData() {
  return loadSiteData();
}

export async function getPrecomputedRouteIndex() {
  const siteData = await loadSiteData();
  return siteData?.routeIndex || null;
}
