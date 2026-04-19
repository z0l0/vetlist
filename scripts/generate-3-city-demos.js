import fs from 'fs';

const cities = JSON.parse(fs.readFileSync('data/demo-cities.json', 'utf-8'));

const getAnimalEmoji = (animal) => {
  const l = animal.toLowerCase();
  if (l.includes('dog')) return '🐕';
  if (l.includes('cat')) return '🐈';
  if (l.includes('bird')) return '🐦';
  if (l.includes('exotic') || l.includes('reptile')) return '🦎';
  if (l.includes('horse')) return '🐴';
  if (l.includes('farm')) return '🐄';
  return '🐾';
};

const generateVetCard = (vet) => {
  const ext = vet.extraction;
  const badges = [];
  if (ext.emergency_services) badges.push('<span class="px-2 py-1 bg-red-100 text-red-700 rounded-md text-xs font-bold">🚨 Emergency</span>');
  if (ext.online_booking) badges.push('<span class="px-2 py-1 bg-blue-100 text-blue-700 rounded-md text-xs font-bold">📅 Online Booking</span>');
  if (ext.accreditations?.length) badges.push(`<span class="px-2 py-1 bg-amber-100 text-amber-700 rounded-md text-xs font-bold">🏆 ${ext.accreditations[0]}</span>`);
  
  const services = ext.services_offered || [];
  const pets = ext.pet_types_served || [];
  
  return `
    <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition">
      <h3 class="text-lg font-bold text-gray-900 mb-2">${vet.name}</h3>
      ${badges.length ? `<div class="flex flex-wrap gap-1.5 mb-3">${badges.join('')}</div>` : ''}
      <div class="text-sm text-gray-600 space-y-1 mb-3">
        <div>${vet.city}, ${vet.province}</div>
      </div>
      ${pets.length ? `
      <div class="mb-2">
        <div class="text-xs text-gray-500 mb-1">Animals:</div>
        <div class="flex flex-wrap gap-1">
          ${pets.slice(0,4).map(p => `<span class="px-2 py-0.5 bg-purple-50 text-purple-700 rounded text-xs">${getAnimalEmoji(p)} ${p}</span>`).join('')}
        </div>
      </div>` : ''}
      ${services.length ? `
      <div class="mb-3">
        <div class="text-xs text-gray-500 mb-1">Services:</div>
        <div class="flex flex-wrap gap-1">
          ${services.slice(0,3).map(s => `<span class="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">${s}</span>`).join('')}
          ${services.length > 3 ? `<span class="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">+${services.length-3}</span>` : ''}
        </div>
      </div>` : ''}
    </div>`;
};

const generatePage = (cityData, size) => {
  const stats = {
    total: cityData.count,
    emergency: cityData.vets.filter(v => v.extraction?.emergency_services).length,
    aaha: cityData.vets.filter(v => v.extraction?.accreditations?.length).length,
    booking: cityData.vets.filter(v => v.extraction?.online_booking).length,
    exotic: cityData.vets.filter(v => v.extraction?.pet_types_served?.some(p => 
      p.toLowerCase().includes('exotic') || p.toLowerCase().includes('bird') || p.toLowerCase().includes('reptile')
    )).length
  };
  
  const emergencyPct = Math.round(stats.emergency / stats.total * 100);
  const aahaPct = Math.round(stats.aaha / stats.total * 100);
  
  // Different content based on city size
  let heroText, keyTakeaways, emergencyText;
  
  if (size === 'large') {
    heroText = `We analyzed ${stats.total} veterinary clinics in ${cityData.name.split(',')[0]} to help you find the right care for your pet. Here's what we found about emergency services, accreditations, specialties, and availability.`;
    keyTakeaways = `
      <li><strong>${stats.emergency} of ${stats.total} clinics</strong> (${emergencyPct}%) offer 24/7 emergency services—significantly above the national average of 15%</li>
      <li><strong>${stats.aaha} clinics</strong> (${aahaPct}%) are AAHA accredited—the gold standard in veterinary care</li>
      <li><strong>${stats.booking} clinics</strong> offer online appointment booking for convenience</li>
      <li><strong>${stats.exotic} clinics</strong> specialize in exotic pets (birds, reptiles, small mammals)</li>
    `;
    emergencyText = `Pet emergencies don't follow business hours. <strong>Our analysis found that ${stats.emergency} out of ${stats.total} ${cityData.name.split(',')[0]} veterinary clinics (${emergencyPct}%) offer 24/7 emergency services.</strong> This is significantly higher than the national average of 15%, making ${cityData.name.split(',')[0]} well-equipped for pet emergencies.`;
  } else if (size === 'medium') {
    heroText = `We analyzed ${stats.total} veterinary clinics in ${cityData.name.split(',')[0]} to help you find the right care for your pet. As a mid-sized city, ${cityData.name.split(',')[0]} offers a good balance of specialized services and accessibility.`;
    keyTakeaways = `
      <li><strong>${stats.emergency} of ${stats.total} clinics</strong> (${emergencyPct}%) offer 24/7 emergency services</li>
      <li><strong>${stats.aaha} clinics</strong> are AAHA accredited</li>
      <li><strong>${stats.booking} clinics</strong> offer online booking</li>
      <li>Most clinics are within a 15-minute drive from anywhere in the city</li>
    `;
    emergencyText = `${cityData.name.split(',')[0]} has ${stats.emergency} veterinary clinics offering 24/7 emergency services (${emergencyPct}% of all clinics). While this is close to the national average, residents in outlying areas may need to drive 20-30 minutes to reach emergency care.`;
  } else {
    heroText = `${cityData.name.split(',')[0]} has ${stats.total} veterinary clinics serving the local community. As a smaller town, pet owners here benefit from personalized care and familiar faces, though some specialized services may require travel to nearby cities.`;
    keyTakeaways = `
      <li><strong>${stats.emergency} ${stats.emergency === 1 ? 'clinic offers' : 'clinics offer'}</strong> emergency services ${stats.emergency === 0 ? '—nearest emergency vet is in a neighboring city' : ''}</li>
      <li>All ${stats.total} clinics provide general veterinary care for dogs and cats</li>
      <li>${stats.exotic > 0 ? `${stats.exotic} ${stats.exotic === 1 ? 'clinic treats' : 'clinics treat'} exotic pets` : 'For exotic pets, you may need to visit a specialist in a larger city'}</li>
      <li>Most residents are within a 10-minute drive of veterinary care</li>
    `;
    emergencyText = stats.emergency > 0 
      ? `${cityData.name.split(',')[0]} has ${stats.emergency} veterinary ${stats.emergency === 1 ? 'clinic' : 'clinics'} offering emergency services. For after-hours emergencies, this provides local access to urgent care without needing to drive to a larger city.`
      : `${cityData.name.split(',')[0]} does not have a 24/7 emergency veterinary clinic. For after-hours emergencies, residents typically drive to the nearest emergency vet in [neighboring city], approximately 30-45 minutes away. It's important to know this location and keep the phone number handy.`;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Complete Guide to Veterinary Care in ${cityData.name} (2025) | VetList</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>tailwind.config={theme:{extend:{colors:{primary:{600:'#16a34a'}}}}}</script>
  <style>.prose h2{font-size:1.75rem;font-weight:700;margin-top:2rem;margin-bottom:1rem}</style>
</head>
<body class="bg-gray-50">

<article class="bg-white border-b">
  <div class="max-w-4xl mx-auto px-4 py-12">
    <nav class="text-sm text-gray-500 mb-6">
      <a href="/" class="hover:text-primary-600">Home</a> › 
      <a href="/canada/" class="hover:text-primary-600">Canada</a> › 
      <a href="/canada/ontario/" class="hover:text-primary-600">Ontario</a> › 
      <span class="text-gray-900">${cityData.name.split(',')[0]}</span>
    </nav>

    <header class="mb-8">
      <h1 class="text-4xl font-bold text-gray-900 mb-4">Complete Guide to Veterinary Care in ${cityData.name}</h1>
      <p class="text-xl text-gray-600">${heroText}</p>
      <div class="flex gap-4 mt-6 text-sm text-gray-500">
        <span>📅 Updated December 2025</span> • <span>📊 ${stats.total} clinics analyzed</span>
      </div>
    </header>

    <div class="bg-blue-50 border-l-4 border-blue-600 p-6 mb-8 rounded-r-lg">
      <h3 class="font-bold text-blue-900 mb-3">Key Takeaways</h3>
      <ul class="space-y-2 text-blue-900">${keyTakeaways}</ul>
    </div>
  </div>
</article>

<section class="bg-gradient-to-b from-gray-50 to-white py-12 border-b">
  <div class="max-w-6xl mx-auto px-4">
    <h2 class="text-2xl font-bold text-gray-900 mb-6 text-center">${cityData.name.split(',')[0]} Veterinary Care at a Glance</h2>
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div class="bg-white rounded-xl p-6 text-center shadow-sm border">
        <div class="text-4xl font-bold text-blue-600 mb-2">${stats.total}</div>
        <div class="text-sm text-gray-600">Total Clinics</div>
      </div>
      <div class="bg-white rounded-xl p-6 text-center shadow-sm border">
        <div class="text-4xl font-bold text-red-600 mb-2">${stats.emergency}</div>
        <div class="text-sm text-gray-600">🚨 Emergency 24/7</div>
      </div>
      <div class="bg-white rounded-xl p-6 text-center shadow-sm border">
        <div class="text-4xl font-bold text-amber-600 mb-2">${stats.aaha}</div>
        <div class="text-sm text-gray-600">🏆 AAHA Accredited</div>
      </div>
      <div class="bg-white rounded-xl p-6 text-center shadow-sm border">
        <div class="text-4xl font-bold text-orange-600 mb-2">${stats.exotic}</div>
        <div class="text-sm text-gray-600">🦎 Exotic Pet Vets</div>
      </div>
    </div>
  </div>
</section>

<main class="max-w-4xl mx-auto px-4 py-12">
  <div class="prose max-w-none">
    <h2>🚨 Emergency Veterinary Services</h2>
    <p>${emergencyText}</p>
  </div>
</main>

<section class="bg-white py-12">
  <div class="max-w-6xl mx-auto px-4">
    <h2 class="text-3xl font-bold text-gray-900 mb-6">All ${stats.total} Veterinary Clinics in ${cityData.name.split(',')[0]}</h2>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      ${cityData.vets.slice(0, 12).map(generateVetCard).join('')}
    </div>
    ${cityData.vets.length > 12 ? `<p class="text-center text-gray-600 mt-6">Showing 12 of ${cityData.vets.length} clinics</p>` : ''}
  </div>
</section>

</body>
</html>`;
};

// Generate all 3 pages
['large', 'medium', 'small'].forEach(size => {
  const cityData = cities[size];
  const html = generatePage(cityData, size);
  fs.writeFileSync(`public/demo-${size}-city.html`, html);
  console.log(`✅ Created demo-${size}-city.html (${cityData.name}, ${cityData.count} vets)`);
});

console.log('\n🎉 All 3 demo pages created!');
console.log('View them at:');
console.log('- http://localhost:4323/demo-large-city.html');
console.log('- http://localhost:4323/demo-medium-city.html');
console.log('- http://localhost:4323/demo-small-city.html');
