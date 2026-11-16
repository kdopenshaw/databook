import type { ComponentType } from 'react';
import type { ChartMeta, DataRow } from '../data/types';

export type BookChartProps = {
  data: DataRow[];
};

export type ChartModule = {
  default: ComponentType<BookChartProps>;
  meta: ChartMeta;
};

/** Eager map of `src/charts/*.tsx` default exports + `meta`. */
const modules = import.meta.glob('./*.tsx', { eager: true }) as Record<string, ChartModule>;

function chartNameFromPath(path: string): string | null {
  const m = path.match(/\/([^/]+)\.tsx$/);
  return m?.[1] ?? null;
}

function moduleFor(name: string): ChartModule | null {
  for (const [path, mod] of Object.entries(modules)) {
    if (chartNameFromPath(path) === name) return mod ?? null;
  }
  return null;
}

export function listBookCharts(): string[] {
  return Object.keys(modules)
    .map(chartNameFromPath)
    .filter((n): n is string => Boolean(n))
    .sort();
}

/** Resolve a chart name to its React component. */
export function resolveBookChart(name: string): ComponentType<BookChartProps> | null {
  return moduleFor(name)?.default ?? null;
}

/** Resolve a chart name to its `meta` (title + query). */
export function resolveChartMeta(name: string): ChartMeta | null {
  const mod = moduleFor(name);
  return mod?.meta ?? null;
}
