import React, { useState } from 'react';
import { HashRouter, Routes, Route, Link } from 'react-router-dom';
import TemplateCreator from './components/TemplateCreator';
import TemplateApplier from './components/TemplateApplier';
import './App.css';

function App() {
  const [connectedPubkey, setConnectedPubkey] = useState(null);

  return (
    <HashRouter>
      <div className="app">
        <header className="app-header">
          <h1>⚡ Communitator</h1>
          <nav>
            <Link to="/">🏠 Create Template</Link>
            {/* Remove the broken link - users will access /apply/:encoded via generated links */}
          </nav>
          {connectedPubkey && (
            <div className="user-badge">
              ✅ {connectedPubkey.slice(0, 8)}...
            </div>
          )}
        </header>
        <main>
          <Routes>
            <Route path="/" element={
              <TemplateCreator setConnectedPubkey={setConnectedPubkey} />
            } />
            <Route path="/apply/:encoded" element={
              <TemplateApplier connectedPubkey={connectedPubkey} setConnectedPubkey={setConnectedPubkey} />
            } />
          </Routes>
        </main>
        <footer>
          <p>Self-contained • Built with Nostr</p>
        </footer>
      </div>
    </HashRouter>
  );
}

export default App;
