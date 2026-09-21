import { defineConfig, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { readFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'

const MAPLIBRE_DIST = `${fileURLToPath(new URL('./node_modules/maplibre-gl/', import.meta.url))}dist/`

/**
 * MapLibre GL v6 loads its web worker at runtime via a URL computed from
 * `import.meta.url` (`maplibre-gl-worker.mjs`), which imports
 * `maplibre-gl-shared.mjs`. Bundlers never see that dynamic request, so the
 * files are absent from the build and every GeoJSON source silently fails.
 * Emit them next to the bundle so the worker resolves at `/assets/...`.
 */
function maplibreWorkerAssets(): Plugin {
  return {
    name: 'maplibre-worker-assets',
    apply: 'build',
    generateBundle() {
      for (const file of ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs']) {
        this.emitFile({
          type: 'asset',
          fileName: `assets/${file}`,
          source: readFileSync(`${MAPLIBRE_DIST}${file}`, 'utf8'),
        })
      }
    },
  }
}

export default defineConfig({
  plugins: [vue(), tailwindcss(), maplibreWorkerAssets()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  optimizeDeps: {
    exclude: ['maplibre-gl'],
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
      '/openaip': {
        target: 'https://storage.openaip.net/openaip-system-exports',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/openaip/, ''),
      },
    },
  },
})
