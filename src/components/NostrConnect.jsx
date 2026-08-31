import { useState } from 'react';

const NostrConnect = ({ connect, disconnect, pubkey, error }) => {
  const [loading, setLoading] = useState(false); const [copyStatus, setCopyStatus] = useState('');
  const onConnect = async () => {
    setLoading(true);
    try { await connect(); } catch { /* The session exposes an inline safe error. */ } finally { setLoading(false); }
  };
  const copyFingerprint = async () => {
    try { if (typeof navigator.clipboard?.writeText !== 'function') throw new Error('Clipboard unavailable'); await navigator.clipboard.writeText(pubkey); setCopyStatus('Signer fingerprint copied.'); }
    catch { setCopyStatus('Unable to copy signer fingerprint.'); }
  };
  if (pubkey) return <div className="nostr-connected"><span>Connected signer: <code>{pubkey}</code></span><button type="button" onClick={copyFingerprint} className="btn-secondary">Copy signer fingerprint</button><button type="button" onClick={disconnect} className="btn-secondary">Disconnect</button><p className="sr-only" role="status" aria-live="polite">{copyStatus}</p></div>;
  return <><button type="button" onClick={onConnect} disabled={loading} className="btn-nostr">{loading ? 'Connecting…' : 'Connect with extension'}</button>{error && <p className="inline-status" role="status">{error}</p>}</>;
};
export default NostrConnect;
