import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { injectGeistFonts } from './components/theme/geistFonts';
import './components/theme/theme.css';

injectGeistFonts();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
