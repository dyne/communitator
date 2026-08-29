/** @typedef {{url: string, read: boolean, write: boolean}} Relay */
/** @typedef {{url: string}} Endpoint */
/** @typedef {{id?: string, name: string, description: string, relays: readonly Relay[], blossomServers: readonly Endpoint[], dmRelays: readonly Endpoint[], created_at?: number}} Template */

export const TEMPLATE_LIMITS = Object.freeze({ encoded: 16 * 1024, id: 80, name: 80, description: 500, url: 2048, relays: 16, blossomServers: 8, dmRelays: 8, destinations: 32 });
// eslint-disable-next-line no-control-regex -- these characters are rejected at the trust boundary.
const CONTROL_OR_BIDI = new RegExp('[\\u0000-\\u001F\\u007F-\\u009F\\u200E\\u200F\\u202A-\\u202E\\u2066-\\u2069]', 'u');
const VERSION = 1;

export class TemplateError extends Error {
  /** @param {string} code */
  constructor(code) { super(code); this.name = 'TemplateError'; this.code = code; }
}
const fail = (code) => { throw new TemplateError(code); };
const own = (value, keys) => Object.keys(value).every((key) => keys.includes(key));
const plainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
const scalarText = (value, limit, required = false) => {
  if (typeof value !== 'string') fail('invalid_text');
  const normalized = value.normalize('NFC');
  if ((required && normalized.trim().length === 0) || Array.from(normalized).length > limit || CONTROL_OR_BIDI.test(normalized)) fail('invalid_text');
  return normalized;
};
const freeze = (value) => Object.freeze(value);
const freezeArray = (values) => freeze(values.map((value) => freeze(value)));
const isLiteralLoopback = (hostname) => hostname === '127.0.0.1' || hostname === '[::1]' || hostname === '::1';

/** Canonical endpoint. Insecure schemes are only opt-in for literal loopback development. */
export const canonicalizeEndpoint = (raw, kind, { allowInsecureLoopback = false } = {}) => {
  if (typeof raw !== 'string' || raw.length === 0 || raw.length > TEMPLATE_LIMITS.url || CONTROL_OR_BIDI.test(raw)) fail('invalid_endpoint');
  let parsed;
  try { parsed = new URL(raw); } catch { fail('invalid_endpoint'); }
  if (parsed.username || parsed.password || parsed.hash || !parsed.hostname) fail('invalid_endpoint');
  const secure = kind === 'blossom' ? 'https:' : 'wss:';
  const insecure = kind === 'blossom' ? 'http:' : 'ws:';
  if (parsed.protocol !== secure && !(allowInsecureLoopback && parsed.protocol === insecure && isLiteralLoopback(parsed.hostname))) fail('invalid_endpoint');
  const url = parsed.toString();
  if (url.length > TEMPLATE_LIMITS.url) fail('invalid_endpoint');
  return url;
};
export const displayEndpoint = (url) => canonicalizeEndpoint(url, url.startsWith('https:') || url.startsWith('http:') ? 'blossom' : 'relay');

const canonicalRelay = (value) => {
  if (!plainObject(value) || !own(value, ['url', 'read', 'write']) || typeof value.read !== 'boolean' || typeof value.write !== 'boolean' || (!value.read && !value.write)) fail('invalid_relay');
  return { url: canonicalizeEndpoint(value.url, 'relay'), read: value.read, write: value.write };
};
const canonicalEndpoint = (value, kind) => {
  if (!plainObject(value) || !own(value, ['url'])) fail('invalid_endpoint');
  return { url: canonicalizeEndpoint(value.url, kind) };
};
const unique = (items) => new Set(items.map((item) => item.url)).size === items.length;

/** Converts untrusted input to the only template shape accepted beyond this boundary. */
export const canonicalizeTemplate = (input) => {
  if (!plainObject(input) || !own(input, ['id', 'name', 'description', 'relays', 'blossomServers', 'dmRelays', 'created_at'])) fail('invalid_shape');
  const name = scalarText(input.name, TEMPLATE_LIMITS.name, true);
  const description = input.description === undefined ? '' : scalarText(input.description, TEMPLATE_LIMITS.description);
  const id = input.id === undefined ? undefined : (() => {
    if (typeof input.id !== 'string' || input.id.length === 0 || input.id.length > TEMPLATE_LIMITS.id || !/^[\x21-\x7E]+$/.test(input.id)) fail('invalid_id');
    return input.id;
  })();
  if (!Array.isArray(input.relays) || input.relays.length === 0 || input.relays.length > TEMPLATE_LIMITS.relays) fail('invalid_relays');
  const relays = input.relays.map(canonicalRelay);
  if (!unique(relays)) fail('duplicate_endpoint');
  const blossomServers = input.blossomServers === undefined ? [] : (() => {
    if (!Array.isArray(input.blossomServers) || input.blossomServers.length > TEMPLATE_LIMITS.blossomServers) fail('invalid_blossom');
    const values = input.blossomServers.map((value) => canonicalEndpoint(value, 'blossom'));
    if (!unique(values)) fail('duplicate_endpoint'); return values;
  })();
  const dmRelays = input.dmRelays === undefined ? [] : (() => {
    if (!Array.isArray(input.dmRelays) || input.dmRelays.length > TEMPLATE_LIMITS.dmRelays) fail('invalid_dm');
    const values = input.dmRelays.map((value) => canonicalEndpoint(value, 'dm'));
    if (!unique(values)) fail('duplicate_endpoint'); return values;
  })();
  const created_at = input.created_at === undefined ? undefined : (() => {
    if (!Number.isInteger(input.created_at) || input.created_at < 0 || input.created_at > 4102444800) fail('invalid_timestamp'); return input.created_at;
  })();
  return freeze({ ...(id === undefined ? {} : { id }), name, description, relays: freezeArray(relays), blossomServers: freezeArray(blossomServers), dmRelays: freezeArray(dmRelays), ...(created_at === undefined ? {} : { created_at }) });
};
export const validateTemplate = (template) => { canonicalizeTemplate(template); return true; };
export const generateTemplateId = () => globalThis.crypto?.randomUUID?.();

const bytesToBase64Url = (bytes) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/u, '');
const base64ToBytes = (text) => {
  if (!/^[A-Za-z0-9_-]+$/.test(text) || text.length % 4 === 1) fail('invalid_encoding');
  const padded = text.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - text.length % 4) % 4);
  try { return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0)); } catch { fail('invalid_encoding'); }
};
const safeParse = (json) => { try { return JSON.parse(json); } catch { fail('invalid_json'); } };
export const encodeTemplate = (template) => {
  const canonical = canonicalizeTemplate(template);
  const encoded = bytesToBase64Url(new TextEncoder().encode(JSON.stringify({ v: VERSION, ...canonical })));
  if (encoded.length > TEMPLATE_LIMITS.encoded) fail('payload_too_large');
  return encoded;
};
/** Versionless legacy btoa(encodeURIComponent(JSON)) links remain supported. */
export const decodeTemplate = (encoded) => {
  if (typeof encoded !== 'string' || encoded.length === 0 || encoded.length > TEMPLATE_LIMITS.encoded) fail('invalid_encoding');
  let parsed;
  if (/^[A-Za-z0-9_-]+$/.test(encoded)) {
    let json;
    try { json = new TextDecoder('utf-8', { fatal: true }).decode(base64ToBytes(encoded)); } catch (error) { if (error instanceof TemplateError) throw error; fail('invalid_encoding'); }
    // Legacy btoa(encodeURIComponent(JSON)) always decodes to percent-encoded JSON.
    // Only that distinct wire shape may fall through to the legacy parser.
    if (json.startsWith('%7B')) {
      try { parsed = safeParse(decodeURIComponent(atob(encoded))); } catch (error) { if (error instanceof TemplateError) throw error; fail('invalid_encoding'); }
      return canonicalizeTemplate(parsed);
    }
    parsed = safeParse(json);
    if (!plainObject(parsed) || parsed.v !== VERSION || !own(parsed, ['v', 'id', 'name', 'description', 'relays', 'blossomServers', 'dmRelays', 'created_at'])) fail('invalid_version');
    const wire = { ...parsed };
    delete wire.v;
    return canonicalizeTemplate(wire);
  }
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) fail('invalid_encoding');
  try { parsed = safeParse(decodeURIComponent(atob(encoded))); } catch (error) { if (error instanceof TemplateError) throw error; fail('invalid_encoding'); }
  return canonicalizeTemplate(parsed);
};

export const getDefaultTemplate = () => canonicalizeTemplate({ id: generateTemplateId(), name: 'Default Relays', description: 'Standard Nostr relay set for beginners', relays: [{ url: 'wss://relay.damus.io', read: true, write: true }, { url: 'wss://nos.lol', read: true, write: true }, { url: 'wss://relay.snort.social', read: true, write: true }], blossomServers: [{ url: 'https://cdn.satellite.earth' }], dmRelays: [{ url: 'wss://relay.private-msgs.com' }], created_at: Math.floor(Date.now() / 1000) });
const preset = (id, name, description, host) => canonicalizeTemplate({ id, name, description, relays: [{ url: `wss://${host}`, read: false, write: true }, { url: `wss://${host}/inbox`, read: true, write: false }, { url: 'wss://relay.ditto.pub', read: true, write: true }], blossomServers: [{ url: `https://${host}` }, { url: 'https://blossom.primal.net' }], dmRelays: [{ url: `wss://${host}/inbox` }] });
export const getCommunityTemplates = () => freeze({ 'planet-dyne': preset('planet-dyne', 'Planet Dyne', 'Settings for dynes like you', 'relay.dyne.org'), basspistol: preset('basspistol', 'Basspistol', 'Settings for Basspistol members of the outernational music syndicate', 'basspistol.org'), 'spatia-arcana': preset('spatia-arcana', 'Spatia Arcana', 'Settings for Spatia Arcana', 'spatia-arcana.com'), 'pyramid-fiatjaf': preset('pyramid-fiatjaf', 'Fiatjaf Pyramid', 'Settings for Fiatjaf Pyramid', 'pyramid.fiatjaf.com'), 'neuch-blockchain': preset('neuch-blockchain', 'Neuchatel Blockchain', 'Settings for Neuchatel Blockchain community', 'nestr.nedao.ch'), anon: canonicalizeTemplate({ id: 'anon', name: 'Anon Relays', description: 'Settings set for anons', relays: [{ url: 'wss://nos.lol', read: true, write: true }, { url: 'wss://nostr.mom', read: true, write: true }, { url: 'wss://relay.ditto.pub', read: true, write: true }], blossomServers: [{ url: 'https://blossom.primal.net' }], dmRelays: [{ url: 'wss://nos.lol' }, { url: 'wss://relay.ditto.pub' }] }) });

const buildEvent = (kind, template, created_at, tags) => {
  const canonical = canonicalizeTemplate(template);
  if (!Number.isInteger(created_at) || created_at < 0 || created_at > 4102444800) fail('invalid_timestamp');
  return freeze({ kind, created_at, tags: freezeArray(tags(canonical).map((tag) => freeze([...tag]))), content: '' });
};
export const buildKind10002 = (template, created_at) => buildEvent(10002, template, created_at, (value) => value.relays.map(({ url, read, write }) => ['r', url, ...(read && write ? [] : [read ? 'read' : 'write'])]));
export const buildKind10063 = (template, created_at) => buildEvent(10063, template, created_at, (value) => value.blossomServers.map(({ url }) => ['server', url]));
export const buildKind10050 = (template, created_at) => buildEvent(10050, template, created_at, (value) => value.dmRelays.map(({ url }) => ['relay', url]));
export const templateToKind10002Tags = (template) => buildKind10002(template, 0).tags;

export const BLAST_RELAYS = freezeArray(['wss://relay.primal.net', 'wss://relay.damus.io', 'wss://relay.ditto.pub', 'wss://offchain.pub', 'wss://sendit.nosflare.com', 'wss://nostr.mom', 'wss://nos.lol', 'wss://purplepag.es', 'wss://indexer.coracle.social', 'wss://user.kindpag.es', 'wss://directory.yabu.me', 'wss://profiles.nostr1.com'].map((url) => ({ url: canonicalizeEndpoint(url, 'relay') })));
export const publicationDestinations = (template) => {
  const canonical = canonicalizeTemplate(template);
  const uniqueUrls = [...new Set([...BLAST_RELAYS.map(({ url }) => url), ...canonical.relays.map(({ url }) => url)])];
  if (uniqueUrls.length > TEMPLATE_LIMITS.destinations) fail('too_many_destinations');
  return freeze(uniqueUrls);
};
export const addRelayToTemplate = (template, relay) => canonicalizeTemplate({ ...template, relays: [...template.relays, relay] });
export const removeRelayFromTemplate = (template, relayUrl) => canonicalizeTemplate({ ...template, relays: template.relays.filter((relay) => relay.url !== relayUrl) });
export const updateRelayInTemplate = (template, relayUrl, updates) => canonicalizeTemplate({ ...template, relays: template.relays.map((relay) => relay.url === relayUrl ? { ...relay, ...updates } : relay) });
export const cloneTemplate = (template) => canonicalizeTemplate(template);
