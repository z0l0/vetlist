import fs from 'fs';
import path from 'path';

const SITE_ORIGIN = 'https://vetlist.org';
const DEFAULT_OG_IMAGE_PATH = '/images/og/vetlist-default-og.jpg';

export const DEFAULT_OG_IMAGE_WIDTH = 1200;
export const DEFAULT_OG_IMAGE_HEIGHT = 630;
export const DEFAULT_OG_IMAGE_TYPE = 'image/jpeg';

function hasProtocol(value) {
  return /^https?:\/\//i.test(String(value || ''));
}

export function toAbsoluteUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  if (hasProtocol(raw)) return raw;
  const normalizedPath = raw.startsWith('/') ? raw : `/${raw}`;
  return new URL(normalizedPath, SITE_ORIGIN).toString();
}

export function getDefaultOgImageUrl() {
  return toAbsoluteUrl(DEFAULT_OG_IMAGE_PATH);
}

export function getValidProfileImage(profile) {
  const candidate = profile?.picture || profile?.image || '';
  return hasProtocol(candidate) ? candidate : null;
}

export function pickFirstProfileImage(profiles = []) {
  for (const profile of profiles) {
    const image = getValidProfileImage(profile);
    if (image) return image;
  }
  return null;
}

export function weightedAveragePosition(rows = []) {
  const rowsWithImpressions = rows.filter((row) => Number.isFinite(row?.position) && Number.isFinite(row?.impressions) && row.impressions > 0);
  if (!rowsWithImpressions.length) return null;
  const weightedTotal = rowsWithImpressions.reduce((sum, row) => sum + row.position * row.impressions, 0);
  const totalImpressions = rowsWithImpressions.reduce((sum, row) => sum + row.impressions, 0);
  return totalImpressions > 0 ? Number((weightedTotal / totalImpressions).toFixed(1)) : null;
}

export function toSafeSegment(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function getGeneratedOgImageUrl(type, segments = []) {
  if (!type || !Array.isArray(segments) || !segments.length) return null;
  const safeSegments = segments.map(toSafeSegment).filter(Boolean);
  if (!safeSegments.length) return null;

  const relativePath = `/images/og/${type}/${safeSegments.join('--')}.jpg`;
  const absolutePath = path.join(process.cwd(), 'public', relativePath);

  return fs.existsSync(absolutePath) ? toAbsoluteUrl(relativePath) : null;
}
