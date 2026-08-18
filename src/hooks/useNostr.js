import { useState, useEffect, useCallback } from 'react';

// Blast relays - configure these once and they'll be used for publishing
// These are hidden from the UI and used to blast events to reliable relays
const BLAST_RELAYS = [
  'wss://relay.primal.net',
  'wss://relay.damus.io',
  'wss://sendit.nosflare.com',
  'wss://nostr.mom',
  'wss://relay.ditto.pub',
  'wss://nos.lol'
];

export const useNostr = () => {
  const [pubkey, setPubkey] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const [extension, setExtension] = useState(null);

  useEffect(() => {
    const checkExtension = async () => {
      try {
        if (window.nostr) {
          setExtension(window.nostr);
          try {
            const pk = await window.nostr.getPublicKey();
            setPubkey(pk);
            setIsConnected(true);
          } catch (err) {
            console.log('Extension available but not authorized');
          }
        }
      } catch (err) {
        setError('No Nostr extension found');
      }
    };
    checkExtension();
  }, []);

  const connect = useCallback(async () => {
    try {
      if (!window.nostr) {
        throw new Error('Please install a Nostr extension (Alby, Nos2x, etc.)');
      }
      const pk = await window.nostr.getPublicKey();
      setPubkey(pk);
      setIsConnected(true);
      setExtension(window.nostr);
      setError(null);
      return pk;
    } catch (err) {
      setError(err.message);
      setIsConnected(false);
      throw err;
    }
  }, []);

  const signEvent = useCallback(async (event) => {
    if (!extension) {
      throw new Error('No Nostr extension connected');
    }
    return await extension.signEvent(event);
  }, [extension]);

  const publishToSingleRelay = useCallback((url, event) => {
    return new Promise((resolve) => {
      let ws = null;
      let resolved = false;
      let timeoutIds = [];
      
      try {
        ws = new WebSocket(url);
        
        const connectTimeout = setTimeout(() => {
          if (!resolved) {
            resolved = true;
            if (ws && ws.readyState !== WebSocket.CLOSED) {
              try { ws.close(); } catch (e) {}
            }
            resolve({ url, success: false, error: 'Connection timeout' });
          }
        }, 10000);
        timeoutIds.push(connectTimeout);
        
        ws.onopen = () => {
          const message = JSON.stringify(['EVENT', event]);
          ws.send(message);
          
          const publishTimeout = setTimeout(() => {
            if (!resolved) {
              resolved = true;
              console.log(`⏰ Publish timeout for ${url}`);
              try { ws.close(); } catch (e) {}
              resolve({ url, success: false, error: 'Publish timeout' });
            }
          }, 15000);
          timeoutIds.push(publishTimeout);
          
          ws.onmessage = (msg) => {
            try {
              const data = JSON.parse(msg.data);
              if (Array.isArray(data) && data[0] === 'OK' && data[1] === event.id) {
                if (!resolved) {
                  resolved = true;
                  console.log(`✅ Published to ${url}`);
                  timeoutIds.forEach(id => clearTimeout(id));
                  try { ws.close(); } catch (e) {}
                  resolve({ url, success: true });
                }
              }
            } catch (e) {}
          };
          
          ws.onerror = () => {
            if (!resolved) {
              resolved = true;
              timeoutIds.forEach(id => clearTimeout(id));
              try { ws.close(); } catch (e) {}
              resolve({ url, success: false, error: 'WebSocket error' });
            }
          };
          
          ws.onclose = () => {
            if (!resolved) {
              resolved = true;
              timeoutIds.forEach(id => clearTimeout(id));
              resolve({ url, success: false, error: 'Connection closed' });
            }
          };
        };
        
        ws.onerror = () => {
          if (!resolved) {
            resolved = true;
            timeoutIds.forEach(id => clearTimeout(id));
            resolve({ url, success: false, error: 'Connection error' });
          }
        };
        
      } catch (err) {
        if (!resolved) {
          resolved = true;
          timeoutIds.forEach(id => clearTimeout(id));
          if (ws) {
            try { ws.close(); } catch (e) {}
          }
          resolve({ url, success: false, error: err.message });
        }
      }
    });
  }, []);

  /**
   * Publish to multiple relays with detailed results
   */
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
    
    const publishPromises = validUrls.map(url => publishToSingleRelay(url, event));
    const results = await Promise.all(publishPromises);
    
    const successCount = results.filter(r => r.success).length;
    console.log(`Published ${label} to ${successCount}/${results.length} relays`);
    
    return results;
  }, [publishToSingleRelay]);

  /**
   * Generic publish function that publishes to BOTH blast relays AND user relays
   */
  const publishKind = useCallback(async (kind, data, pubkey, userRelayUrls = []) => {
    if (!extension) {
      throw new Error('No Nostr extension connected');
    }

    const event = {
      kind: kind,
      pubkey: pubkey,
      created_at: Math.floor(Date.now() / 1000),
      tags: data.tags || [],
      content: data.content || ''
    };

    console.log(`Signing kind ${kind} event...`);
    const signedEvent = await extension.signEvent(event);
    console.log(`Kind ${kind} event signed successfully`);

    // Combine blast relays and user relays (deduplicated)
    const allRelays = [...new Set([...BLAST_RELAYS, ...userRelayUrls])];
    console.log(`Publishing kind ${kind} to ${allRelays.length} relays (${BLAST_RELAYS.length} blast + ${userRelayUrls.length} user)`);

    // Publish to all relays
    const results = await publishToRelays(signedEvent, allRelays, `kind ${kind}`);
    
    // Separate results for better reporting
    const blastResults = results.filter(r => BLAST_RELAYS.includes(r.url));
    const userResults = results.filter(r => userRelayUrls.includes(r.url));
    
    console.log(`Kind ${kind} results:`, {
      blast: `${blastResults.filter(r => r.success).length}/${blastResults.length}`,
      user: `${userResults.filter(r => r.success).length}/${userResults.length}`
    });
    
    return {
      event: signedEvent,
      results: results,
      blastResults: blastResults,
      userResults: userResults
    };
  }, [extension, publishToRelays]);

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

    // Extract user relay URLs for combined publishing
    const userRelayUrls = validRelays.map(r => r.url);
    
    return await publishKind(10002, { tags }, pubkey, userRelayUrls);
  }, [publishKind]);

  // Kind 10063 - Blossom Servers
  const publishKind10063 = useCallback(async (servers, pubkey) => {
    const validServers = servers.filter(s => s.url && s.url.trim() !== '');
    
    if (validServers.length === 0) {
      throw new Error('No valid blossom servers');
    }

    const tags = validServers.map(server => ['server', server.url]);

    // For blossom servers, we want to publish to blast relays
    // The user's main relays are used for kind 10002, not kind 10063
    return await publishKind(10063, { tags }, pubkey, []);
  }, [publishKind]);

  // Kind 10050 - DM Relays
  const publishKind10050 = useCallback(async (relays, pubkey) => {
    const validRelays = relays.filter(r => r.url && r.url.trim() !== '');
    
    if (validRelays.length === 0) {
      throw new Error('No valid DM relays');
    }

    const tags = validRelays.map(relay => ['relay', relay.url]);

    // For DM relays, we want to publish to blast relays
    // The user's main relays are used for kind 10002, not kind 10050
    return await publishKind(10050, { tags }, pubkey, []);
  }, [publishKind]);

  return {
    pubkey,
    isConnected,
    error,
    extension,
    connect,
    signEvent,
    publishToRelays,
    publishKind,
    publishKind10002,
    publishKind10063,
    publishKind10050
  };
};

export default useNostr;
