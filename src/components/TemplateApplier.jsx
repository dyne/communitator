// @ts-nocheck -- operation-result types are introduced with the apply orchestration boundary.
import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { decodeTemplate, displayEndpoint } from '../utils/templates';
import useNostr from '../hooks/useNostr';
import NostrConnect from './NostrConnect';

const TemplateApplier = ({ setConnectedPubkey }) => {
  const { encoded } = useParams();
  const nostr = useNostr();
  
  const [template, setTemplate] = useState(null);
  const [error, setError] = useState('');
  const [applying, setApplying] = useState(false);
  const [results, setResults] = useState(null);

  useEffect(() => {
    if (nostr.pubkey) {
      setConnectedPubkey(nostr.pubkey);
    }
  }, [nostr.pubkey, setConnectedPubkey]);

  // ============================================================
  // LOAD TEMPLATE
  // ============================================================
  useEffect(() => {
    if (!encoded) {
      setError('No template provided');
      return;
    }

    try {
      const decoded = decodeTemplate(encoded);
      setTemplate(decoded);
      setError('');
    } catch {
      setError('This template link is invalid or unsupported.');
    }
  }, [encoded]);

  // ============================================================
  // PUBLISH FUNCTIONS
  // ============================================================
  const handleApplyTemplate = async () => {
    if (!template) return;

    setApplying(true);
    setError('');
    setResults(null);

    try {
      if (!nostr.pubkey) {
        throw new Error('Please connect your Nostr signer first');
      }

      setResults(await nostr.applyTemplate(template));

    } catch {
      setError('Unable to apply this template.');
    } finally {
      setApplying(false);
    }
  };

  const handleRetry = async () => {
    if (!results?.retry) return;
    setApplying(true);
    try {
      setResults(await results.retry());
    } catch {
      setError('Retry is no longer valid. Please review and apply the template again.');
    } finally {
      setApplying(false);
    }
  };

  // ============================================================
  // RENDER
  // ============================================================

  if (error && !template) {
    return (
      <div className="template-applier">
        <h2>Apply Relay Template</h2>
        <div className="error-box">
          <h3>❌ Error Loading Template</h3>
          <p>{error}</p>
          <Link to="/" className="btn-primary" style={{ display: 'inline-block', marginTop: '10px', width: 'auto' }}>
            ← Go Back to Create
          </Link>
        </div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="template-applier">
        <div className="loading">Loading template...</div>
      </div>
    );
  }

  const isConnected = nostr.isConnected && nostr.pubkey;

  return (
    <div className="template-applier">
      <h2>Apply Relay Template</h2>
      
      <div className="template-preview">
        <h3>{template.name}</h3>
        {template.description && <p>{template.description}</p>}
        {template.created_at && (
          <p style={{ fontSize: '14px', color: '#999', marginTop: '4px' }}>
            Created: {new Date(template.created_at * 1000).toLocaleDateString()}
          </p>
        )}
        
        {/* Main Relays */}
        <div className="relay-preview">
          <h4>📡 Relays ({template.relays.length}):</h4>
          <ul>
            {template.relays.map((relay, index) => (
              <li key={index}>
                <span className="relay-url">{displayEndpoint(relay.url)}</span>
                <span className="relay-permissions">
                  {relay.read && relay.write ? '📨📤 Read + Write (In- & Outbox)' :
                   relay.read ? '📨 Read (Inbox)' :
                   relay.write ? '📤 Write (Outbox)' : ''}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Blossom Servers */}
        {template.blossomServers && template.blossomServers.length > 0 && (
          <div className="relay-preview" style={{ marginTop: '16px' }}>
            <h4>🌺 Blossom Servers ({template.blossomServers.length}):</h4>
            <ul>
              {template.blossomServers.map((server, index) => (
                <li key={index}>
                  <span className="relay-url">{displayEndpoint(server.url)}</span>
                  <span style={{ fontSize: '12px', color: '#999' }}>
                    #{index + 1} {index === 0 ? '⭐ Preferred' : ''}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* DM Relays */}
        {template.dmRelays && template.dmRelays.length > 0 && (
          <div className="relay-preview" style={{ marginTop: '16px' }}>
            <h4>💬 DM Relays ({template.dmRelays.length}):</h4>
            <ul>
              {template.dmRelays.map((relay, index) => (
                <li key={index}>
                  <span className="relay-url">{displayEndpoint(relay.url)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* AUTH SECTION */}
      {!isConnected && (
        <div className="auth-section" style={{
          padding: '20px',
          background: '#f8f9fa',
          borderRadius: '8px',
          border: '1px solid #e9ecef',
          marginBottom: '16px'
        }}>
          <h4 style={{ marginBottom: '12px' }}>🔑 Connect Your Nostr Signer</h4>
          <p style={{ fontSize: '14px', color: '#666', marginBottom: '12px' }}>
            You need to connect a signer to publish this template.
          </p>
          <NostrConnect {...nostr} setConnectedPubkey={setConnectedPubkey} />
        </div>
      )}

      {/* CONNECTED STATUS */}
      {isConnected && (
        <div className="connection-status" style={{ marginBottom: '16px' }}>
          <div className="info-box" style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            background: '#e8f5e9',
            borderRadius: '6px',
            border: '1px solid #4caf50',
            flexWrap: 'wrap',
            gap: '8px'
          }}>
            <span>
              ✅ Connected: <code>{nostr.pubkey.slice(0, 8)}...{nostr.pubkey.slice(-8)}</code>
            </span>
            <button
              onClick={() => {
                nostr.disconnect();
                setConnectedPubkey(null);
              }}
              className="btn-secondary"
              style={{ fontSize: '12px', padding: '4px 12px' }}
            >
              Disconnect
            </button>
          </div>
        </div>
      )}

      {/* PUBLISH BUTTON */}
      {!results && isConnected && (
        <button 
          onClick={handleApplyTemplate}
          className="btn-primary"
          disabled={applying}
          style={{ 
            fontSize: '18px',
            padding: '16px',
            marginTop: '10px'
          }}
        >
          {applying ? '⏳ Publishing...' : '✅ Apply Template & Publish to Relays'}
        </button>
      )}

      {error && !results && (
        <div className="error-box" style={{ marginTop: '16px' }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {results && results.events && (
        <div className="success-box" style={{ marginTop: '20px' }}>
          <h3>{results.status === 'complete' ? '✅ Template Applied Successfully!' : results.status === 'partial' ? '⚠️ Template Partially Applied' : results.status === 'cancelled' ? '⏹️ Template Application Cancelled' : '❌ Template Was Not Applied'}</h3>
          {results.events.map(({ event, results: relayResults }) => {
            const accepted = relayResults.filter(({ status }) => status === 'accepted').length;
            return <div key={event.id} style={{ marginTop: '12px', padding: '16px', borderRadius: '6px', border: accepted ? '1px solid #4caf50' : '1px solid #ff5252' }}>
              <strong>Kind {event.kind}</strong><p>Published to <strong>{accepted}</strong> of {relayResults.length} relays</p>
              <ul>{relayResults.filter(({ status }) => status !== 'accepted').map(({ url, status, error: relayError }) => <li key={url}>{url}: {status}{relayError ? ` — ${relayError}` : ''}</li>)}</ul>
            </div>;
          })}

          {results.status !== 'complete' && results.status !== 'cancelled' && results.retry && <button onClick={handleRetry} className="btn-secondary" disabled={applying}>Retry failed relays</button>}

          <div style={{ marginTop: '16px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <Link to="/" className="btn-secondary">
              ← Create Another Template
            </Link>
            <button 
              onClick={() => window.location.reload()}
              className="btn-secondary"
            >
              🔄 Apply Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TemplateApplier;
