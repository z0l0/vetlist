#!/usr/bin/env node
/**
 * Build ONE PERFECT city page - Scratch & Dent style
 * Simple list, real data, no AI slop
 */

import fs from 'fs';
import Papa from 'papaparse';

// Read Toronto vets
const csv = fs.readFileSync('data/professionals.csv', 'utf-8');
const { data } = Papa.parse(csv, { header: true });

const torontoVets = data.filter(v => 
  v.city === 'Toronto' && 
  v.province === 'Ontario' &&
  v.phone_number &&
  v.address
).slice(0, 50); // First 50

console.log(`Found ${torontoVets.length} Toronto vets with complete data`);

// Count special features
const emergency = torontoVets.filter(v => {
  const hours = JSON.parse(v.hours_of_operation || '{}');
  // Check if open late (past 8pm) or 24/7
  return Object.values(hours).some(h => 
    Array.isArray(h) && h.some(time => time.includes('23:') || time.includes('00:'))
  );
}).length;

const exotic = torontoVets.filter(v => {
  const animals = JSON.parse(v.animals_treated || '[]');
  return animals.some(a => ['birds', 'reptiles', 'exotic', 'small_animals'].includes(a));
}).length;

const highRated = torontoVets.filter(v => parseFloat(v.rating) >= 4.5).length;

console.log(`Stats: ${emergency} emergency, ${exotic} exotic, ${highRated} highly rated`);

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  
  <!-- SCRATCH & DENT FORMULA: Specific numbers + value prop -->
  <title>${torontoVets.length} Veterinarians in Toronto, ON | ${emergency} Emergency | ${highRated} Top-Rated</title>
  <meta name="description" content="Find ${torontoVets.length} veterinary clinics in Toronto, Ontario. ${emergency} offer emergency care, ${exotic} treat exotic pets, ${highRated} are highly rated. Compare hours, services & phone numbers.">
  
  <!-- SEO -->
  <link rel="canonical" href="https://vetlist.org/canada/ontario/toronto/">
  <meta name="robots" content="index, follow">
  
  <!-- Schema.org -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": "Veterinarians in Toronto, ON",
    "description": "Directory of ${torontoVets.length} veterinary clinics in Toronto, Ontario",
    "numberOfItems": ${torontoVets.length},
    "itemListElement": [
      ${torontoVets.map((vet, i) => `{
        "@type": "ListItem",
        "position": ${i + 1},
        "item": {
          "@type": "VeterinaryCare",
          "@id": "https://vetlist.org/canada/ontario/toronto/#${vet.id}",
          "name": "${vet.name.replace(/"/g, '\\"')}",
          "address": {
            "@type": "PostalAddress",
            "streetAddress": "${(vet.address || '').split(',')[0].replace(/"/g, '\\"')}",
            "addressLocality": "Toronto",
            "addressRegion": "ON",
            "addressCountry": "CA"
          },
          "telephone": "${vet.phone_number}",
          ${vet.rating ? `"aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": ${vet.rating},
            "bestRating": "5",
            "worstRating": "1",
            "ratingCount": 1,
            "reviewCount": 1
          },` : ''}
          "url": "https://vetlist.org/canada/ontario/toronto/"
        }
      }`).join(',\n      ')}
    ]
  }
  </script>
  
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-50">

<!-- Header with stats -->
<div class="bg-white border-b border-gray-200">
  <div class="max-w-7xl mx-auto px-4 py-6">
    <h1 class="text-3xl font-bold text-gray-900 mb-2">${torontoVets.length} Veterinarians in Toronto, Ontario</h1>
    <div class="flex flex-wrap gap-4 text-sm text-gray-600">
      <span>🚨 ${emergency} Emergency Care</span>
      <span>🦜 ${exotic} Exotic Pets</span>
      <span>⭐ ${highRated} Highly Rated (4.5+)</span>
    </div>
  </div>
</div>

<!-- Simple list - NO AI SLOP -->
<main class="max-w-7xl mx-auto px-4 py-6">
  <div class="space-y-3">
    ${torontoVets.map((vet, i) => {
      const animals = JSON.parse(vet.animals_treated || '[]');
      const services = JSON.parse(vet.specialization || '[]');
      const hours = JSON.parse(vet.hours_of_operation || '{}');
      const isEmergency = Object.values(hours).some(h => 
        Array.isArray(h) && h.some(time => time.includes('23:') || time.includes('00:'))
      );
      
      return `
    <div class="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div class="flex items-start justify-between gap-4">
        <div class="flex-1">
          <div class="flex items-center gap-2 mb-1">
            <h2 class="text-lg font-bold text-gray-900">${i + 1}. ${vet.name}</h2>
            ${isEmergency ? '<span class="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded">🚨 EMERGENCY</span>' : ''}
            ${vet.rating >= 4.5 ? '<span class="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs font-bold rounded">⭐ ' + vet.rating + '</span>' : ''}
          </div>
          
          <div class="space-y-1 text-sm text-gray-600 mb-2">
            <div>📍 ${vet.address}</div>
            <div>📞 <a href="tel:${vet.phone_number}" class="text-blue-600 hover:underline font-medium">${vet.phone_number}</a></div>
            ${vet.website ? `<div>🌐 <a href="${vet.website}" target="_blank" class="text-blue-600 hover:underline">${vet.website.replace('https://', '').replace('http://', '').split('/')[0]}</a></div>` : ''}
          </div>
          
          ${animals.length > 0 ? `
          <div class="flex flex-wrap gap-1 mb-2">
            ${animals.slice(0, 4).map(a => `<span class="px-2 py-0.5 bg-purple-50 text-purple-700 text-xs rounded">${a}</span>`).join('')}
          </div>
          ` : ''}
          
          ${services.length > 0 ? `
          <div class="text-xs text-gray-500">
            Services: ${services.slice(0, 3).join(', ')}
          </div>
          ` : ''}
        </div>
        
        <a href="tel:${vet.phone_number}" class="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors whitespace-nowrap">
          Call Now
        </a>
      </div>
    </div>
      `;
    }).join('\n')}
  </div>
</main>

<footer class="bg-white border-t border-gray-200 mt-12 py-6">
  <div class="max-w-7xl mx-auto px-4 text-center text-sm text-gray-600">
    <p>VetList.org - Find veterinarians in Toronto and across Canada</p>
  </div>
</footer>

</body>
</html>`;

fs.writeFileSync('public/SCRATCH-DENT-STYLE.html', html);
console.log('\n✅ Created: public/SCRATCH-DENT-STYLE.html');
console.log('📊 This is what ACTUALLY works - simple list, real data, no AI slop');
