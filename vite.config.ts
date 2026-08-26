/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'
import { defineConfig, type PluginOption } from 'vite'

// rollup-plugin-visualizer declares its Rollup hooks against a slightly older
// signature than Vite 7 exposes, which `exactOptionalPropertyTypes` rejects.
// The plugin works correctly at runtime; the assertion is confined to this line.
const analyzer = () => visualizer({ filename: 'stats.html', gzipSize: true }) as PluginOption

export default defineConfig({
  plugins: [
    // Must run before the React plugin so the generated tree is transformed too.
    tanstackRouter({
      routesDirectory: 'src/pages',
      generatedRouteTree: 'src/routeTree.gen.ts',
      quoteStyle: 'single',
      semicolons: false,
      // Each route becomes its own chunk (§8.3), so a clinic loading the
      // patient list does not download the reporting screens.
      autoCodeSplitting: true,
    }),
    react(),
    tailwindcss(),
    // Opt-in: `pnpm build:analyze` only, so normal builds stay fast.
    process.env.ANALYZE ? analyzer() : null,
  ],

  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },

  server: {
    /*
     * §1.2 — production is same-origin behind nginx. The dev proxy reproduces
     * that shape so no CORS or absolute-URL handling ever enters the code.
     *
     * The default is the deployed backend, because that is the only thing
     * that tells the truth about the contract. Every mismatch found so far was
     * invisible until a request reached a real server: the mocks agreed with
     * the client because one reading of the code produced both.
     *
     * Point it elsewhere when a Django is running locally:
     *
     *   API_PROXY_TARGET=http://localhost:8000 pnpm dev
     *
     * ⚠️ The default target serves production data. Use the app to work, not
     * to browse records, and not with a screen recorder running (§13.4).
     */
    proxy: {
      '/api': {
        target: process.env['API_PROXY_TARGET'] ?? 'https://salomatos.uz',
        // Django checks Host against ALLOWED_HOSTS; forwarding localhost:5173
        // as the Host header would be rejected.
        changeOrigin: true,
        secure: true,
      },
    },
  },

  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        /*
         * The entry gets a name of its own so the bundle budget can point at
         * it precisely.
         *
         * Rollup names a chunk after its source file, so `pages/_auth/
         * patients/index.tsx` produced `assets/index-<hash>.js` — which the
         * `index-*` glob in .size-limit.json counted as initial JS. The
         * patients route alone made the budget read 177 kB against a true
         * 161 kB, and the next route would have "failed" a limit nothing had
         * actually exceeded.
         */
        entryFileNames: 'assets/entry-[hash].js',
        /*
         * React only, and matched by path rather than by package name:
         * `react-dom/client` is a different module id from `react-dom`, so the
         * name-based form in §8.3 left React DOM in the entry chunk and
         * produced a 3 kB "vendor-react" that cached nothing.
         *
         * Splitting further was measured and rejected. Four vendor chunks
         * (react / tanstack / i18n / zod) came to 183 kB gzip against 170 kB
         * for this arrangement: each file is compressed with its own
         * dictionary, so cutting the payload into pieces costs real bytes. The
         * budget in §14.1 is about what a clinic downloads on 4G, and 13 kB is
         * worth more than a finer cache granularity.
         *
         * React is the exception because it is both the largest dependency and
         * the one that changes least, so it earns its own file.
         */
        manualChunks: (id) => {
          if (!id.includes('node_modules')) return undefined
          if (/[\\/]react(-dom)?[\\/]/.test(id) || id.includes('scheduler')) return 'vendor-react'
          return undefined
        },
      },
    },
  },

  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    css: false,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      // e2e lives in Playwright; generated code is not ours to cover.
      exclude: ['src/shared/api/generated/**', 'e2e/**'],
    },
  },
})
