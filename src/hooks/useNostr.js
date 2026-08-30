// @ts-check
import { useCallback, useEffect, useRef, useState } from 'react';
import { verifyEvent } from 'nostr-tools';
import { buildKind10002, buildKind10050, buildKind10063, canonicalizeEndpoint, canonicalizeTemplate, publicationDestinations } from '../utils/templates.js';

const PUBKEY = /^[0-9a-f]{64}$/u;
const RELAY_LIMIT = 32;
const CONCURRENCY = 4;
const RELAY_TIMEOUT = 10_000;
const MESSAGE_LIMIT = 1024;
// eslint-disable-next-line no-control-regex -- relay control characters are stripped before rendering.
const CONTROL_CHARS = /[\u0000-\u001F\u007F-\u009F]/gu;
const safeMessage = (value) => typeof value === 'string' ? value.replace(CONTROL_CHARS, ' ').slice(0, 240) : 'Relay rejected the event.';
const publicKey = (value) => typeof value === 'string' && PUBKEY.test(value) ? value : null;
const sameUnsigned = (unsigned, signed, pubkey) => signed && signed.pubkey === pubkey && signed.kind === unsigned.kind && signed.created_at === unsigned.created_at && signed.content === unsigned.content && JSON.stringify(signed.tags) === JSON.stringify(unsigned.tags);

/** Fail closed: a signer may only return the exact reviewed event for the connected identity. */
export const verifySignedEvent = (unsigned, signed, identity) => {
  if (!sameUnsigned(unsigned, signed, identity) || !verifyEvent(signed)) throw new Error('The signer returned an invalid event.');
  return Object.freeze({ ...signed, tags: Object.freeze(signed.tags.map((tag) => Object.freeze([...tag]))) });
};

/** A bounded one-event-per-destination transport with a single terminal result. */
/** @param {string} url @param {{id?: string}} event @param {{WebSocketImpl?: typeof WebSocket, signal?: AbortSignal}} [options] */
export const publishRelayEvent = (url, event, { WebSocketImpl = globalThis.WebSocket, signal } = {}) => new Promise((resolve) => {
  if (signal?.aborted) { resolve({ url, status: 'cancelled' }); return; }
  if (typeof WebSocketImpl !== 'function') { resolve({ url, status: 'network-error', error: 'Relay transport is unavailable.' }); return; }
  let socket; let settled = false; let notice;
  const abort = () => settle({ status: 'cancelled' });
  const timer = setTimeout(() => settle({ status: 'timeout', error: 'Relay timed out.' }), RELAY_TIMEOUT);
  const settle = (result) => { if (settled) return; settled = true; clearTimeout(timer); signal?.removeEventListener('abort', abort); try { socket?.close(); } catch { /* cleanup */ } resolve(Object.freeze({ url, ...result })); };
  signal?.addEventListener('abort', abort, { once: true });
  try {
    socket = new WebSocketImpl(url);
    socket.onopen = () => { try { socket.send(JSON.stringify(['EVENT', event])); } catch { settle({ status: 'network-error', error: 'Relay send failed.' }); } };
    socket.onerror = () => settle({ status: 'network-error', error: 'Relay connection failed.' });
    socket.onclose = (closeEvent) => { if (!settled) settle({ status: 'network-error', error: safeMessage(closeEvent?.reason || notice || 'Relay closed the connection.') }); };
    socket.onmessage = ({ data }) => { if (typeof data !== 'string' || data.length > MESSAGE_LIMIT) return; try { const message = JSON.parse(data); if (!Array.isArray(message)) return; if (message[0] === 'NOTICE') { notice = safeMessage(message[1]); return; } if (message[0] === 'OK' && message[1] === event.id && typeof message[2] === 'boolean') settle(message[2] ? { status: 'accepted' } : { status: 'rejected', error: safeMessage(message[3]) }); } catch { /* malformed frame */ } };
  } catch { settle({ status: 'network-error', error: 'Relay setup failed.' }); }
});

/** Shares the operation-wide connection cap across every event kind. */
export const createRelayQueue = (options = {}) => {
  const queued = []; let active = 0;
  const drain = () => {
    while (active < CONCURRENCY && queued.length) {
      const { url, event, resolve } = queued.shift();
      active += 1;
      publishRelayEvent(url, event, options).then(resolve).finally(() => { active -= 1; drain(); });
    }
  };
  return (url, event) => new Promise((resolve) => { queued.push({ url, event, resolve }); drain(); });
};

export const publishRelaySet = async (event, destinations, options = {}) => {
  const requested = new Map();
  destinations.forEach((destination) => {
    const value = typeof destination === 'string' ? { url: destination } : destination;
    try {
      const url = canonicalizeEndpoint(value?.url, 'relay');
      const existing = requested.get(url) ?? { url, blast: false, template: false };
      requested.set(url, { ...existing, blast: existing.blast || value?.blast === true, template: existing.template || value?.template === true });
    } catch { /* Canonical template and callers provide validated endpoints. */ }
  });
  const requestedDestinations = [...requested.values()];
  const overflow = requestedDestinations.slice(RELAY_LIMIT).map((destination) => Object.freeze({ ...destination, status: 'rejected', error: 'Relay destination limit exceeded.' }));
  const { publishRelay, ...transportOptions } = options;
  const urls = requestedDestinations.slice(0, RELAY_LIMIT); const results = new Array(urls.length); let next = 0;
  const worker = async () => { while (next < urls.length) { const index = next++; const destination = urls[index]; const result = await (publishRelay ? publishRelay(destination.url, event) : publishRelayEvent(destination.url, event, transportOptions)); results[index] = Object.freeze({ ...result, ...destination }); } };
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, urls.length) }, worker));
  return Object.freeze([...results, ...overflow]);
};
const signerMessage = 'The signer declined or failed to sign this event.';
const signedState = Object.freeze({ status: 'signed' });
const signerState = (status, error) => Object.freeze({ status, ...(error ? { error } : {}) });
const abortableSignature = (signature, signal) => new Promise((resolve, reject) => {
  let settled = false;
  const finish = (callback, value) => { if (settled) return; settled = true; signal.removeEventListener('abort', abort); callback(value); };
  const abort = () => finish(reject, new Error('Signing cancelled.'));
  if (signal.aborted) abort(); else signal.addEventListener('abort', abort, { once: true });
  Promise.resolve(signature).then((value) => finish(resolve, value), (error) => finish(reject, error));
});
const freezeOperationEvents = (events) => Object.freeze(events.map(({ event, signer, results }) => Object.freeze({ event, signer, results: Object.freeze(results) })));
const summarize = (events) => {
  const frozenEvents = freezeOperationEvents(events);
  const completed = frozenEvents.filter(({ signer, results }) => signer.status === 'signed' && results.some(({ status }) => status === 'accepted')).length;
  const cancelled = frozenEvents.some(({ signer, results }) => signer.status === 'cancelled' || results.some(({ status }) => status === 'cancelled'));
  return { status: completed === frozenEvents.length ? 'complete' : completed ? 'partial' : cancelled ? 'cancelled' : 'failed', events: frozenEvents, completed };
};

export const useNostr = () => {
  const [pubkey, setPubkey] = useState(/** @type {string|null} */ (null)); const [error, setError] = useState(/** @type {string|null} */ (null)); const [isConnecting, setIsConnecting] = useState(false);
  const activeOperation = useRef(/** @type {AbortController|null} */ (null)); const sessionVersion = useRef(0); const operationVersion = useRef(0); const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; activeOperation.current?.abort(); }; }, []);
  const connect = useCallback(async () => {
    setIsConnecting(true); setError(null);
    try { const adapter = globalThis.nostr; if (!adapter || typeof adapter.getPublicKey !== 'function' || typeof adapter.signEvent !== 'function') throw new Error(); const identity = publicKey(await adapter.getPublicKey()); if (!identity || globalThis.nostr !== adapter) throw new Error(); if (mounted.current) setPubkey(identity); return identity; }
    catch { if (mounted.current) setError('Unable to connect the signer.'); throw new Error('Unable to connect the signer.'); }
    finally { if (mounted.current) setIsConnecting(false); }
  }, []);
  const cancelOperation = useCallback(() => { operationVersion.current += 1; activeOperation.current?.abort(); }, []);
  const disconnect = useCallback(() => { sessionVersion.current += 1; cancelOperation(); setPubkey(null); setError(null); }, [cancelOperation]);
  const applyTemplate = useCallback(async (input) => {
    const adapter = globalThis.nostr; const identity = publicKey(pubkey); const version = sessionVersion.current;
    if (!identity || !adapter || typeof adapter.signEvent !== 'function') throw new Error('Please connect your Nostr signer first.');
    const operation = operationVersion.current + 1; operationVersion.current = operation;
    const controller = new AbortController(); activeOperation.current?.abort(); activeOperation.current = controller;
    const template = canonicalizeTemplate(input); const createdAt = Math.floor(Date.now() / 1000);
    const unsigned = [[template.relays.length, buildKind10002], [template.blossomServers.length, buildKind10063], [template.dmRelays.length, buildKind10050]].filter(([count]) => count).map(([, build]) => build(template, createdAt));
    const signing = unsigned.map((event) => ({ event, signer: signerState('not-requested'), results: [] }));
    for (let index = 0; index < unsigned.length; index += 1) {
      const event = unsigned[index];
      if (controller.signal.aborted || globalThis.nostr !== adapter || sessionVersion.current !== version || operationVersion.current !== operation) {
        for (let remaining = index; remaining < signing.length; remaining += 1) signing[remaining] = { ...signing[remaining], signer: signerState('cancelled') };
        if (activeOperation.current === controller) activeOperation.current = null;
        return Object.freeze(summarize(signing));
      }
      try {
        const signingCopy = { ...event, tags: event.tags.map((tag) => [...tag]) };
        const nextSigned = await abortableSignature(adapter.signEvent(signingCopy), controller.signal);
        if (controller.signal.aborted || globalThis.nostr !== adapter || sessionVersion.current !== version || operationVersion.current !== operation) {
          for (let remaining = index; remaining < signing.length; remaining += 1) signing[remaining] = { ...signing[remaining], signer: signerState('cancelled') };
          if (activeOperation.current === controller) activeOperation.current = null;
          return Object.freeze(summarize(signing));
        }
        signing[index] = { event: verifySignedEvent(event, nextSigned, identity), signer: signedState, results: [] };
      } catch {
        const cancelled = controller.signal.aborted || globalThis.nostr !== adapter || sessionVersion.current !== version || operationVersion.current !== operation;
        signing[index] = { ...signing[index], signer: signerState(cancelled ? 'cancelled' : 'rejected', cancelled ? undefined : signerMessage) };
        for (let remaining = index + 1; remaining < signing.length; remaining += 1) signing[remaining] = { ...signing[remaining], signer: signerState(cancelled ? 'cancelled' : 'not-requested') };
        if (activeOperation.current === controller) activeOperation.current = null;
        return Object.freeze(summarize(signing));
      }
    }
    if (controller.signal.aborted || globalThis.nostr !== adapter || sessionVersion.current !== version || operationVersion.current !== operation) {
      const cancelled = signing.map((entry) => ({ ...entry, signer: signerState('cancelled') }));
      if (activeOperation.current === controller) activeOperation.current = null;
      return Object.freeze(summarize(cancelled));
    }
    const destinations = publicationDestinations(template);
    const publishEvents = async (signal) => { const publishRelay = createRelayQueue({ signal }); return Promise.all(signing.map(async ({ event, signer }) => ({ event, signer, results: await publishRelaySet(event, destinations, { signal, publishRelay }) }))); };
    const makeResult = (currentEvents) => {
      const summary = summarize(currentEvents);
      if (summary.status === 'complete' || summary.status === 'cancelled') return Object.freeze(summary);
      const retry = async () => {
        if (globalThis.nostr !== adapter || sessionVersion.current !== version || operationVersion.current !== operation || !Object.isFrozen(template) || !Object.isFrozen(destinations) || currentEvents.some(({ event }) => !Object.isFrozen(event))) throw new Error('Retry is no longer valid.');
        const retryController = new AbortController(); activeOperation.current?.abort(); activeOperation.current = retryController;
        try {
          const publishRelay = createRelayQueue({ signal: retryController.signal });
          const retried = await Promise.all(currentEvents.map(async ({ event, signer, results }) => {
            const failedDestinations = results.filter(({ status }) => status !== 'accepted').map(({ url, blast, template: templateSource }) => ({ url, blast, template: templateSource }));
            if (!failedDestinations.length) return { event, signer, results };
            const retryResults = await publishRelaySet(event, failedDestinations, { signal: retryController.signal, publishRelay });
            const replacements = new Map(retryResults.map((result) => [result.url, result]));
            return { event, signer, results: results.map((result) => result.status === 'accepted' ? result : replacements.get(result.url) ?? result) };
          }));
          return makeResult(retried);
        } finally { if (activeOperation.current === retryController) activeOperation.current = null; }
      };
      return Object.freeze({ ...summary, retry });
    };
    try { return makeResult(await publishEvents(controller.signal)); }
    finally { if (activeOperation.current === controller) activeOperation.current = null; }
  }, [pubkey]);
  return { pubkey, isConnected: Boolean(pubkey), error, isConnecting, connect, disconnect, cancelOperation, applyTemplate, publishToRelays: (event, urls) => publishRelaySet(event, urls).then((results) => results.map(({ url, status, error: relayError }) => ({ url, success: status === 'accepted', ...(relayError ? { error: relayError } : {}) }))) };
};
export default useNostr;
