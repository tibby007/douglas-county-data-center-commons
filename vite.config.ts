import { defineConfig } from 'vite'

export default defineConfig(({ mode }) => ({
  base: './',
  build: mode === 'portable' ? { outDir: 'dist/portable', assetsInlineLimit: Infinity } : undefined,
}))
