#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

const TARGET_WIDTH = 1200;
const TARGET_HEIGHT = 630;
const TARGET_RATIO = TARGET_WIDTH / TARGET_HEIGHT;
const DEFAULT_IMAGE = path.join(process.cwd(), 'public', 'images', 'og', 'vetlist-default-og.jpg');
const SITE_DATA_PATH = path.join(process.cwd(), 'data', 'derived', 'site-data.json');

function parseArgs(argv) {
  const raw = Object.fromEntries(
    argv
      .filter((arg) => arg.startsWith('--'))
      .map((arg) => {
        const [key, value = 'true'] = arg.slice(2).split('=');
        return [key, value];
      }),
  );

  return {
    mode: String(raw.mode || 'all'),
    limit: Number.parseInt(raw.limit || '300', 10),
    concurrency: Math.max(1, Number.parseInt(raw.concurrency || '4', 10)),
    skipExisting: String(raw['skip-existing'] || 'true') !== 'false',
  };
}

function toSafeSegment(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function hasHttpImage(profile) {
  return /^https?:\/\//i.test(String(profile?.picture || '').trim());
}

function buildProfileJobs(profiles, limit) {
  return profiles
    .filter((profile) => profile.country_slug && profile.province_slug && profile.city_slug && profile.name_slug && hasHttpImage(profile))
    .slice(0, limit)
    .map((profile) => ({
      kind: 'profile',
      imageUrl: String(profile.picture).trim(),
      outputRelativePath: path.join('images', 'og', 'profiles', `${toSafeSegment(profile.country_slug)}--${toSafeSegment(profile.province_slug)}--${toSafeSegment(profile.city_slug)}--${toSafeSegment(profile.name_slug)}.jpg`),
      label: `${profile.name} (${profile.city}, ${profile.province})`,
    }));
}

function buildCityJobs(profiles, limit) {
  const cityMap = new Map();

  for (const profile of profiles) {
    if (!profile.country_slug || !profile.province_slug || !profile.city_slug || !hasHttpImage(profile)) continue;

    const key = `${profile.country_slug}/${profile.province_slug}/${profile.city_slug}`;
    const score = Number.parseFloat(profile.vetscore) || 0;
    const existing = cityMap.get(key);

    if (!existing || score > existing.score) {
      cityMap.set(key, {
        score,
        country: profile.country_slug,
        region: profile.province_slug,
        city: profile.city_slug,
        cityName: profile.city,
        regionName: profile.province,
        imageUrl: String(profile.picture).trim(),
      });
    }
  }

  return Array.from(cityMap.values())
    .slice(0, limit)
    .map((entry) => ({
      kind: 'city',
      imageUrl: entry.imageUrl,
      outputRelativePath: path.join('images', 'og', 'cities', `${toSafeSegment(entry.country)}--${toSafeSegment(entry.region)}--${toSafeSegment(entry.city)}.jpg`),
      label: `${entry.cityName}, ${entry.regionName}`,
    }));
}

async function ensureCommand(command) {
  await execFileAsync('which', [command]);
}

async function loadProfiles() {
  const raw = await fs.readFile(SITE_DATA_PATH, 'utf-8');
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed.professionals) ? parsed.professionals : [];
}

async function createTempDir() {
  const base = path.join(os.tmpdir(), 'vetlist-og');
  await fs.mkdir(base, { recursive: true });
  return fs.mkdtemp(path.join(base, `${Date.now()}-`));
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function fetchToFile(url, destinationPath) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    const response = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'user-agent': 'VetList-OG-Generator/1.0',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    await fs.writeFile(destinationPath, Buffer.from(arrayBuffer));
  } finally {
    clearTimeout(timeout);
  }
}

async function getImageDimensions(filePath) {
  const { stdout } = await execFileAsync('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', filePath]);
  const widthMatch = stdout.match(/pixelWidth:\s*(\d+)/);
  const heightMatch = stdout.match(/pixelHeight:\s*(\d+)/);

  const width = widthMatch ? Number.parseInt(widthMatch[1], 10) : 0;
  const height = heightMatch ? Number.parseInt(heightMatch[1], 10) : 0;

  if (!width || !height) {
    throw new Error('Unable to read image dimensions');
  }

  return { width, height };
}

function calculateCropDimensions(width, height) {
  const sourceRatio = width / height;

  if (Math.abs(sourceRatio - TARGET_RATIO) < 0.01) {
    return { cropWidth: width, cropHeight: height };
  }

  if (sourceRatio > TARGET_RATIO) {
    const cropWidth = Math.floor(height * TARGET_RATIO);
    return { cropWidth, cropHeight: height };
  }

  const cropHeight = Math.floor(width / TARGET_RATIO);
  return { cropWidth: width, cropHeight };
}

async function processImageToOg(inputPath, outputPath, tmpDir) {
  const sourceJpeg = path.join(tmpDir, `${crypto.randomUUID()}-source.jpg`);
  const cropped = path.join(tmpDir, `${crypto.randomUUID()}-cropped.jpg`);

  await execFileAsync('sips', ['-s', 'format', 'jpeg', inputPath, '--out', sourceJpeg]);
  const { width, height } = await getImageDimensions(sourceJpeg);
  const { cropWidth, cropHeight } = calculateCropDimensions(width, height);

  await execFileAsync('sips', ['-c', String(cropHeight), String(cropWidth), sourceJpeg, '--out', cropped]);
  await execFileAsync('sips', ['-z', String(TARGET_HEIGHT), String(TARGET_WIDTH), cropped, '--out', outputPath]);
}

async function runWithPool(items, concurrency, onItem) {
  let index = 0;

  async function worker() {
    while (true) {
      const current = index;
      index += 1;
      if (current >= items.length) break;
      await onItem(items[current], current);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(workers);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!['profiles', 'cities', 'all'].includes(args.mode)) {
    throw new Error('Invalid --mode. Use profiles, cities, or all.');
  }

  if (!(await fileExists(DEFAULT_IMAGE))) {
    throw new Error(`Default fallback image is missing at ${DEFAULT_IMAGE}`);
  }

  await ensureCommand('sips');

  const profiles = await loadProfiles();
  const tmpDir = await createTempDir();
  const jobs = [];

  if (args.mode === 'profiles' || args.mode === 'all') {
    jobs.push(...buildProfileJobs(profiles, args.limit));
  }

  if (args.mode === 'cities' || args.mode === 'all') {
    jobs.push(...buildCityJobs(profiles, args.limit));
  }

  if (!jobs.length) {
    console.log('No OG jobs were generated.');
    return;
  }

  let success = 0;
  let fallback = 0;
  let skipped = 0;

  await runWithPool(jobs, args.concurrency, async (job, idx) => {
    const outputPath = path.join(process.cwd(), 'public', job.outputRelativePath);

    if (args.skipExisting && (await fileExists(outputPath))) {
      skipped += 1;
      if ((idx + 1) % 25 === 0) {
        console.log(`[${idx + 1}/${jobs.length}] skipped existing ${job.kind} OG image`);
      }
      return;
    }

    await fs.mkdir(path.dirname(outputPath), { recursive: true });

    const rawDownloadPath = path.join(tmpDir, `${crypto.randomUUID()}-download`);

    try {
      await fetchToFile(job.imageUrl, rawDownloadPath);
      await processImageToOg(rawDownloadPath, outputPath, tmpDir);
      success += 1;
    } catch (error) {
      await fs.copyFile(DEFAULT_IMAGE, outputPath);
      fallback += 1;
      console.warn(`Fallback used for ${job.kind}: ${job.label} (${error.message})`);
    }

    if ((idx + 1) % 25 === 0 || idx + 1 === jobs.length) {
      console.log(`[${idx + 1}/${jobs.length}] processed`);
    }
  });

  await fs.rm(tmpDir, { recursive: true, force: true });

  console.log('---');
  console.log(`Mode: ${args.mode}`);
  console.log(`Jobs: ${jobs.length}`);
  console.log(`Generated: ${success}`);
  console.log(`Fallback copied: ${fallback}`);
  console.log(`Skipped existing: ${skipped}`);
  console.log('Output directories: public/images/og/profiles and public/images/og/cities');
}

main().catch((error) => {
  console.error('generate-og-images failed:', error.message);
  process.exitCode = 1;
});
