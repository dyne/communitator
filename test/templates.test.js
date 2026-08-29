import { describe, expect, it } from 'vitest';
import { BLAST_RELAYS, TEMPLATE_LIMITS, buildKind10002, buildKind10050, buildKind10063, canonicalizeEndpoint, canonicalizeTemplate, decodeTemplate, encodeTemplate, getCommunityTemplates, publicationDestinations } from '../src/utils/templates.js';

const fixture = { id: 'fixture', name: 'Fixture relays', description: 'A deterministic test fixture', relays: [{ url: 'wss://RELAY.example:443/path?q=1', read: true, write: true }], blossomServers: [{ url: 'https://blossom.example' }], dmRelays: [{ url: 'wss://dm.example' }], created_at: 1 };
const wire = (value) => btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/u, '');

describe('template trust boundary', () => {
  it('returns a small deeply frozen canonical value and versioned round trip', () => {
    const decoded = decodeTemplate(encodeTemplate(fixture));
    expect(decoded).toEqual({ ...fixture, relays: [{ ...fixture.relays[0], url: 'wss://relay.example/path?q=1' }], blossomServers: [{ url: 'https://blossom.example/' }], dmRelays: [{ url: 'wss://dm.example/' }] });
    expect(Object.isFrozen(decoded)).toBe(true);
    expect(Object.isFrozen(decoded.relays)).toBe(true);
    expect(Object.isFrozen(decoded.relays[0])).toBe(true);
    expect(Object.keys(decoded).sort()).toEqual(['blossomServers', 'created_at', 'description', 'dmRelays', 'id', 'name', 'relays']);
  });

  it('accepts bounded legacy links but rejects malformed, oversized and versioned invalid input with non-reflective codes', () => {
    const legacy = btoa(encodeURIComponent(JSON.stringify({ ...fixture, id: 'legacy' })));
    expect(decodeTemplate(legacy).id).toBe('legacy');
    for (const encoded of ['not base64!', 'A'.repeat(TEMPLATE_LIMITS.encoded + 1), wire({ v: 2, ...fixture }), wire({ v: 1, ...fixture, surprise: 'attacker-data' }), wire([])]) {
      expect(() => decodeTemplate(encoded)).toThrow(/^(invalid_|unknown_|payload_)/);
      expect(() => decodeTemplate(encoded)).not.toThrow(/attacker-data/);
    }
  });

  it('accepts a URL-safe-looking legacy payload without treating malformed new wire as legacy', () => {
    const legacyTemplate = { name: 'xx', description: '', relays: [{ url: 'wss://relay.example', read: true, write: true }], blossomServers: [], dmRelays: [] };
    const legacy = btoa(encodeURIComponent(JSON.stringify(legacyTemplate)));
    expect(legacy).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(decodeTemplate(legacy)).toMatchObject({ name: 'xx', description: '' });
    expect(() => decodeTemplate(wire({ name: 'not-versioned', relays: [] }))).toThrow('invalid_version');
    expect(decodeTemplate(encodeTemplate(fixture)).name).toBe(fixture.name);
  });

  it('rejects wrong shapes, proto keys, nonfinite times, bidi IDs and oversize Unicode without mutating input', () => {
    const input = { ...fixture, relays: fixture.relays.map((relay) => ({ ...relay })) };
    const before = JSON.stringify(input);
    expect(() => canonicalizeTemplate({ ...fixture, relays: [] })).toThrow('invalid_relays');
    expect(() => canonicalizeTemplate({ ...fixture, id: 'safe\u202Eevil' })).toThrow('invalid_id');
    expect(() => canonicalizeTemplate({ ...fixture, name: '🙂'.repeat(81) })).toThrow('invalid_text');
    expect(() => canonicalizeTemplate({ ...fixture, created_at: Infinity })).toThrow('invalid_timestamp');
    expect(() => decodeTemplate(wire(JSON.parse(`{"v":1,"name":"Fixture","relays":[{"url":"wss://relay.example","read":true,"write":true}],"__proto__":{"polluted":true}}`)))).toThrow(/^(invalid_version|unknown_field)$/);
    canonicalizeTemplate(input);
    expect(JSON.stringify(input)).toBe(before);
  });
});

describe('canonical endpoint policy', () => {
  it('normalizes host case, default ports and trailing slash while preserving path and query', () => {
    expect(canonicalizeEndpoint('wss://EXAMPLE.com:443/path?q=one', 'relay')).toBe('wss://example.com/path?q=one');
    expect(canonicalizeEndpoint('https://bücher.example', 'blossom')).toBe('https://xn--bcher-kva.example/');
  });
  it('rejects credentials, fragments, private schemes and permits insecure literal loopback only through the dev option', () => {
    for (const url of ['wss://user:pass@example.com', 'wss://example.com/#fragment', 'ws://127.0.0.1', 'http://127.0.0.1']) expect(() => canonicalizeEndpoint(url, url.startsWith('http') ? 'blossom' : 'relay')).toThrow('invalid_endpoint');
    expect(canonicalizeEndpoint('ws://127.0.0.1:3000/path', 'relay', { allowInsecureLoopback: true })).toBe('ws://127.0.0.1:3000/path');
    expect(() => canonicalizeEndpoint('ws://10.0.0.1', 'relay', { allowInsecureLoopback: true })).toThrow('invalid_endpoint');
  });
});

describe('canonical event builders and destinations', () => {
  it('produces immutable exact NIP tags with stable ordering and no signer identity', () => {
    const template = canonicalizeTemplate({ ...fixture, relays: [{ url: 'wss://one.example', read: true, write: true }, { url: 'wss://two.example', read: true, write: false }, { url: 'wss://three.example', read: false, write: true }] });
    expect(buildKind10002(template, 9)).toEqual({ kind: 10002, created_at: 9, tags: [['r', 'wss://one.example/'], ['r', 'wss://two.example/', 'read'], ['r', 'wss://three.example/', 'write']], content: '' });
    expect(buildKind10063(template, 9).tags).toEqual([['server', 'https://blossom.example/']]);
    expect(buildKind10050(template, 9).tags).toEqual([['relay', 'wss://dm.example/']]);
    expect(Object.isFrozen(buildKind10002(template, 9).tags)).toBe(true);
  });
  it('deduplicates canonical template destinations with the immutable blast set', () => {
    const destinations = publicationDestinations(canonicalizeTemplate({ ...fixture, relays: [{ url: BLAST_RELAYS[0].url, read: true, write: true }] }));
    expect(destinations).toHaveLength(BLAST_RELAYS.length);
    expect(Object.isFrozen(destinations)).toBe(true);
  });
  it('ships community presets through the same canonical boundary', () => {
    expect(Object.values(getCommunityTemplates()).every((template) => Object.isFrozen(template) && template.relays.length > 0)).toBe(true);
  });
});
