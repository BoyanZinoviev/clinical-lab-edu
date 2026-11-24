import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Относителен base: изграденият сайт работи от всяка папка / статичен хостинг.
// Навигацията е с hash-маршрути (#/...), затова не е нужна конфигурация на сървъра.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  build: {
    target: 'es2020',
    sourcemap: false,
  },
});
