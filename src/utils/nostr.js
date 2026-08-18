import { finalizeEvent, generateSecretKey, getPublicKey } from 'nostr-tools';

export const getNostrExtension = async () => {
  if (window.nostr) {
    return window.nostr;
  }
  throw new Error('No Nostr extension found. Please install Alby, Nos2x, or another NIP-07 extension.');
};

export const signAndPublishKind10002 = async (relays, pubkey) => {
  const nostr = await getNostrExtension();
  
  // Build kind 10002 tags
  const tags = relays.map(relay => {
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

  // Sign with extension
  const signedEvent = await nostr.signEvent(event);
  
  // Publish to all relays in the template
  const relayUrls = relays.map(r => r.url);
  await publishToRelays(signedEvent, relayUrls);
  
  return signedEvent;
};

export const publishToRelays = async (event, relayUrls) => {
  const publishPromises = relayUrls.map(async (url) => {
    try {
      const relay = await getRelayConnection(url);
      await relay.publish(event);
      return { url, success: true };
    } catch (error) {
      console.error(`Failed to publish to ${url}:`, error);
      return { url, success: false, error: error.message };
    }
  });
  
  return Promise.all(publishPromises);
};

// Simple relay connection (in production, use a relay pool)
export const getRelayConnection = async (url) => {
  const relay = await relayInit(url);
  await relay.connect();
  return relay;
};