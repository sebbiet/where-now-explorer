import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  // Using root domain now (thereyetapp.com)
  base: '/',
  server: {
    host: "::",
    port: 8080,
    https: false, // Set to true if you need HTTPS for geolocation
  },
  plugins: [
    react()
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Enable source maps for better debugging
    sourcemap: mode === 'development',
    // Optimize chunks for better caching
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate vendor chunks for better caching
          'react-vendor': ['react', 'react-dom'],
          'ui-vendor': ['@radix-ui/react-toast', '@radix-ui/react-tooltip'],
          'query-vendor': ['@tanstack/react-query'],
          'router-vendor': ['react-router-dom'],
        },
      },
    },
    // Optimize for production
    target: 'esnext',
    minify: 'esbuild',
    // Warn on large chunks
    chunkSizeWarningLimit: 1000,
  },
  // Performance optimizations
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@tanstack/react-query'
    ],
  },
}));
