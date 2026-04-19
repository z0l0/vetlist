import fs from 'fs';

const profiles = JSON.parse(fs.readFileSync('data/demo-profiles.json', 'utf-8'));

// Helper to get animal emoji
const getAnimalEmoji = (animal) => {
  const lower = animal.toLowerCase();
  if (lower.includes('dog')) return '🐕';
  if (lower.includes('cat')) return '🐈';
  if (lower.includes('bird') || lower.includes('avian')) return '🐦';
  if (lower.includes('reptile') || lower.includes('exotic')) return '🦎';
  if (lower.includes('horse') || lower.includes('equine')) return '🐴';
  if (lower.includes('farm') || lower.includes('livestock')) return '🐄';
  if (lower.includes('rabbit')) return '🐰';
  if (lower.includes('small')) return '🐹';
  return '🐾';
};

// Generate card HTML
const generateCard = (profile) => {
  const animals = JSON.parse(profile.animals_treated || '[]');
  const services = profile.scraped.services_offered || [];
  const accreditations = profile.scraped.accreditations || [];
  const paymentPlans = profile.scraped.payment_plans || [];
  const petTypes = profile.scraped.pet_types_served || [];
  
  const badges = [];
  if (profile.scraped.emergency_services) badges.push('<span class="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-md text-xs font-bold">🚨 Emergency</span>');
  if (profile.scraped.online_booking) badges.push('<span class="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-md text-xs font-bold">📅 Online Booking</span>');
  if (accreditations.length > 0) badges.push(`<span class="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 rounded-md text-xs font-bold">🏆 ${accreditations[0]}</span>`);
  if (paymentPlans.length > 0) badges.push(`<span class="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded-md text-xs font-bold">💳 ${paymentPlans[0]}</span>`);
  
  const allAnimals = [...new Set([...animals, ...petTypes])];
  
  return `
  <div class="vet-card bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-4 border border-gray-200">
    <div class="flex items-start justify-between gap-3 mb-3">
      <div class="flex-1 min-w-0">
        <h3 class="text-lg font-bold text-gray-900 mb-1">${profile.name}</h3>
        <div class="flex items-center gap-3 flex-wrap">
          ${profile.rating ? `
          <div class="flex items-center gap-1">
            <svg class="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
            <span class="text-sm font-semibold text-gray-700">${profile.rating}</span>
          </div>` : ''}
        </div>
      </div>
    </div>
    
    ${badges.length > 0 ? `<div class="flex flex-wrap gap-1.5 mb-3">${badges.join('')}</div>` : ''}

    <div class="space-y-2 mb-3 text-sm text-gray-700">
      ${profile.address ? `
      <div class="flex items-start gap-2">
        <svg class="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/></svg>
        <span>${profile.address}</span>
      </div>` : ''}
      ${profile.phone_number ? `
      <div class="flex items-center gap-2">
        <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
        <a href="tel:${profile.phone_number}" class="font-medium hover:text-primary-600">${profile.phone_number}</a>
      </div>` : ''}
      ${profile.website ? `
      <div class="flex items-center gap-2">
        <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"/></svg>
        <a href="${profile.website}" target="_blank" class="text-gray-700 hover:text-primary-600 truncate text-xs">${profile.website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}</a>
      </div>` : ''}
    </div>

    ${allAnimals.length > 0 ? `
    <div class="mb-3">
      <span class="text-xs text-gray-500 font-medium">Animals Treated:</span>
      <div class="flex flex-wrap gap-1.5 mt-1">
        ${allAnimals.slice(0, 6).map(a => `<span class="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-50 text-purple-700 rounded text-xs font-medium">${getAnimalEmoji(a)} ${a}</span>`).join('')}
        ${allAnimals.length > 6 ? `<span class="inline-flex items-center px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-medium">+${allAnimals.length - 6}</span>` : ''}
      </div>
    </div>` : ''}

    ${services.length > 0 ? `
    <div class="mb-3">
      <span class="text-xs text-gray-500 font-medium">Services (Real Scraped Data):</span>
      <div class="flex flex-wrap gap-1.5 mt-1">
        ${services.slice(0, 4).map(s => `<span class="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-medium">${s}</span>`).join('')}
        ${services.length > 4 ? `<span class="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">+${services.length - 4}</span>` : ''}
      </div>
    </div>` : ''}

    <div class="mt-auto pt-3 border-t border-gray-100">
      ${profile.phone_number ? `<a href="tel:${profile.phone_number}" class="block w-full text-center px-4 py-2.5 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition-colors mb-2">Call Now</a>` : ''}
    </div>
  </div>`;
};

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>REAL Scraped Data Demo | VetList.org</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>tailwind.config = { theme: { extend: { colors: { primary: { 600: '#16a34a', 700: '#15803d' } } } } }</script>
  <style>.vet-card { display: flex; flex-direction: column; height: 100%; }</style>
</head>
<body class="bg-gray-50">

<div class="bg-gradient-to-b from-white to-gray-50 border-b border-gray-200 py-6">
  <div class="max-w-7xl mx-auto px-4">
    <h1 class="text-3xl font-bold text-gray-900 mb-2">REAL Scraped Data Demo</h1>
    <p class="text-gray-600">These are actual profiles from our test scrape with real addresses, phones, and scraped data</p>
  </div>
</div>

<main class="max-w-7xl mx-auto px-4 py-6">
  <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
    <h2 class="font-bold text-blue-900 mb-2">✅ All Data Below is REAL:</h2>
    <ul class="text-sm text-blue-800 space-y-1">
      <li>• Addresses, phones, websites from your CSV</li>
      <li>• Services, accreditations, payment plans from actual website scrapes</li>
      <li>• Animals treated from both CSV and scraped data</li>
      <li>• Confidence scores 7-9/10 (high quality extractions)</li>
    </ul>
  </div>

  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch">
    ${profiles.map(generateCard).join('\n')}
  </div>

  <div class="mt-8 bg-amber-50 border border-amber-200 rounded-lg p-6">
    <h3 class="font-bold text-amber-800 mb-3">📊 What You're Seeing:</h3>
    <div class="grid md:grid-cols-2 gap-4 text-sm text-gray-700">
      <div>
        <h4 class="font-semibold mb-2">From Your CSV:</h4>
        <ul class="space-y-1">
          <li>• Clinic names</li>
          <li>• Addresses</li>
          <li>• Phone numbers</li>
          <li>• Websites</li>
          <li>• Ratings</li>
          <li>• Basic animals treated</li>
        </ul>
      </div>
      <div>
        <h4 class="font-semibold mb-2">NEW from Scraping:</h4>
        <ul class="space-y-1">
          <li>• 🚨 Emergency services flags</li>
          <li>• 📅 Online booking availability</li>
          <li>• 🏆 Real accreditations (AAHA, CVO, etc.)</li>
          <li>• 💳 Payment plans (Cherry, CareCredit)</li>
          <li>• 🏥 Real services from websites</li>
          <li>• 🐾 Additional pet types served</li>
        </ul>
      </div>
    </div>
  </div>
</main>

</body>
</html>`;

fs.writeFileSync('public/demo-enriched-city.html', html);
console.log('✅ Demo page created at public/demo-enriched-city.html');
console.log('\nOpen it in your browser to see REAL scraped data!');
