import { useState } from 'react';
import { encodeTemplate, generateTemplateId, validateTemplate, getCommunityTemplates } from '../utils/templates';
import RelayList from './RelayList';

const TemplateCreator = () => {
  const [templateName, setTemplateName] = useState('');
  const [description, setDescription] = useState('');
  const [relays, setRelays] = useState([
    { url: 'wss://your.relay', read: true, write: true }
  ]);
  
  const [blossomServers, setBlossomServers] = useState([
    { url: 'https://your.blossom' }
  ]);
  const [showBlossom, setShowBlossom] = useState(true);
  
  const [dmRelays, setDmRelays] = useState([
    { url: 'wss://dm.relay' }
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

  const addCommonRelay = (url) => {
    if (!relays.some(r => r.url === url)) {
      setRelays([...relays, { url, read: true, write: true }]);
    }
  };

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

  return (
    <div className="template-creator">
      <h2>Create Settings Template</h2>

      {/* ✅ MOVED INLINE STYLES TO CSS CLASS */}
      <div className="community-templates-section">
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '18px' }}>📚</span>
          Community Templates
        </label>
        <p className="community-templates-description">
          Load a pre-configured template from popular communities
        </p>
        
        <div className="community-templates-buttons">
          {Object.entries(communityTemplates).map(([key, template]) => (
            <button
              key={key}
              onClick={() => loadCommunityTemplate(key)}
              className={`btn-secondary community-template-btn ${selectedTemplate === key ? 'active-template' : ''}`}
            >
              {template.name}
              <span className="relay-count">
                ({template.relays.length} relays)
              </span>
            </button>
          ))}
        </div>
        
        {selectedTemplate && (
          <div className="community-template-info">
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
            className="btn-secondary clear-template-btn"
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

      <div className="form-group">
        <label>📡 Relays *</label>
        <RelayList
          relays={relays}
          onUpdate={updateRelay}
          onRemove={removeRelay}
        />
        
        <div className="common-relay-buttons">
          <button onClick={addRelay} className="btn-secondary">
            + Add Custom Relay
          </button>
          <button 
            onClick={() => addCommonRelay('wss://relay.primal.net')} 
            className="btn-secondary common-relay-btn"
          >
            + Primal
          </button>
          <button 
            onClick={() => addCommonRelay('wss://relay.damus.io')} 
            className="btn-secondary common-relay-btn"
          >
            + Damus
          </button>
          <button 
            onClick={() => addCommonRelay('wss://nos.lol')} 
            className="btn-secondary common-relay-btn"
          >
            + Nos.lol
          </button>
          <button 
            onClick={() => addCommonRelay('wss://relay.snort.social')} 
            className="btn-secondary common-relay-btn"
          >
            + Snort
          </button>
        </div>
      </div>

      <div className="form-group">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <label style={{ marginBottom: 0 }}>🌺 Blossom Servers (kind 10063)</label>
          <button 
            onClick={() => setShowBlossom(!showBlossom)}
            className="btn-secondary toggle-btn"
          >
            {showBlossom ? 'Hide' : 'Show'}
          </button>
        </div>
        
        {showBlossom && (
          <>
            <p className="helper-text">
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
            <button onClick={addBlossomServer} className="btn-secondary add-btn">
              + Add Blossom Server
            </button>
          </>
        )}
      </div>

      <div className="form-group">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <label style={{ marginBottom: 0 }}>💬 DM Relays (kind 10050)</label>
          <button 
            onClick={() => setShowDmRelays(!showDmRelays)}
            className="btn-secondary toggle-btn"
          >
            {showDmRelays ? 'Hide' : 'Show'}
          </button>
        </div>
        
        {showDmRelays && (
          <>
            <p className="helper-text">
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
            <button onClick={addDmRelay} className="btn-secondary add-btn">
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
          <button onClick={() => navigator.clipboard?.writeText(shareUrl)} className="btn-success">
          Copy Link
          </button>
          <p className="helper-text" style={{ marginTop: '8px' }}>
            💡 Send this link to a friend. When they visit that page, they can apply these settings and blast them to many relays, so other npubs can find them
          </p>
        </div>
      )}
    </div>
  );
};

export default TemplateCreator;
