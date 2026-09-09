import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  resolve: {
    alias: Object.fromEntries(Object.entries({
      '@': 'src', '§': 'src/pages', '#': 'src/components', '$': 'src/components/modules',
      '£': 'src/layouts', 'µ': 'src/modules', '&': 'src/hooks', '%': 'src/utils',
    }).map(([key, value]) => [key, path.resolve('apps/frontend', value)])),
  },
  test: { include: ['apps/*/tests/**/*.test.ts'], environment: 'node', restoreMocks: true },
})
