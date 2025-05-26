import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import mkcert from 'vite-plugin-mkcert'
import Unocss from 'unocss/vite'
import path from 'path'

const aliasEntries = {
  '@': 'src',
  '§': 'src/pages',
  '#': 'src/components',
  '$': 'src/components/modules',
  '£': 'src/layouts',
  'µ': 'src/modules',
  '&': 'src/hooks',
  '%': 'src/utils'
}

const resolveAlias = Object.fromEntries(
  Object.entries(aliasEntries).map(([alias, target]) => [
    alias,
    path.resolve(__dirname, target),
  ])
)

export default defineConfig(({ mode }) => ({
  server: {
    host: true,
    port: 5173,
    https: mode === "web" ? {} : false,
    proxy: {},
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp'
    },
  },
  plugins: [react(), Unocss(), mkcert()],
  resolve: {
    alias: resolveAlias,
  }
}))
