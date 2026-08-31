import { HashRouter, Routes, Route, Link } from 'react-router-dom';
import TemplateCreator from './components/TemplateCreator';
import TemplateApplier from './components/TemplateApplier';

function App() {
  return (
    <HashRouter>
      <div className="app">
        <header className="app-header">
          <h1>⚡ Communitator</h1>
          <nav>
            <Link to="/">🏠 Create Template</Link>
          </nav>
        </header>
        <main>
          <Routes>
            <Route path="/" element={<TemplateCreator />} />
            <Route path="/apply/:encoded" element={<TemplateApplier />} />
          </Routes>
        </main>
        <footer>
          <p>
            Built with Nostr &middot;{' '}
            <a 
              href="https://github.com/dyne/communitator"
              target="_blank" 
              rel="noopener noreferrer"
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
