/**
 * ============================================
 * ENCODING / DECODING FUNCTIONS
 * ============================================
 */

/**
 * Encode a template object into a URL-safe base64 string
 * Using btoa with proper UTF-8 handling
 */
export const encodeTemplate = (template) => {
  try {
    const json = JSON.stringify(template);
    // Proper UTF-8 encoding for btoa
    const utf8Encoded = encodeURIComponent(json);
    const base64 = btoa(utf8Encoded);
    return base64;
  } catch (error) {
    throw new Error('Failed to encode template: ' + error.message);
  }
};

/**
 * Decode a URL-safe base64 string back to a template object
 */
export const decodeTemplate = (encoded) => {
  try {
    // First, make sure the string is clean
    const clean = encoded.trim();
    // Decode from base64
    const decoded = atob(clean);
    // Decode the URI component
    const json = decodeURIComponent(decoded);
    return JSON.parse(json);
  } catch (error) {
    console.error('Decode error:', error);
    throw new Error('Failed to decode template: ' + error.message);
  }
};

/**
 * Generate a short unique ID for templates
 */
export const generateTemplateId = () => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${random}`;
};

/**
 * ============================================
 * VALIDATION FUNCTIONS
 * ============================================
 */

/**
 * Validate template structure and data
 */
export const validateTemplate = (template) => {
  if (!template || typeof template !== 'object') {
    throw new Error('Template must be an object');
  }

  if (!template.name || typeof template.name !== 'string' || template.name.trim().length === 0) {
    throw new Error('Template must have a name');
  }

  if (!Array.isArray(template.relays) || template.relays.length === 0) {
    throw new Error('Template must have at least one relay');
  }

  template.relays.forEach((relay, index) => {
    if (!relay.url || typeof relay.url !== 'string') {
      throw new Error(`Relay ${index + 1} must have a URL`);
    }
    
    // Validate URL format
    try {
      const url = new URL(relay.url);
      if (url.protocol !== 'wss:' && url.protocol !== 'ws:') {
        throw new Error(`Relay ${index + 1} must use wss:// or ws:// protocol`);
      }
    } catch (error) {
      throw new Error(`Relay ${index + 1} has invalid URL: ${relay.url}`);
    }

    if (typeof relay.read !== 'boolean') {
      throw new Error(`Relay ${index + 1} must specify read as boolean`);
    }

    if (typeof relay.write !== 'boolean') {
      throw new Error(`Relay ${index + 1} must specify write as boolean`);
    }
  });

  return true;
};

/**
 * Check if a template has duplicate relay URLs
 */
export const hasDuplicateRelays = (template) => {
  const urls = template.relays.map(r => r.url);
  return new Set(urls).size !== urls.length;
};

/**
 * ============================================
 * DEFAULT / PRESET TEMPLATES
 * ============================================
 */

/**
 * Get default relay template
 */
export const getDefaultTemplate = () => {
  return {
    id: generateTemplateId(),
    name: 'Default Relays',
    description: 'Standard Nostr relay set for beginners',
    relays: [
      { url: 'wss://relay.damus.io', read: true, write: true },
      { url: 'wss://nos.lol', read: true, write: true },
      { url: 'wss://relay.snort.social', read: true, write: true }
    ],
    created_at: Math.floor(Date.now() / 1000)
  };
};

/**
 * Get popular community templates
 */
export const getCommunityTemplates = () => {
  return {
    'nostr-punks': {
      id: 'nostr-punks',
      name: 'Nostr Punks',
      description: 'Relay set for the Nostr Punks community',
      relays: [
        { url: 'wss://relay.nostr-punks.com', read: true, write: true },
        { url: 'wss://relay.damus.io', read: true, write: true },
        { url: 'wss://nostr-pub.wellorder.net', read: true, write: true }
      ]
    },
    'plebchain': {
      id: 'plebchain',
      name: 'PlebChain',
      description: 'Relay set for PlebChain community',
      relays: [
        { url: 'wss://relay.damus.io', read: true, write: true },
        { url: 'wss://nos.lol', read: true, write: true },
        { url: 'wss://relay.snort.social', read: true, write: true },
        { url: 'wss://offchain.pub', read: true, write: true }
      ]
    },
    'minimal': {
      id: 'minimal',
      name: 'Minimal Set',
      description: 'Just the essentials to get started',
      relays: [
        { url: 'wss://relay.damus.io', read: true, write: true }
      ]
    }
  };
};

/**
 * ============================================
 * TEMPLATE MANIPULATION FUNCTIONS
 * ============================================
 */

/**
 * Add a relay to a template
 */
export const addRelayToTemplate = (template, relay) => {
  if (!relay.url) {
    throw new Error('Relay must have a URL');
  }
  
  // Check if relay already exists
  if (template.relays.some(r => r.url === relay.url)) {
    throw new Error('Relay already exists in template');
  }
  
  return {
    ...template,
    relays: [
      ...template.relays,
      {
        url: relay.url,
        read: relay.read !== undefined ? relay.read : true,
        write: relay.write !== undefined ? relay.write : true
      }
    ]
  };
};

/**
 * Remove a relay from a template by URL
 */
export const removeRelayFromTemplate = (template, relayUrl) => {
  return {
    ...template,
    relays: template.relays.filter(r => r.url !== relayUrl)
  };
};

/**
 * Update a relay in a template
 */
export const updateRelayInTemplate = (template, relayUrl, updates) => {
  return {
    ...template,
    relays: template.relays.map(r => 
      r.url === relayUrl ? { ...r, ...updates } : r
    )
  };
};

/**
 * Clone a template (deep copy)
 */
export const cloneTemplate = (template) => {
  return JSON.parse(JSON.stringify(template));
};

/**
 * ============================================
 * CONVERSION FUNCTIONS
 * ============================================
 */

/**
 * Convert template relays to kind 10002 tags format
 */
export const templateToKind10002Tags = (template) => {
  return template.relays.map(relay => {
    const params = [];
    if (!relay.read) params.push('read');
    if (!relay.write) params.push('write');
    return ['r', relay.url, ...params];
  });
};

/**
 * Convert kind 10002 tags to template format
 */
export const kind10002TagsToTemplate = (tags, name = 'Imported Relays') => {
  const relays = tags
    .filter(tag => tag[0] === 'r')
    .map(tag => {
      const url = tag[1];
      const params = tag.slice(2);
      return {
        url: url,
        read: !params.includes('read'),
        write: !params.includes('write')
      };
    });

  return {
    id: generateTemplateId(),
    name: name,
    description: `Imported from existing relay set`,
    relays: relays,
    created_at: Math.floor(Date.now() / 1000)
  };
};

/**
 * ============================================
 * STORAGE FUNCTIONS (LocalStorage)
 * ============================================
 */

/**
 * Save template to localStorage
 */
export const saveTemplateToStorage = (template) => {
  const history = JSON.parse(localStorage.getItem('templateHistory') || '[]');
  const entry = {
    ...template,
    saved_at: Date.now()
  };
  // Remove duplicates
  const filtered = history.filter(h => h.id !== template.id);
  filtered.unshift(entry);
  // Keep last 50 templates
  localStorage.setItem('templateHistory', JSON.stringify(filtered.slice(0, 50)));
  return entry;
};

/**
 * Get template history from localStorage
 */
export const getTemplateHistory = () => {
  return JSON.parse(localStorage.getItem('templateHistory') || '[]');
};

/**
 * Clear template history
 */
export const clearTemplateHistory = () => {
  localStorage.removeItem('templateHistory');
};

/**
 * Get recently applied templates
 */
export const getRecentTemplates = (limit = 5) => {
  const history = getTemplateHistory();
  return history.slice(0, limit);
};

/**
 * ============================================
 * SHARE FUNCTIONS
 * ============================================
 */

/**
 * Generate a shareable URL for a template
 */
export const generateShareUrl = (template, baseUrl = window.location.origin) => {
  const encoded = encodeTemplate(template);
  return `${baseUrl}/apply/${encoded}`;
};

/**
 * Extract template from share URL
 */
export const extractTemplateFromUrl = (url) => {
  const match = url.match(/\/apply\/([^/?]+)/);
  if (!match) {
    throw new Error('Invalid share URL');
  }
  return decodeTemplate(match[1]);
};

/**
 * ============================================
 * EXPORT ALL
 * ============================================
 */

// Default export for convenience
export default {
  encodeTemplate,
  decodeTemplate,
  generateTemplateId,
  validateTemplate,
  hasDuplicateRelays,
  getDefaultTemplate,
  getCommunityTemplates,
  addRelayToTemplate,
  removeRelayFromTemplate,
  updateRelayInTemplate,
  cloneTemplate,
  templateToKind10002Tags,
  kind10002TagsToTemplate,
  saveTemplateToStorage,
  getTemplateHistory,
  clearTemplateHistory,
  getRecentTemplates,
  generateShareUrl,
  extractTemplateFromUrl
};
