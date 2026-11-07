import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // `server-only` throws when imported outside an RSC graph. Alias it to a
      // no-op in tests so server modules (e.g. auth claim sync) are importable.
      'server-only': path.resolve(__dirname, './src/test/server-only-stub.ts'),
    },
  },
})
