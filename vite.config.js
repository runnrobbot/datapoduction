import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  assetsInclude: ['**/*.svg', '**/*.csv'],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost',
        changeOrigin: true,
        rewrite: (path) => {
          // Always add trailing slash so Apache never issues a mod_dir redirect
          // index.php strips it with rtrim(), so this is safe for all endpoints
          let p = path.replace(/^\/api/, '/inventory_api');
          if (!p.endsWith('/')) p += '/';
          return p;
        },
      },
    },
  },
})
