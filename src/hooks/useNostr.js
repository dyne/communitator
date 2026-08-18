import { useState, useEffect, useCallback } from 'react';

// Blast relays - configured once, used for publishing
const BLAST_RELAYS = [
  'wss://relay.primal.net',
  'wss://relay.damus.io',
  'wss://relay.ditto.pub',
  'wss://offchain.pub',
  'wss://sendit.nosflare.com',
  'wss://nostr.mom',
  'wss://nos.lol'
];

export const useNostr = () => {
  const [pubkey, setPubkey] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const [extension, setExtension] = useState(null);
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
            setExtension(window.nostr);
            setPubkey(pk);
            setIsConnected(true);
            console.log('✅ Connected via extension:', pk.slice(0, 8) + '...');
            return;
          } catch (e) {
            console.log('Extension available but not authorized');
          }
        }
        console.log('ℹ️ No extension found');
      } catch (e) {
        console.error('Init error:', e);
      }
    };

    checkConnection();

    const interval = setInterval(() => {
      if (window.nostr?.getPublicKey && !isConnected) {
        window.nostr.getPublicKey().then(pk => {
          setExtension(window.nostr);
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
      setExtension(window.nostr);
      setPubkey(pk);
      setIsConnected(true);
      setError(null);
      setIsConnecting(false);
      return pk;
    } catch (e) {
      setError(e.message);
      setIsConnecting(false);
      throw e;
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
    } catch (e) {
      console.error('Signing failed:', e);
      throw e;
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
          try { ws.close(); } catch (e) {}
          resolve({ url, success: false, error: 'Timeout' });
        }
      }, 10000);

      ws.onopen = () => {
        ws.send(JSON.stringify(['EVENT', event]));
        const pubTimeout = setTimeout(() => {
          if (!resolved) {
            resolved = true;
            try { ws.close(); } catch (e) {}
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
                try { ws.close(); } catch (e) {}
                resolve({ url, success: true });
              }
            }
          } catch (e) {}
        };
      };

      ws.onerror = () => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          try { ws.close(); } catch (e) {}
          resolve({ url, success: false, error: 'WebSocket error' });
        }
      };
    });
  }, []);

  const publishToRelays = useCallback(async (event, relayUrls, label = '') => {
    console.log(`Publishing ${label} to ${relayUrls.length} relays...`);
    
    const validUrls = relayUrls.filter(url => {
      try {
        new URL(url);
        return url.startsWith('wss://') || url.startsWith('ws://');
      } catch {
        return false;
      }
    });
    
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

  /**
   * Generic publish function that publishes to ALL relays
   * @param {number} kind - Event kind
   * @param {object} data - Event data with tags and content
   * @param {string} pubkey - User's pubkey
   * @param {string[]} userRelayUrls - User's relay URLs (all of them, not just for this kind)
   */
  const publishKind = useCallback(async (kind, data, pubkey, userRelayUrls = []) => {
    if (!extension) {
      throw new Error('No Nostr extension connected');
    }

    const event = {
      kind,
      pubkey,
      created_at: Math.floor(Date.now() / 1000),
      tags: data.tags || [],
      content: data.content || ''
    };

    console.log(`Signing kind ${kind} event...`);
    const signedEvent = await signEvent(event);
    console.log(`Kind ${kind} event signed successfully`);

    // ✅ Combine ALL relays: blast + ALL user relays
    const allRelays = [...new Set([...BLAST_RELAYS, ...userRelayUrls])];
    console.log(`Publishing kind ${kind} to ${allRelays.length} relays (${BLAST_RELAYS.length} blast + ${userRelayUrls.length} user)`);

    const results = await publishToRelays(signedEvent, allRelays, `kind ${kind}`);
    
    const blastResults = results.filter(r => BLAST_RELAYS.includes(r.url));
    const userResults = results.filter(r => userRelayUrls.includes(r.url));
    
    return {
      event: signedEvent,
      results,
      blastResults,
      userResults
    };
  }, [extension, signEvent, publishToRelays]);

  // Kind 10002 - Relays
  const publishKind10002 = useCallback(async (relays, pubkey) => {
    const validRelays = relays.filter(r => r.url && r.url.trim() !== '');
    if (validRelays.length === 0) {
      throw new Error('No valid relays to publish');
    }
    const tags = validRelays.map(relay => {
      const params = [];
      if (!relay.read) params.push('read');
      if (!relay.write) params.push('write');
      return ['r', relay.url, ...params];
    });
    // ✅ Pass ALL user relay URLs (they're the same as the relays being published)
    const userRelayUrls = validRelays.map(r => r.url);
    return await publishKind(10002, { tags }, pubkey, userRelayUrls);
  }, [publishKind]);

  // Kind 10063 - Blossom Servers
  const publishKind10063 = useCallback(async (servers, pubkey, allUserRelays = []) => {
    const validServers = servers.filter(s => s.url && s.url.trim() !== '');
    if (validServers.length === 0) {
      throw new Error('No valid blossom servers');
    }
    const tags = validServers.map(server => ['server', server.url]);
    // ✅ Pass ALL user relays (main relays, not just blossom servers)
    return await publishKind(10063, { tags }, pubkey, allUserRelays);
  }, [publishKind]);

  // Kind 10050 - DM Relays
  const publishKind10050 = useCallback(async (relays, pubkey, allUserRelays = []) => {
    const validRelays = relays.filter(r => r.url && r.url.trim() !== '');
    if (validRelays.length === 0) {
      throw new Error('No valid DM relays');
    }
    const tags = validRelays.map(relay => ['relay', relay.url]);
    // ✅ Pass ALL user relays (main relays, not just DM relays)
    return await publishKind(10050, { tags }, pubkey, allUserRelays);
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