// @ts-nocheck -- deterministic WebSocket double intentionally implements only this transport's surface.
import { act, renderHook } from '@testing-library/react';
import { finalizeEvent, generateSecretKey, getPublicKey } from 'nostr-tools';
import { StrictMode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import useNostr, { createRelayQueue, publishRelayEvent, publishRelaySet, verifySignedEvent } from '../src/hooks/useNostr.js';

const template = { name: 'Review fixture', description: '', relays: [{ url: 'wss://relay.example', read: true, write: true }], blossomServers: [], dmRelays: [] };
const allKindsTemplate = { ...template, blossomServers: [{ url: 'https://media.example' }], dmRelays: [{ url: 'wss://dm.example' }] };
class RelayWebSocket {
  static current = 0; static max = 0;
  constructor(url) { this.url = url; RelayWebSocket.current++; RelayWebSocket.max = Math.max(RelayWebSocket.max, RelayWebSocket.current); queueMicrotask(() => this.onopen?.()); }
  send(payload) { const [, event] = JSON.parse(payload); queueMicrotask(() => this.onmessage?.({ data: JSON.stringify(['OK', event.id, true, 'accepted']) })); }
  close() { RelayWebSocket.current--; }
}
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); RelayWebSocket.current = 0; RelayWebSocket.max = 0; });

describe('signer and relay contracts', () => {
  it('does not request identity on load and only calls it after explicit connect', async () => {
    const signer = { getPublicKey: vi.fn().mockResolvedValue('a'.repeat(64)), signEvent: vi.fn() };
    vi.stubGlobal('nostr', signer);
    const { result } = renderHook(() => useNostr());
    expect(signer.getPublicKey).not.toHaveBeenCalled();
    await act(() => result.current.connect());
    expect(signer.getPublicKey).toHaveBeenCalledTimes(1);
  });

  it('keeps the connected identity visible after the StrictMode effect replay', async () => {
    const signer = { getPublicKey: vi.fn().mockResolvedValue('a'.repeat(64)), signEvent: vi.fn() };
    vi.stubGlobal('nostr', signer);
    const wrapper = ({ children }) => <StrictMode>{children}</StrictMode>;
    const { result } = renderHook(() => useNostr(), { wrapper });

    await act(() => result.current.connect());

    expect(result.current.pubkey).toBe('a'.repeat(64));
    expect(result.current.isConnected).toBe(true);
  });

  it('rejects altered or invalid signer output before any relay is opened', () => {
    const unsigned = { kind: 10002, created_at: 1, tags: [['r', 'wss://relay.example/']], content: '' };
    expect(() => verifySignedEvent(unsigned, { ...unsigned, pubkey: 'a'.repeat(64), id: 'bad', sig: 'bad' }, 'a'.repeat(64))).toThrow(/invalid event/i);
    expect(() => verifySignedEvent(unsigned, { ...unsigned, pubkey: 'a'.repeat(64), id: 'bad', sig: 'bad', content: 'altered' }, 'a'.repeat(64))).toThrow(/invalid event/i);
  });

  it('accepts only a positive matching OK and records relay denial safely', async () => {
    const accepted = await publishRelayEvent('wss://relay.example/', { id: 'event-id' }, { WebSocketImpl: RelayWebSocket });
    expect(accepted.status).toBe('accepted');
    class RejectingSocket extends RelayWebSocket { send(payload) { const [, event] = JSON.parse(payload); queueMicrotask(() => this.onmessage?.({ data: JSON.stringify(['OK', event.id, false, 'no\u0000thanks']) })); } }
    await expect(publishRelayEvent('wss://relay.example/', { id: 'event-id' }, { WebSocketImpl: RejectingSocket })).resolves.toMatchObject({ status: 'rejected', error: 'no thanks' });
  });

  it('deduplicates destinations and caps concurrent relay work', async () => {
    const urls = Array.from({ length: 12 }, (_, index) => `wss://relay-${index}.example`);
    const results = await publishRelaySet({ id: 'event-id' }, [...urls, urls[0]], { WebSocketImpl: RelayWebSocket });
    expect(results).toHaveLength(12); expect(RelayWebSocket.max).toBeLessThanOrEqual(4);
  });

  it('shares one four-socket queue across every event kind in an operation', async () => {
    class GatedSocket {
      static current = 0; static max = 0; static released = false; static waiting = [];
      constructor() { GatedSocket.current += 1; GatedSocket.max = Math.max(GatedSocket.max, GatedSocket.current); queueMicrotask(() => this.onopen?.()); }
      send(payload) { const [, event] = JSON.parse(payload); this.event = event; if (GatedSocket.released) this.accept(); else GatedSocket.waiting.push(this); }
      accept() { queueMicrotask(() => this.onmessage?.({ data: JSON.stringify(['OK', this.event.id, true, 'accepted']) })); }
      close() { if (this.closed) return; this.closed = true; GatedSocket.current -= 1; }
      static release() { GatedSocket.released = true; GatedSocket.waiting.splice(0).forEach((socket) => socket.accept()); }
    }
    const urls = Array.from({ length: 8 }, (_, index) => `wss://relay-${index}.example`);
    const publishRelay = createRelayQueue({ WebSocketImpl: GatedSocket });
    const publishing = Promise.all([10002, 10063, 10050].map((kind) => publishRelaySet({ id: `event-${kind}`, kind }, urls, { publishRelay })));

    await Promise.resolve();
    expect(GatedSocket.current).toBe(4);
    expect(GatedSocket.max).toBe(4);
    GatedSocket.release();

    const results = await publishing;
    expect(results.flat()).toHaveLength(24);
    expect(results.flat().every(({ status }) => status === 'accepted')).toBe(true);
    expect(GatedSocket.max).toBe(4);
    expect(GatedSocket.current).toBe(0);
  });

  it('returns an explicit rejection for destinations above the transport limit', async () => {
    const urls = Array.from({ length: 33 }, (_, index) => `wss://relay-${index}.example`);
    const results = await publishRelaySet({ id: 'event-id' }, urls, { WebSocketImpl: RelayWebSocket });
    expect(results).toHaveLength(33); expect(results[32]).toMatchObject({ status: 'rejected', error: 'Relay destination limit exceeded.' });
  });

  it('cancels active relay work without leaving a pending publication', async () => {
    class SilentSocket { constructor() { queueMicrotask(() => this.onopen?.()); } send() {} close() {} }
    const controller = new AbortController();
    const pending = publishRelayEvent('wss://relay.example/', { id: 'event-id' }, { WebSocketImpl: SilentSocket, signal: controller.signal });
    controller.abort();
    await expect(pending).resolves.toMatchObject({ status: 'cancelled' });
  });

  it('returns cancelled rather than failed when an apply operation is aborted', async () => {
    class SilentSocket { constructor() { queueMicrotask(() => this.onopen?.()); } send() {} close() {} }
    const secret = generateSecretKey(); const pubkey = getPublicKey(secret);
    const signer = { getPublicKey: vi.fn().mockResolvedValue(pubkey), signEvent: vi.fn((event) => finalizeEvent(event, secret)) };
    vi.stubGlobal('nostr', signer); vi.stubGlobal('WebSocket', SilentSocket);
    const { result } = renderHook(() => useNostr()); await act(() => result.current.connect());
    const applying = result.current.applyTemplate(template); await Promise.resolve(); await Promise.resolve(); result.current.disconnect();
    await expect(applying).resolves.toMatchObject({ status: 'cancelled' });
  });

  it('returns a cancelled per-kind result and opens zero sockets when unmounted during signing', async () => {
    const secret = generateSecretKey(); const pubkey = getPublicKey(secret);
    let releaseSigning;
    const signer = {
      getPublicKey: vi.fn().mockResolvedValue(pubkey),
      signEvent: vi.fn((event) => new Promise((resolve) => { releaseSigning = () => resolve(finalizeEvent(event, secret)); })),
    };
    const Socket = vi.fn();
    vi.stubGlobal('nostr', signer); vi.stubGlobal('WebSocket', Socket);
    const { result, unmount } = renderHook(() => useNostr());
    await act(() => result.current.connect());
    const applying = result.current.applyTemplate(template);
    await vi.waitFor(() => expect(signer.signEvent).toHaveBeenCalledTimes(1));

    unmount();
    await expect(applying).resolves.toMatchObject({
      status: 'cancelled',
      events: [
        { event: { kind: 10002 }, signer: { status: 'cancelled' }, results: [] },
      ],
    });
    expect(Socket).not.toHaveBeenCalled();
    releaseSigning();
  });

  it('returns cancelled per-kind state when disconnected during signing', async () => {
    const secret = generateSecretKey(); const pubkey = getPublicKey(secret); let releaseSigning;
    const signer = { getPublicKey: vi.fn().mockResolvedValue(pubkey), signEvent: vi.fn((event) => new Promise((resolve) => { releaseSigning = () => resolve(finalizeEvent(event, secret)); })) };
    const Socket = vi.fn(); vi.stubGlobal('nostr', signer); vi.stubGlobal('WebSocket', Socket);
    const { result } = renderHook(() => useNostr()); await act(() => result.current.connect());
    const applying = result.current.applyTemplate(allKindsTemplate); await vi.waitFor(() => expect(signer.signEvent).toHaveBeenCalledTimes(1));
    act(() => result.current.disconnect());

    await expect(applying).resolves.toMatchObject({
      status: 'cancelled',
      events: [
        { event: { kind: 10002 }, signer: { status: 'cancelled' }, results: [] },
        { event: { kind: 10063 }, signer: { status: 'cancelled' }, results: [] },
        { event: { kind: 10050 }, signer: { status: 'cancelled' }, results: [] },
      ],
    });
    expect(Socket).not.toHaveBeenCalled();
    releaseSigning();
  });

  it.each([0, 1, 2])('returns truthful per-kind state when signature %i is rejected', async (rejectedIndex) => {
    const secret = generateSecretKey(); const pubkey = getPublicKey(secret);
    const signer = {
      getPublicKey: vi.fn().mockResolvedValue(pubkey),
      signEvent: vi.fn((event) => signer.signEvent.mock.calls.length - 1 === rejectedIndex ? Promise.reject(new Error('<b>private signer detail</b>')) : Promise.resolve(finalizeEvent(event, secret))),
    };
    const Socket = vi.fn();
    vi.stubGlobal('nostr', signer); vi.stubGlobal('WebSocket', Socket);
    const { result } = renderHook(() => useNostr()); await act(() => result.current.connect());

    let outcome; await act(async () => { outcome = await result.current.applyTemplate(allKindsTemplate); });

    expect(outcome.status).toBe('failed');
    expect(outcome.events.map(({ signer: state }) => state.status)).toEqual([
      ...Array.from({ length: rejectedIndex }, () => 'signed'),
      'rejected',
      ...Array.from({ length: 2 - rejectedIndex }, () => 'not-requested'),
    ]);
    expect(outcome.events[rejectedIndex].signer.error).toBe('The signer declined or failed to sign this event.');
    expect(JSON.stringify(outcome)).not.toContain('private signer detail');
    expect(Socket).not.toHaveBeenCalled();
  });

  it('signs the exact reviewed event set only after explicit consent', async () => {
    const secret = generateSecretKey(); const pubkey = getPublicKey(secret);
    const signer = { getPublicKey: vi.fn().mockResolvedValue(pubkey), signEvent: vi.fn((event) => finalizeEvent(event, secret)) };
    vi.stubGlobal('nostr', signer); vi.stubGlobal('WebSocket', RelayWebSocket);
    const { result } = renderHook(() => useNostr());
    expect(signer.signEvent).not.toHaveBeenCalled();
    await act(() => result.current.connect());
    let outcome;
    await act(async () => { outcome = await result.current.applyTemplate(template); });
    expect(outcome.status).toBe('complete'); expect(signer.signEvent).toHaveBeenCalledTimes(1);
  });

  it('retries retained signed events without asking the signer again', async () => {
    class RetryingSocket extends RelayWebSocket { static accept = false; send(payload) { const [, event] = JSON.parse(payload); queueMicrotask(() => this.onmessage?.({ data: JSON.stringify(['OK', event.id, RetryingSocket.accept, 'temporary denial']) })); } }
    const secret = generateSecretKey(); const pubkey = getPublicKey(secret);
    const signer = { getPublicKey: vi.fn().mockResolvedValue(pubkey), signEvent: vi.fn((event) => finalizeEvent(event, secret)) };
    vi.stubGlobal('nostr', signer); vi.stubGlobal('WebSocket', RetryingSocket);
    const { result } = renderHook(() => useNostr()); await act(() => result.current.connect());
    let outcome; await act(async () => { outcome = await result.current.applyTemplate(template); });
    expect(outcome.status).toBe('failed'); expect(signer.signEvent).toHaveBeenCalledTimes(1);
    RetryingSocket.accept = true;
    await act(async () => { outcome = await outcome.retry(); });
    expect(outcome.status).toBe('complete'); expect(signer.signEvent).toHaveBeenCalledTimes(1);
  });

  it('revokes retained retry authority when the reviewed operation is cancelled', async () => {
    class RejectingSocket extends RelayWebSocket { send(payload) { const [, event] = JSON.parse(payload); queueMicrotask(() => this.onmessage?.({ data: JSON.stringify(['OK', event.id, false, 'temporary denial']) })); } }
    const secret = generateSecretKey(); const pubkey = getPublicKey(secret);
    const signer = { getPublicKey: vi.fn().mockResolvedValue(pubkey), signEvent: vi.fn((event) => finalizeEvent(event, secret)) };
    vi.stubGlobal('nostr', signer); vi.stubGlobal('WebSocket', RejectingSocket);
    const { result } = renderHook(() => useNostr()); await act(() => result.current.connect());
    let outcome; await act(async () => { outcome = await result.current.applyTemplate(template); });
    expect(outcome.retry).toEqual(expect.any(Function));

    act(() => result.current.cancelOperation());
    await expect(outcome.retry()).rejects.toThrow('Retry is no longer valid.');
    expect(signer.signEvent).toHaveBeenCalledTimes(1);
  });

  it('merges retained successes so a two-kind retry can recover to complete', async () => {
    class SplitSocket extends RelayWebSocket { static retrying = false; send(payload) { const [, event] = JSON.parse(payload); const accepted = SplitSocket.retrying || event.kind === 10002; queueMicrotask(() => this.onmessage?.({ data: JSON.stringify(['OK', event.id, accepted, 'temporary denial']) })); } }
    const secret = generateSecretKey(); const pubkey = getPublicKey(secret);
    const signer = { getPublicKey: vi.fn().mockResolvedValue(pubkey), signEvent: vi.fn((event) => finalizeEvent(event, secret)) };
    vi.stubGlobal('nostr', signer); vi.stubGlobal('WebSocket', SplitSocket);
    const multiKind = { ...template, dmRelays: [{ url: 'wss://dm.example' }] };
    const { result } = renderHook(() => useNostr()); await act(() => result.current.connect());
    let outcome; await act(async () => { outcome = await result.current.applyTemplate(multiKind); });
    expect(outcome.status).toBe('partial'); expect(signer.signEvent).toHaveBeenCalledTimes(2); expect(RelayWebSocket.max).toBeLessThanOrEqual(4);
    SplitSocket.retrying = true;
    await act(async () => { outcome = await outcome.retry(); });
    expect(outcome.status).toBe('complete'); expect(signer.signEvent).toHaveBeenCalledTimes(2);
  });

  it('binds every retry to the latest merged results and republishes only still-failed destinations', async () => {
    class MultiStepSocket {
      static attempts = new Map();
      constructor(url) { this.url = url; queueMicrotask(() => this.onopen?.()); }
      send(payload) {
        const [, event] = JSON.parse(payload); const key = `${event.kind}:${this.url}`; const attempt = (MultiStepSocket.attempts.get(key) ?? 0) + 1;
        MultiStepSocket.attempts.set(key, attempt);
        const accepted = (event.kind === 10002 && this.url.includes('relay.primal.net') && attempt >= 2) || attempt >= 3;
        queueMicrotask(() => this.onmessage?.({ data: JSON.stringify(['OK', event.id, accepted, accepted ? 'accepted' : 'temporary denial']) }));
      }
      close() {}
    }
    const secret = generateSecretKey(); const pubkey = getPublicKey(secret);
    const signer = { getPublicKey: vi.fn().mockResolvedValue(pubkey), signEvent: vi.fn((event) => finalizeEvent(event, secret)) };
    vi.stubGlobal('nostr', signer); vi.stubGlobal('WebSocket', MultiStepSocket);
    const { result } = renderHook(() => useNostr()); await act(() => result.current.connect());

    let initial; await act(async () => { initial = await result.current.applyTemplate(allKindsTemplate); });
    const initialRetry = initial.retry;
    let middle; await act(async () => { middle = await initial.retry(); });
    const middleRetry = middle.retry;
    let final; await act(async () => { final = await middle.retry(); });

    expect(initial.status).toBe('failed'); expect(middle.status).toBe('partial'); expect(final.status).toBe('complete');
    expect(middleRetry).not.toBe(initialRetry); expect(final.retry).toBeUndefined();
    expect([...MultiStepSocket.attempts.values()].sort((a, b) => a - b)).toEqual([2, ...Array.from({ length: 38 }, () => 3)]);
    expect(signer.signEvent).toHaveBeenCalledTimes(3);
  });
});
