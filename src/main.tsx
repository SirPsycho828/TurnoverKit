import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Console branding
console.log(
  '%c' + [
    ' _____ _  __',
    '|_   _| |/ /',
    '  | | |   / ',
    '  |_| |_|\\_\\',
  ].join('\n'),
  'color: #10B981; font-family: monospace; font-size: 14px; font-weight: bold;',
);
console.log(
  '%cYour property\'s legal shield. Every turnover tracked.',
  'color: #64748B; font-size: 12px;',
);

// Register service worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js');
  });
}
