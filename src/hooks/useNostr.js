import { useState, useEffect, useCallback } from 'react';
import { BLAST_RELAYS, buildKind10002, buildKind10050, buildKind10063, canonicalizeEndpoint, publicationDestinations } from '../utils/templates.js';

/**
 * Public signer contract consumed by the application transport.
 * @typedef {{getPublicKey: () => Promise<string>, signEvent: (event: UnsignedNostrEvent) => Promise<SignedNostrEvent>}} NostrSigner
 * @typedef {{kind: number, created_at: number, tags: string[][], content: string}} UnsignedNostrEvent
 * @typedef {UnsignedNostrEvent & {id: string, sig: string, pubkey: string}} SignedNostrEvent
 * @typedef {{url: string, success: boolean, error?: string}} RelayPublicationResult
 * @typedef {{pubkey: string | null, isConnected: boolean, error: string | null, isConnecting: boolean, connect: () => Promise<string>, signEvent: (event: UnsignedNostrEvent) => Promise<SignedNostrEvent>, disconnect: () => void, publishToRelays: (event: SignedNostrEvent, relayUrls: string[], label?: string) => Promise<RelayPublicationResult[]>} & Record<string, unknown>} NostrSession
 */

/** @returns {NostrSession} */
export const useNostr = () => {
  const [pubkey, setPubkey] = useState(/** @type {string | null} */ (null));
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(/** @type {string | null} */ (null));
  const [extension, setExtension] = useState(/** @type {NostrSigner | null} */ (null));
  const [isConnecting, setIsConnecting] = useState(false);

  // ============================================================
  // INIT - Check for existing extension
  // ============================================================
  useEffect(() => {
    const checkConnection = async () => {
      if (isConnected && pubkey) return;

      try {
        if (window.nostr?.getPublicKey) {
          try {
            const pk = await window.nostr.getPublicKey();
          setExtension(/** @type {NostrSigner} */ (window.nostr));
            setPubkey(pk);
            setIsConnected(true);
            console.log('✅ Connected via extension:', pk.slice(0, 8) + '...');
            return;
          } catch {
            console.log('Extension available but not authorized');
          }
        }
        console.log('ℹ️ No extension found');
      } catch {
        console.warn('Signer initialization was unavailable');
      }
    };

    checkConnection();

    const interval = setInterval(() => {
      if (window.nostr?.getPublicKey && !isConnected) {
        window.nostr.getPublicKey().then(pk => {
          setExtension(/** @type {NostrSigner} */ (window.nostr));
          setPubkey(pk);
          setIsConnected(true);
          console.log('✅ Extension connected:', pk.slice(0, 8) + '...');
        }).catch(() => {});
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [isConnected, pubkey]);

  // ============================================================
  // CONNECT
  // ============================================================
  const connect = useCallback(async () => {
    try {
      setIsConnecting(true);
      if (!window.nostr) {
        throw new Error('Please install a Nostr extension (Alby, Nos2x, etc.)');
      }
      const pk = await window.nostr.getPublicKey();
      setExtension(/** @type {NostrSigner} */ (window.nostr));
      setPubkey(pk);
      setIsConnected(true);
      setError(null);
      setIsConnecting(false);
      return pk;
    } catch {
      setError('Unable to connect the signer.');
      setIsConnecting(false);
      throw new Error('Unable to connect the signer.');
    }
  }, []);

  // ============================================================
  // SIGN EVENT
  // ============================================================
  const signEvent = useCallback(async (event) => {
    if (!extension) {
      throw new Error('No Nostr extension connected');
    }
    try {
      console.log('📱 Signing event...');
      const signed = await extension.signEvent(event);
      console.log('✅ Event signed');
      return signed;
    } catch {
      console.warn('Signer rejected the event');
      throw new Error('Signer rejected the event.');
    }
  }, [extension]);

  // ============================================================
  // PUBLISH HELPERS
  // ============================================================
  const publishToSingleRelay = useCallback((url, event) => {
    return new Promise((resolve) => {
      const ws = new WebSocket(url);
      let resolved = false;

      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          try { ws.close(); } catch { /* ignored during cleanup */ }
          resolve({ url, success: false, error: 'Timeout' });
        }
      }, 10000);

      ws.onopen = () => {
        ws.send(JSON.stringify(['EVENT', event]));
        const pubTimeout = setTimeout(() => {
          if (!resolved) {
            resolved = true;
            try { ws.close(); } catch { /* ignored during cleanup */ }
            resolve({ url, success: false, error: 'Publish timeout' });
          }
        }, 15000);

        ws.onmessage = (msg) => {
          try {
            const data = JSON.parse(msg.data);
            if (data[0] === 'OK' && data[1] === event.id) {
              if (!resolved) {
                resolved = true;
                clearTimeout(timeout);
                clearTimeout(pubTimeout);
                try { ws.close(); } catch { /* ignored during cleanup */ }
                resolve({ url, success: true });
              }
            }
          } catch { /* malformed relay message is ignored */ }
        };
      };

      ws.onerror = () => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          try { ws.close(); } catch { /* ignored during cleanup */ }
          resolve({ url, success: false, error: 'WebSocket error' });
        }
      };
    });
  }, []);

  const publishToRelays = useCallback(async (event, relayUrls, label = '') => {
    console.log(`Publishing ${label} to ${relayUrls.length} relays...`);
    
    const validUrls = [...new Set(relayUrls.map((url) => {
      try { return canonicalizeEndpoint(url, 'relay'); } catch { return null; }
    }).filter(Boolean))];
    
    if (validUrls.length === 0) {
      return [{ url: 'none', success: false, error: 'No valid relay URLs' }];
    }
    
    const results = await Promise.all(
      validUrls.map(url => publishToSingleRelay(url, event))
    );
    
    const successCount = results.filter(r => r.success).length;
    console.log(`Published ${label} to ${successCount}/${results.length} relays`);
    
    return results;
  }, [publishToSingleRelay]);

  // ============================================================
  // PUBLISH KIND FUNCTIONS
  // ============================================================

  const publishKind = useCallback(async (event, destinations) => {
    if (!extension) {
      throw new Error('No Nostr extension connected');
    }

    console.log(`Signing kind ${event.kind} event...`);
    const signedEvent = await signEvent(event);
    console.log(`Kind ${event.kind} event signed successfully`);
    const allRelays = destinations;
    const blastUrls = BLAST_RELAYS.map(({ url }) => url);
    console.log(`Publishing kind ${event.kind} to ${allRelays.length} relays (${blastUrls.length} blast)`);

    const results = await publishToRelays(signedEvent, allRelays, `kind ${event.kind}`);
    
    const blastResults = results.filter(r => blastUrls.includes(r.url));
    const userResults = results.filter(r => !blastUrls.includes(r.url));
    
    return {
      event: signedEvent,
      results,
      blastResults,
      userResults
    };
  }, [extension, signEvent, publishToRelays]);

  const publishKind10002 = useCallback(async (template, createdAt = Math.floor(Date.now() / 1000)) => {
    return publishKind(buildKind10002(template, createdAt), publicationDestinations(template));
  }, [publishKind]);

  const publishKind10063 = useCallback(async (template, createdAt = Math.floor(Date.now() / 1000)) => {
    return publishKind(buildKind10063(template, createdAt), publicationDestinations(template));
  }, [publishKind]);

  const publishKind10050 = useCallback(async (template, createdAt = Math.floor(Date.now() / 1000)) => {
    return publishKind(buildKind10050(template, createdAt), publicationDestinations(template));
  }, [publishKind]);

  // ============================================================
  // DISCONNECT
  // ============================================================
  const disconnect = useCallback(() => {
    setPubkey(null);
    setIsConnected(false);
    setExtension(null);
    console.log('👋 Disconnected');
  }, []);

  // ============================================================
  // RETURN
  // ============================================================
  return {
    pubkey,
    isConnected,
    error,
    isConnecting,
    connect,
    signEvent,
    disconnect,
    publishToRelays,
    publishKind,
    publishKind10002,
    publishKind10063,
    publishKind10050,
  };
};

export default useNostr;
