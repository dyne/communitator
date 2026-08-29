import { describe, expect, it } from 'vitest';
import {
  decodeTemplate,
  encodeTemplate,
  templateToKind10002Tags,
  validateTemplate,
} from '../src/utils/templates.js';

const template = {
  id: 'fixture',
  name: 'Fixture relays',
  description: 'A deterministic test fixture',
  relays: [{ url: 'wss://relay.example', read: true, write: true }],
  blossomServers: [{ url: 'https://blossom.example' }],
  dmRelays: [{ url: 'wss://dm.example' }],
};

describe('template boundary characterization', () => {
  it('round-trips a valid template and validates the decoded result', () => {
    const decoded = decodeTemplate(encodeTemplate(template));
    expect(decoded).toEqual(template);
    expect(validateTemplate(decoded)).toBe(true);
  });

  it('rejects malformed template payloads', () => {
    expect(() => decodeTemplate('not base64')).toThrow('Failed to decode template');
    expect(() => validateTemplate({ ...template, relays: [] })).toThrow('at least one relay');
  });

  it('preserves current NIP-65 tag fixtures for the existing builder', () => {
    expect(templateToKind10002Tags(template)).toEqual([['r', 'wss://relay.example']]);
  });

  it.todo('canonical-event-builders replaces the contradictory read/write marker behavior');
});
