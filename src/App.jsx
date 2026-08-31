import React, { useState } from 'react';
import { HashRouter, Routes, Route, Link } from 'react-router-dom';
import TemplateCreator from './components/TemplateCreator';
import TemplateApplier from './components/TemplateApplier';
// Remove this line: import './App.css';

function App() {
  const [connectedPubkey, setConnectedPubkey] = useState(null);

  return (
    <HashRouter>
      <div className="app">
        <header className="app-header">
          <h1>⚡ Communitator</h1>
          <nav>
            <Link to="/">🏠 Create Template</Link>
          </nav>
          {connectedPubkey && (
            <div className="user-badge">
              ✅ {connectedPubkey.slice(0, 8)}...
            </div>
          )}
        </header>
        <main>
          <Routes>
            <Route path="/" element={<TemplateCreator />} />
            <Route path="/apply/:encoded" element={<TemplateApplier setConnectedPubkey={setConnectedPubkey} />} />
          </Routes>
        </main>
        <footer>
          <p>
            Built with Nostr &middot;{' '}
            <a 
              href="https://github.com/dyne/communitator"
              target="_blank" 
              rel="noopener noreferrer"
              style={{ color: 'inherit', textDecoration: 'underline' }}
            >
              Source Code
            </a>
          </p>
        </footer>
      </div>
    </HashRouter>
  );
}

export default App;
