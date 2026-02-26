import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { initAccessibility } from './utils/accessibility';

// Apply saved accessibility settings (font size, font family, line height, etc.)
// BEFORE the first React render so there is no visual flash.
initAccessibility();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
