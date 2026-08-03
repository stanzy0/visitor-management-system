import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  // @ts-expect-error - vitest bundles its own Vite instance, causing type mismatch
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['__tests__/**/*.test.{ts,tsx}'],
    exclude: ['node_modules', '.next', 'dist', '.kilo'],
    env: {
      NEXT_PUBLIC_APP_URL: 'https://visitor-management-system-alpha-neon.vercel.app',
      NEXT_PUBLIC_SUPABASE_URL: 'https://phkmhrncmkvfgnraiyug.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
      RESEND_API_KEY: 'test-resend-key',
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, '.'),
    },
  },
})
