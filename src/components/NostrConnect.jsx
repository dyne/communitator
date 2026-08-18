import React, { useState, useEffect } from 'react';

const NostrConnect = ({ setConnectedPubkey }) => {
  const [pubkey, setPubkey] = useState(null);
  const [loading, setLoading] = useState(false);

  const connect = async () => {
    setLoading(true);
    try {
      if (!window.nostr) {
        throw new Error('Please install a Nostr extension (Alby, Nos2x, etc.)');
      }
      
      const pubkey = await window.nostr.getPublicKey();
      setPubkey(pubkey);
      setConnectedPubkey(pubkey);
    } catch (error) {
      alert('Failed to connect: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Check if already connected
    if (window.nostr) {
      window.nostr.getPublicKey().then(pk => {
        setPubkey(pk);
        setConnectedPubkey(pk);
      }).catch(() => {});
    }
  }, []);

  if (pubkey) {
    return (
      <div className="nostr-connected">
        ✅ Connected: {pubkey.slice(0, 8)}...{pubkey.slice(-8)}
      </div>
    );
  }

  return (
    <button onClick={connect} disabled={loading} className="btn-nostr">
      {loading ? 'Connecting...' : '🔑 Connect Nostr'}
    </button>
  );
};

export default NostrConnect;