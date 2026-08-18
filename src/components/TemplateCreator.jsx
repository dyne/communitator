import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { encodeTemplate, generateTemplateId, validateTemplate } from '../utils/templates';
import RelayList from './RelayList';
import NostrConnect from './NostrConnect';

const TemplateCreator = ({ setConnectedPubkey }) => {
  const navigate = useNavigate();
  const [templateName, setTemplateName] = useState('');
  const [description, setDescription] = useState('');
  const [relays, setRelays] = useState([
    { url: 'wss://relay.dyne.org', read: false, write: true },
    { url: 'wss://relay.dyne.org/inbox', read: true, write: false },
    { url: 'wss://basspistol.org', read: false, write: true },
    { url: 'wss://basspistol.org/inbox', read: true, write: false },
    { url: 'wss://spatia-arcana.com', read: false, write: true },
    { url: 'wss://spatia-arcana.com/inbox', read: true, write: false },
    { url: 'wss://nestr.nedao.ch', read: false, write: true },
    { url: 'wss://nestr.nedao.ch/inbox', read: true, write: false },
    { url: 'wss://pyramid.fiatjaf.com', read: false, write: true },
    { url: 'wss://pyramid.fiatjaf.com/inbox', read: true, write: false },
    { url: 'wss://relay.ditto.pub', read: true, write: true },
    { url: 'wss://nos.lol', read: true, write: true }
  ]);
  const [error, setError] = useState('');
  const [shareUrl, setShareUrl] = useState('');

  const handleCreateTemplate = () => {
    try {
      const template = {
        id: generateTemplateId(),
        name: templateName,
        description: description,
        relays: relays,
        created_at: Math.floor(Date.now() / 1000)
      };

      validateTemplate(template);

      const encoded = encodeTemplate(template);
      // Use HashRouter format
      const url = `${window.location.origin}${window.location.pathname}#/apply/${encoded}`;
      setShareUrl(url);

      // Copy to clipboard automatically
      navigator.clipboard?.writeText(url).catch(() => {
        // Fallback - just show the URL
      });

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

  return (
    <div className="template-creator">
      <h2>Create Relay Template</h2>
      
      <NostrConnect setConnectedPubkey={setConnectedPubkey} />

      <div className="form-group">
        <label>Template Name *</label>
        <input
          type="text"
          value={templateName}
          onChange={(e) => setTemplateName(e.target.value)}
          placeholder="e.g., Nostr Plebs Default Relays"
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
        <label>Relays *</label>
        <RelayList
          relays={relays}
          onUpdate={updateRelay}
          onRemove={removeRelay}
        />
        <button onClick={addRelay} className="btn-secondary">
          + Add Relay
        </button>
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
        </div>
      )}
    </div>
  );
};

export default TemplateCreator;
