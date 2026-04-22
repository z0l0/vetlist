#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

const TARGET_FILE = process.argv[2] || 'data/professionals-canada.csv';
const DATA_FILE = path.isAbsolute(TARGET_FILE) ? TARGET_FILE : path.join(process.cwd(), TARGET_FILE);
const BACKUP_FILE = `${DATA_FILE}.bak`;

function parseCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}

function formatTime(totalMinutes) {
  const minutesInDay = 24 * 60;
  const normalized = ((totalMinutes % minutesInDay) + minutesInDay) % minutesInDay;
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function parseTime(value) {
  const match = String(value || '').trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function normalizeRange(range) {
  if (typeof range !== 'string' || !range.includes('-')) return { changed: false, value: range };

  const [openRaw, closeRaw] = range.split('-').map((value) => String(value || '').trim());
  const open = parseTime(openRaw);
  const close = parseTime(closeRaw);

  if (open == null || close == null) return { changed: false, value: range };

  const openHour = Math.floor(open / 60);
  const closeHour = Math.floor(close / 60);
  const duration = close - open;

  // Fix obvious "9 instead of 9pm" style closes.
  if (close > open && duration > 0 && duration <= 180 && openHour >= 7 && openHour <= 11 && closeHour >= 1 && closeHour <= 11) {
    const pmClose = close + 12 * 60;
    if (pmClose > open) {
      return { changed: true, value: `${formatTime(open)}-${formatTime(pmClose)}` };
    }
  }

  // Fix rows where the close time is earlier than the open time but the pattern clearly
  // looks like a daytime clinic, not an overnight business.
  if (close <= open && openHour >= 7 && openHour <= 11 && closeHour >= 1 && closeHour <= 11) {
    const pmClose = close + 12 * 60;
    if (pmClose > open) {
      return { changed: true, value: `${formatTime(open)}-${formatTime(pmClose)}` };
    }
  }

  return { changed: false, value: range };
}

function normalizeHours(hoursValue) {
  if (!hoursValue || typeof hoursValue !== 'object') return { changed: false, value: hoursValue };

  let changed = false;
  const normalized = {};

  for (const [day, ranges] of Object.entries(hoursValue)) {
    if (!Array.isArray(ranges)) {
      normalized[day] = ranges;
      continue;
    }

    const nextRanges = [];
    for (const range of ranges) {
      const result = normalizeRange(range);
      if (result.changed) changed = true;
      nextRanges.push(result.value);
    }

    // Merge common split-hour artifacts like ["08:00-23:59", "00:00-01:00"] into one range.
    if (nextRanges.length === 2) {
      const [first, second] = nextRanges;
      if (
        typeof first === 'string' &&
        typeof second === 'string' &&
        first.endsWith('-23:59') &&
        second.startsWith('00:00-')
      ) {
        const [openRaw] = first.split('-');
        const [, closeRaw] = second.split('-');
        const open = parseTime(openRaw);
        const close = parseTime(closeRaw);
        if (open != null && close != null) {
          const merged = `${formatTime(open)}-${formatTime(close)}`;
          normalized[day] = [merged];
          changed = true;
          continue;
        }
      }
    }

    normalized[day] = nextRanges;
  }

  return { changed, value: normalized };
}

function main() {
  if (!fs.existsSync(DATA_FILE)) {
    throw new Error(`Missing data file: ${DATA_FILE}`);
  }

  if (!fs.existsSync(BACKUP_FILE)) {
    fs.copyFileSync(DATA_FILE, BACKUP_FILE);
  }

  const input = fs.readFileSync(DATA_FILE, 'utf8');
  const lines = input.split(/\r?\n/);
  if (!lines.length) return;

  const header = parseCsvLine(lines[0]);
  const hoursIndex = header.indexOf('hours_of_operation');
  if (hoursIndex === -1) {
    throw new Error('hours_of_operation column not found');
  }

  let rowsChanged = 0;
  let rangesChanged = 0;
  const output = [lines[0]];

  for (let i = 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line.trim()) {
      output.push(line);
      continue;
    }

    const row = parseCsvLine(line);
    const rawHours = row[hoursIndex];
    if (rawHours && rawHours.trim().startsWith('{')) {
      try {
        const hours = JSON.parse(rawHours);
        const { changed, value } = normalizeHours(hours);
        if (changed) {
          row[hoursIndex] = JSON.stringify(value);
          rowsChanged += 1;
          rangesChanged += 1;
        }
      } catch {
        // Leave malformed rows untouched.
      }
    }

    output.push(row.map((cell) => `"${String(cell || '').replace(/"/g, '""')}"`).join(','));
  }

  fs.writeFileSync(DATA_FILE, output.join('\n') + '\n', 'utf8');

  console.log(JSON.stringify({
    file: DATA_FILE,
    backup: BACKUP_FILE,
    rowsChanged,
    rangesChanged,
  }, null, 2));
}

main();
