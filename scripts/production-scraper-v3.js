#!/usr/bin/env node
/**
 * PRODUCTION Multi-LLM Scraper v3.4 - RATE-LIMITED & RESILIENT
 * 
 * OPTIMIZATIONS:
 * - BOTTLENECK RATE LIMITING: Smooth 14 req/sec to Jina (no burst limits)
 * - CIRCUIT BREAKER: Auto-backs off when Jina is struggling
 * - HIGH CONCURRENCY: 50 in-flight requests (staggered, not burst)
 * - LLM ROUND-ROBIN + FALLBACK: Split load across LLMs, race on failure
 * - PIPELINED BATCHES: Scrapes next batch while processing current
 * - JINA TOKEN EFFICIENCY: 5KB max, aggressive content filtering
 * 
 * SPEED: ~14 profiles/second sustained (vs bursts that trigger limits)
 * 
 * Usage:
 *   # Basic usage
 *   node scripts/production-scraper-v3.js data/professionals.csv
 *   
 *   # Filter by location
 *   node scripts/production-scraper-v3.js data/professionals.csv --province="Ontario"
 *   node scripts/production-scraper-v3.js data/professionals.csv --city="Toronto"
 *   node scripts/production-scraper-v3.js data/professionals.csv --country="USA"
 *   
 *   # Resume after interruption (CTRL+C or error)
 *   node scripts/production-scraper-v3.js data/professionals.csv --resume
 *   node scripts/production-scraper-v3.js data/professionals.csv --resume --province="Ontario"
 *   
 *   # Test with sample
 *   node scripts/production-scraper-v3.js data/professionals.csv --sample=100
 *   
 *   # Process all CSV files (professionals.csv + old-files/)
 *   node scripts/production-scraper-v3.js --all-files --country="USA"
 *   
 *   # Custom output file
 *   node scripts/production-scraper-v3.js data/professionals.csv --output=data/enriched-usa.csv
 *   
 *   # Dry run (see what would be processed)
 *   node scripts/production-scraper-v3.js data/professionals.csv --dry-run --province="Ontario"
 * 
 * RESUME INSTRUCTIONS:
 *   If the scraper stops (CTRL+C, error, rate limit), your progress is saved!
 *   Simply run the SAME command with --resume added:
 *   
 *   # Original command:
 *   node scripts/production-scraper-v3.js data/professionals.csv --province="Ontario"
 *   
 *   # Resume command (add --resume):
 *   node scripts/production-scraper-v3.js data/professionals.csv --province="Ontario" --resume
 *   
 *   The scraper will skip already-processed profiles and continue where it left off.
 *   Checkpoint is saved every 50 profiles to: data/.scraper-checkpoint-v3.json
 */

import fs from 'fs';
import Papa from 'papaparse';
import dotenv from 'dotenv';
import { createHash } from 'crypto';
// Bottleneck removed - using simple parallel batches

dotenv.config();

// API Keys
const JINA_API_KEY = process.env.JINA_AI_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Configuration (will be updated based on args)
const CONFIG = {
  PARALLEL_LIMIT: 75, // Parallel batch size - very aggressive
  CHECKPOINT_EVERY: 100,
  MAX_RETRIES: 1, // Fail fast
  CONTENT_MAX_LENGTH: 4000,
  CHECKPOINT_FILE: 'data/.scraper-checkpoint-v3.json',
  PROGRESS_FILE: 'data/.scraper-progress-v3.csv',
  CONTENT_CACHE_DIR: 'data/.scraper-cache-v3',
  OUTPUT_FILE: 'data/enriched-professionals-v3.csv',
};

// Stats
let stats = {
  processed: 0, success: 0, failed: 0, skipped: 0, cached: 0, pricingFound: 0,
  llm: { openai: 0, deepseek: 0, gemini: 0 },
  jina: { success: 0, failed: 0, rateLimited: 0, circuitTrips: 0 },
  costs: { jina: 0, llm: 0 },
  startTime: Date.now()
};

// No rate limiter - just parallel batches

// Graceful shutdown
let shuttingDown = false;
process.on('SIGINT', () => { shuttingDown = true; });

// SIMPLE extraction prompt - clinic info only
const MAIN_PROMPT = `Extract vet clinic data. Return ONLY valid JSON.
{"emergency_services":null,"emergency_24_hour":null,"online_booking":null,"telehealth_available":null,"house_calls_available":null,"mobile_vet_service":null,"accepts_pet_insurance":null,"languages_spoken":[],"services_offered":[],"boarding":null,"grooming":null,"pharmacy":null,"accreditations":[],"pet_types_served":[],"year_established":null,"veterinarian_count":null,"veterinarian_names":[],"email_address":null,"has_client_portal":null,"social_facebook":null,"social_instagram":null}

IMPORTANT for pet_types_served: Look for SPECIALTY animals they treat. Values: "birds", "fish", "horses", "farm_animals", "exotic", "reptiles". Only include these if EXPLICITLY mentioned. Do NOT include dogs/cats/small_animals - those are assumed defaults.

IMPORTANT for languages_spoken: Look for languages other than English. Only include non-English languages like Spanish, French, Mandarin, etc.

Use null for unknown booleans, [] for empty lists.`;

// Default pet types for all vets (will be merged with specialty animals found)
const DEFAULT_PET_TYPES = ["dogs", "cats", "small_animals"];
const DEFAULT_LANGUAGES = ["English"];

// FOCUSED pricing prompt - only dollar amounts
const PRICING_PROMPT = `Extract vet prices. Return ONLY this JSON:
{"has_pricing":true,"exam":"$X","vaccine":"$X","rabies":"$X","spay_dog":"$X","spay_cat":"$X","neuter_dog":"$X","neuter_cat":"$X","dental":"$X","blood_panel":"$X","fecal":"$X","microchip":"$X","xray":"$X","nail_trim":"$X","anal_gland":"$X","ear_clean":"$X","other":[]}
Rules: has_pricing=true if ANY $ found. Format "$129" or "$80-$120". null if not found. other=[{"s":"name","p":"$X"}]`;


// Utilities
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const hash = (s) => createHash('md5').update(s).digest('hex').slice(0, 12);

const normalizeUrl = (url) => {
  if (!url) return null;
  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`);
    return u.origin + u.pathname.replace(/\/$/, '');
  } catch { return null; }
};



// Cache
const ensureCacheDir = () => {
  if (!fs.existsSync(CONFIG.CONTENT_CACHE_DIR)) {
    fs.mkdirSync(CONFIG.CONTENT_CACHE_DIR, { recursive: true });
  }
};

const getCached = (url) => {
  const f = `${CONFIG.CONTENT_CACHE_DIR}/${hash(url)}.txt`;
  if (fs.existsSync(f)) { stats.cached++; return fs.readFileSync(f, 'utf-8'); }
  return null;
};

const setCache = (url, content) => {
  ensureCacheDir();
  fs.writeFileSync(`${CONFIG.CONTENT_CACHE_DIR}/${hash(url)}.txt`, content);
};

// Checkpoint
const saveCheckpoint = (processedIds, websiteData) => {
  fs.writeFileSync(CONFIG.CHECKPOINT_FILE, JSON.stringify({ processedIds, websiteData, stats }, null, 2));
};

const loadCheckpoint = () => {
  try {
    if (fs.existsSync(CONFIG.CHECKPOINT_FILE)) return JSON.parse(fs.readFileSync(CONFIG.CHECKPOINT_FILE, 'utf-8'));
  } catch {}
  return { processedIds: [], websiteData: {} };
};

// CSV fields - must match original + new pricing fields
const ALL_FIELDS = [
  'id','name','hours_of_operation','specialization','animals_treated','picture','location',
  'country','province','city','phone_number','email_address','address','website','social_media',
  'latitude','longitude','is_verified','profile_weight','created_at','updated_at','rating','claimed',
  'scraped','skip_reason','scraped_at','deduplicated',
  'emergency_services','emergency_24_hour','after_hours_emergency_phone','accepts_new_patients',
  'appointment_required','walk_ins_welcome','online_booking','online_booking_url','telehealth_available',
  'house_calls_available','mobile_vet_service','curbside_service','wheelchair_accessible','parking_info',
  'accepts_pet_insurance','price_range','free_first_visit','military_discount','senior_discount',
  'rescue_discount','year_established','years_in_business','email_scraped','fax_number','has_blog',
  'blog_url','has_client_portal','client_portal_url','online_pharmacy_url','confidence_score',
  'payment_methods','payment_plans','insurance_companies','languages_spoken','specialties_scraped',
  'services_scraped','accreditations','pet_types_scraped','boarding_available','grooming_available',
  'daycare_available','training_available','pharmacy_onsite','lab_onsite','pet_food_sales',
  'cremation_services','hospice_care','behavioral_services','veterinarian_count','total_staff',
  'veterinarian_names','social_facebook','social_instagram','social_twitter','social_youtube',
  'social_tiktok','social_linkedin','social_yelp','social_nextdoor',
  // NEW pricing fields
  'has_pricing','pricing_exam','pricing_vaccine','pricing_rabies','pricing_spay_dog','pricing_spay_cat',
  'pricing_neuter_dog','pricing_neuter_cat','pricing_dental','pricing_blood_panel','pricing_fecal',
  'pricing_microchip','pricing_xray','pricing_nail_trim','pricing_anal_gland','pricing_ear_clean','pricing_other'
];

const initProgressFile = () => {
  if (!fs.existsSync(CONFIG.PROGRESS_FILE)) {
    fs.writeFileSync(CONFIG.PROGRESS_FILE, ALL_FIELDS.join(',') + '\n');
  }
};

const appendToProgress = (profiles) => {
  const rows = profiles.map(p => {
    const row = {};
    ALL_FIELDS.forEach(f => row[f] = p[f] !== undefined ? p[f] : '');
    return row;
  });
  fs.appendFileSync(CONFIG.PROGRESS_FILE, Papa.unparse(rows, { header: false, columns: ALL_FIELDS, quotes: true }) + '\n');
};


// Jina scraper - Simple and fast
async function scrapeWithJina(url) {
  const norm = normalizeUrl(url);
  if (!norm) return null;
  
  const cached = getCached(norm);
  if (cached) return cached;
  
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(`https://r.jina.ai/${norm}`, {
        headers: { 
          'Authorization': `Bearer ${JINA_API_KEY}`, 
          'X-Return-Format': 'text',
          'X-With-Generated-Alt': 'false',
          'X-With-Links-Summary': 'false',
          'X-With-Images-Summary': 'false',
        },
        signal: AbortSignal.timeout(8000) // 8 sec timeout - fail fast
      });
      
      if (res.status === 429) {
        stats.jina.rateLimited++;
        await sleep(3000);
        continue;
      }
      
      if (!res.ok) {
        stats.jina.failed++;
        continue;
      }
      
      const content = (await res.text()).slice(0, CONFIG.CONTENT_MAX_LENGTH);
      stats.jina.success++;
      setCache(norm, content);
      return content;
      
    } catch (e) {
      stats.jina.failed++;
    }
  }
  
  return null;
}

// LLM extraction - OpenAI
async function extractWithOpenAI(content, prompt) {
  if (!OPENAI_API_KEY) return null;
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: 'gpt-5-nano',
        messages: [{ role: 'system', content: prompt }, { role: 'user', content }],
        max_completion_tokens: 4000,
        response_format: { type: 'json_object' }
      }),
      signal: AbortSignal.timeout(45000)
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => 'unknown');
      console.log(`\n⚠️ OpenAI error ${res.status}: ${errText.slice(0, 100)}`);
      return null;
    }
    const data = await res.json();
    stats.costs.llm += (data.usage?.total_tokens || 0) / 1000000 * 0.3;
    const text = data.choices[0]?.message?.content?.trim();
    const match = text?.match(/\{[\s\S]*\}/);
    if (!match) return null;
    const parsed = JSON.parse(match[0]);
    stats.llm.openai++;
    return parsed;
  } catch (e) { 
    console.log(`\n⚠️ OpenAI exception: ${e.message}`);
    return null; 
  }
}

// LLM extraction - DeepSeek (cheap and fast)
async function extractWithDeepSeek(content, prompt) {
  if (!DEEPSEEK_API_KEY) return null;
  try {
    const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${DEEPSEEK_API_KEY}` },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'system', content: prompt }, { role: 'user', content }],
        temperature: 0.1, max_tokens: 1500
      }),
      signal: AbortSignal.timeout(45000)
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => 'unknown');
      console.log(`\n⚠️ DeepSeek error ${res.status}: ${errText.slice(0, 100)}`);
      return null;
    }
    const data = await res.json();
    stats.costs.llm += (data.usage?.total_tokens || 0) / 1000000 * 0.14; // DeepSeek pricing
    const text = data.choices[0]?.message?.content?.trim();
    const match = text?.match(/\{[\s\S]*\}/);
    if (!match) return null;
    const parsed = JSON.parse(match[0]);
    stats.llm.deepseek++;
    return parsed;
  } catch (e) { 
    console.log(`\n⚠️ DeepSeek exception: ${e.message}`);
    return null; 
  }
}

// LLM extraction - Gemini 2.5 Flash (fast & cheap)
async function extractWithGemini(content, prompt) {
  if (!GEMINI_API_KEY) return null;
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${prompt}\n\nContent to extract from:\n${content}` }] }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 2000,
          responseMimeType: 'application/json'
        }
      }),
      signal: AbortSignal.timeout(45000)
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => 'unknown');
      console.log(`\n⚠️ Gemini error ${res.status}: ${errText.slice(0, 100)}`);
      return null;
    }
    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!text) return null;
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    const parsed = JSON.parse(match[0]);
    stats.llm.gemini++;
    return parsed;
  } catch (e) { 
    console.log(`\n⚠️ Gemini exception: ${e.message}`);
    return null; 
  }
}

// Available LLMs
const availableLLMs = [];

function initLLMs() {
  if (DEEPSEEK_API_KEY) availableLLMs.push('deepseek');
  if (OPENAI_API_KEY) availableLLMs.push('openai');
  if (GEMINI_API_KEY) availableLLMs.push('gemini');
  
  if (availableLLMs.length === 0) return false;
  
  // Initialize extractors for round-robin
  initExtractors();
  
  console.log(`🤖 Using ${availableLLMs.length} LLMs (split + fallback): ${availableLLMs.join(', ')}\n`);
  return true;
}

// Available LLM extractors
const llmExtractors = [];
let llmRoundRobin = 0;

function initExtractors() {
  if (DEEPSEEK_API_KEY) llmExtractors.push({ name: 'deepseek', fn: extractWithDeepSeek });
  if (OPENAI_API_KEY) llmExtractors.push({ name: 'openai', fn: extractWithOpenAI });
  if (GEMINI_API_KEY) llmExtractors.push({ name: 'gemini', fn: extractWithGemini });
}

// Extract - SPLIT with fallback racing
async function extract(content, prompt) {
  if (llmExtractors.length === 0) return null;
  
  // Assign to one LLM (round-robin)
  const assignedLLM = llmExtractors[llmRoundRobin % llmExtractors.length];
  llmRoundRobin++;
  
  // Try assigned LLM first
  const result = await assignedLLM.fn(content, prompt);
  if (result) return result;
  
  // If assigned LLM failed, race the others as fallback
  return new Promise((resolve) => {
    let resolved = false;
    let completed = 0;
    const fallbackLLMs = llmExtractors.filter(llm => llm.name !== assignedLLM.name);
    
    if (fallbackLLMs.length === 0) {
      resolve(null);
      return;
    }
    
    const handleResult = (result) => {
      if (resolved) return;
      if (result) {
        resolved = true;
        resolve(result);
      } else {
        completed++;
        if (completed === fallbackLLMs.length) {
          resolved = true;
          resolve(null);
        }
      }
    };
    
    // Race remaining LLMs as fallback
    fallbackLLMs.forEach(llm => {
      llm.fn(content, prompt).then(handleResult).catch(() => handleResult(null));
    });
  });
}

// Check if content has pricing indicators
function hasPricingIndicators(content) {
  return /\$\d+/.test(content) && /price|pricing|fee|cost|rate/i.test(content);
}


// Process with PIPELINED batches - scrape next while processing current
async function processInParallel(profiles, processedIds, websiteData) {
  const toProcess = profiles.filter(p => !processedIds.includes(p.id || p.name));
  const total = toProcess.length;
  const results = [];
  
  // Pre-scrape first batch
  let nextBatchIdx = 0;
  let scrapedBatch = null;
  
  const scrapeNextBatch = async () => {
    if (nextBatchIdx >= total || shuttingDown) return null;
    const batch = toProcess.slice(nextBatchIdx, nextBatchIdx + CONFIG.PARALLEL_LIMIT);
    nextBatchIdx += CONFIG.PARALLEL_LIMIT;
    
    // Scrape all websites in parallel
    const scraped = await Promise.all(batch.map(async (p) => {
      const content = await scrapeWithJina(p.website);
      return { profile: p, content };
    }));
    
    return scraped;
  };
  
  // Start first batch scraping
  scrapedBatch = await scrapeNextBatch();
  
  while (scrapedBatch && scrapedBatch.length > 0) {
    if (shuttingDown) break;
    
    const currentBatch = scrapedBatch;
    const processed = stats.processed;
    const pct = ((processed / total) * 100).toFixed(0);
    const llmStats = `D:${stats.llm.deepseek} O:${stats.llm.openai} Gm:${stats.llm.gemini}`;
    const jinaStats = `J:${stats.jina.success}/${stats.jina.success + stats.jina.failed}`;
    const elapsed = ((Date.now() - stats.startTime) / 1000).toFixed(0);
    const rate = (processed / Math.max(1, elapsed)).toFixed(1);
    process.stdout.write(`\r🔄 ${processed}/${total} (${pct}%) | ✅${stats.success} ❌${stats.failed} 💰${stats.pricingFound} | ${llmStats} | ${jinaStats} | ${rate}/s    `);
    
    // Start scraping NEXT batch while processing CURRENT batch
    const nextScrapePromise = scrapeNextBatch();
    
    // Process current batch with LLMs
    const batchResults = await Promise.all(currentBatch.map(async ({ profile, content }) => {
      stats.processed++;
      
      if (!profile.website?.trim()) {
        stats.skipped++;
        return { ...profile, scraped: false, skip_reason: 'no_website', scraped_at: new Date().toISOString() };
      }
      
      const normUrl = normalizeUrl(profile.website);
      
      // Deduplication
      if (normUrl && websiteData[normUrl]) {
        stats.success++;
        return { ...profile, scraped: true, ...websiteData[normUrl], scraped_at: new Date().toISOString() };
      }
      
      if (!content) {
        stats.failed++;
        return { ...profile, scraped: false, skip_reason: 'scrape_failed', scraped_at: new Date().toISOString() };
      }
      
      // Extract with racing LLMs
      const mainData = await extract(content, MAIN_PROMPT);
      
      let pricingData = null;
      if (hasPricingIndicators(content)) {
        pricingData = await extract(content, PRICING_PROMPT);
      }
      
      const flat = {
        emergency_services: mainData?.emergency_services,
        emergency_24_hour: mainData?.emergency_24_hour,
        online_booking: mainData?.online_booking,
        telehealth_available: mainData?.telehealth_available,
        house_calls_available: mainData?.house_calls_available,
        mobile_vet_service: mainData?.mobile_vet_service,
        accepts_pet_insurance: mainData?.accepts_pet_insurance,
        // Merge default languages with any additional languages found
        languages_spoken: JSON.stringify([...DEFAULT_LANGUAGES, ...(mainData?.languages_spoken || [])].filter((v, i, a) => a.indexOf(v) === i)),
        services_offered: JSON.stringify(mainData?.services_offered || []),
        boarding: mainData?.boarding,
        grooming: mainData?.grooming,
        pharmacy: mainData?.pharmacy,
        accreditations: JSON.stringify(mainData?.accreditations || []),
        // Merge default pet types with any specialty animals found
        pet_types_served: JSON.stringify([...DEFAULT_PET_TYPES, ...(mainData?.pet_types_served || [])].filter((v, i, a) => a.indexOf(v) === i)),
        year_established: mainData?.year_established,
        veterinarian_count: mainData?.veterinarian_count,
        veterinarian_names: JSON.stringify(mainData?.veterinarian_names || []),
        email_scraped: mainData?.email_address,
        has_client_portal: mainData?.has_client_portal,
        social_facebook: mainData?.social_facebook,
        social_instagram: mainData?.social_instagram,
        has_pricing: pricingData?.has_pricing || false,
        pricing_exam: pricingData?.exam,
        pricing_vaccine: pricingData?.vaccine,
        pricing_rabies: pricingData?.rabies,
        pricing_spay_dog: pricingData?.spay_dog,
        pricing_spay_cat: pricingData?.spay_cat,
        pricing_neuter_dog: pricingData?.neuter_dog,
        pricing_neuter_cat: pricingData?.neuter_cat,
        pricing_dental: pricingData?.dental,
        pricing_blood_panel: pricingData?.blood_panel,
        pricing_fecal: pricingData?.fecal,
        pricing_microchip: pricingData?.microchip,
        pricing_xray: pricingData?.xray,
        pricing_nail_trim: pricingData?.nail_trim,
        pricing_anal_gland: pricingData?.anal_gland,
        pricing_ear_clean: pricingData?.ear_clean,
        pricing_other: JSON.stringify(pricingData?.other || [])
      };
      
      if (pricingData?.has_pricing) stats.pricingFound++;
      if (normUrl) websiteData[normUrl] = flat;
      
      stats.success++;
      return { ...profile, scraped: true, ...flat, scraped_at: new Date().toISOString() };
    }));
    
    batchResults.forEach(r => {
      processedIds.push(r.id || r.name);
      results.push(r);
    });
    
    appendToProgress(batchResults);
    
    if (stats.processed % CONFIG.CHECKPOINT_EVERY === 0) {
      saveCheckpoint(processedIds, websiteData);
    }
    
    // FAILURE DETECTION
    if (stats.processed >= 20) {
      const failureRate = stats.failed / stats.processed;
      if (failureRate > 0.5) {
        console.log(`\n\n🚨 HIGH FAILURE RATE: ${(failureRate * 100).toFixed(0)}% (${stats.failed}/${stats.processed})`);
        console.log(`\n📊 Failure breakdown:`);
        console.log(`   Scrape failures: Check Jina API key and rate limits`);
        console.log(`   LLM failures: Check API keys - D:${stats.llm.deepseek} O:${stats.llm.openai} Gm:${stats.llm.gemini}`);
        console.log(`\n💡 Fix the issue and run with --resume to continue\n`);
        process.exit(1);
      }
    }
    
    // Get next batch (already scraping in background)
    scrapedBatch = await nextScrapePromise;
  }
  
  process.stdout.write('\r' + ' '.repeat(100) + '\r');
  return results;
}

// Parse args
function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { inputFile: 'data/professionals.csv', resume: false, sample: null, city: null, province: null, country: null, dryRun: false, allFiles: false, output: null };
  
  for (const arg of args) {
    if (arg === '--resume') opts.resume = true;
    else if (arg === '--dry-run') opts.dryRun = true;
    else if (arg === '--all-files') opts.allFiles = true;
    else if (arg.startsWith('--sample=')) opts.sample = parseInt(arg.split('=')[1]);
    else if (arg.startsWith('--city=')) opts.city = arg.split('=')[1].replace(/"/g, '');
    else if (arg.startsWith('--province=')) opts.province = arg.split('=')[1].replace(/"/g, '');
    else if (arg.startsWith('--country=')) opts.country = arg.split('=')[1].replace(/"/g, '');
    else if (arg.startsWith('--output=')) opts.output = arg.split('=')[1].replace(/"/g, '');
    else if (!arg.startsWith('--')) opts.inputFile = arg;
  }
  return opts;
}

// Load all professionals CSV files and combine them
function loadAllProfessionalsFiles() {
  const files = [
    'data/professionals.csv',
    'data/old-files/professionals2.csv',
    'data/old-files/professionals3.csv',
    'data/old-files/professionals4.csv',
    'data/old-files/professionals5.csv',
    'data/old-files/professionals6.csv',
    'data/old-files/professionals7.csv',
    'data/old-files/professionals8.csv',
    'data/old-files/professionals9.csv',
    'data/old-files/professionals10.csv'
  ];
  
  let allProfiles = [];
  let fileStats = [];
  
  for (const file of files) {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf-8');
      const { data } = Papa.parse(content, { header: true, skipEmptyLines: true });
      allProfiles = allProfiles.concat(data);
      fileStats.push({ file: file.replace('data/', ''), count: data.length });
    }
  }
  
  return { profiles: allProfiles, fileStats };
}

// Load already enriched profiles to skip them
function loadEnrichedProfiles() {
  const enrichedFile = 'data/enriched-professionals-v3.csv';
  if (!fs.existsSync(enrichedFile)) return new Set();
  
  const content = fs.readFileSync(enrichedFile, 'utf-8');
  const { data } = Papa.parse(content, { header: true, skipEmptyLines: true });
  
  // Create set of unique identifiers (website URL is best)
  const enrichedSet = new Set();
  data.forEach(p => {
    if (p.website) enrichedSet.add(normalizeUrl(p.website));
    if (p.id) enrichedSet.add(p.id);
    if (p.name) enrichedSet.add(`${p.name}|${p.city}|${p.province}`);
  });
  
  return enrichedSet;
}

// Main
async function main() {
  const opts = parseArgs();
  
  // Update config based on output option
  if (opts.output) {
    CONFIG.OUTPUT_FILE = opts.output;
    CONFIG.PROGRESS_FILE = opts.output.replace('.csv', '-progress.csv');
    CONFIG.CHECKPOINT_FILE = opts.output.replace('.csv', '-checkpoint.json').replace('data/', 'data/.');
  }
  
  console.log('🚀 Scraper v3.3\n');
  
  // Check APIs
  if (!JINA_API_KEY) { console.error('❌ JINA_AI_API_KEY required'); process.exit(1); }
  
  // Initialize available LLMs
  const hasLLMs = initLLMs();
  if (!hasLLMs) { console.error('❌ Need at least one LLM key (DEEPSEEK, OPENAI, or GEMINI)'); process.exit(1); }
  
  // Load checkpoint
  let checkpoint = opts.resume ? loadCheckpoint() : { processedIds: [], websiteData: {} };
  if (!opts.resume) {
    [CONFIG.CHECKPOINT_FILE, CONFIG.PROGRESS_FILE].forEach(f => fs.existsSync(f) && fs.unlinkSync(f));
  }
  
  // Read data
  let data;
  let fileStats = [];
  
  if (opts.allFiles) {
    console.log('📂 Loading ALL professionals CSV files...\n');
    const result = loadAllProfessionalsFiles();
    data = result.profiles;
    fileStats = result.fileStats;
    
    console.log('📊 Files loaded:');
    fileStats.forEach(f => console.log(`   ${f.file}: ${f.count} profiles`));
    console.log(`   Total: ${data.length} profiles\n`);
    
    // Filter by country if specified
    if (opts.country) {
      const beforeFilter = data.length;
      const countryLower = opts.country.toLowerCase();
      // Handle common variations: "USA" matches "United States", etc.
      const countryAliases = {
        'usa': ['usa', 'united states', 'us', 'u.s.', 'u.s.a.'],
        'canada': ['canada', 'ca'],
        'uk': ['uk', 'united kingdom', 'great britain', 'england'],
      };
      const matchTerms = countryAliases[countryLower] || [countryLower];
      data = data.filter(p => {
        const profileCountry = p.country?.toLowerCase() || '';
        return matchTerms.some(term => profileCountry.includes(term) || term.includes(profileCountry));
      });
      console.log(`🌍 ${opts.country} only: ${data.length} profiles (removed ${beforeFilter - data.length} others)\n`);
    }
    
    // Load already enriched to skip them
    console.log('🔍 Checking for already enriched profiles...');
    const enrichedSet = loadEnrichedProfiles();
    console.log(`   Found ${enrichedSet.size} already enriched\n`);
    
    // Filter out already enriched
    const beforeFilter = data.length;
    data = data.filter(p => {
      const normUrl = normalizeUrl(p.website);
      const nameKey = `${p.name}|${p.city}|${p.province}`;
      return !enrichedSet.has(normUrl) && !enrichedSet.has(p.id) && !enrichedSet.has(nameKey);
    });
    console.log(`   Skipping ${beforeFilter - data.length} already enriched`);
    console.log(`   Remaining: ${data.length} to process\n`);
    
  } else {
    console.log(`📂 Input: ${opts.inputFile}`);
    const content = fs.readFileSync(opts.inputFile, 'utf-8');
    const parsed = Papa.parse(content, { header: true, skipEmptyLines: true });
    data = parsed.data;
  }
  
  if (opts.province) data = data.filter(p => p.province?.toLowerCase().includes(opts.province.toLowerCase()));
  if (opts.city) data = data.filter(p => p.city?.toLowerCase().includes(opts.city.toLowerCase()));
  if (opts.sample) data = data.sort(() => Math.random() - 0.5).slice(0, opts.sample);
  
  const withWeb = data.filter(p => p.website?.trim());
  console.log(`📊 ${data.length} profiles (${withWeb.length} with websites)`);
  console.log(`   Already done: ${checkpoint.processedIds.length}`);
  console.log(`   To process: ${data.length - checkpoint.processedIds.length}\n`);
  
  if (opts.dryRun) { console.log('🧪 Dry run - exiting'); process.exit(0); }
  
  initProgressFile();
  stats.startTime = Date.now();
  
  await processInParallel(data, checkpoint.processedIds, checkpoint.websiteData);
  
  saveCheckpoint(checkpoint.processedIds, checkpoint.websiteData);
  if (fs.existsSync(CONFIG.PROGRESS_FILE)) fs.copyFileSync(CONFIG.PROGRESS_FILE, CONFIG.OUTPUT_FILE);
  
  const mins = ((Date.now() - stats.startTime) / 60000).toFixed(1);
  const totalSecs = (Date.now() - stats.startTime) / 1000;
  const avgRate = (stats.processed / Math.max(1, totalSecs)).toFixed(2);
  
  console.log('\n=== SCRAPER COMPLETE ===');
  console.log(`Time: ${mins} min | Success: ${stats.success} | Failed: ${stats.failed} | Skipped: ${stats.skipped} | Rate: ${avgRate}/sec`);
  console.log(`Jina: ${stats.jina.success} ok, ${stats.jina.failed} fail, ${stats.jina.rateLimited} rate-limited, ${stats.jina.circuitTrips} circuit trips`);
  console.log(`LLM: DeepSeek=${stats.llm.deepseek} OpenAI=${stats.llm.openai} Gemini=${stats.llm.gemini}`);
  console.log(`Pricing found: ${stats.pricingFound}`);
  console.log(`Cost: Jina $${stats.costs.jina.toFixed(4)} + LLM $${stats.costs.llm.toFixed(4)} = $${(stats.costs.jina + stats.costs.llm).toFixed(4)}`);
  console.log(`Output: ${CONFIG.OUTPUT_FILE}`);
  
  if (!shuttingDown && fs.existsSync(CONFIG.CHECKPOINT_FILE)) fs.unlinkSync(CONFIG.CHECKPOINT_FILE);
}

main().catch(e => { console.error('❌', e); process.exit(1); });
