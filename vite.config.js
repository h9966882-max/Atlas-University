import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // GitHub Pagesでどのリポジトリ名の下に置いても動くよう相対パスにしています。
  base: './',
});
