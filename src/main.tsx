import { lazy, StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { injectGeistFonts } from './components/theme/geistFonts';
import './components/theme/theme.css';

const isEmbed = new URLSearchParams(window.location.search).get('embed') === '1';
const Book = lazy(() => isEmbed ? import('./components/layout/BookReader') : import('./App'));

if (isEmbed) document.documentElement.classList.add('dbk-embed');
injectGeistFonts();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Suspense>
      <Book />
    </Suspense>
  </StrictMode>,
);
