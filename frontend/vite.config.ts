import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Backend (NestJS) listens separately (default port 4000, see backend/src/main.ts).
// The SPA and Playwright's baseURL share one origin (http://localhost:3000);
// Vite's dev-server proxy forwards /api/* and /api-json to the backend so no
// CORS/privileged-path handling is needed (tech-design.md: "no privileged
// path" — the SPA consumes the same published contract as any other client).
const BACKEND_ORIGIN = process.env.BACKEND_ORIGIN || 'http://localhost:4000';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': { target: BACKEND_ORIGIN, changeOrigin: true },
      '/api-json': { target: BACKEND_ORIGIN, changeOrigin: true },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      // App.tsx/main.tsx are bootstrap/mount-only (route table, ReactDOM
      // root) exercised by the Playwright E2E run against the live app
      // rather than by component tests, mirroring backend/jest.config.js's
      // exclusion of its own main.ts/data-source.ts bootstrap files.
      exclude: [
        'src/App.tsx',
        'src/main.tsx',
        'src/api/client.ts',
        'src/vite-env.d.ts',
        '**/*.config.ts',
        '**/*.config.js',
      ],
      thresholds: { lines: 80, branches: 75 },
    },
  },
});
