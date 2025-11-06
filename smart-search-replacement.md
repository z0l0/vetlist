# Smart Search Bar Replacement - VetGPT Integration

## Overview
Replace your existing VetList search bar with a smart input that expands into a full chat interface when clicked, seamlessly integrating your AI chatbot.

## Implementation

### 1. Smart Search Bar Component (Astro)

```astro
---
// src/components/VetGPTSearchBar.astro
---

<div class="vetgpt-search-container">
  <!-- Initial Search Bar State -->
  <div id="search-bar" class="search-bar">
    <div class="search-input-wrapper">
      <span class="search-icon">🤖</span>
      <input 
        type="text" 
        id="search-input"
        placeholder="Ask VetGPT: Find a vet near me, emergency care, specialists..."
        class="search-input"
        readonly
      />
      <div class="ai-badge">AI</div>
    </div>
  </div>

  <!-- Expanded Chat Interface -->
  <div id="chat-overlay" class="chat-overlay hidden">
    <div class="chat-container">
      <div class="chat-header">
        <div class="chat-title">
          <span class="chat-icon">🤖</span>
          <div>
            <h3>VetGPT</h3>
            <p>AI Veterinary Assistant</p>
          </div>
        </div>
        <button id="close-chat" class="close-btn">&times;</button>
      </div>
      
      <div class="chat-iframe-container">
        <iframe 
          id="chat-iframe"
          src=""
          width="100%" 
          height="100%"
          frameborder="0"
          title="VetGPT Chat Interface">
        </iframe>
      </div>
    </div>
  </div>
</div>

<style>
  .vetgpt-search-container {
    position: relative;
    width: 100%;
    max-width: 600px;
    margin: 0 auto;
  }

  /* Search Bar Styling */
  .search-bar {
    position: relative;
    z-index: 10;
  }

  .search-input-wrapper {
    display: flex;
    align-items: center;
    background: white;
    border: 2px solid #e2e8f0;
    border-radius: 25px;
    padding: 12px 20px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.1);
    transition: all 0.3s ease;
    cursor: pointer;
  }

  .search-input-wrapper:hover {
    border-color: #667eea;
    box-shadow: 0 6px 25px rgba(102,126,234,0.15);
    transform: translateY(-1px);
  }

  .search-icon {
    font-size: 20px;
    margin-right: 12px;
  }

  .search-input {
    flex: 1;
    border: none;
    outline: none;
    font-size: 16px;
    color: #374151;
    background: transparent;
    cursor: pointer;
  }

  .search-input::placeholder {
    color: #9ca3af;
  }

  .ai-badge {
    background: linear-gradient(45deg, #667eea, #764ba2);
    color: white;
    padding: 4px 8px;
    border-radius: 12px;
    font-size: 11px;
    font-weight: bold;
    margin-left: 8px;
  }

  /* Chat Overlay */
  .chat-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0,0,0,0.5);
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    backdrop-filter: blur(4px);
  }

  .chat-container {
    background: white;
    border-radius: 16px;
    width: 90vw;
    height: 80vh;
    max-width: 800px;
    max-height: 600px;
    display: flex;
    flex-direction: column;
    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    overflow: hidden;
  }

  .chat-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
  }

  .chat-title {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .chat-icon {
    font-size: 24px;
  }

  .chat-title h3 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
  }

  .chat-title p {
    margin: 0;
    font-size: 12px;
    opacity: 0.9;
  }

  .close-btn {
    background: none;
    border: none;
    color: white;
    font-size: 24px;
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
    transition: background 0.2s;
  }

  .close-btn:hover {
    background: rgba(255,255,255,0.2);
  }

  .chat-iframe-container {
    flex: 1;
    position: relative;
  }

  .hidden {
    display: none !important;
  }

  /* Mobile Responsive */
  @media (max-width: 768px) {
    .chat-container {
      width: 95vw;
      height: 90vh;
      border-radius: 12px;
    }
    
    .search-input-wrapper {
      padding: 10px 16px;
    }
    
    .search-input {
      font-size: 14px;
    }
  }
</style>

<script>
  document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('search-input');
    const searchBar = document.getElementById('search-bar');
    const chatOverlay = document.getElementById('chat-overlay');
    const closeChat = document.getElementById('close-chat');
    const chatIframe = document.getElementById('chat-iframe');
    
    let iframeLoaded = false;

    // Open chat when clicking search bar
    function openChat() {
      // Load iframe only when needed for performance
      if (!iframeLoaded) {
        const embedUrl = 'https://ai-chatbot-weld-nu-18.vercel.app/embed?profession=veterinary&theme=light&domain=vetlist.com';
        chatIframe.src = embedUrl;
        iframeLoaded = true;
      }
      
      chatOverlay.classList.remove('hidden');
      document.body.style.overflow = 'hidden'; // Prevent background scroll
    }

    // Close chat
    function closeChat() {
      chatOverlay.classList.add('hidden');
      document.body.style.overflow = ''; // Restore scroll
    }

    // Event listeners
    searchInput?.addEventListener('click', openChat);
    searchBar?.addEventListener('click', openChat);
    closeChat?.addEventListener('click', closeChat);
    
    // Close on overlay click
    chatOverlay?.addEventListener('click', (e) => {
      if (e.target === chatOverlay) {
        closeChat();
      }
    });

    // Close on escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !chatOverlay.classList.contains('hidden')) {
        closeChat();
      }
    });
  });
</script>
```

### 2. Integration Instructions

#### Replace Your Current Search Bar

1. **Find your current search bar** in your Astro layout/component
2. **Replace it** with the VetGPT search bar:

```astro
---
// In your main layout or header component
import VetGPTSearchBar from '../components/VetGPTSearchBar.astro';
---

<!-- Replace your existing search with: -->
<VetGPTSearchBar />
```

#### Example Integration in Header

```astro
---
// src/components/Header.astro
import VetGPTSearchBar from './VetGPTSearchBar.astro';
---

<header class="main-header">
  <div class="header-container">
    <!-- Logo -->
    <div class="logo">
      <span class="logo-icon">🐾</span>
      <span class="logo-text">VetList</span>
    </div>
    
    <!-- Smart Search Bar -->
    <div class="search-section">
      <VetGPTSearchBar />
    </div>
    
    <!-- Navigation -->
    <nav class="main-nav">
      <!-- your nav items -->
    </nav>
  </div>
</header>

<style>
  .main-header {
    background: white;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    padding: 1rem 0;
  }
  
  .header-container {
    max-width: 1200px;
    margin: 0 auto;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 2rem;
  }
  
  .search-section {
    flex: 1;
    max-width: 600px;
    margin: 0 2rem;
  }
  
  .logo {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 24px;
    font-weight: bold;
    color: #374151;
  }
</style>
```

### 3. Advanced Features

#### Auto-focus with User Query
If you want to pass the user's initial search to the chatbot:

```javascript
// Enhanced script section
function openChat(initialQuery = '') {
  if (!iframeLoaded) {
    let embedUrl = 'https://ai-chatbot-weld-nu-18.vercel.app/embed?profession=veterinary&theme=light&domain=vetlist.com';
    
    // Pass initial query if provided
    if (initialQuery) {
      embedUrl += `&initialQuery=${encodeURIComponent(initialQuery)}`;
    }
    
    chatIframe.src = embedUrl;
    iframeLoaded = true;
  }
  
  chatOverlay.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

// Allow typing in search bar before opening
searchInput?.addEventListener('input', (e) => {
  // Store the query but don't open yet
  searchInput.dataset.query = e.target.value;
});

searchInput?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const query = searchInput.value.trim();
    if (query) {
      openChat(query);
    } else {
      openChat();
    }
  }
});
```

#### Smooth Animation
Add CSS transitions for smoother experience:

```css
.chat-overlay {
  opacity: 0;
  transform: scale(0.9);
  transition: all 0.3s ease;
}

.chat-overlay:not(.hidden) {
  opacity: 1;
  transform: scale(1);
}

.search-input-wrapper {
  transform: scale(1);
  transition: transform 0.2s ease;
}

.search-input-wrapper:active {
  transform: scale(0.98);
}
```

## User Experience Flow

1. **User sees smart search bar** with AI badge and helpful placeholder
2. **Clicks anywhere on search bar** → Smooth overlay opens
3. **Full chat interface loads** with your existing chatbot
4. **User chats naturally** → Gets vet recommendations
5. **Clicks outside or close button** → Returns to main site

## Benefits

✅ **Seamless Integration**: Looks like part of your site  
✅ **Performance**: Iframe only loads when needed  
✅ **Mobile Friendly**: Responsive design  
✅ **Accessible**: Keyboard navigation support  
✅ **SEO Safe**: No impact on static site SEO  
✅ **Secure**: API keys stay on Vercel  

## Customization Options

- **Colors**: Adjust gradient and theme colors
- **Size**: Modify chat container dimensions  
- **Animation**: Customize transition effects
- **Branding**: Change icons, text, and styling
- **Behavior**: Add auto-open, query passing, etc.

This creates a modern, AI-powered search experience that will definitely stand out to AI directory reviewers!