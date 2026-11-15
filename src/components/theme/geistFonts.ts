/**
 * Geist typography comes from the `geist` npm package (fonts only).
 * Font files are vendored into public/fonts so Vite can serve them without
 * hitting the package `exports` field (which only exposes next/font entrypoints).
 */
export function injectGeistFonts() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('databook-geist-fonts')) return;
  const style = document.createElement('style');
  style.id = 'databook-geist-fonts';
  style.textContent = `
@font-face {
  font-family: 'Geist';
  src: url('/fonts/Geist-Variable.woff2') format('woff2');
  font-weight: 100 900;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: 'Geist Mono';
  src: url('/fonts/GeistMono-Variable.woff2') format('woff2');
  font-weight: 100 900;
  font-style: normal;
  font-display: swap;
}
`;
  document.head.appendChild(style);
}
