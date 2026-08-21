/**
 * ============================================
 * ENCODING / DECODING FUNCTIONS
 * ============================================
 */

/**
 * Encode a template object into a URL-safe base64 string
 */
export const encodeTemplate = (template) => {
  try {
    const json = JSON.stringify(template);
    return btoa(encodeURIComponent(json));
  } catch (error) {
    throw new Error('Failed to encode template: ' + error.message);
  }
};

/**
 * Decode a URL-safe base64 string back to a template object
 */
export const decodeTemplate = (encoded) => {
  try {
    const clean = encoded.trim();
    const decoded = atob(clean);
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

  // Validate main relays
  if (!Array.isArray(template.relays) || template.relays.length === 0) {
    throw new Error('Template must have at least one relay');
  }

  template.relays.forEach((relay, index) => {
    if (!relay.url || typeof relay.url !== 'string') {
      throw new Error(`Relay ${index + 1} must have a URL`);
    }
    
    try {
      const url = new URL(relay.url);
      if (url.protocol !== 'wss:' && url.protocol !== 'ws:') {
        throw new Error(`Relay ${index + 1} must use wss:// or ws:// protocol`);
      }
    } catch (error) {
      throw new Error(`Relay ${index + 1} has invalid URL: ${relay.url}`);
    }

    if (typeof relay.read !== 'boolean') {
      throw new Error(`Relay ${index + 1} must specify read (inbox) as boolean`);
    }

    if (typeof relay.write !== 'boolean') {
      throw new Error(`Relay ${index + 1} must specify write (outbox) as boolean`);
    }
  });

  // Validate blossom servers (optional)
  if (template.blossomServers && Array.isArray(template.blossomServers)) {
    template.blossomServers.forEach((server, index) => {
      if (!server.url || typeof server.url !== 'string') {
        throw new Error(`Blossom server ${index + 1} must have a URL`);
      }
      try {
        const url = new URL(server.url);
        if (url.protocol !== 'https:' && url.protocol !== 'http:') {
          throw new Error(`Blossom server ${index + 1} must use https:// or http:// protocol`);
        }
      } catch (error) {
        throw new Error(`Blossom server ${index + 1} has invalid URL: ${server.url}`);
      }
    });
  }

  // Validate DM relays (optional)
  if (template.dmRelays && Array.isArray(template.dmRelays)) {
    template.dmRelays.forEach((relay, index) => {
      if (!relay.url || typeof relay.url !== 'string') {
        throw new Error(`DM relay ${index + 1} must have a URL`);
      }
      try {
        const url = new URL(relay.url);
        if (url.protocol !== 'wss:' && url.protocol !== 'ws:') {
          throw new Error(`DM relay ${index + 1} must use wss:// or ws:// protocol`);
        }
      } catch (error) {
        throw new Error(`DM relay ${index + 1} has invalid URL: ${relay.url}`);
      }
    });
  }

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
    blossomServers: [
      { url: 'https://cdn.satellite.earth' }
    ],
    dmRelays: [
      { url: 'wss://relay.private-msgs.com' }
    ],
    created_at: Math.floor(Date.now() / 1000)
  };
};

/**
 * Get popular community templates
 */
export const getCommunityTemplates = () => {
  return {
    'planet-dyne': {
      id: 'planet-dyne',
      name: 'Planet Dyne',
      description: 'Settings for dynes like you',
      relays: [
        { url: 'wss://relay.dyne.org', read: false, write: true },
        { url: 'wss://relay.dyne.org/inbox', read: true, write: false },
        { url: 'wss://relay.ditto.pub', read: true, write: true }
      ],
      blossomServers: [
        { url: 'https://relay.dyne.org' },
        { url: 'https://blossom.primal.net' }
      ],
      dmRelays: [
        { url: 'wss://relay.dyne.org/inbox' }
      ]
    },
    'basspistol': {
      id: 'basspistol',
      name: 'Basspistol',
      description: 'Settings for Basspistol members of the outernational music syndicate',
      relays: [
        { url: 'wss://basspistol.org', read: false, write: true },
        { url: 'wss://basspistol.org/inbox', read: true, write: false },
        { url: 'wss://relay.ditto.pub', read: true, write: true }
      ],
      blossomServers: [
        { url: 'https://basspistol.org' },
        { url: 'https://blossom.primal.net' }
      ],
      dmRelays: [
        { url: 'wss://basspistol.org/inbox' }
      ]
    },
    'spatia-arcana': {
      id: 'spatia-arcana',
      name: 'Spatia Arcana',
      description: 'Settings for Spatia Arcana',
      relays: [
        { url: 'wss://spatia-arcana.com', read: false, write: true },
        { url: 'wss://spatia-arcana.com/inbox', read: true, write: false },
        { url: 'wss://relay.ditto.pub', read: true, write: true }
      ],
      blossomServers: [
        { url: 'https://spatia-arcana.com' },
        { url: 'https://blossom.primal.net' }
      ],
      dmRelays: [
        { url: 'wss://spatia-arcana.com/inbox' }
      ]
    },
    'pyramid-fiatjaf': {
      id: 'pyramid-fiatjaf',
      name: 'Fiatjaf Pyramid',
      description: 'Settings for Fiatjaf Pyramid',
      relays: [
        { url: 'wss://pyramid.fiatjaf.com', read: false, write: true },
        { url: 'wss://pyramid.fiatjaf.com/inbox', read: true, write: false },
        { url: 'wss://relay.ditto.pub', read: true, write: true }
      ],
      blossomServers: [
        { url: 'https://pyramid.fiatjaf.com' },
        { url: 'https://blossom.primal.net' }
      ],
      dmRelays: [
        { url: 'wss://pyramid.fiatjaf.com/inbox' }
      ]
    },
    'neuch-blockchain': {
      id: 'neuch-blockchain',
      name: 'Neuchatel Blockchain',
      description: 'Settings for Neuchatel Blockchain community',
      relays: [
        { url: 'wss://nestr.nedao.ch', read: false, write: true },
        { url: 'wss://nestr.nedao.ch/inbox', read: true, write: false },
        { url: 'wss://relay.ditto.pub', read: true, write: true }
      ],
      blossomServers: [
        { url: 'https://nestr.nedao.ch' },
        { url: 'https://blossom.primal.net' }
      ],
      dmRelays: [
        { url: 'wss://nestr.nedao.ch/inbox' }
      ]
    },
    'anon': {
      id: 'anon',
      name: 'Anon Relays',
      description: 'Settings set for anons',
      relays: [
        { url: 'wss://nos.lol', read: true, write: true },
        { url: 'wss://nostr.mom', read: true, write: true },
        { url: 'wss://relay.ditto.pub', read: true, write: true }
      ],
      blossomServers: [
        { url: 'https://blossom.primal.net' }
      ],
      dmRelays: [
        { url: 'wss://nos.lol' },
        { url: 'wss://relay.ditto.pub' }
      ]
    },
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
 * read = inbox, write = outbox
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
 * - ['r', url] = read AND write (both inbox and outbox)
 * - ['r', url, 'read'] = read ONLY (inbox only)
 * - ['r', url, 'write'] = write ONLY (outbox only)
 */
export const kind10002TagsToTemplate = (tags, name = 'Imported Relays') => {
  const relays = tags
    .filter(tag => tag[0] === 'r')
    .map(tag => {
      const url = tag[1];
      const params = tag.slice(2);
      // If 'read' is in params, read is false (don't read from this relay)
      // If 'write' is in params, write is false (don't write to this relay)
      const read = !params.includes('read');
      const write = !params.includes('write');
      return {
        url: url,
        read: read,
        write: write
      };
    });

  return {
    id: generateTemplateId(),
    name: name,
    description: `Imported from existing relay set`,
    relays: relays,
    blossomServers: [],
    dmRelays: [],
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
  const filtered = history.filter(h => h.id !== template.id);
  filtered.unshift(entry);
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
