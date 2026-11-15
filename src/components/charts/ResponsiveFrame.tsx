import { useEffect, useState, type ReactElement } from 'react';
import { ResponsiveContainer } from 'recharts';

type Props = {
  children: ReactElement;
  height?: number;
};

/** Thin responsive wrapper around Recharts; theme colors come from CSS variables. */
export function ResponsiveFrame({ children, height = 320 }: Props) {
  return (
    <div className="cb-responsive-frame" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  );
}

export function readCssVar(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

/**
 * Changes whenever the `<html>` class (light/dark) changes.
 * `chartColors()` is read at render time only — remount charts with this key
 * after ThemeToggle flips `document.documentElement.classList`.
 */
export function useThemeKey(): string {
  const read = () => (typeof document === 'undefined' ? '' : document.documentElement.className);
  const [key, setKey] = useState(read);
  useEffect(() => {
    const obs = new MutationObserver(() => setKey(read()));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);
  return key;
}

export function chartColors() {
  return {
    fg: readCssVar('--cb-fg', '#ededed'),
    muted: readCssVar('--cb-muted', '#a1a1a1'),
    border: readCssVar('--cb-border', '#2e2e2e'),
    grid: readCssVar('--cb-grid', '#1f1f1f'),
    surface: readCssVar('--cb-surface', '#111111'),
    series: [
      readCssVar('--cb-series-1', '#56b4e9'),
      readCssVar('--cb-series-2', '#e69f00'),
      readCssVar('--cb-series-3', '#009e73'),
      readCssVar('--cb-series-4', '#f0e442'),
      readCssVar('--cb-series-5', '#cc79a7'),
      readCssVar('--cb-series-6', '#d55e00'),
      readCssVar('--cb-series-7', '#0072b2'),
      readCssVar('--cb-series-8', '#9a9a9a'),
    ],
  };
}
