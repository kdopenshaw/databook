import type { ComponentType } from 'react';
import type { DataRow } from '../data/types';

export type BookChartProps = {
  data: DataRow[];
};

type ChartModule = { default: ComponentType<BookChartProps> };

/** Eager map of `src/charts/*.tsx` default exports (agent-authored charts). */
const modules = import.meta.glob('./*.tsx', { eager: true }) as Record<string, ChartModule>;

function chartNameFromPath(path: string): string | null {
  const m = path.match(/\/([^/]+)\.tsx$/);
  return m?.[1] ?? null;
}

export function listBookCharts(): string[] {
  return Object.keys(modules)
    .map(chartNameFromPath)
    .filter((n): n is string => Boolean(n))
    .sort();
}

/** Resolve a chart block's `component` name to a React component. */
export function resolveBookChart(name: string): ComponentType<BookChartProps> | null {
  for (const [path, mod] of Object.entries(modules)) {
    if (chartNameFromPath(path) === name && mod?.default) return mod.default;
  }
  return null;
}
