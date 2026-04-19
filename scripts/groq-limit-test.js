#!/usr/bin/env node
/**
 * Groq Rate Limit Tester
 * 
 * Tests different strategies to find Groq's sweet spot:
 * - Test 1: Sequential (1 at a time with delays)
 * - Test 2: Small batches (5 concurrent)
 * - Test 3: Medium batches (10 concurrent)
 * - Test 4: Burst then wait
 * 
 * Goal: Find the pattern that lets us do 100+ successful calls
 */

import fs from 'fs';
import Papa from 'papaparse';
import dotenv from 'dotenv';

dotenv.config();

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const JINA_API_KEY = process.env.JINA_AI_API_KEY;

if (!GROQ_API_KEY) {
  console.error('❌ GROQ_API_KEY required in .env');
  process.exit(1);
}

// Simple extraction prompt
const PROMPT = `Extract vet clinic data. Return ONLY valid JSON.
{"emergency_services":null,"online_booking":null,"services_offered":[],"pet_types_served":[]}
Use null for unknown, [] for empty lists.`;

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// Stats tracking
let stats = {
  success: 0,
  failed: 0,
  rateLimited: 0,
  errors: [],
  responseTimes: []
};

// Single Groq call with detailed error tracking
async function callGroq(content, callId) {
  const start = Date.now();
  
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        'Authorization': `Bearer ${GROQ_API_KEY}` 
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: PROMPT }, 
          { role: 'user', content: content.slice(0, 3000) }
        ],
        temperature: 0.1, 
        max_tokens: 500,
        response_format: { type: 'json_object' }
      }),
      signal: AbortSignal.timeout(30000)
    });
    
    const elapsed = Date.now() - start;
    
    if (!res.ok) {
      const errText = await res.text().catch(() => 'unknown');
      
      if (res.status === 429) {
        stats.rateLimited++;
        // Parse rate limit headers if available
        const retryAfter = res.headers.get('retry-after');
        const remaining = res.headers.get('x-ratelimit-remaining-requests');
        const reset = res.headers.get('x-ratelimit-reset-requests');
        
        return { 
          success: false, 
          error: '429', 
          callId, 
          elapsed,
          retryAfter,
          remaining,
          reset,
          message: errText.slice(0, 200)
        };
      }
      
      stats.failed++;
      stats.errors.push({ status: res.status, message: errText.slice(0, 100) });
      return { success: false, error: res.status, callId, elapsed };
    }
    
    const data = await res.json();
    const text = data.choices[0]?.message?.content?.trim();
    const match = text?.match(/\{[\s\S]*\}/);
    
    if (!match) {
      stats.failed++;
      return { success: false, error: 'no_json', callId, elapsed };
    }
    
    JSON.parse(match[0]); // Validate JSON
    stats.success++;
    stats.responseTimes.push(elapsed);
    
    return { success: true, callId, elapsed };
    
  } catch (e) {
    stats.failed++;
    return { success: false, error: e.message, callId, elapsed: Date.now() - start };
  }
}

// Get sample content from cached files or scrape fresh
async function getSampleContent(count) {
  const cacheDir = 'data/.scraper-cache-v3';
  const samples = [];
  
  // Try to use cached content first
  if (fs.existsSync(cacheDir)) {
    const files = fs.readdirSync(cacheDir).slice(0, count);
    for (const file of files) {
      const content = fs.readFileSync(`${cacheDir}/${file}`, 'utf-8');
      if (content.length > 500) {
        samples.push(content);
      }
    }
  }
  
  // If not enough cached, use dummy content
  while (samples.length < count) {
    samples.push(`
      Welcome to Happy Paws Veterinary Clinic
      We offer emergency services 24/7
      Services: vaccinations, dental care, surgery, wellness exams
      We treat dogs, cats, birds, and exotic pets
      Online booking available at our website
      Call us at 555-1234
    `);
  }
  
  return samples.slice(0, count);
}

// Test 1: Sequential with variable delays
async function testSequential(samples, delayMs) {
  console.log(`\n📊 TEST: Sequential (${delayMs}ms delay between calls)`);
  console.log('─'.repeat(50));
  
  stats = { success: 0, failed: 0, rateLimited: 0, errors: [], responseTimes: [] };
  const startTime = Date.now();
  
  for (let i = 0; i < samples.length; i++) {
    const result = await callGroq(samples[i], i + 1);
    
    const status = result.success ? '✅' : (result.error === '429' ? '⏳' : '❌');
    process.stdout.write(`\r${status} ${i + 1}/${samples.length} | ✅${stats.success} ⏳${stats.rateLimited} ❌${stats.failed}`);
    
    if (result.error === '429') {
      // Wait 60 seconds max, not the full penalty
      const waitTime = Math.min(60000, result.retryAfter ? parseInt(result.retryAfter) * 1000 : 60000);
      console.log(`\n   Rate limited! Waiting ${waitTime/1000}s (ignoring ${result.retryAfter}s penalty)...`);
      await sleep(waitTime);
    } else {
      await sleep(delayMs);
    }
  }
  
  const elapsed = (Date.now() - startTime) / 1000;
  const avgResponse = stats.responseTimes.length > 0 
    ? (stats.responseTimes.reduce((a, b) => a + b, 0) / stats.responseTimes.length).toFixed(0)
    : 'N/A';
  
  console.log(`\n\n📈 Results:`);
  console.log(`   Success: ${stats.success}/${samples.length} (${((stats.success/samples.length)*100).toFixed(1)}%)`);
  console.log(`   Rate Limited: ${stats.rateLimited}`);
  console.log(`   Failed: ${stats.failed}`);
  console.log(`   Total Time: ${elapsed.toFixed(1)}s`);
  console.log(`   Avg Response: ${avgResponse}ms`);
  console.log(`   Throughput: ${(stats.success / elapsed * 60).toFixed(1)} calls/min`);
  
  return { success: stats.success, rateLimited: stats.rateLimited, elapsed, throughput: stats.success / elapsed * 60 };
}

// Test 2: Batched with delays between batches
async function testBatched(samples, batchSize, delayBetweenBatches) {
  console.log(`\n📊 TEST: Batched (${batchSize} concurrent, ${delayBetweenBatches}ms between batches)`);
  console.log('─'.repeat(50));
  
  stats = { success: 0, failed: 0, rateLimited: 0, errors: [], responseTimes: [] };
  const startTime = Date.now();
  
  for (let i = 0; i < samples.length; i += batchSize) {
    const batch = samples.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(samples.length / batchSize);
    
    process.stdout.write(`\rBatch ${batchNum}/${totalBatches} | ✅${stats.success} ⏳${stats.rateLimited} ❌${stats.failed}`);
    
    // Fire batch concurrently
    const results = await Promise.all(
      batch.map((content, idx) => callGroq(content, i + idx + 1))
    );
    
    // Check for rate limits
    const rateLimited = results.filter(r => r.error === '429');
    if (rateLimited.length > 0) {
      const waitTime = rateLimited[0].retryAfter ? parseInt(rateLimited[0].retryAfter) * 1000 : 10000;
      console.log(`\n   ${rateLimited.length} rate limited! Waiting ${waitTime}ms...`);
      await sleep(waitTime);
    } else {
      await sleep(delayBetweenBatches);
    }
  }
  
  const elapsed = (Date.now() - startTime) / 1000;
  const avgResponse = stats.responseTimes.length > 0 
    ? (stats.responseTimes.reduce((a, b) => a + b, 0) / stats.responseTimes.length).toFixed(0)
    : 'N/A';
  
  console.log(`\n\n📈 Results:`);
  console.log(`   Success: ${stats.success}/${samples.length} (${((stats.success/samples.length)*100).toFixed(1)}%)`);
  console.log(`   Rate Limited: ${stats.rateLimited}`);
  console.log(`   Failed: ${stats.failed}`);
  console.log(`   Total Time: ${elapsed.toFixed(1)}s`);
  console.log(`   Avg Response: ${avgResponse}ms`);
  console.log(`   Throughput: ${(stats.success / elapsed * 60).toFixed(1)} calls/min`);
  
  return { success: stats.success, rateLimited: stats.rateLimited, elapsed, throughput: stats.success / elapsed * 60 };
}

// Test 3: Burst then long wait
async function testBurstWait(samples, burstSize, waitAfterBurst) {
  console.log(`\n📊 TEST: Burst-Wait (${burstSize} burst, ${waitAfterBurst}ms wait)`);
  console.log('─'.repeat(50));
  
  stats = { success: 0, failed: 0, rateLimited: 0, errors: [], responseTimes: [] };
  const startTime = Date.now();
  
  for (let i = 0; i < samples.length; i += burstSize) {
    const batch = samples.slice(i, i + burstSize);
    const batchNum = Math.floor(i / burstSize) + 1;
    const totalBatches = Math.ceil(samples.length / burstSize);
    
    process.stdout.write(`\rBurst ${batchNum}/${totalBatches} | ✅${stats.success} ⏳${stats.rateLimited} ❌${stats.failed}`);
    
    // Fire burst as fast as possible
    const results = await Promise.all(
      batch.map((content, idx) => callGroq(content, i + idx + 1))
    );
    
    // Always wait after burst
    await sleep(waitAfterBurst);
  }
  
  const elapsed = (Date.now() - startTime) / 1000;
  
  console.log(`\n\n📈 Results:`);
  console.log(`   Success: ${stats.success}/${samples.length} (${((stats.success/samples.length)*100).toFixed(1)}%)`);
  console.log(`   Rate Limited: ${stats.rateLimited}`);
  console.log(`   Throughput: ${(stats.success / elapsed * 60).toFixed(1)} calls/min`);
  
  return { success: stats.success, rateLimited: stats.rateLimited, elapsed, throughput: stats.success / elapsed * 60 };
}

// Main test runner
async function main() {
  console.log('🧪 GROQ RATE LIMIT TESTER v2');
  console.log('═'.repeat(50));
  console.log(`\nGoal: Find sustainable rate (target: 20/min = 3s delay)\n`);
  
  // Get test samples
  const sampleCount = 30;
  console.log(`📥 Loading ${sampleCount} sample contents...`);
  const samples = await getSampleContent(sampleCount);
  console.log(`✅ Got ${samples.length} samples\n`);
  
  const results = [];
  
  // Test: Sequential with 3 second delay (target 20/min)
  console.log('\n' + '═'.repeat(50));
  console.log('TEST: Sequential 3s delay (target ~20/min)');
  console.log('═'.repeat(50));
  results.push({ 
    name: 'Sequential 3s', 
    ...await testSequential(samples, 3000) 
  });
  
  // Summary
  console.log('\n\n' + '═'.repeat(50));
  console.log('📊 RESULT');
  console.log('═'.repeat(50));
  
  const r = results[0];
  const successRate = (r.success / samples.length * 100).toFixed(1);
  
  console.log(`\n   Success: ${r.success}/${samples.length} (${successRate}%)`);
  console.log(`   Rate Limited: ${r.rateLimited}`);
  console.log(`   Throughput: ${r.throughput.toFixed(1)} calls/min`);
  
  if (r.rateLimited === 0 && r.success >= samples.length * 0.9) {
    console.log('\n✅ GROQ IS VIABLE at 3s delay (~20/min)');
    console.log('   Recommendation: Add Groq as slow-lane processor');
  } else if (r.rateLimited > 0) {
    console.log('\n⚠️ GROQ STILL RATE LIMITED even at 3s delay');
    console.log('   Recommendation: Remove Groq or use only for cleanup');
  } else {
    console.log('\n❌ GROQ NOT RELIABLE');
    console.log('   Recommendation: Remove Groq from scraper');
  }
}

main().catch(e => { console.error('❌', e); process.exit(1); });
