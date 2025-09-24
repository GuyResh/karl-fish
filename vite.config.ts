import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/karl-fish/', // Replace 'karl-fish' with your repository name
  clearScreen: false,
  server: {
    port: 4000,
    strictPort: true,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
})
