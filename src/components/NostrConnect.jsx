import { useState } from 'react';

const NostrConnect = ({ connect, disconnect, pubkey, setConnectedPubkey }) => {
  const [loading, setLoading] = useState(false);
  const onConnect = async () => {
    setLoading(true);
    try { setConnectedPubkey(await connect()); } catch { /* Session owns safe error state. */ } finally { setLoading(false); }
  };
  if (pubkey) return <div className="nostr-connected"><span>✅ Connected: <code>{pubkey.slice(0, 8)}...{pubkey.slice(-8)}</code></span><button onClick={() => { disconnect(); setConnectedPubkey(null); }} className="btn-secondary">Disconnect</button></div>;
  return <button onClick={onConnect} disabled={loading} className="btn-nostr">{loading ? '⏳ Connecting...' : '🔑 Connect with Extension'}</button>;
};
export default NostrConnect;
