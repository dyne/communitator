import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { decodeTemplate, validateTemplate } from '../utils/templates';
import useNostr from '../hooks/useNostr';
import NostrConnect from './NostrConnect';

const TemplateApplier = ({ setConnectedPubkey }) => {
  const { encoded } = useParams();
  const nostr = useNostr();
  
  const [template, setTemplate] = useState(null);
  const [error, setError] = useState('');
  const [applying, setApplying] = useState(false);
  const [results, setResults] = useState(null);

  // ============================================================
  // CONNECTION CHECK
  // ============================================================
  useEffect(() => {
    const checkConnection = async () => {
      if (nostr.pubkey) {
        setConnectedPubkey(nostr.pubkey);
        return;
      }

      if (window.nostr?.getPublicKey) {
        try {
          const pk = await window.nostr.getPublicKey();
          if (pk) {
            await nostr.connect();
            setConnectedPubkey(pk);
          }
        } catch (e) {
          console.log('Extension not authorized');
        }
      }
    };

    checkConnection();
  }, []);

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
      validateTemplate(decoded);
      setTemplate(decoded);
      setError('');
    } catch (err) {
      console.error('Template decode error:', err);
      setError('Invalid template: ' + err.message);
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

      // Collect ALL user relay URLs from the main relays
      const allUserRelays = template.relays.map(r => r.url);

      const allResults = [];
      const publishConfigs = [];

      // 1. Publish kind 10002 (relays)
      if (template.relays && template.relays.length > 0) {
        publishConfigs.push({
          name: 'Relays (kind 10002)',
          kind: '10002',
          publishFn: () => nostr.publishKind10002(template.relays, nostr.pubkey)
        });
      }

      // 2. Publish kind 10063 (blossom servers)
      if (template.blossomServers && template.blossomServers.length > 0) {
        publishConfigs.push({
          name: 'Blossom Servers (kind 10063)',
          kind: '10063',
          publishFn: () => nostr.publishKind10063(template.blossomServers, nostr.pubkey, allUserRelays)
        });
      }

      // 3. Publish kind 10050 (DM relays)
      if (template.dmRelays && template.dmRelays.length > 0) {
        publishConfigs.push({
          name: 'DM Relays (kind 10050)',
          kind: '10050',
          publishFn: () => nostr.publishKind10050(template.dmRelays, nostr.pubkey, allUserRelays)
        });
      }

      if (publishConfigs.length === 0) {
        throw new Error('No events to publish');
      }

      // Publish each kind
      for (const config of publishConfigs) {
        console.log(`Publishing ${config.name}...`);
        try {
          const result = await config.publishFn();
          
          const successCount = result.results.filter(r => r.success).length;
          const blastSuccess = result.blastResults ? result.blastResults.filter(r => r.success).length : 0;
          const userSuccess = result.userResults ? result.userResults.filter(r => r.success).length : 0;
          
          allResults.push({
            kind: config.kind,
            name: config.name,
            success: successCount > 0,
            eventId: result.event.id,
            publishedTo: successCount,
            totalRelays: result.results.length,
            blastPublished: blastSuccess,
            blastTotal: result.blastResults ? result.blastResults.length : 0,
            userPublished: userSuccess,
            userTotal: result.userResults ? result.userResults.length : 0,
            details: result.results
          });
        } catch (err) {
          allResults.push({
            kind: config.kind,
            name: config.name,
            success: false,
            error: err.message
          });
        }
      }

      setResults({
        success: allResults.some(r => r.success),
        events: allResults
      });

    } catch (err) {
      setError('Failed to apply template: ' + err.message);
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
                <span className="relay-url">{relay.url}</span>
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
                  <span className="relay-url">{server.url}</span>
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
                  <span className="relay-url">{relay.url}</span>
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
          <NostrConnect setConnectedPubkey={setConnectedPubkey} />
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

      {/* RESULTS */}
      {results && results.events && (
        <div className="success-box" style={{ marginTop: '20px' }}>
          <h3>
            {results.success ? '✅ Template Applied Successfully!' : '⚠️ Some Events Failed'}
          </h3>
          
          {results.events.map((event, index) => (
            <div key={index} style={{ 
              marginTop: '12px', 
              padding: '16px',
              background: event.success ? 'rgba(76, 175, 80, 0.1)' : 'rgba(255, 82, 82, 0.1)',
              borderRadius: '6px',
              border: event.success ? '1px solid #4caf50' : '1px solid #ff5252'
            }}>
              <strong>{event.name}</strong>
              {event.success ? (
                <>
                  <p style={{ marginTop: '4px' }}>
                    ✅ Published to <strong>{event.publishedTo}</strong> of {event.totalRelays} relays
                  </p>
                  
                  {event.blastTotal > 0 && (
                    <p style={{ fontSize: '13px', color: '#555' }}>
                      📡 Blast relays: <strong>{event.blastPublished}/{event.blastTotal}</strong>
                    </p>
                  )}
                  
                  {event.userTotal > 0 && (
                    <p style={{ fontSize: '13px', color: '#555' }}>
                      👤 Your relays: <strong>{event.userPublished}/{event.userTotal}</strong>
                    </p>
                  )}
                  
                  <p style={{ fontSize: '12px', color: '#555', marginTop: '4px' }}>
                    Event ID: <code style={{ fontSize: '11px', wordBreak: 'break-all' }}>
                      {event.eventId}
                    </code>
                  </p>
                  
                  <details style={{ marginTop: '8px' }}>
                    <summary style={{ cursor: 'pointer', color: '#2e7d32', fontSize: '13px' }}>
                      📊 Publication Details ({event.publishedTo} successful)
                    </summary>
                    <ul style={{ marginTop: '8px', fontSize: '12px', maxHeight: '200px', overflowY: 'auto' }}>
                      {event.details.map((result, idx) => (
                        <li key={idx} style={{ 
                          padding: '2px 0',
                          color: result.success ? '#2e7d32' : '#c62828'
                        }}>
                          {result.success ? '✅' : '❌'} {result.url}
                          {result.error && ` - ${result.error}`}
                        </li>
                      ))}
                    </ul>
                  </details>
                </>
              ) : (
                <p style={{ color: '#c62828', marginTop: '4px' }}>
                  ❌ Failed: {event.error}
                </p>
              )}
            </div>
          ))}

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
