import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// `npm run build`      -> dist/ (site déployable : GitHub Pages, Cloudflare Pages…)
// `npm run build:demo` -> dist-demo/index.html, un seul fichier autonome
export default defineConfig(({ mode }) => ({
  base: './',
  plugins: mode === 'demo' ? [preact(), viteSingleFile()] : [preact()],
  build: { outDir: mode === 'demo' ? 'dist-demo' : 'dist' }
}));
