import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import Upload from './components/Upload';
import ImageDetails from './components/ImageDetails';
import { Camera } from 'lucide-react';

function App() {
  return (
    <Router>
      <div className="container">
        <header className="header">
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary-color)' }}>
            <Camera size={32} />
            <h1>AI Image Object Detection &amp; Captioning</h1>
          </Link>
          <nav>
            <Link to="/upload" className="btn btn-primary">
              Upload Image
            </Link>
          </nav>
        </header>

        <main>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/upload" element={<Upload />} />
            <Route path="/image/:id" element={<ImageDetails />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
