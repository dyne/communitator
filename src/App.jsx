import { HashRouter, Routes, Route, Link } from 'react-router-dom';
import TemplateCreator from './components/TemplateCreator';
import TemplateApplier from './components/TemplateApplier';
import dyneBlack from './assets/dyne-logotype-black.svg';
import dyneWhite from './assets/dyne-logotype-white.svg';

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
          <a className="footer-logo" href="https://dyne.org" aria-label="Dyne.org">
            <picture>
              <source srcSet={dyneWhite} media="(prefers-color-scheme: dark)" />
              <img src={dyneBlack} alt="Dyne.org" width="94" />
            </picture>
          </a>
          <div className="footer-copy">
            <p>Software made with 💖 by <a href="https://dyne.org">dyne.org</a></p>
            <p>
              Help us keep making free software for everyone.{' '}
              <a href="https://dyne.org/donate">Please consider a donation.</a>
            </p>
            <p>
              <a href="https://dyne.org/communitator/">Documentation</a> &middot;{' '}
              <a
                href="https://github.com/dyne/communitator"
                target="_blank"
                rel="noopener noreferrer"
              >
                Source Code
              </a>
            </p>
          </div>
        </footer>
      </div>
    </HashRouter>
  );
}

export default App;
