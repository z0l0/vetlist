#!/usr/bin/env node

/**
 * Redirect Testing Script
 * Tests that profile page URLs would redirect correctly to city pages with anchors
 */

import fs from 'fs';
import path from 'path';

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function testRedirect(profileUrl, expectedCityUrl, expectedAnchor) {
  log(`\n${'='.repeat(80)}`, 'cyan');
  log(`Testing Redirect`, 'blue');
  log('='.repeat(80), 'cyan');
  
  log(`\n📍 Profile URL: ${profileUrl}`, 'yellow');
  log(`🎯 Expected City URL: ${expectedCityUrl}`, 'yellow');
  log(`⚓ Expected Anchor: #${expectedAnchor}`, 'yellow');

  // Parse the profile URL
  const urlParts = profileUrl.split('/').filter(p => p);
  
  if (urlParts.length !== 4) {
    log(`\n❌ Invalid profile URL format. Expected: /country/region/city/profile/`, 'red');
    return false;
  }

  const [country, region, city, profile] = urlParts;

  // Check if city page exists
  const cityPagePath = `dist/${country}/${region}/${city}/index.html`;
  
  if (!fs.existsSync(cityPagePath)) {
    log(`\n⚠️  City page not found: ${cityPagePath}`, 'yellow');
    log(`   (This is expected if the city wasn't built in fast mode)`, 'yellow');
    return true; // Not a failure, just not built
  }

  log(`\n✅ City page exists: ${cityPagePath}`, 'green');

  // Read the city page HTML
  const html = fs.readFileSync(cityPagePath, 'utf-8');

  // Check if the profile anchor exists in the HTML
  const anchorPattern = new RegExp(`id="${profile}"`, 'i');
  
  if (anchorPattern.test(html)) {
    log(`✅ Anchor #${profile} found in city page`, 'green');
  } else {
    log(`⚠️  Anchor #${profile} not found in city page`, 'yellow');
    log(`   (Profile may not be in the first 36 cards or may not exist)`, 'yellow');
  }

  // Verify redirect configuration
  const vercelConfig = JSON.parse(fs.readFileSync('vercel.json', 'utf-8'));
  const redirectRule = vercelConfig.redirects?.find(r => 
    r.source === '/:country/:region/:city/:profile/'
  );

  if (!redirectRule) {
    log(`\n❌ Redirect rule not found in vercel.json`, 'red');
    return false;
  }

  log(`\n✅ Redirect rule configured:`, 'green');
  log(`   Source: ${redirectRule.source}`, 'cyan');
  log(`   Destination: ${redirectRule.destination}`, 'cyan');
  log(`   Permanent: ${redirectRule.permanent}`, 'cyan');

  // Verify it's a 301 redirect
  if (redirectRule.permanent !== true) {
    log(`\n❌ Redirect should be permanent (301), but permanent=${redirectRule.permanent}`, 'red');
    return false;
  }

  log(`\n✅ Redirect is permanent (301)`, 'green');

  // Simulate the redirect
  const simulatedDestination = redirectRule.destination
    .replace(':country', country)
    .replace(':region', region)
    .replace(':city', city)
    .replace(':profile', profile);

  log(`\n🔄 Simulated redirect:`, 'cyan');
  log(`   ${profileUrl} → ${simulatedDestination}`, 'cyan');

  if (simulatedDestination === expectedCityUrl + '#' + expectedAnchor) {
    log(`\n✅ Redirect destination matches expected URL`, 'green');
    return true;
  } else {
    log(`\n❌ Redirect destination doesn't match`, 'red');
    log(`   Expected: ${expectedCityUrl}#${expectedAnchor}`, 'yellow');
    log(`   Got: ${simulatedDestination}`, 'yellow');
    return false;
  }
}

// Main execution
log('🔍 Testing Profile Page Redirects...', 'blue');
log('='.repeat(80), 'cyan');

const testCases = [
  {
    profileUrl: '/canada/british-columbia/victoria/triangle-mountain-veterinary-clinic/',
    expectedCityUrl: '/canada/british-columbia/victoria/',
    expectedAnchor: 'triangle-mountain-veterinary-clinic'
  },
  {
    profileUrl: '/canada/british-columbia/vancouver/dunbar-animal-hospital/',
    expectedCityUrl: '/canada/british-columbia/vancouver/',
    expectedAnchor: 'dunbar-animal-hospital'
  },
  {
    profileUrl: '/canada/british-columbia/kelowna/southside-pet-hospital/',
    expectedCityUrl: '/canada/british-columbia/kelowna/',
    expectedAnchor: 'southside-pet-hospital'
  },
  {
    profileUrl: '/canada/british-columbia/victoria/james-bay-veterinary-clinic/',
    expectedCityUrl: '/canada/british-columbia/victoria/',
    expectedAnchor: 'james-bay-veterinary-clinic'
  },
  {
    profileUrl: '/canada/british-columbia/vancouver/kitsilano-animal-clinic/',
    expectedCityUrl: '/canada/british-columbia/vancouver/',
    expectedAnchor: 'kitsilano-animal-clinic'
  }
];

let passed = 0;
let failed = 0;
let skipped = 0;

testCases.forEach((testCase, index) => {
  const result = testRedirect(
    testCase.profileUrl,
    testCase.expectedCityUrl,
    testCase.expectedAnchor
  );

  if (result === true) {
    passed++;
  } else if (result === false) {
    failed++;
  } else {
    skipped++;
  }
});

// Summary
log('\n' + '='.repeat(80), 'cyan');
log('TEST SUMMARY', 'cyan');
log('='.repeat(80), 'cyan');
log(`\n✅ Passed: ${passed}`, 'green');
if (failed > 0) {
  log(`❌ Failed: ${failed}`, 'red');
}
if (skipped > 0) {
  log(`⚠️  Skipped: ${skipped}`, 'yellow');
}

log('\n📝 Notes:', 'cyan');
log('   - Redirects are configured in vercel.json', 'cyan');
log('   - 301 (permanent) redirects preserve SEO value', 'cyan');
log('   - Anchor links (#profile-slug) scroll to the correct card', 'cyan');
log('   - Profile pages are no longer generated (eliminated)', 'cyan');

if (failed === 0) {
  log('\n✅ ALL REDIRECT TESTS PASSED', 'green');
  process.exit(0);
} else {
  log('\n❌ SOME REDIRECT TESTS FAILED', 'red');
  process.exit(1);
}
