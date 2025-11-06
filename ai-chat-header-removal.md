# Remove VetBot Header from AI Chat Project

This document provides instructions for removing the duplicate VetBot header from the AI chatbot project to create a cleaner integration with VetList.org.

## Problem
When the VetList.org site embeds the AI chatbot, there are two headers:
1. VetList.org's main header (which should stay)
2. VetBot's internal header (which should be hidden for embedded views)

## Solution
Add a `hideHeader` URL parameter that hides the VetBot header when the chatbot is embedded.

## Implementation Steps

### 1. Update the Chat Component

Find your main chat component (likely `ChatInterface.tsx`, `Chat.tsx`, or similar) and modify it to check for the `hideHeader` parameter:

```tsx
// At the top of your chat component
import { useSearchParams } from 'next/navigation'; // or your router's hook

export default function ChatInterface() {
  const searchParams = useSearchParams();
  const hideHeader = searchParams.get('hideHeader') === 'true';

  return (
    <div className="chat-container">
      {/* Conditionally render header */}
      {!hideHeader && (
        <div className="chat-header">
          <div className="chat-title">
            <span className="chat-icon">🤖</span>
            <div>
              <h3>VetBot</h3>
              <p>AI veterinary assistant</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Chat messages and input - always visible */}
      <div className="chat-messages">
        {/* Your existing chat UI */}
      </div>
    </div>
  );
}
```

### 2. Alternative: CSS-Based Solution

If you prefer a CSS-only approach, add this to your global styles:

```css
/* Hide header when hideHeader parameter is present */
body[data-hide-header="true"] .chat-header,
body[data-hide-header="true"] .vetbot-header,
body[data-hide-header="true"] .header {
  display: none !important;
}

/* Adjust chat container when header is hidden */
body[data-hide-header="true"] .chat-container {
  padding-top: 0 !important;
}

body[data-hide-header="true"] .chat-messages {
  height: 100vh !important;
  max-height: 100vh !important;
}
```

Then add this JavaScript to detect the parameter:

```javascript
// Add to your main layout or app component
useEffect(() => {
  const urlParams = new URLSearchParams(window.location.search);
  const hideHeader = urlParams.get('hideHeader') === 'true';
  
  if (hideHeader) {
    document.body.setAttribute('data-hide-header', 'true');
  }
}, []);
```

### 3. Update Embed Route (if using Next.js)

If you have a dedicated embed route, update it:

```tsx
// pages/embed.tsx or app/embed/page.tsx
import { Suspense } from 'react';
import ChatInterface from '../components/ChatInterface';

export default function EmbedPage() {
  return (
    <div className="embed-container">
      <Suspense fallback={<div>Loading...</div>}>
        <ChatInterface />
      </Suspense>
    </div>
  );
}
```

### 4. Test the Implementation

Test these URLs to ensure the header shows/hides correctly:

- **With header**: `https://ai-chatbot-weld-nu-18.vercel.app/embed?profession=veterinary&theme=light&domain=vetlist.com`
- **Without header**: `https://ai-chatbot-weld-nu-18.vercel.app/embed?profession=veterinary&theme=light&domain=vetlist.com&hideHeader=true`

## Expected Result

When `hideHeader=true` is in the URL:
- ✅ VetBot's internal header is hidden
- ✅ Chat messages area expands to full height
- ✅ Only the embedding site's header (VetList.org) is visible
- ✅ All chat functionality remains intact

## CSS Classes to Target

Common header class names to hide:
- `.chat-header`
- `.header`
- `.app-header`
- `.vetbot-header`
- `.navbar`
- `.top-bar`

## Fallback Option

If the above doesn't work, you can also try hiding the header with CSS injection from the parent site, but the URL parameter approach is cleaner:

```css
/* Add to VetList.org if needed as fallback */
iframe[src*="ai-chatbot-weld-nu-18.vercel.app"] {
  /* This won't work due to cross-origin restrictions, so use URL parameter method */
}
```

## Testing Checklist

- [ ] Header hidden when `hideHeader=true`
- [ ] Header visible when `hideHeader=false` or not present
- [ ] Chat functionality works in both modes
- [ ] Mobile responsive in both modes
- [ ] No console errors
- [ ] Smooth integration with VetList.org

This approach gives you clean control over when to show/hide the header based on how the chatbot is being used (standalone vs embedded).