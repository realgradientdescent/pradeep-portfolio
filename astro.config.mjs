import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import node from '@astrojs/node';

export default defineConfig({
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
  },
  // Hybrid: pages are static by default, API routes are server-rendered
  output: 'static',
  adapter: node({ mode: 'standalone' }),
  site: 'https://realgradientdescent.tech',
  server: {
    host: '0.0.0.0',
    port: 4321,
  },
});
