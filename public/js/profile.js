// Profile page interactions
class ProfileInteractions {
  constructor() {
    this.currentActiveIcon = null;
    this.currentActiveDisplay = null;
    this.init();
  }

  init() {
    this.setupContactIcons();
    this.setupReadMore();
    this.setupFAQs();
    this.setupClaimButton();
  }

  setupContactIcons() {
    document.querySelectorAll('.contact-icon-btn').forEach(button => {
      button.addEventListener('click', () => this.handleContactClick(button));
    });
  }

  handleContactClick(button) {
    const { contactType, contactValue, displayId, contentId } = button.dataset;
    const display = document.getElementById(displayId);
    const content = document.getElementById(contentId);
    
    if (this.currentActiveIcon === button && !display.classList.contains('hidden')) {
      display.classList.add('hidden');
      this.currentActiveIcon = null;
      this.currentActiveDisplay = null;
      return;
    }
    
    if (this.currentActiveDisplay && !this.currentActiveDisplay.classList.contains('hidden')) {
      this.currentActiveDisplay.classList.add('hidden');
    }
    
    const contactInfo = this.getContactInfo(contactType, contactValue);
    content.innerHTML = contactInfo;
    display.classList.remove('hidden');
    
    this.currentActiveIcon = button;
    this.currentActiveDisplay = display;
  }

  getContactInfo(type, value) {
    const configs = {
      phone: {
        display: value || 'Phone number not available',
        action: value ? `<a href="tel:${value}" class="text-primary-600 hover:text-primary-800 font-medium">Call Now</a>` : ''
      },
      location: {
        display: value || 'Address not available',
        action: value ? `<a href="https://maps.google.com/?q=${encodeURIComponent(value)}" target="_blank" rel="noopener noreferrer" class="text-primary-600 hover:text-primary-800 font-medium">View on Map</a>` : ''
      },
      website: {
        display: value || 'Website not available',
        action: value ? `<a href="${value}" target="_blank" rel="noopener noreferrer" class="text-primary-600 hover:text-primary-800 font-medium">Visit Website</a>` : ''
      }
    };

    const config = configs[type];
    return `<div class="mb-2">${config.display}</div>${config.action ? `<div>${config.action}</div>` : ''}`;
  }

  setupReadMore() {
    const description = document.getElementById('aboutDescription');
    const readMore = document.getElementById('readMore');
    const hide = document.getElementById('hide');

    if (!description || !readMore || !hide) return;

    const lineHeight = parseFloat(window.getComputedStyle(description).lineHeight);
    const maxHeight = lineHeight * 6;
    
    if (description.scrollHeight <= maxHeight) {
      readMore.style.display = 'none';
      return;
    }

    readMore.addEventListener('click', () => {
      description.classList.remove('clamped');
      readMore.style.display = 'none';
      hide.style.display = 'inline-block';
    });

    hide.addEventListener('click', () => {
      description.classList.add('clamped');
      hide.style.display = 'none';
      readMore.style.display = 'inline-block';
    });
  }

  setupFAQs() {
    document.querySelectorAll('.faq-question').forEach(button => {
      button.addEventListener('click', () => this.toggleFAQ(button));
    });
  }

  toggleFAQ(button) {
    const expanded = button.getAttribute('aria-expanded') === 'true';
    const answerId = button.getAttribute('aria-controls');
    const answer = document.getElementById(answerId);
    const icon = button.querySelector('.faq-icon');
    
    // Close all other FAQs
    document.querySelectorAll('.faq-question').forEach(otherButton => {
      if (otherButton !== button) {
        otherButton.setAttribute('aria-expanded', 'false');
        const otherAnswerId = otherButton.getAttribute('aria-controls');
        const otherAnswer = document.getElementById(otherAnswerId);
        const otherIcon = otherButton.querySelector('.faq-icon');
        
        if (otherAnswer) otherAnswer.classList.add('hidden');
        if (otherIcon) otherIcon.style.transform = 'rotate(0deg)';
      }
    });
    
    // Toggle current FAQ
    if (expanded) {
      button.setAttribute('aria-expanded', 'false');
      if (answer) answer.classList.add('hidden');
      if (icon) icon.style.transform = 'rotate(0deg)';
    } else {
      button.setAttribute('aria-expanded', 'true');
      if (answer) answer.classList.remove('hidden');
      if (icon) icon.style.transform = 'rotate(180deg)';
    }
  }

  setupClaimButton() {
    const claimButton = document.getElementById('claim-clinic-btn');
    if (!claimButton) return;

    claimButton.addEventListener('click', () => {
      const params = this.buildClaimParams();
      window.location.href = `/claim-clinic?${params.toString()}`;
    });
  }

  buildClaimParams() {
    const params = new URLSearchParams();
    
    // Basic info
    const name = document.querySelector('h1')?.textContent?.trim();
    if (name) params.set('name', name);
    
    // Contact info
    ['phone', 'location', 'website'].forEach(type => {
      const button = document.querySelector(`[data-contact-type="${type}"]`);
      if (button?.dataset.contactValue) {
        const key = type === 'location' ? 'address' : type;
        params.set(key, button.dataset.contactValue);
      }
    });
    
    // Location from URL
    const pathParts = window.location.pathname.split('/').filter(part => part);
    if (pathParts.length >= 3) {
      const toTitleCase = str => str.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      params.set('country', toTitleCase(pathParts[0]));
      params.set('province', toTitleCase(pathParts[1]));
      params.set('city', toTitleCase(pathParts[2]));
    }
    
    // Services
    const services = Array.from(document.querySelectorAll('.bg-primary-50.text-primary-700'))
      .map(el => el.textContent?.trim())
      .filter(Boolean);
    if (services.length) params.set('services', JSON.stringify(services));
    
    // Hours
    const hours = this.extractHours();
    if (Object.keys(hours).length) {
      params.set('hours', encodeURIComponent(JSON.stringify(hours)));
    }
    
    return params;
  }

  extractHours() {
    const hours = {};
    const dayMapping = {
      'Monday': '1', 'Tuesday': '2', 'Wednesday': '3', 'Thursday': '4',
      'Friday': '5', 'Saturday': '6', 'Sunday': '7'
    };
    
    document.querySelectorAll('table tbody tr').forEach(row => {
      const cells = row.querySelectorAll('td');
      if (cells.length >= 2) {
        const dayName = cells[0].textContent?.trim();
        const hoursText = cells[1].textContent?.trim();
        
        if (dayName && hoursText && dayMapping[dayName]) {
          const dayNum = dayMapping[dayName];
          if (hoursText.toLowerCase() !== 'closed' && hoursText !== 'Hours information unavailable') {
            hours[dayNum] = [hoursText.replace(/\s*-\s*/, '-')];
          } else {
            hours[dayNum] = [];
          }
        }
      }
    });
    
    return hours;
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => new ProfileInteractions());