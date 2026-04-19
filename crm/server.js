import express from 'express';
import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { execFile } from 'child_process';
import Papa from 'papaparse';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3030;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(join(__dirname, 'public')));

// Data directory
const dataDir = join(__dirname, '..', 'data');

// Helper function to load CSV
function loadCSV(filename) {
  const csvPath = join(dataDir, filename);
  const csvContent = readFileSync(csvPath, 'utf-8');
  const parsed = Papa.parse(csvContent, { header: true, skipEmptyLines: true });
  
  // Add index-based ID if no ID exists
  return parsed.data.map((row, index) => ({
    ...row,
    _rowIndex: index,
    _id: row.id || `${filename}-${index}`
  }));
}

// Helper function to save CSV
function saveCSV(filename, data) {
  const csvPath = join(dataDir, filename);
  const csv = Papa.unparse(data);
  writeFileSync(csvPath, csv, 'utf-8');
}

function refreshDerivedSiteData() {
  return new Promise((resolve) => {
    execFile(process.execPath, [join(__dirname, '..', 'scripts', 'precompute-site-data.js')], { cwd: join(__dirname, '..') }, (error, stdout, stderr) => {
      if (error) {
        console.error('Failed to refresh derived site data:', error.message);
      }
      if (stdout) console.log(stdout.trim());
      if (stderr) console.error(stderr.trim());
      resolve();
    });
  });
}

// Get list of CSV files
function getCSVFiles() {
  return readdirSync(dataDir).filter(f => f.startsWith('professionals') && f.endsWith('.csv'));
}

function getDefaultCsvFile() {
  const csvFiles = getCSVFiles();
  return csvFiles.includes('professionals-canada.csv') ? 'professionals-canada.csv' : csvFiles[0];
}

function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-')
    .replace(/-?\d+$/, '');
}

function normalizeCountry(country) {
  if (!country) return '';
  if (/^(us|usa|united\s*states(\s*of\s*america)?)$/i.test(country.trim())) {
    return 'united-states';
  }
  return slugify(country);
}

function normalizeProvince(province) {
  return slugify(province);
}

function buildProfilePath(profile) {
  const country = normalizeCountry(profile.country);
  const region = normalizeProvince(profile.province);
  const city = slugify(profile.city);
  const name = slugify(profile.name);

  if (!country || !region || !city || !name) return null;
  return `http://localhost:4323/${country}/${region}/${city}/${name}/`;
}

function getDashboardStats(csvFiles) {
  let totalProfiles = 0;

  for (const file of csvFiles) {
    try {
      totalProfiles += loadCSV(file).length;
    } catch {}
  }

  return {
    csvFiles: csvFiles.length,
    totalProfiles,
  };
}

// Routes
app.get('/', (req, res) => {
  const csvFiles = getCSVFiles();
  const selectedFile = req.query.file || 'all';
  const searchQuery = req.query.search || '';
  
  let profiles = [];
  let filesSearched = [];
  
  // Load from all files or just selected file
  if (selectedFile === 'all' || searchQuery) {
    // When searching, always search all files
    csvFiles.forEach(file => {
      const fileProfiles = loadCSV(file);
      // Add source file to each profile for display
      fileProfiles.forEach(p => p._sourceFile = file);
      profiles.push(...fileProfiles);
      filesSearched.push(file);
    });
  } else {
    profiles = loadCSV(selectedFile);
    profiles.forEach(p => p._sourceFile = selectedFile);
    filesSearched.push(selectedFile);
  }
  
  // Filter by search
  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    profiles = profiles.filter(p => 
      p.name?.toLowerCase().includes(query) ||
      p.city?.toLowerCase().includes(query) ||
      p.province?.toLowerCase().includes(query) ||
      p.phone_number?.includes(query)
    );
  }
  
  res.send(renderBrowsePage(csvFiles, selectedFile, searchQuery, profiles, filesSearched, getDashboardStats(csvFiles)));
});

app.get('/docs', (req, res) => {
  const csvFiles = getCSVFiles();
  res.send(renderDocsPage(getDashboardStats(csvFiles)));
});

app.get('/edit', (req, res) => {
  const profileId = req.query.id;
  const selectedFile = req.query.file || getDefaultCsvFile();
  const success = req.query.success === '1';
  
  const profiles = loadCSV(selectedFile);
  const profile = profiles.find(p => p._id === profileId || p.id === profileId);
  
  res.send(renderEditPage(profile, selectedFile, profileId, success));
});

app.post('/edit', async (req, res) => {
  const { profileId, selectedFile, ...formData } = req.body;
  
  console.log('Editing profile:', profileId, 'in file:', selectedFile);
  console.log('Form data received:', formData);
  
  const profiles = loadCSV(selectedFile);
  const index = profiles.findIndex(p => p._id === profileId || p.id === profileId);
  
  if (index !== -1) {
    console.log('Found profile at index:', index);
    console.log('Old phone:', profiles[index].phone_number);
    console.log('New phone:', formData.phone_number);
    
    // Remove internal fields before saving
    const { _rowIndex, _id, _sourceFile, ...cleanData } = formData;
    
    // Handle claimed checkbox (if not checked, it won't be in formData)
    if (!cleanData.claimed) {
      cleanData.claimed = 'false';
    }
    
    profiles[index] = {
      ...profiles[index],
      ...cleanData
    };
    
    console.log('Updated phone:', profiles[index].phone_number);
    
    // Remove internal fields before saving to CSV
    const cleanProfiles = profiles.map(p => {
      const { _rowIndex, _id, _sourceFile, ...clean } = p;
      return clean;
    });
    
    saveCSV(selectedFile, cleanProfiles);
    console.log('Saved to CSV');
    await refreshDerivedSiteData();
    
    res.redirect(`/edit?id=${profileId}&file=${selectedFile}&success=1`);
  } else {
    res.send('Profile not found');
  }
});

app.get('/import', (req, res) => {
  res.send(renderImportPage(getCSVFiles(), getDefaultCsvFile()));
});

app.post('/import/parse', (req, res) => {
  const { email_text } = req.body;
  const parsedData = parseClaimEmail(email_text);
  
  // Search for matching profiles across all CSV files
  const csvFiles = getCSVFiles();
  const matches = [];
  
  csvFiles.forEach(file => {
    const profiles = loadCSV(file);
    profiles.forEach(profile => {
      let matchScore = 0;
      let matchReasons = [];
      
      // Check for exact name match
      if (profile.name && parsedData.name && 
          profile.name.toLowerCase().trim() === parsedData.name.toLowerCase().trim()) {
        matchScore += 10;
        matchReasons.push('Exact name match');
      }
      
      // Check for phone match
      if (profile.phone_number && parsedData.phone_number) {
        const cleanPhone1 = profile.phone_number.replace(/[^0-9]/g, '');
        const cleanPhone2 = parsedData.phone_number.replace(/[^0-9]/g, '');
        if (cleanPhone1 === cleanPhone2 && cleanPhone1.length >= 10) {
          matchScore += 8;
          matchReasons.push('Phone number match');
        }
      }
      
      // Check for address match
      if (profile.address && parsedData.address &&
          profile.address.toLowerCase().includes(parsedData.address.toLowerCase().substring(0, 20))) {
        matchScore += 5;
        matchReasons.push('Address match');
      }
      
      // Check for city + province match
      if (profile.city && parsedData.city && profile.province && parsedData.province &&
          profile.city.toLowerCase() === parsedData.city.toLowerCase() &&
          profile.province.toLowerCase() === parsedData.province.toLowerCase()) {
        matchScore += 3;
        matchReasons.push('Location match');
      }
      
      // If we have a reasonable match, add it
      if (matchScore >= 8) {
        matches.push({
          profile,
          file,
          matchScore,
          matchReasons
        });
      }
    });
  });
  
  // Sort by match score
  matches.sort((a, b) => b.matchScore - a.matchScore);
  
  res.json({
    parsedData,
    matches: matches.slice(0, 5) // Return top 5 matches
  });
});

app.post('/import/save', async (req, res) => {
  const { parsedData, target_file, update_profile_id, update_file } = req.body;
  const data = JSON.parse(parsedData);
  
  // If updating an existing profile
  if (update_profile_id && update_file) {
    const profiles = loadCSV(update_file);
    const index = profiles.findIndex(p => p._id === update_profile_id || p.id === update_profile_id);
    
    if (index !== -1) {
      // Update existing profile
      profiles[index] = {
        ...profiles[index],
        name: data.name,
        hours_of_operation: JSON.stringify(data.hours_of_operation),
        specialization: JSON.stringify(data.specialization),
        phone_number: data.phone_number,
        email_address: data.email_address,
        address: data.address,
        website: data.website,
        city: data.city,
        province: data.province,
        country: data.country,
        faqs: JSON.stringify(data.faqs),
        is_verified: '1',
        claimed: 'true',
        updated_at: new Date().toISOString()
      };
      
      // Remove internal fields before saving
      const cleanProfiles = profiles.map(p => {
        const { _rowIndex, _id, _sourceFile, ...clean } = p;
        return clean;
      });
      
      saveCSV(update_file, cleanProfiles);
      await refreshDerivedSiteData();
      res.json({ success: true, id: profiles[index].id, updated: true });
      return;
    }
  }
  
  // Create new profile
  const profiles = loadCSV(target_file);
  const maxId = Math.max(...profiles.map(p => parseInt(p.id) || 0));
  const newId = maxId + 1;
  
  const newProfile = {
    id: newId.toString(),
    name: data.name,
    description: `${data.name} in ${data.city}`,
    detailed_description: `${data.name} is a veterinary practice located in ${data.city}, ${data.province}.`,
    hours_of_operation: JSON.stringify(data.hours_of_operation),
    specialization: JSON.stringify(data.specialization),
    picture: '',
    location: `${data.city}, ${data.province}`,
    country: data.country,
    province: data.province,
    city: data.city,
    phone_number: data.phone_number,
    email_address: data.email_address,
    address: data.address,
    website: data.website,
    social_media: '',
    latitude: '',
    longitude: '',
    is_verified: '1',
    claimed: 'true',
    profile_weight: '5',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    faqs: JSON.stringify(data.faqs),
    rating: ''
  };
  
  profiles.push(newProfile);
  
  // Remove internal fields before saving
  const cleanProfiles = profiles.map(p => {
    const { _rowIndex, _id, _sourceFile, ...clean } = p;
    return clean;
  });
  
  saveCSV(target_file, cleanProfiles);
  await refreshDerivedSiteData();
  
  res.json({ success: true, id: newId, updated: false });
});

app.get('/bulk-edit', (req, res) => {
  const selectedFile = req.query.file || getDefaultCsvFile();
  const csvContent = readFileSync(join(dataDir, selectedFile), 'utf-8');
  res.send(renderBulkEditPage(getCSVFiles(), selectedFile, csvContent));
});

app.post('/bulk-edit', async (req, res) => {
  const { csv_content, target_file } = req.body;
  
  try {
    const parsed = Papa.parse(csv_content, { header: true, skipEmptyLines: true });
    if (parsed.errors.length > 0) {
      res.send(renderBulkEditPage(getCSVFiles(), target_file, csv_content, `CSV parsing errors: ${parsed.errors.map(e => e.message).join(', ')}`));
    } else {
      writeFileSync(join(dataDir, target_file), csv_content, 'utf-8');
      await refreshDerivedSiteData();
      res.redirect(`/bulk-edit?file=${target_file}&success=1`);
    }
  } catch (error) {
    res.send(renderBulkEditPage(getCSVFiles(), target_file, csv_content, `Error: ${error.message}`));
  }
});

// Email parser
function parseClaimEmail(emailText) {
  const data = {
    name: '',
    phone_number: '',
    email_address: '',
    website: '',
    address: '',
    city: '',
    province: '',
    country: '',
    hours_of_operation: {},
    specialization: [],
    faqs: []
  };

  const nameMatch = emailText.match(/Practice Name:\s*(.+)/i);
  if (nameMatch) data.name = nameMatch[1].trim();

  const phoneMatch = emailText.match(/Phone:\s*(.+)/i);
  if (phoneMatch) data.phone_number = phoneMatch[1].trim();

  const emailMatch = emailText.match(/Email:\s*(.+)/i);
  if (emailMatch) data.email_address = emailMatch[1].trim();

  const websiteMatch = emailText.match(/Website:\s*(.+)/i);
  if (websiteMatch) data.website = websiteMatch[1].trim();

  const addressMatch = emailText.match(/ADDRESS:\s*\n(.+)\n(.+)\n(.+)/i);
  if (addressMatch) {
    data.address = addressMatch[1].trim();
    const cityProvince = addressMatch[2].trim();
    data.country = addressMatch[3].trim();
    
    const parts = cityProvince.split(',').map(p => p.trim());
    if (parts.length >= 2) {
      data.city = parts[0];
      data.province = parts[1];
    }
  }

  const servicesMatch = emailText.match(/SERVICES OFFERED:\s*\n(.+?)(?=\n\n|FREQUENTLY|HOURS)/is);
  if (servicesMatch) {
    data.specialization = servicesMatch[1]
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }

  const hoursSection = emailText.match(/HOURS OF OPERATION:\s*\n([\s\S]+?)(?=\n\n|VERIFICATION|$)/i);
  if (hoursSection) {
    const hoursLines = hoursSection[1].split('\n').filter(l => l.trim());
    hoursLines.forEach(line => {
      const match = line.match(/(\w+):\s*(.+)/);
      if (match) {
        const day = match[1];
        const hours = match[2].trim();
        if (hours.toLowerCase() === 'closed') {
          data.hours_of_operation[day] = [];
        } else {
          data.hours_of_operation[day] = [hours.replace(/\s+/g, '')];
        }
      }
    });
  }

  const faqsSection = emailText.match(/FREQUENTLY ASKED QUESTIONS:\s*\n([\s\S]+?)(?=\n\nHOURS|VERIFICATION|$)/i);
  if (faqsSection) {
    const faqLines = faqsSection[1].split('\n').filter(l => l.trim());
    let currentQ = null;
    let currentA = null;
    
    faqLines.forEach(line => {
      const qMatch = line.match(/^\d+\.\s*(.+\?)\s*$/);
      if (qMatch) {
        if (currentQ && currentA) {
          data.faqs.push({ question: currentQ, answer: currentA });
        }
        currentQ = qMatch[1].trim();
        currentA = null;
      } else if (currentQ && line.trim()) {
        currentA = line.trim();
      }
    });
    
    if (currentQ && currentA) {
      data.faqs.push({ question: currentQ, answer: currentA });
    }
  }

  return data;
}

// HTML Templates
function renderBrowsePage(csvFiles, selectedFile, searchQuery, profiles, filesSearched, stats) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>VetList CRM</title>
  <link rel="stylesheet" href="/styles.css">
</head>
<body>
  <div class="container">
    <header>
      <div class="header-top">
        <div>
          <div class="eyebrow">Local-only CMS</div>
          <h1>VetList Admin</h1>
          <p>Simple local editing for listings, imports, bulk work, and quality control.</p>
        </div>
        <div class="header-note">
          <strong>${stats.totalProfiles.toLocaleString()}</strong>
          <span>profiles across ${stats.csvFiles} CSV files</span>
        </div>
      </div>
      <div class="nav">
        <a href="/">Browse</a>
        <a href="/import">Import</a>
        <a href="/bulk-edit">Bulk Edit</a>
        <a href="/docs">Docs</a>
      </div>
    </header>

    <div class="dashboard-grid">
      <div class="dashboard-card">
        <span class="dashboard-label">Profiles in view</span>
        <strong>${profiles.length.toLocaleString()}</strong>
        <p>${searchQuery ? 'Matching your current search.' : 'Loaded from the selected file scope.'}</p>
      </div>
      <div class="dashboard-card">
        <span class="dashboard-label">Current scope</span>
        <strong>${selectedFile === 'all' ? 'All files' : selectedFile}</strong>
        <p>${searchQuery ? `Searching across ${filesSearched.length} files.` : 'Switch files or search globally.'}</p>
      </div>
      <div class="dashboard-card">
        <span class="dashboard-label">Best workflow</span>
        <strong>Search -> Edit -> Preview</strong>
        <p>Use import for claim emails and bulk edit only when you truly need raw CSV access.</p>
      </div>
    </div>

    <div class="search-bar">
      <form class="search-form" method="get">
        <select name="file">
          <option value="all" ${selectedFile === 'all' ? 'selected' : ''}>🔍 Search All Files</option>
          ${csvFiles.map(file => `<option value="${file}" ${file === selectedFile ? 'selected' : ''}>${file}</option>`).join('')}
        </select>
        <input type="text" name="search" placeholder="Search across all CSV files by name, city, province, or phone..." value="${searchQuery}">
        <button type="submit">Search</button>
        ${searchQuery ? '<a href="/" class="btn-clear">Clear</a>' : ''}
      </form>
    </div>

    <div class="stats">
      ${searchQuery 
        ? `Found ${profiles.length} profile${profiles.length !== 1 ? 's' : ''} across ${filesSearched.length} file${filesSearched.length !== 1 ? 's' : ''}`
        : `Showing ${profiles.length} profile${profiles.length !== 1 ? 's' : ''} from ${selectedFile === 'all' ? 'all files' : selectedFile}`
      }
    </div>

    ${profiles.length > 0 ? `
      <div class="profiles-grid">
        ${profiles.slice(0, 50).map(profile => `
          <div class="profile-card">
            <div class="profile-info">
              <h3>${profile.name || 'Unnamed'} ${profile._sourceFile ? `<span class="file-badge">${profile._sourceFile}</span>` : ''}</h3>
              <div class="profile-details">
                <span><strong>Location:</strong> ${profile.city || 'N/A'}, ${profile.province || 'N/A'}</span>
                <span><strong>Phone:</strong> ${profile.phone_number || 'N/A'}</span>
                <span><strong>Email:</strong> ${profile.email_address || 'N/A'}</span>
                <span><strong>Address:</strong> ${profile.address || 'N/A'}</span>
                <span><strong>Website:</strong> ${profile.website || 'N/A'}</span>
              </div>
            </div>
            <div class="profile-actions">
              <a href="/edit?id=${profile._id || profile.id}&file=${profile._sourceFile || selectedFile}" class="btn btn-edit">Edit</a>
              ${buildProfilePath(profile) ? `<a href="${buildProfilePath(profile)}" class="btn btn-view" target="_blank">View</a>` : ''}
            </div>
          </div>
        `).join('')}
      </div>
    ` : `
      <div class="empty-state">
        <h3>No profiles found</h3>
        <p>Try a different search term or select another CSV file.</p>
      </div>
    `}

    ${profiles.length > 50 ? '<div class="stats" style="margin-top: 20px;">Showing first 50 results. Use search to narrow down.</div>' : ''}
  </div>
</body>
</html>`;
}

function renderEditPage(profile, selectedFile, profileId, success = false) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Edit Profile - VetList CRM</title>
  <link rel="stylesheet" href="/styles.css">
</head>
<body>
  <div class="container">
    <header>
      <div class="header-top">
        <div>
          <div class="eyebrow">Editing workflow</div>
          <h1>Edit Profile</h1>
          <p>Make direct factual changes to the listing, save, then refresh the public page locally.</p>
        </div>
        <div class="nav">
          <a href="/">Browse</a>
          <a href="/docs">Docs</a>
        </div>
      </div>
    </header>

    ${success ? '<div class="message">Profile updated successfully and derived site data was refreshed.</div>' : ''}

    ${profile ? `
      <div class="form-container">
        <form method="POST" action="/edit">
          <input type="hidden" name="profileId" value="${profileId}">
          <input type="hidden" name="selectedFile" value="${selectedFile}">
          
          <div class="form-group">
            <label>Practice Name *</label>
            <input type="text" name="name" value="${profile.name || ''}" required>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Phone Number</label>
              <input type="tel" name="phone_number" value="${profile.phone_number || ''}">
            </div>
            <div class="form-group">
              <label>Email Address</label>
              <input type="email" name="email_address" value="${profile.email_address || ''}">
            </div>
          </div>

          <div class="form-group">
            <label>Website</label>
            <input type="url" name="website" value="${profile.website || ''}">
          </div>

          <div class="form-group">
            <label>Address</label>
            <input type="text" name="address" value="${profile.address || ''}">
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>City</label>
              <input type="text" name="city" value="${profile.city || ''}">
            </div>
            <div class="form-group">
              <label>Province/State</label>
              <input type="text" name="province" value="${profile.province || ''}">
            </div>
          </div>

          <div class="form-group">
            <label>Country</label>
            <input type="text" name="country" value="${profile.country || ''}">
          </div>

          <div class="form-group">
            <label>Hours of Operation (JSON format)</label>
            <textarea name="hours_of_operation">${profile.hours_of_operation || ''}</textarea>
          </div>

          <div class="form-group">
            <label>Specialization (JSON array)</label>
            <textarea name="specialization">${profile.specialization || ''}</textarea>
          </div>

          <div class="form-group">
            <label>Short Description</label>
            <textarea name="description">${profile.description || ''}</textarea>
          </div>

          <div class="form-group">
            <label>Detailed Description</label>
            <textarea name="detailed_description" style="min-height: 150px;">${profile.detailed_description || ''}</textarea>
          </div>

          <div class="form-group">
            <label>FAQs (JSON format)</label>
            <textarea name="faqs">${profile.faqs || ''}</textarea>
          </div>

          <div class="form-group">
            <label style="display: flex; align-items: center; gap: 8px;">
              <input type="checkbox" name="claimed" value="true" ${profile.claimed === 'true' || profile.claimed === '1' ? 'checked' : ''} style="width: auto; margin: 0;">
              <span>✅ Mark as Claimed/Verified Listing</span>
            </label>
            <p style="font-size: 12px; color: #6b7280; margin: 4px 0 0 0;">
              Claimed listings appear on the homepage and get a verified badge
            </p>
          </div>

          <div class="btn-group">
            <button type="submit">Save Changes</button>
            <a href="/" class="btn-secondary">Cancel</a>
          </div>
        </form>
      </div>
    ` : '<div class="form-container"><p>Profile not found.</p></div>'}
  </div>
</body>
</html>`;
}

function renderImportPage(csvFiles, defaultFile) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Import from Email - VetList CRM</title>
  <link rel="stylesheet" href="/styles.css">
</head>
<body>
  <div class="container">
    <header>
      <div class="header-top">
        <div>
          <div class="eyebrow">Import workflow</div>
          <h1>Email Import</h1>
          <p>Paste a claim email, detect an existing match, then update or create the profile locally.</p>
        </div>
        <div class="nav">
          <a href="/">Browse</a>
          <a href="/docs">Docs</a>
        </div>
      </div>
    </header>

    <div class="content">
      <div class="panel">
        <h2>Paste Email Content</h2>
        <div class="form-group">
          <label>Email Text</label>
          <textarea id="email_text" placeholder="Paste the entire claim email here..." style="min-height: 400px;"></textarea>
        </div>

        <button onclick="parseEmail()" style="width: 100%; padding: 12px; font-size: 16px;">🔍 Parse Email & Search All Files</button>
        
        <div id="targetFileSection" style="display:none; margin-top: 20px;">
          <div class="form-group">
            <label>Target CSV File <span style="color: #6b7280; font-size: 12px;">(Only used when creating new profiles)</span></label>
            <select id="target_file">
              ${csvFiles.map((file) => `<option value="${file}" ${file === defaultFile ? 'selected' : ''}>${file}</option>`).join('')}
            </select>
          </div>
          <button onclick="saveToCSV()" id="saveBtn" class="btn-success" style="width: 100%; padding: 12px; font-size: 16px;">Save to CSV</button>
        </div>
      </div>

      <div class="panel">
        <h2>Preview</h2>
        <div id="preview">
          <p style="color: #6b7280; font-size: 14px;">Paste an email and click "Parse Email" to see the extracted data here.</p>
        </div>
      </div>
    </div>
  </div>

  <script>
    let parsedData = null;
    let matchedProfiles = [];
    let selectedMatch = null;

    async function parseEmail() {
      const emailText = document.getElementById('email_text').value;
      
      if (!emailText.trim()) {
        alert('Please paste an email first!');
        return;
      }
      
      const response = await fetch('/import/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email_text: emailText })
      });
      
      const result = await response.json();
      parsedData = result.parsedData;
      matchedProfiles = result.matches || [];
      selectedMatch = null;
      
      displayPreview(parsedData, matchedProfiles);
      document.getElementById('targetFileSection').style.display = 'block';
    }

    async function saveToCSV() {
      const targetFile = document.getElementById('target_file').value;
      
      const payload = { 
        parsedData: JSON.stringify(parsedData),
        target_file: targetFile
      };
      
      // If updating an existing profile
      if (selectedMatch) {
        payload.update_profile_id = selectedMatch.profile._id || selectedMatch.profile.id;
        payload.update_file = selectedMatch.file;
      }
      
      const response = await fetch('/import/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const result = await response.json();
      if (result.success) {
        const action = result.updated ? 'updated' : 'added';
        alert(\`Profile \${action} successfully! ID: \${result.id}\`);
        window.location.href = '/';
      }
    }

    function selectMatch(index) {
      selectedMatch = matchedProfiles[index];
      
      // Update UI to show selection
      document.querySelectorAll('.match-card').forEach((card, i) => {
        if (i === index) {
          card.classList.add('selected');
          card.style.border = '2px solid #10b981';
          card.style.backgroundColor = '#ecfdf5';
        } else {
          card.classList.remove('selected');
          card.style.border = '1px solid #e5e7eb';
          card.style.backgroundColor = 'white';
        }
      });
      
      // Update save button text and hide target file selector
      const saveBtn = document.getElementById('saveBtn');
      const targetFileGroup = document.querySelector('#targetFileSection .form-group');
      saveBtn.innerHTML = '✅ Update Existing Profile in ' + selectedMatch.file;
      saveBtn.className = 'btn-warning';
      targetFileGroup.style.display = 'none';
    }

    function createNew() {
      selectedMatch = null;
      
      // Clear all selections
      document.querySelectorAll('.match-card').forEach(card => {
        card.classList.remove('selected');
        card.style.border = '1px solid #e5e7eb';
        card.style.backgroundColor = 'white';
      });
      
      // Update save button text and show target file selector
      const saveBtn = document.getElementById('saveBtn');
      const targetFileGroup = document.querySelector('#targetFileSection .form-group');
      saveBtn.textContent = '➕ Create New Profile';
      saveBtn.className = 'btn-success';
      targetFileGroup.style.display = 'block';
    }

    function displayPreview(data, matches) {
      const preview = document.getElementById('preview');
      
      let matchesHTML = '';
      if (matches && matches.length > 0) {
        matchesHTML = \`
          <div style="background: #fef3c7; border: 2px solid #f59e0b; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
            <h3 style="margin: 0 0 12px 0; color: #92400e;">⚠️ Found \${matches.length} Matching Profile\${matches.length > 1 ? 's' : ''} Across All CSV Files</h3>
            <p style="margin: 0 0 16px 0; color: #78350f; font-size: 14px;">
              <strong>The system searched all 10 CSV files automatically.</strong> Select a profile below to update it, or click "Create New Profile" to add a new entry.
            </p>
            
            \${matches.map((match, index) => \`
              <div class="match-card" style="background: white; border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px; margin-bottom: 12px; cursor: pointer; transition: all 0.2s;" onclick="selectMatch(\${index})">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
                  <div style="flex: 1;">
                    <strong style="font-size: 16px; color: #111827;">\${match.profile.name}</strong>
                    <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">
                      <span style="background: #dbeafe; color: #1e40af; padding: 2px 8px; border-radius: 4px; margin-right: 8px; font-weight: 600;">📁 \${match.file}</span>
                      <span style="color: #059669; font-weight: 600;">✓ Match Score: \${match.matchScore}</span>
                    </div>
                  </div>
                  <button type="button" style="background: #10b981; color: white; border: none; padding: 8px 16px; border-radius: 4px; font-size: 13px; cursor: pointer; font-weight: 600;">
                    Select This
                  </button>
                </div>
                <div style="font-size: 13px; color: #4b5563; line-height: 1.8; background: #f9fafb; padding: 8px; border-radius: 4px; margin-top: 8px;">
                  <div><strong>Phone:</strong> \${match.profile.phone_number || 'N/A'}</div>
                  <div><strong>Address:</strong> \${match.profile.address || 'N/A'}</div>
                  <div><strong>Location:</strong> \${match.profile.city || 'N/A'}, \${match.profile.province || 'N/A'}</div>
                  <div style="color: #059669; margin-top: 6px; padding-top: 6px; border-top: 1px solid #e5e7eb;">
                    <strong>Why matched:</strong> \${match.matchReasons.join(', ')}
                  </div>
                </div>
              </div>
            \`).join('')}
            
            <button type="button" onclick="createNew()" style="width: 100%; background: #3b82f6; color: white; border: none; padding: 12px; border-radius: 6px; font-size: 15px; cursor: pointer; margin-top: 8px; font-weight: 600;">
              ➕ No Match - Create New Profile Instead
            </button>
          </div>
        \`;
      } else {
        matchesHTML = \`
          <div style="background: #d1fae5; border: 2px solid #10b981; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
            <h3 style="margin: 0 0 8px 0; color: #065f46;">✅ No Existing Profiles Found</h3>
            <p style="margin: 0; color: #047857; font-size: 14px;">
              Searched all 10 CSV files - no matches found. This will create a new profile.
            </p>
          </div>
        \`;
      }
      
      preview.innerHTML = \`
        \${matchesHTML}
        
        <h3 style="margin: 0 0 16px 0; color: #111827;">📋 Parsed Data from Email</h3>
        <div class="preview">
          <div class="preview-item"><strong>Practice Name:</strong> <span>\${data.name || 'N/A'}</span></div>
          <div class="preview-item"><strong>Phone:</strong> <span>\${data.phone_number || 'N/A'}</span></div>
          <div class="preview-item"><strong>Email:</strong> <span>\${data.email_address || 'N/A'}</span></div>
          <div class="preview-item"><strong>Website:</strong> <span>\${data.website || 'N/A'}</span></div>
          <div class="preview-item"><strong>Address:</strong> <span>\${data.address || 'N/A'}</span></div>
          <div class="preview-item"><strong>City:</strong> <span>\${data.city || 'N/A'}</span></div>
          <div class="preview-item"><strong>Province:</strong> <span>\${data.province || 'N/A'}</span></div>
          <div class="preview-item"><strong>Country:</strong> <span>\${data.country || 'N/A'}</span></div>
          <div class="preview-item">
            <strong>Services (\${data.specialization.length}):</strong>
            <ul class="preview-list">
              \${data.specialization.slice(0, 10).map(s => \`<li>\${s}</li>\`).join('')}
              \${data.specialization.length > 10 ? \`<li>...and \${data.specialization.length - 10} more</li>\` : ''}
            </ul>
          </div>
          <div class="preview-item">
            <strong>Hours:</strong>
            <ul class="preview-list">
              \${Object.entries(data.hours_of_operation).map(([day, hours]) => 
                \`<li>\${day}: \${Array.isArray(hours) && hours.length > 0 ? hours.join(', ') : 'Closed'}</li>\`
              ).join('')}
            </ul>
          </div>
          <div class="preview-item"><strong>FAQs:</strong> <span>\${data.faqs.length} questions parsed</span></div>
        </div>
      \`;
      
      // Set initial button state
      const saveBtn = document.getElementById('saveBtn');
      const targetFileGroup = document.querySelector('#targetFileSection .form-group');
      
      if (matches && matches.length > 0) {
        saveBtn.textContent = '➕ Create New Profile';
        saveBtn.className = 'btn-success';
        targetFileGroup.style.display = 'block';
      } else {
        saveBtn.textContent = '💾 Save New Profile';
        saveBtn.className = 'btn-success';
        targetFileGroup.style.display = 'block';
      }
    }
  </script>
</body>
</html>`;
}

function renderBulkEditPage(csvFiles, selectedFile, csvContent, message = '') {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bulk Edit - VetList CRM</title>
  <link rel="stylesheet" href="/styles.css">
</head>
<body>
  <div class="container">
    <header>
      <div class="header-top">
        <div>
          <div class="eyebrow">Advanced workflow</div>
          <h1>Bulk Edit CSV</h1>
          <p>Raw CSV access for batch cleanup. Best for find/replace work after you already know exactly what you want to change.</p>
        </div>
        <div class="nav">
          <a href="/">Browse</a>
          <a href="/docs">Docs</a>
        </div>
      </div>
    </header>

    <div class="warning">
      ⚠️ <strong>Warning:</strong> This is direct CSV editing. Make sure your CSV format is correct before saving. 
      Invalid CSV will cause errors. Always backup your data first!
    </div>

    ${message ? `<div class="message ${message.includes('Error') ? 'error' : ''}">${message}</div>` : ''}

    <div class="form-container">
      <form method="POST" action="/bulk-edit">
        <div class="form-group">
          <label>Select CSV File</label>
          <select name="target_file" onchange="window.location.href='/bulk-edit?file=' + this.value">
            ${csvFiles.map((file) => `<option value="${file}" ${selectedFile === file ? 'selected' : ''}>${file}</option>`).join('')}
          </select>
        </div>

        <div class="form-group">
          <label>CSV Content</label>
          <textarea name="csv_content" required style="min-height: 500px;">${csvContent}</textarea>
        </div>

        <div class="btn-group">
          <button type="submit" class="btn-danger">Save Changes</button>
          <a href="/" class="btn-secondary">Cancel</a>
        </div>
      </form>
    </div>
  </div>
</body>
</html>`;
}

function renderDocsPage(stats) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Docs - VetList Admin</title>
  <link rel="stylesheet" href="/styles.css">
</head>
<body>
  <div class="container">
    <header>
      <div class="header-top">
        <div>
          <div class="eyebrow">Admin wiki</div>
          <h1>VetList Local CMS Guide</h1>
          <p>A simple reference for what lives where, which workflow to use, and how not to get lost.</p>
        </div>
        <div class="nav">
          <a href="/">Browse</a>
          <a href="/import">Import</a>
          <a href="/bulk-edit">Bulk Edit</a>
        </div>
      </div>
    </header>

    <div class="dashboard-grid">
      <div class="dashboard-card">
        <span class="dashboard-label">Data files</span>
        <strong>${stats.csvFiles}</strong>
        <p>CSV sources you can edit locally.</p>
      </div>
      <div class="dashboard-card">
        <span class="dashboard-label">Profiles</span>
        <strong>${stats.totalProfiles.toLocaleString()}</strong>
        <p>Total listings detected in the current data folder.</p>
      </div>
      <div class="dashboard-card">
        <span class="dashboard-label">Rule of thumb</span>
        <strong>Use the safest tool first</strong>
        <p>Browse for normal edits, import for claim emails, bulk edit only for deliberate CSV work.</p>
      </div>
    </div>

    <div class="docs-grid">
      <section class="form-container">
        <h2>Quick workflows</h2>
        <div class="doc-block">
          <h3>1. Normal listing edit</h3>
          <p>Go to Browse, search the clinic, click Edit, save changes, then refresh the Astro page locally.</p>
        </div>
        <div class="doc-block">
          <h3>2. Claim email import</h3>
          <p>Go to Import, paste the email, review matches, choose update or create, then save.</p>
        </div>
        <div class="doc-block">
          <h3>3. Large cleanup</h3>
          <p>Use Bulk Edit only when you already know the exact CSV you want to touch and you need raw access.</p>
        </div>
      </section>

      <section class="form-container">
        <h2>How the local setup works</h2>
        <div class="doc-block">
          <h3>Public site</h3>
          <p><code>npm run dev</code> runs the Astro site on <code>http://localhost:4323</code>.</p>
        </div>
        <div class="doc-block">
          <h3>Local CMS</h3>
          <p><code>cd crm && npm start</code> runs the local admin on <code>http://localhost:3030</code>.</p>
        </div>
        <div class="doc-block">
          <h3>Derived data</h3>
          <p>The project now precomputes site data before dev/build so Astro can render faster without redoing CSV work constantly.</p>
        </div>
      </section>

      <section class="form-container">
        <h2>FAQ</h2>
        <div class="doc-block">
          <h3>Which CSV should I edit?</h3>
          <p>Edit the file shown on the listing card whenever possible. Search all files first if you are unsure.</p>
        </div>
        <div class="doc-block">
          <h3>When should I use Bulk Edit?</h3>
          <p>Only for advanced cleanup jobs. If one listing needs work, use the normal edit screen instead.</p>
        </div>
        <div class="doc-block">
          <h3>What if a profile has the wrong URL on the public site?</h3>
          <p>Check the country, province, city, and name fields. Those are used to build the profile path.</p>
        </div>
      </section>
    </div>
  </div>
</body>
</html>`;
}

// Start server
app.listen(PORT, () => {
  console.log(`\n🏥 VetList CRM running at http://localhost:${PORT}\n`);
});
