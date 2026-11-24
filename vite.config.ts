import fs from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    {
      name: 'copy-unbundled-src-assets',
      apply: 'build',
      closeBundle(error?: Error): void {
        if (error) return;

        const distDir = path.resolve(__dirname, 'dist');
        const srcAssets = path.resolve(__dirname, 'src/assets');
        const distAssets = path.resolve(distDir, 'src/assets');

        if (fs.existsSync(distDir) && fs.existsSync(srcAssets)) {
          fs.cpSync(srcAssets, distAssets, { recursive: true, force: true });
        }
      },
    },
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  server: {
    hmr: true,
  },
});
