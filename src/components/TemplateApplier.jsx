import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { decodeTemplate, validateTemplate } from '../utils/templates';
import useNostr from '../hooks/useNostr';

const TemplateApplier = ({ connectedPubkey, setConnectedPubkey }) => {
  const { encoded } = useParams();
  const [template, setTemplate] = useState(null);
  const [error, setError] = useState('');
  const [applying, setApplying] = useState(false);
  const [results, setResults] = useState(null);
  const [publishResults, setPublishResults] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const { publishKind10002, isConnected, connect, pubkey } = useNostr();

  useEffect(() => {
    if (!encoded) {
      setError('No template provided');
      return;
    }

    try {
      // Decode and validate the template
      const decoded = decodeTemplate(encoded);
      validateTemplate(decoded);
      setTemplate(decoded);
      setError('');
    } catch (err) {
      console.error('Template decode error:', err);
      setError('Invalid template: ' + err.message);
    }
  }, [encoded]);

  // Update parent when connection changes
  useEffect(() => {
    if (pubkey && !connectedPubkey) {
      setConnectedPubkey(pubkey);
    }
  }, [pubkey, connectedPubkey, setConnectedPubkey]);

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      const pk = await connect();
      setConnectedPubkey(pk);
      setError('');
    } catch (err) {
      setError('Failed to connect: ' + err.message);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleApplyTemplate = async () => {
    if (!template) return;

    setApplying(true);
    setError('');
    setPublishResults(null);

    try {
      // Get pubkey from parent or hook
      let pubkeyToUse = connectedPubkey || pubkey;
      
      if (!pubkeyToUse) {
        // Try to connect
        try {
          pubkeyToUse = await connect();
          setConnectedPubkey(pubkeyToUse);
        } catch (err) {
          throw new Error('Please connect your Nostr extension first');
        }
      }

      if (!pubkeyToUse) {
        throw new Error('No Nostr public key available. Please connect your extension.');
      }

      // Publish the kind 10002 event
      const result = await publishKind10002(template.relays, pubkeyToUse);
      
      setPublishResults({
        success: true,
        eventId: result.event.id,
        publishedTo: result.results.filter(r => r.success).length,
        totalRelays: result.results.length,
        details: result.results
      });

      setResults({
        success: true,
        eventId: result.event.id,
        published: result.event
      });

    } catch (err) {
      setError('Failed to apply template: ' + err.message);
      setPublishResults({
        success: false,
        error: err.message
      });
    } finally {
      setApplying(false);
    }
  };

  // Handle case where template fails to decode
  if (error && !template) {
    return (
      <div className="template-applier">
        <h2>Apply Relay Template</h2>
        <div className="error-box">
          <h3>❌ Error Loading Template</h3>
          <p>{error}</p>
          <p style={{ marginTop: '10px', fontSize: '14px', color: '#666' }}>
            The link you clicked may be malformed or expired. Please try generating a new template.
          </p>
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
        
        <div className="relay-preview">
          <h4>📡 Relays in this template ({template.relays.length}):</h4>
          <ul>
            {template.relays.map((relay, index) => (
              <li key={index}>
                <span className="relay-url">{relay.url}</span>
                <span className="relay-permissions">
                  {relay.read ? '📖 Read' : '🔒 No Read'} 
                  {relay.write ? ' ✍️ Write' : ' 🔒 No Write'}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Connection Status & Button */}
      <div className="connection-status" style={{ marginBottom: '16px' }}>
        {(connectedPubkey || pubkey) ? (
          <div className="info-box">
            ✅ Connected as: <code>{(connectedPubkey || pubkey).slice(0, 8)}...{(connectedPubkey || pubkey).slice(-8)}</code>
          </div>
        ) : (
          <div className="warning" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
            <span>⚠️ Not connected to Nostr. Please connect your extension to publish.</span>
            <button 
              onClick={handleConnect}
              disabled={isConnecting}
              className="btn-nostr"
              style={{ width: 'auto' }}
            >
              {isConnecting ? '⏳ Connecting...' : '🔑 Connect Nostr'}
            </button>
          </div>
        )}
      </div>

      {/* Publish Button */}
      {!results && (connectedPubkey || pubkey) && (
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
          {applying ? (
            '⏳ Publishing...'
          ) : (
            '✅ Apply Template & Publish to Relays'
          )}
        </button>
      )}

      {/* Error Display */}
      {error && !results && (
        <div className="error-box" style={{ marginTop: '16px' }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Success Results */}
      {publishResults && publishResults.success && (
        <div className="success-box" style={{ marginTop: '20px' }}>
          <h3>✅ Template Applied Successfully!</h3>
          <p style={{ marginTop: '8px' }}>
            Published to <strong>{publishResults.publishedTo}</strong> of {publishResults.totalRelays} relays
          </p>
          <p style={{ fontSize: '13px', color: '#555', marginTop: '4px' }}>
            Event ID: <code style={{ fontSize: '12px', wordBreak: 'break-all' }}>
              {publishResults.eventId}
            </code>
          </p>
          
          <details style={{ marginTop: '12px' }}>
            <summary style={{ cursor: 'pointer', color: '#2e7d32' }}>
              📊 Publication Details
            </summary>
            <ul style={{ marginTop: '8px', fontSize: '13px' }}>
              {publishResults.details.map((result, index) => (
                <li key={index} style={{ 
                  padding: '4px 0',
                  color: result.success ? '#2e7d32' : '#c62828'
                }}>
                  {result.success ? '✅' : '❌'} {result.url}
                  {result.error && ` - ${result.error}`}
                </li>
              ))}
            </ul>
          </details>

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

      {/* Error Results */}
      {publishResults && !publishResults.success && (
        <div className="error-box" style={{ marginTop: '20px' }}>
          <h3>❌ Failed to Publish</h3>
          <p>{publishResults.error}</p>
          <button 
            onClick={() => setPublishResults(null)}
            className="btn-secondary"
            style={{ marginTop: '10px' }}
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
};

export default TemplateApplier;