import { describe, expect, it } from 'vitest';
import { creatorReducer, initialCreatorState } from '../src/components/templateCreatorState.js';

describe('template creator draft reducer', () => {
  it('updates, adds, removes, resets, and loads presets without mutating prior drafts', () => {
    const initial = initialCreatorState(); const relay = initial.relays[0];
    const changed = creatorReducer(initial, { type: 'update', group: 'relays', id: relay.id, value: { url: 'wss://relay.example' } });
    expect(initial.relays[0].url).toBe('wss://your.relay'); expect(changed.relays[0]).not.toBe(relay);
    const added = creatorReducer(changed, { type: 'add', group: 'relays', value: { read: true, write: false } });
    expect(added.relays).toHaveLength(2);
    expect(creatorReducer(added, { type: 'remove', group: 'relays', id: added.relays[1].id }).relays).toHaveLength(1);
    const preset = creatorReducer(added, { type: 'preset', key: 'demo', template: { name: 'Demo', description: '', relays: [{ url: 'wss://demo.example', read: true, write: true }], blossomServers: [], dmRelays: [] } });
    expect(preset.relays[0]).not.toBe(added.relays[0]); expect(preset.showBlossom).toBe(false); expect(creatorReducer(preset, { type: 'reset' }).name).toBe('');
  });

  it('tracks row interaction and clears stale validation/output when drafts are corrected or reset', () => {
    const initial = initialCreatorState(); const relay = initial.relays[0];
    const touched = creatorReducer(initial, { type: 'touch-many', fields: ['name', relay.id] });
    expect(touched.touched).toMatchObject({ name: true, [relay.id]: true });
    const shared = creatorReducer(touched, { type: 'shared', value: 'https://example.test/#/apply/value' });
    const corrected = creatorReducer(shared, { type: 'update', group: 'relays', id: relay.id, value: { url: 'wss://corrected.example' } });
    expect(corrected.shareUrl).toBe(''); expect(corrected.touched[relay.id]).toBe(true);
    const reset = creatorReducer(corrected, { type: 'reset' });
    expect(reset.touched).toEqual({}); expect(reset.shareUrl).toBe('');
  });

  it('caps every draft endpoint group and allows a removed row to be added again', () => {
    /** @type {[string, number][]} */
    const limits = [['relays', 16], ['blossomServers', 8], ['dmRelays', 8]];
    for (const [group, limit] of limits) {
      let state = initialCreatorState();
      while (state[group].length < limit) state = creatorReducer(state, { type: 'add', group, value: {} });
      const capped = creatorReducer(state, { type: 'add', group, value: {} });
      expect(capped).toBe(state);
      const reopened = creatorReducer(state, { type: 'remove', group, id: state[group][1].id });
      expect(creatorReducer(reopened, { type: 'add', group, value: {} })[group]).toHaveLength(limit);
    }
  });
});
