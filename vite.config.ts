/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
//
// `base: './'` (relative) is used instead of an absolute path so the exact
// same production build works whether GitHub Pages serves it from the
// repository root (a user/organization page) or from a project subpath
// (https://<user>.github.io/<repo>/). No repo name needs to be hard-coded
// here, and no server-side rewrite rules are required.
export default defineConfig({
  base: './',
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
})
