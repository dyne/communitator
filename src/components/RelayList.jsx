import React from 'react';

const RelayList = ({ relays, onUpdate, onRemove }) => {
  return (
    <div className="relay-list">
      {relays.map((relay, index) => (
        <div key={index} className="relay-item">
          <input
            type="text"
            value={relay.url}
            onChange={(e) => onUpdate(index, 'url', e.target.value)}
            placeholder="wss://relay.example.com"
            className="relay-input"
          />
          <label>
            <input
              type="checkbox"
              checked={relay.read}
              onChange={(e) => onUpdate(index, 'read', e.target.checked)}
            />
            📨 Inbox (Read)
          </label>
          <label>
            <input
              type="checkbox"
              checked={relay.write}
              onChange={(e) => onUpdate(index, 'write', e.target.checked)}
            />
            📤 Outbox (Write)
          </label>
          <button 
            onClick={() => onRemove(index)}
            className="btn-danger"
            disabled={relays.length === 1}
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
};

export default RelayList;