import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  // Determine base path based on environment
  const base = process.env.VITE_BASE_PATH || (mode === 'github-pages' ? '/karl-fish/' : '/');
  
  return {
    plugins: [react()],
    base,
  clearScreen: false,
  server: {
    port: 4000,
    strictPort: true,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['lucide-react'],
          'data-vendor': ['dexie', '@supabase/supabase-js'],
          'utils-vendor': ['date-fns', 'leaflet'],
          // App chunks
          'auth': [
            './src/contexts/AuthContext.tsx',
            './src/services/authService.ts',
            './src/components/Login.tsx',
            './src/components/Register.tsx'
          ],
          'friends': [
            './src/services/friendService.ts',
            './src/components/Friends.tsx'
          ],
          'sharing': [
            './src/services/sharingService.ts',
            './src/components/Share.tsx'
          ],
          'fishing': [
            './src/database/index.ts',
            './src/services/exportService.ts',
            './src/components/Dashboard.tsx',
            './src/components/SessionForm.tsx',
            './src/components/SessionList.tsx',
            './src/components/CatchesList.tsx'
          ],
          'settings': [
            './src/components/Settings.tsx',
            './src/services/nmea2000Service.ts',
            './src/services/testDataService.ts'
          ]
        }
      }
    },
    chunkSizeWarningLimit: 1000, // Increase limit to 1MB
    target: 'esnext',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.log in production
        drop_debugger: true
      }
    }
  }
  };
})
