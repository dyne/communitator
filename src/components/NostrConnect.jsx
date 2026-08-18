import React, { useState, useEffect } from 'react';

const NostrConnect = ({ setConnectedPubkey }) => {
  const [pubkey, setPubkey] = useState(null);
  const [loading, setLoading] = useState(false);

  // Check if already connected
  useEffect(() => {
    if (window.nostr?.getPublicKey) {
      window.nostr.getPublicKey()
        .then(pk => {
          setPubkey(pk);
          setConnectedPubkey(pk);
        })
        .catch(() => {});
    }
  }, []);

  const connect = async () => {
    setLoading(true);
    try {
      if (!window.nostr) {
        throw new Error('Please install a Nostr extension (Alby, Nos2x, etc.)');
      }
      const pk = await window.nostr.getPublicKey();
      setPubkey(pk);
      setConnectedPubkey(pk);
      setLoading(false);
    } catch (error) {
      alert('Failed to connect: ' + error.message);
      setLoading(false);
    }
  };

  const disconnect = () => {
    setPubkey(null);
    setConnectedPubkey(null);
  };

  if (pubkey) {
    return (
      <div className="nostr-connected" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        background: '#e8f5e9',
        borderRadius: '8px',
        border: '1px solid #4caf50',
        flexWrap: 'wrap',
        gap: '8px'
      }}>
        <span>
          ✅ Connected: <code>{pubkey.slice(0, 8)}...{pubkey.slice(-8)}</code>
        </span>
        <button
          onClick={disconnect}
          className="btn-secondary"
          style={{ fontSize: '12px', padding: '4px 12px' }}
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={connect}
      disabled={loading}
      className="btn-nostr"
      style={{
        padding: '10px 20px',
        background: loading ? '#ccc' : '#ff6b00',
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        fontWeight: '600',
        cursor: loading ? 'not-allowed' : 'pointer',
        transition: 'background 0.2s'
      }}
    >
      {loading ? '⏳ Connecting...' : '🔑 Connect with Extension'}
    </button>
  );
};

export default NostrConnect;