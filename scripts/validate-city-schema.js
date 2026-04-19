#!/usr/bin/env node

/**
 * Schema Validation Script for City Pages
 * Validates ItemList and VeterinaryCare schema markup
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ANSI color codes for terminal output
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

function validateSchema(htmlPath) {
  log(`\n${'='.repeat(80)}`, 'cyan');
  log(`Validating: ${htmlPath}`, 'blue');
  log('='.repeat(80), 'cyan');

  if (!fs.existsSync(htmlPath)) {
    log(`❌ File not found: ${htmlPath}`, 'red');
    return false;
  }

  const html = fs.readFileSync(htmlPath, 'utf-8');
  
  // Extract JSON-LD schema
  const schemaMatch = html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s);
  
  if (!schemaMatch) {
    log('❌ No JSON-LD schema found', 'red');
    return false;
  }

  let schema;
  try {
    schema = JSON.parse(schemaMatch[1]);
  } catch (e) {
    log(`❌ Invalid JSON in schema: ${e.message}`, 'red');
    return false;
  }

  let errors = 0;
  let warnings = 0;

  // Validate ItemList schema
  log('\n📋 Validating ItemList Schema...', 'cyan');
  
  if (schema['@type'] !== 'ItemList') {
    log('❌ Schema @type should be "ItemList"', 'red');
    errors++;
  } else {
    log('✅ Schema @type is "ItemList"', 'green');
  }

  if (!schema.name) {
    log('❌ Missing required field: name', 'red');
    errors++;
  } else {
    log(`✅ Name: ${schema.name}`, 'green');
  }

  if (!schema.numberOfItems || typeof schema.numberOfItems !== 'number') {
    log('❌ Missing or invalid numberOfItems', 'red');
    errors++;
  } else {
    log(`✅ Number of items: ${schema.numberOfItems}`, 'green');
  }

  if (!schema.itemListElement || !Array.isArray(schema.itemListElement)) {
    log('❌ Missing or invalid itemListElement array', 'red');
    errors++;
    return false;
  }

  log(`\n🏥 Validating ${schema.itemListElement.length} VeterinaryCare items...`, 'cyan');

  schema.itemListElement.forEach((listItem, index) => {
    const position = index + 1;
    log(`\n--- Item ${position} ---`, 'yellow');

    // Validate ListItem structure
    if (listItem['@type'] !== 'ListItem') {
      log(`❌ Item ${position}: @type should be "ListItem"`, 'red');
      errors++;
    }

    if (listItem.position !== position) {
      log(`❌ Item ${position}: position should be ${position}, got ${listItem.position}`, 'red');
      errors++;
    }

    const item = listItem.item;
    if (!item) {
      log(`❌ Item ${position}: Missing item object`, 'red');
      errors++;
      return;
    }

    // Validate VeterinaryCare schema
    if (item['@type'] !== 'VeterinaryCare') {
      log(`❌ Item ${position}: item @type should be "VeterinaryCare"`, 'red');
      errors++;
    }

    // Check required fields
    if (!item.name) {
      log(`❌ Item ${position}: Missing name`, 'red');
      errors++;
    } else {
      log(`✅ Item ${position}: ${item.name}`, 'green');
    }

    if (!item['@id']) {
      log(`❌ Item ${position}: Missing @id`, 'red');
      errors++;
    }

    if (!item.url) {
      log(`❌ Item ${position}: Missing url`, 'red');
      errors++;
    }

    // Validate address structure
    if (!item.address) {
      log(`❌ Item ${position}: Missing address`, 'red');
      errors++;
    } else {
      const addr = item.address;
      
      if (addr['@type'] !== 'PostalAddress') {
        log(`❌ Item ${position}: address @type should be "PostalAddress"`, 'red');
        errors++;
      }

      if (!addr.streetAddress) {
        log(`⚠️  Item ${position}: Missing streetAddress`, 'yellow');
        warnings++;
      }

      if (!addr.addressLocality) {
        log(`❌ Item ${position}: Missing addressLocality`, 'red');
        errors++;
      }

      if (!addr.addressRegion) {
        log(`❌ Item ${position}: Missing addressRegion`, 'red');
        errors++;
      }

      if (!addr.addressCountry) {
        log(`❌ Item ${position}: Missing addressCountry`, 'red');
        errors++;
      }
    }

    // Validate telephone
    if (!item.telephone) {
      log(`⚠️  Item ${position}: Missing telephone`, 'yellow');
      warnings++;
    }

    // Validate aggregateRating if present
    if (item.aggregateRating) {
      const rating = item.aggregateRating;

      if (rating['@type'] !== 'AggregateRating') {
        log(`❌ Item ${position}: aggregateRating @type should be "AggregateRating"`, 'red');
        errors++;
      }

      if (typeof rating.ratingValue !== 'number') {
        log(`❌ Item ${position}: ratingValue should be a number, got ${typeof rating.ratingValue}`, 'red');
        errors++;
      }

      if (typeof rating.ratingCount !== 'number') {
        log(`❌ Item ${position}: ratingCount should be a number, got ${typeof rating.ratingCount}`, 'red');
        errors++;
      }

      if (typeof rating.reviewCount !== 'number') {
        log(`❌ Item ${position}: reviewCount should be a number, got ${typeof rating.reviewCount}`, 'red');
        errors++;
      }

      if (!rating.bestRating) {
        log(`⚠️  Item ${position}: Missing bestRating`, 'yellow');
        warnings++;
      }

      if (!rating.worstRating) {
        log(`⚠️  Item ${position}: Missing worstRating`, 'yellow');
        warnings++;
      }
    }

    // Validate openingHoursSpecification if present
    if (item.openingHoursSpecification) {
      const hours = item.openingHoursSpecification;

      if (!Array.isArray(hours)) {
        log(`❌ Item ${position}: openingHoursSpecification should be an array`, 'red');
        errors++;
      } else {
        // Check for duplicate days
        const days = hours.map(h => h.dayOfWeek);
        const uniqueDays = new Set(days);
        
        if (days.length !== uniqueDays.size) {
          log(`❌ Item ${position}: Duplicate days in openingHoursSpecification`, 'red');
          errors++;
        }

        // Validate each hour entry
        hours.forEach((hour, idx) => {
          if (hour['@type'] !== 'OpeningHoursSpecification') {
            log(`❌ Item ${position}: Hour ${idx + 1} @type should be "OpeningHoursSpecification"`, 'red');
            errors++;
          }

          if (!hour.dayOfWeek) {
            log(`❌ Item ${position}: Hour ${idx + 1} missing dayOfWeek`, 'red');
            errors++;
          }

          if (!hour.opens) {
            log(`❌ Item ${position}: Hour ${idx + 1} missing opens`, 'red');
            errors++;
          }

          if (!hour.closes) {
            log(`❌ Item ${position}: Hour ${idx + 1} missing closes`, 'red');
            errors++;
          }
        });
      }
    }
  });

  // Summary
  log('\n' + '='.repeat(80), 'cyan');
  log('VALIDATION SUMMARY', 'cyan');
  log('='.repeat(80), 'cyan');
  
  if (errors === 0 && warnings === 0) {
    log('✅ All validations passed!', 'green');
    return true;
  } else {
    if (errors > 0) {
      log(`❌ ${errors} error(s) found`, 'red');
    }
    if (warnings > 0) {
      log(`⚠️  ${warnings} warning(s) found`, 'yellow');
    }
    return errors === 0;
  }
}

// Main execution
const args = process.argv.slice(2);

if (args.length === 0) {
  // Default: validate a few sample city pages
  const sampleCities = [
    'dist/canada/british-columbia/victoria/index.html',
    'dist/canada/british-columbia/vancouver/index.html',
    'dist/canada/british-columbia/kelowna/index.html',
  ];

  log('🔍 Validating sample city pages...', 'blue');
  
  let allPassed = true;
  sampleCities.forEach(city => {
    if (fs.existsSync(city)) {
      const passed = validateSchema(city);
      if (!passed) allPassed = false;
    } else {
      log(`\n⚠️  Skipping ${city} (not found)`, 'yellow');
    }
  });

  log('\n' + '='.repeat(80), 'cyan');
  if (allPassed) {
    log('✅ ALL SAMPLE CITIES PASSED VALIDATION', 'green');
    process.exit(0);
  } else {
    log('❌ SOME VALIDATIONS FAILED', 'red');
    process.exit(1);
  }
} else {
  // Validate specific file
  const passed = validateSchema(args[0]);
  process.exit(passed ? 0 : 1);
}
