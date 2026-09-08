import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// The API is on a different origin to the site, so the browser cannot start
// talking to it until it has done a DNS lookup and a TLS handshake it only
// discovers it needs once the JavaScript runs. Announcing the origin in the
// HTML lets both happen in parallel with the bundle download. Derived from the
// env rather than written down, so it cannot point at last month's backend,
// and skipped for localhost, where preconnecting to yourself buys nothing.
const apiPreconnect = (apiUrl) => ({
  name: 'api-preconnect',
  transformIndexHtml(html) {
    if (!apiUrl) return html;
    let origin;
    try {
      origin = new URL(apiUrl).origin;
    } catch {
      return html;
    }
    if (/localhost|127\.0\.0\.1/.test(origin)) return html;
    return html.replace(
      '</head>',
      `  <link rel="preconnect" href="${origin}" crossorigin />\n    <link rel="dns-prefetch" href="${origin}" />\n  </head>`
    );
  },
});

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react(), apiPreconnect(env.VITE_API_BASE_URL)],
    build: {
      // React and the router change only when they are upgraded, while app code
      // changes every deploy. Splitting them means a returning reader
      // re-downloads what actually changed instead of the whole bundle.
      rollupOptions: {
        output: {
          manualChunks: (id) =>
            /node_modules\/(react|react-dom|scheduler|react-router|react-router-dom)\//.test(id)
              ? 'react'
              : undefined,
        },
      },
      // Set just above the markdown pipeline (react-markdown, rehype-raw's
      // HTML parser and rehype-sanitize), which is ~348 kB raw and is the
      // largest thing here that has to exist. It is loaded only by the article
      // page and the editor, never on the critical path. Sized so the build is
      // quiet when nothing is wrong — a warning that always fires is one
      // nobody reads — while still catching a new chunk of that scale.
      //
      // The budget that actually gates the build is in scripts/verify-build.mjs
      // and is measured gzipped, which is what a reader downloads.
      chunkSizeWarningLimit: 360,
    },
    test: {
      // Component tests render into a DOM; the pure-function tests don't care.
      environment: 'jsdom',
      globals: true,
      setupFiles: './src/test/setup.js',
      // Only the unit tests. tests/ holds standalone Node scripts that drive a
      // real browser against a real build (`npm run test:prerender`); Vitest
      // picking them up runs them with no build present and reports a failure
      // that is purely about how they were invoked.
      include: ['src/**/*.test.{js,jsx}'],
      // Vitest watches by default, which hangs a CI run — `npm test` is a single
      // pass, `npm run test:watch` is the interactive one.
      watch: false,
    },
  };
});
