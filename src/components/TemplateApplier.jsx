// @ts-check
import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import useNostr from '../hooks/useNostr';
import useDecodedTemplate from '../hooks/useDecodedTemplate';
import NostrConnect from './NostrConnect';
import PublishResults from './PublishResults';
import TemplatePreview from './TemplatePreview';

/** @typedef {import('../types/operation-result').OperationResult} OperationResult */

/** The sole UI orchestrator: it asks the session to perform an explicit user-approved apply operation. */
const TemplateApplier = () => {
  const { encoded } = useParams(); const nostr = useNostr(); const { template, error: decodeError } = useDecodedTemplate(encoded);
  const [applying, setApplying] = useState(false); const [error, setError] = useState(''); const [results, setResults] = useState(/** @type {OperationResult|null} */ (null)); const errorRef = useRef(/** @type {HTMLDivElement|null} */ (null)); const routeVersion = useRef(0);
  useEffect(() => {
    routeVersion.current += 1;
    nostr.cancelOperation();
    setApplying(false); setResults(null); setError('');
  }, [encoded, nostr.cancelOperation]);
  /** @param {string} message */
  const fail = (message) => { setError(message); requestAnimationFrame(() => errorRef.current?.focus()); };
  const apply = async () => { if (!template || !nostr.pubkey) return fail('Connect a signer before you apply this template.'); const currentRoute = routeVersion.current; setApplying(true); setError(''); try { const nextResults = await nostr.applyTemplate(template); if (routeVersion.current === currentRoute) setResults(nextResults); } catch { if (routeVersion.current === currentRoute) fail('Unable to apply this template. Review the signer and destinations, then try again.'); } finally { if (routeVersion.current === currentRoute) setApplying(false); } };
  const retry = async () => { if (!results?.retry) return; const currentRoute = routeVersion.current; setApplying(true); setError(''); try { const nextResults = await results.retry(); if (routeVersion.current === currentRoute) setResults(nextResults); } catch { if (routeVersion.current === currentRoute) fail('Retry is no longer valid. Review and apply the template again.'); } finally { if (routeVersion.current === currentRoute) setApplying(false); } };
  const cancel = () => nostr.cancelOperation();
  if (decodeError) return <section className="template-applier"><h2>Apply relay template</h2><div className="error-box" role="alert"><h3>Unable to load template</h3><p>{decodeError}</p><Link to="/" className="btn-primary compact-action">Create a template</Link></div></section>;
  if (!template) return <section className="template-applier" aria-busy="true"><p className="loading" role="status">Loading template…</p></section>;
  const connected = Boolean(nostr.pubkey);
  return <section className="template-applier" aria-labelledby="apply-title"><h2 id="apply-title">Apply relay template</h2><TemplatePreview template={template} />
    {!results && <section className="auth-section" aria-labelledby="signer-title"><h3 id="signer-title">1. Connect your Nostr signer</h3><p>Connecting requests your public key only. Applying later requests signatures for kinds 10002, 10063, and 10050 when present.</p><NostrConnect connect={nostr.connect} disconnect={nostr.disconnect} pubkey={nostr.pubkey} error={nostr.error} /></section>}
    {connected && !results && <section className="apply-controls" aria-labelledby="apply-title"><h3>2. Approve the reviewed events</h3><p className="helper-text">Your signer will show each event for approval. Communitator only publishes after signed events return.</p><button type="button" onClick={apply} className="btn-primary apply-button" disabled={applying}>{applying ? 'Publishing reviewed events…' : 'Apply template and publish reviewed events'}</button></section>}
    {(applying || nostr.isConnecting) && <p className="inline-status" role="status">{nostr.isConnecting ? 'Connecting signer…' : 'Signing and publishing…'}</p>}
    {applying && <button type="button" onClick={cancel} className="btn-secondary">Cancel application</button>}
    {error && <div ref={errorRef} tabIndex={-1} className="error-box" role="alert">{error}</div>}
    {results?.events && <PublishResults results={results} applying={applying} onRetry={retry} onReset={() => { setResults(null); setError(''); }} />}
  </section>;
};
export default TemplateApplier;
