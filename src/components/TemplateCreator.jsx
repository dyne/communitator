import React, { useState } from 'react';
import { encodeTemplate, generateTemplateId, validateTemplate, getCommunityTemplates } from '../utils/templates';
import RelayList from './RelayList';
import NostrConnect from './NostrConnect';

// Configure your blast relays here (hidden from UI)
// These will be used to publish the events, but won't appear in the template
const BLAST_RELAYS = [
  'wss://relay.primal.net',
  'wss://relay.damus.io',
  'wss://nos.lol'
  // Add your preferred blast relays here
];

const TemplateCreator = ({ setConnectedPubkey }) => {
  const [templateName, setTemplateName] = useState('');
  const [description, setDescription] = useState('');
  const [relays, setRelays] = useState([
    { url: 'wss://relay.damus.io', read: true, write: true },
    { url: 'wss://nos.lol', read: true, write: true }
  ]);
  
  // Blossom servers (kind 10063)
  const [blossomServers, setBlossomServers] = useState([
    { url: 'https://cdn.satellite.earth' }
  ]);
  const [showBlossom, setShowBlossom] = useState(true);
  
  // DM relays (kind 10050)
  const [dmRelays, setDmRelays] = useState([
    { url: 'wss://relay.private-msgs.com' }
  ]);
  const [showDmRelays, setShowDmRelays] = useState(true);
  
  const [error, setError] = useState('');
  const [shareUrl, setShareUrl] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');

  const communityTemplates = getCommunityTemplates();

  const handleCreateTemplate = () => {
    try {
      const template = {
        id: generateTemplateId(),
        name: templateName,
        description: description,
        relays: relays,
        blossomServers: showBlossom ? blossomServers : [],
        dmRelays: showDmRelays ? dmRelays : [],
        created_at: Math.floor(Date.now() / 1000)
      };

      validateTemplate(template);
      
      const encoded = encodeTemplate(template);
      const url = `${window.location.origin}${window.location.pathname}#/apply/${encoded}`;
      setShareUrl(url);
      
      navigator.clipboard?.writeText(url).catch(() => {});
      
      setError('');
    } catch (err) {
      setError(err.message);
    }
  };

  const loadCommunityTemplate = (templateKey) => {
    const template = communityTemplates[templateKey];
    if (template) {
      setRelays(template.relays);
      setTemplateName(template.name);
      setDescription(template.description);
      if (template.blossomServers && template.blossomServers.length > 0) {
        setBlossomServers(template.blossomServers);
        setShowBlossom(true);
      } else {
        setBlossomServers([{ url: '' }]);
        setShowBlossom(false);
      }
      if (template.dmRelays && template.dmRelays.length > 0) {
        setDmRelays(template.dmRelays);
        setShowDmRelays(true);
      } else {
        setDmRelays([{ url: '' }]);
        setShowDmRelays(false);
      }
      setSelectedTemplate(templateKey);
      setError('');
    }
  };

  // Relay functions
  const addRelay = () => {
    setRelays([...relays, { url: '', read: true, write: true }]);
  };

  const removeRelay = (index) => {
    setRelays(relays.filter((_, i) => i !== index));
  };

  const updateRelay = (index, field, value) => {
    const updated = [...relays];
    updated[index][field] = value;
    setRelays(updated);
  };

  // Blossom server functions
  const addBlossomServer = () => {
    setBlossomServers([...blossomServers, { url: '' }]);
  };

  const removeBlossomServer = (index) => {
    setBlossomServers(blossomServers.filter((_, i) => i !== index));
  };

  const updateBlossomServer = (index, value) => {
    const updated = [...blossomServers];
    updated[index].url = value;
    setBlossomServers(updated);
  };

  // DM relay functions
  const addDmRelay = () => {
    setDmRelays([...dmRelays, { url: '' }]);
  };

  const removeDmRelay = (index) => {
    setDmRelays(dmRelays.filter((_, i) => i !== index));
  };

  const updateDmRelay = (index, value) => {
    const updated = [...dmRelays];
    updated[index].url = value;
    setDmRelays(updated);
  };

  const addCommonRelay = (url) => {
    if (!relays.some(r => r.url === url)) {
      setRelays([...relays, { url, read: true, write: true }]);
    }
  };

  return (
    <div className="template-creator">
      <h2>Create Relay Template</h2>
      
      <NostrConnect setConnectedPubkey={setConnectedPubkey} />

      {/* Community Templates Section */}
      <div className="form-group" style={{ 
        background: '#f8f9fa', 
        padding: '16px', 
        borderRadius: '8px',
        border: '1px solid #e9ecef',
        marginBottom: '24px'
      }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '18px' }}>📚</span>
          Community Templates
        </label>
        <p style={{ fontSize: '13px', color: '#666', marginBottom: '10px' }}>
          Load a pre-configured template from popular communities
        </p>
        
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {Object.entries(communityTemplates).map(([key, template]) => (
            <button
              key={key}
              onClick={() => loadCommunityTemplate(key)}
              className={`btn-secondary ${selectedTemplate === key ? 'active-template' : ''}`}
              style={{
                padding: '8px 16px',
                border: selectedTemplate === key ? '2px solid #7c4dff' : '1px solid #ddd',
                background: selectedTemplate === key ? '#f0ebff' : 'white',
                fontWeight: selectedTemplate === key ? '600' : 'normal',
                transition: 'all 0.2s'
              }}
            >
              {template.name}
              <span style={{ fontSize: '11px', color: '#999', marginLeft: '4px' }}>
                ({template.relays.length} relays)
              </span>
            </button>
          ))}
        </div>
        
        {selectedTemplate && (
          <div style={{ 
            marginTop: '10px', 
            fontSize: '13px', 
            color: '#666',
            padding: '8px 12px',
            background: 'white',
            borderRadius: '4px',
            border: '1px solid #e9ecef'
          }}>
            💡 <strong>{communityTemplates[selectedTemplate].name}:</strong> {communityTemplates[selectedTemplate].description}
          </div>
        )}
        
        {selectedTemplate && (
          <button
            onClick={() => {
              setSelectedTemplate('');
              setRelays([
                { url: 'wss://relay.damus.io', read: true, write: true },
                { url: 'wss://nos.lol', read: true, write: true }
              ]);
              setTemplateName('');
              setDescription('');
              setBlossomServers([{ url: 'https://cdn.satellite.earth' }]);
              setDmRelays([{ url: 'wss://relay.private-msgs.com' }]);
              setShowBlossom(true);
              setShowDmRelays(true);
            }}
            className="btn-secondary"
            style={{ marginTop: '8px', fontSize: '12px' }}
          >
            ✕ Clear Template
          </button>
        )}
      </div>

      <div className="form-group">
        <label>Template Name *</label>
        <input
          type="text"
          value={templateName}
          onChange={(e) => setTemplateName(e.target.value)}
          placeholder="e.g., My Community Relays"
        />
      </div>

      <div className="form-group">
        <label>Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe this relay set for new users"
          rows="3"
        />
      </div>

      {/* Main Relays Section */}
      <div className="form-group">
        <label>Relays *</label>
        <RelayList
          relays={relays}
          onUpdate={updateRelay}
          onRemove={removeRelay}
        />
        
        <div style={{ marginTop: '10px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button onClick={addRelay} className="btn-secondary">
            + Add Custom Relay
          </button>
          <button 
            onClick={() => addCommonRelay('wss://relay.primal.net')} 
            className="btn-secondary"
            style={{ fontSize: '12px' }}
          >
            + Primal
          </button>
          <button 
            onClick={() => addCommonRelay('wss://relay.damus.io')} 
            className="btn-secondary"
            style={{ fontSize: '12px' }}
          >
            + Damus
          </button>
          <button 
            onClick={() => addCommonRelay('wss://nos.lol')} 
            className="btn-secondary"
            style={{ fontSize: '12px' }}
          >
            + Nos.lol
          </button>
          <button 
            onClick={() => addCommonRelay('wss://relay.snort.social')} 
            className="btn-secondary"
            style={{ fontSize: '12px' }}
          >
            + Snort
          </button>
        </div>
      </div>

      {/* Blossom Servers Section */}
      <div className="form-group">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <label style={{ marginBottom: 0 }}>🌺 Blossom Servers (kind 10063)</label>
          <button 
            onClick={() => setShowBlossom(!showBlossom)}
            className="btn-secondary"
            style={{ fontSize: '12px', padding: '4px 10px' }}
          >
            {showBlossom ? 'Hide' : 'Show'}
          </button>
        </div>
        
        {showBlossom && (
          <>
            <p style={{ fontSize: '13px', color: '#666', marginBottom: '10px' }}>
              Servers used to host your blobs/images. Order determines trust/reliability.
            </p>
            {blossomServers.map((server, index) => (
              <div key={index} className="relay-item">
                <input
                  type="text"
                  value={server.url}
                  onChange={(e) => updateBlossomServer(index, e.target.value)}
                  placeholder="https://cdn.example.com"
                  className="relay-input"
                  style={{ flex: 1 }}
                />
                <button 
                  onClick={() => removeBlossomServer(index)}
                  className="btn-danger"
                  disabled={blossomServers.length === 1}
                >
                  ✕
                </button>
              </div>
            ))}
            <button onClick={addBlossomServer} className="btn-secondary" style={{ marginTop: '4px' }}>
              + Add Blossom Server
            </button>
          </>
        )}
      </div>

      {/* DM Relays Section */}
      <div className="form-group">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <label style={{ marginBottom: 0 }}>💬 DM Relays (kind 10050)</label>
          <button 
            onClick={() => setShowDmRelays(!showDmRelays)}
            className="btn-secondary"
            style={{ fontSize: '12px', padding: '4px 10px' }}
          >
            {showDmRelays ? 'Hide' : 'Show'}
          </button>
        </div>
        
        {showDmRelays && (
          <>
            <p style={{ fontSize: '13px', color: '#666', marginBottom: '10px' }}>
              Relays used for private messages.
            </p>
            {dmRelays.map((relay, index) => (
              <div key={index} className="relay-item">
                <input
                  type="text"
                  value={relay.url}
                  onChange={(e) => updateDmRelay(index, e.target.value)}
                  placeholder="wss://relay.private-msgs.com"
                  className="relay-input"
                  style={{ flex: 1 }}
                />
                <button 
                  onClick={() => removeDmRelay(index)}
                  className="btn-danger"
                  disabled={dmRelays.length === 1}
                >
                  ✕
                </button>
              </div>
            ))}
            <button onClick={addDmRelay} className="btn-secondary" style={{ marginTop: '4px' }}>
              + Add DM Relay
            </button>
          </>
        )}
      </div>

      {error && <div className="error">{error}</div>}

      <button 
        onClick={handleCreateTemplate} 
        className="btn-primary"
        disabled={!templateName || relays.some(r => !r.url)}
      >
        Generate Shareable Template
      </button>

      {shareUrl && (
        <div className="share-box">
          <h3>✅ Template Created!</h3>
          <p>Share this link with your community:</p>
          <input type="text" value={shareUrl} readOnly />
          <button onClick={() => navigator.clipboard?.writeText(shareUrl)}>
            Copy Link
          </button>
          <p style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
            🔒 Template will be published to blast relays (configured in code)
          </p>
        </div>
      )}
    </div>
  );
};

export default TemplateCreator;