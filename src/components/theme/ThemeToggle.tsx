import { useEffect, useState } from 'react';

export const THEME_STORAGE_KEY = 'databook-theme';

function readIsDark(): boolean {
  if (typeof document === 'undefined') return true;
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'light') return false;
    if (stored === 'dark') return true;
  } catch {
    // ignore
  }
  // Dark is the product default when nothing is stored yet.
  return true;
}

function applyDark(dark: boolean) {
  document.documentElement.classList.toggle('dark', dark);
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, dark ? 'dark' : 'light');
  } catch {
    // Storage can be unavailable; class toggle still works for the session.
  }
}

/** Sets/removes class `dark` on <html>; no ThemeProvider library. */
export function ThemeToggle() {
  const [dark, setDark] = useState(readIsDark);

  useEffect(() => {
    applyDark(dark);
  }, [dark]);

  const next = dark ? 'light' : 'dark';
  return (
    <button
      type="button"
      className="cb-theme-toggle"
      onClick={() => setDark((d) => !d)}
      aria-label={`Switch to ${next} theme`}
      title={`Switch to ${next} theme`}
    >
      {dark ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  );
}
