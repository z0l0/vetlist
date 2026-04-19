import fs from 'fs';

const vets = JSON.parse(fs.readFileSync('data/real-vets-for-demo.json', 'utf-8'));

const getAnimalEmoji = (a) => {
  const l = a.toLowerCase();
  if (l.includes('dog')) return '🐕';
  if (l.includes('cat')) return '🐈';
  if (l.includes('bird')) return '🐦';
  if (l.includes('exotic') || l.includes('reptile')) return '🦎';
  if (l.includes('horse')) return '🐴';
  if (l.includes('farm')) return '🐄';
  return '🐾';
};

// Read the blog template
const blogTemplate = fs.readFileSync('public/blog-style-demo.html', 'utf-8');

// Generate vet cards HTML
const vetCardsHTML = vets.map(vet => {
  const ext = vet.scraped;
  const animals = JSON.parse(vet.animals_treated || '[]');
  const allAnimals = [...new Set([...animals, ...(ext.pet_types_served || [])])];
  const services = ext.services_offered || [];
  
  const badges = [];
  if (ext.emergency_services) badges.push('<span class="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-md text-xs font-bold">🚨 Emergency</span>');
  if (ext.online_booking) badges.push('<span class="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-md text-xs font-bold">📅 Online Booking</span>');
  if (ext.accreditations?.length) badges.push(`<span class="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 rounded-md text-xs font-bold">🏆 ${ext.accreditations[0]}</span>`);
  if (ext.payment_plans?.length) badges.push(`<span class="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded-md text-xs font-bold">💳 ${ext.payment_plans[0]}</span>`);
  
  return `
    <div class="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-4 border border-gray-200 flex flex-col h-full">
      <div class="flex items-start justify-between gap-3 mb-3">
        <div class="flex-1 min-w-0">
          <h3 class="text-lg font-bold text-gray-900 mb-1">${vet.name}</h3>
          ${vet.rating ? `
          <div class="flex items-center gap-1">
            <svg class="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
            <span class="text-sm font-semibold text-gray-700">${vet.rating}</span>
          </div>` : ''}
        </div>
      </div>
      
      ${badges.length ? `<div class="flex flex-wrap gap-1.5 mb-3">${badges.join('')}</div>` : ''}

      <div class="space-y-2 mb-3 text-sm text-gray-700">
        ${vet.address ? `
        <div class="flex items-start gap-2">
          <svg class="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/></svg>
          <span class="leading-snug">${vet.address}</span>
        </div>` : ''}
        ${vet.phone_number ? `
        <div class="flex items-center gap-2">
          <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
          <a href="tel:${vet.phone_number}" class="font-medium hover:text-primary-600">${vet.phone_number}</a>
        </div>` : ''}
        ${vet.website ? `
        <div class="flex items-center gap-2">
          <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"/></svg>
          <a href="${vet.website}" target="_blank" class="text-gray-700 hover:text-primary-600 truncate text-xs">${vet.website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}</a>
        </div>` : ''}
      </div>

      ${allAnimals.length ? `
      <div class="mb-3">
        <span class="text-xs text-gray-500 font-medium">Animals Treated:</span>
        <div class="flex flex-wrap gap-1.5 mt-1">
          ${allAnimals.slice(0, 4).map(a => `<span class="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-50 text-purple-700 rounded text-xs font-medium">${getAnimalEmoji(a)} ${a}</span>`).join('')}
          ${allAnimals.length > 4 ? `<span class="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">+${allAnimals.length - 4}</span>` : ''}
        </div>
      </div>` : ''}

      ${services.length ? `
      <div class="mb-3">
        <span class="text-xs text-gray-500 font-medium">Services (Real Scraped Data):</span>
        <div class="flex flex-wrap gap-1.5 mt-1">
          ${services.slice(0, 4).map(s => `<span class="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-medium">${s}</span>`).join('')}
          ${services.length > 4 ? `<span class="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">+${services.length - 4}</span>` : ''}
        </div>
      </div>` : ''}

      <div class="mt-auto pt-3 border-t border-gray-100">
        ${vet.phone_number ? `<a href="tel:${vet.phone_number}" class="block w-full text-center px-4 py-2.5 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition-colors mb-2">Call Now</a>` : ''}
      </div>
    </div>`;
}).join('\n');

// Insert vet cards before the closing </body> tag
const vetCardsSection = `
<!-- Vet Directory Section -->
<section class="bg-white py-12 border-t border-gray-200">
  <div class="max-w-6xl mx-auto px-4">
    <h2 class="text-3xl font-bold text-gray-900 mb-6">All 109 Veterinary Clinics in Toronto</h2>
    <p class="text-gray-600 mb-8">Browse our complete directory of Toronto veterinary clinics. Each listing includes real data scraped from clinic websites, including services offered, animals treated, and special features like emergency care or online booking.</p>
    
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch">
      ${vetCardsHTML}
    </div>
    
    <p class="text-center text-gray-600 mt-8 text-sm">Showing 12 of 109 clinics with verified scraped data. All information updated December 2025.</p>
  </div>
</section>

</body>
</html>`;

const finalHTML = blogTemplate.replace('</body>\n</html>', vetCardsSection);

fs.writeFileSync('public/FINAL-large-city-demo.html', finalHTML);
console.log('✅ Created FINAL-large-city-demo.html');
console.log('View at: http://localhost:4323/FINAL-large-city-demo.html');
