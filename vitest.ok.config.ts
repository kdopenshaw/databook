import { defineConfig } from 'vitest/config';

/** Narrow config so `npm run ok` runs only the live book gate (not the full suite). */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/data/okBook.gate.ts'],
  },
});
