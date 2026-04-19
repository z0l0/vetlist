#!/usr/bin/env node
/**
 * VetList Production Scraper - Enriches ALL 27K vets
 * Usage: node scripts/enrich-all-vets.js
 * 
 * What it does:
 * 1. Reads all professionals*.csv files
 * 2. Scrapes websites with Jina AI + DeepSeek
 * 3. Adds real data: emergency, services, payment plans, etc.
 * 4. Saves enriched data to data/enriched-professionals.csv
 * 5. Runs in parallel (50 at a time) with progress tracking
 */

import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';
import dotenv from 'dotenv';

dotenv.config();

const JINA_API_KEY = process.env.JINA_AI_API_KEY;
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const PARALLEL_LIMIT = 50; // Process 50 at a time
const BATCH_SIZE = 1000; // Save every 1000 profiles

// Cost tracking
let totalInputTokens = 0;
let totalOutputTokens = 0;
let successCount = 0;
let failCount = 0;
let skippedCount = 0;

const EXTRACTION_PROMPT = `Extract veterinary clinic data from website content. Return ONLY valid JSON.

EXTRACT (null if not found, don't guess):
{
  "emergency_services": true/false/null,
  "accepts_new_patients": true/false/null,
  "online_booking": true/false/null,
  "telehealth_available": true/false/null,
  "wheelchair_accessible": true/false/null,
  "payment_plans": ["CareCredit", "Scratchpay", etc] or [],
  "languages_spoken": ["English", "Spanish", etc] or [],
  "specialties": ["Exotic pets", "Dental", "Surgery", etc] or [],
  "services_offered": ["Wellness exams", "Vaccinations", "Surgery", etc] or [],
  "accreditations": ["AAHA Accredited", "Fear Free", etc] or [],
  "pet_types_served": ["Dogs", "Cats", "Birds", "Exotic", etc] or [],
  "insurance_accepted": [] or company names,
  "year_established": number or null,
  "parking_info": string or null,
  "staff_count": number or null,
  "confidence_score": 1-10
}`;

async function scrapeWithJina(url) {
  try {
    const response = await fetch(`https://r.jina.ai/${url}`, {
      headers: {
        'Authorization': `Bearer ${JINA_API_KEY}`,
        'Accept': 'text/plain'
      }
    });
    
    if (!response.ok) return null;
    const text = await response.text();
    return text.slice(0, 8000); // Limit to save tokens
  } catch (error) {
    return null;
  }
}

async function extractWithDeepSeek(content, clinicName) {
  try {
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: EXTRACTION_PROMPT },
          { role: 'user', content: `Extract data for "${clinicName}":\n\n${content}` }
        ],
        temperature: 0.1,
        max_tokens: 1000
      })
    });

    if (!response.ok) return null;
    const data = await response.json();
    
    totalInputTokens += data.usage?.prompt_tokens || 0;
    totalOutputTokens += data.usage?.completion_tokens || 0;
    
    const content_text = data.choices[0].message.content.trim();
    const jsonMatch = content_text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    
    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    return null;
  }
}

async function enrichProfile(profile) {
  // Skip if no website
  if (!profile.website || profile.website.trim() === '') {
    skippedCount++;
    return { ...profile, scraped: false, skip_reason: 'no_website' };
  }

  try {
    // Scrape website
    const content = await scrapeWithJina(profile.website);
    if (!content) {
      failCount++;
      return { ...profile, scraped: false, skip_reason: 'scrape_failed' };
    }

    // Extract data
    const extracted = await extractWithDeepSeek(content, profile.name);
    if (!extracted) {
      failCount++;
      return { ...profile, scraped: false, skip_reason: 'extraction_failed' };
    }

    successCount++;
    return {
      ...profile,
      scraped: true,
      emergency_services: extracted.emergency_services,
      accepts_new_patients: extracted.accepts_new_patients,
      online_booking: extracted.online_booking,
      telehealth_available: extracted.telehealth_available,
      wheelchair_accessible: extracted.wheelchair_accessible,
      payment_plans: JSON.stringify(extracted.payment_plans || []),
      languages_spoken: JSON.stringify(extracted.languages_spoken || []),
      specialties_scraped: JSON.stringify(extracted.specialties || []),
      services_scraped: JSON.stringify(extracted.services_offered || []),
      accreditations: JSON.stringify(extracted.accreditations || []),
      pet_types_scraped: JSON.stringify(extracted.pet_types_served || []),
      insurance_accepted: JSON.stringify(extracted.insurance_accepted || []),
      year_established: extracted.year_established,
      parking_info: extracted.parking_info,
      staff_count: extracted.staff_count,
      confidence_score: extracted.confidence_score,
      scraped_at: new Date().toISOString()
    };
  } catch (error) {
    failCount++;
    return { ...profile, scraped: false, skip_reason: 'error', error: error.message };
  }
}

async function processInParallel(profiles, limit) {
  const results = [];
  const total = profiles.length;
  let processed = 0;

  for (let i = 0; i < profiles.length; i += limit) {
    const batch = profiles.slice(i, i + limit);
    const batchResults = await Promise.all(batch.map(enrichProfile));
    results.push(...batchResults);
    
    processed += batch.length;
    const percent = ((processed / total) * 100).toFixed(1);
    const inputCost = (totalInputTokens / 1000000) * 0.14;
    const outputCost = (totalOutputTokens / 1000000) * 0.28;
    const totalCost = inputCost + outputCost;
    
    console.log(`Progress: ${processed}/${total} (${percent}%) | Success: ${successCount} | Failed: ${failCount} | Skipped: ${skippedCount} | Cost: $${totalCost.toFixed(2)}`);
    
    // Save checkpoint every BATCH_SIZE
    if (processed % BATCH_SIZE === 0) {
      saveCheckpoint(results, processed);
    }
  }

  return results;
}

function saveCheckpoint(results, count) {
  const checkpointPath = `data/enriched-checkpoint-${count}.csv`;
  const csv = Papa.unparse(results);
  fs.writeFileSync(checkpointPath, csv);
  console.log(`✅ Checkpoint saved: ${checkpointPath}`);
}

async function main() {
  console.log('🚀 VetList Production Scraper Starting...\n');

  // Read all CSV files
  const dataDir = 'data';
  const csvFiles = fs.readdirSync(dataDir)
    .filter(f => f.startsWith('professionals') && f.endsWith('.csv'))
    .map(f => path.join(dataDir, f));

  console.log(`📂 Found ${csvFiles.length} CSV files`);

  let allProfiles = [];
  for (const file of csvFiles) {
    const content = fs.readFileSync(file, 'utf-8');
    const parsed = Papa.parse(content, { header: true, skipEmptyLines: true });
    allProfiles.push(...parsed.data);
  }

  console.log(`📊 Total profiles: ${allProfiles.length}`);
  console.log(`🌐 Profiles with websites: ${allProfiles.filter(p => p.website && p.website.trim()).length}`);
  console.log(`⚙️  Parallel limit: ${PARALLEL_LIMIT}`);
  console.log(`💾 Checkpoint every: ${BATCH_SIZE} profiles\n`);

  const startTime = Date.now();

  // Process all profiles
  const enriched = await processInParallel(allProfiles, PARALLEL_LIMIT);

  // Save final results
  const outputPath = 'data/enriched-professionals.csv';
  const csv = Papa.unparse(enriched);
  fs.writeFileSync(outputPath, csv);

  const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
  const inputCost = (totalInputTokens / 1000000) * 0.14;
  const outputCost = (totalOutputTokens / 1000000) * 0.28;
  const totalCost = inputCost + outputCost;

  console.log('\n✅ COMPLETE!');
  console.log(`📁 Output: ${outputPath}`);
  console.log(`⏱️  Duration: ${duration} minutes`);
  console.log(`✅ Success: ${successCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log(`⏭️  Skipped: ${skippedCount}`);
  console.log(`💰 Total Cost: $${totalCost.toFixed(2)}`);
  console.log(`   Input tokens: ${totalInputTokens.toLocaleString()} ($${inputCost.toFixed(2)})`);
  console.log(`   Output tokens: ${totalOutputTokens.toLocaleString()} ($${outputCost.toFixed(2)})`);
}

main().catch(console.error);
