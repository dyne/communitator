import { useState, useEffect, useCallback } from 'react';

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

  /**
   * Publish to a single relay using native WebSocket
   * Relays are passed in from the template - nothing hardcoded
   */
  const publishToSingleRelay = useCallback((url, event) => {
    return new Promise((resolve) => {
      let ws = null;
      let resolved = false;
      let timeoutIds = [];
      
      try {
        console.log(`Connecting to ${url}...`);
        ws = new WebSocket(url);
        
        // Connection timeout
        const connectTimeout = setTimeout(() => {
          if (!resolved) {
            resolved = true;
            console.log(`⏰ Connection timeout for ${url}`);
            if (ws && ws.readyState !== WebSocket.CLOSED) {
              try { ws.close(); } catch (e) {}
            }
            resolve({ url, success: false, error: 'Connection timeout' });
          }
        }, 10000);
        timeoutIds.push(connectTimeout);
        
        ws.onopen = () => {
          console.log(`Connected to ${url}, sending event...`);
          
          // Send the event as a JSON-RPC message
          const message = JSON.stringify(['EVENT', event]);
          ws.send(message);
          
          // Publish timeout
          const publishTimeout = setTimeout(() => {
            if (!resolved) {
              resolved = true;
              console.log(`⏰ Publish timeout for ${url}`);
              try { ws.close(); } catch (e) {}
              resolve({ url, success: false, error: 'Publish timeout' });
            }
          }, 15000);
          timeoutIds.push(publishTimeout);
          
          // Listen for responses
          ws.onmessage = (msg) => {
            try {
              const data = JSON.parse(msg.data);
              // Check for OK response for our event
              if (Array.isArray(data) && data[0] === 'OK' && data[1] === event.id) {
                if (!resolved) {
                  resolved = true;
                  console.log(`✅ Published to ${url}`);
                  // Clear all timeouts
                  timeoutIds.forEach(id => clearTimeout(id));
                  try { ws.close(); } catch (e) {}
                  resolve({ url, success: true });
                }
              }
              // Check for error response
              if (Array.isArray(data) && data[0] === 'OK' && data[1] !== event.id && data[2] === false) {
                if (!resolved) {
                  resolved = true;
                  console.log(`❌ Relay rejected event for ${url}:`, data[3]);
                  timeoutIds.forEach(id => clearTimeout(id));
                  try { ws.close(); } catch (e) {}
                  resolve({ url, success: false, error: data[3] || 'Event rejected' });
                }
              }
            } catch (e) {
              // Ignore parse errors for non-OK messages
            }
          };
          
          ws.onerror = (error) => {
            if (!resolved) {
              resolved = true;
              console.log(`❌ WebSocket error for ${url}:`, error);
              timeoutIds.forEach(id => clearTimeout(id));
              try { ws.close(); } catch (e) {}
              resolve({ url, success: false, error: 'WebSocket error' });
            }
          };
          
          ws.onclose = () => {
            if (!resolved) {
              resolved = true;
              console.log(`⚠️ Connection closed for ${url}`);
              timeoutIds.forEach(id => clearTimeout(id));
              resolve({ url, success: false, error: 'Connection closed' });
            }
          };
        };
        
        ws.onerror = (error) => {
          if (!resolved) {
            resolved = true;
            console.log(`❌ Connection error for ${url}:`, error);
            timeoutIds.forEach(id => clearTimeout(id));
            resolve({ url, success: false, error: 'Connection error' });
          }
        };
        
      } catch (err) {
        if (!resolved) {
          resolved = true;
          console.log(`❌ Error with ${url}:`, err.message);
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
   * Publish to multiple relays (all from the user's template)
   */
  const publishToRelays = useCallback(async (event, relayUrls) => {
    console.log(`Publishing to ${relayUrls.length} relays...`);
    
    // Filter out invalid URLs
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
    
    // Publish to each relay in parallel
    const publishPromises = validUrls.map(url => publishToSingleRelay(url, event));
    const results = await Promise.all(publishPromises);
    
    const successCount = results.filter(r => r.success).length;
    console.log(`Published to ${successCount}/${results.length} relays`);
    
    return results;
  }, [publishToSingleRelay]);

  const publishKind10002 = useCallback(async (relays, pubkey) => {
    if (!extension) {
      throw new Error('No Nostr extension connected');
    }

    // relays comes from the user's template - NOT hardcoded
    const validRelays = relays.filter(r => r.url && r.url.trim() !== '');
    
    if (validRelays.length === 0) {
      throw new Error('No valid relays to publish to');
    }

    const tags = validRelays.map(relay => {
      const params = [];
      if (!relay.read) params.push('read');
      if (!relay.write) params.push('write');
      return ['r', relay.url, ...params];
    });

    const event = {
      kind: 10002,
      pubkey: pubkey,
      created_at: Math.floor(Date.now() / 1000),
      tags: tags,
      content: ''
    };

    console.log('Signing kind 10002 event...');
    const signedEvent = await extension.signEvent(event);
    console.log('Event signed successfully');

    // Extract URLs from the user's relay list
    const relayUrls = [...new Set(validRelays.map(r => r.url))];
    console.log('Publishing to relay URLs:', relayUrls);
    
    const results = await publishToRelays(signedEvent, relayUrls);
    console.log('Final results:', results);
    
    return {
      event: signedEvent,
      results: results
    };
  }, [extension, publishToRelays]);

  return {
    pubkey,
    isConnected,
    error,
    extension,
    connect,
    signEvent,
    publishToRelays,
    publishKind10002
  };
};

export default useNostr;