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
    // §1.2 — production is same-origin behind nginx. The dev proxy reproduces
    // that shape so no CORS or absolute-URL handling ever enters the code.
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: false,
      },
    },
  },

  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-query': ['@tanstack/react-query'],
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
