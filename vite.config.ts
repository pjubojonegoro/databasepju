import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  base: '/database/',
  plugins: [react()],
  envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'mapbox-vendor': ['mapbox-gl'],
          'supabase-vendor': ['@supabase/supabase-js'],
          'react-vendor': ['react', 'react-dom', 'zustand'],
        }
      }
    },
    chunkSizeWarningLimit: 1600,
  }
})
