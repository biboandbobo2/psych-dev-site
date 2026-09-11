// Prepare the isolated, static hosting artifact. No deployment or account changes.
const { copyFileSync, cpSync, existsSync, mkdirSync } = require('node:fs');
const { resolve } = require('node:path');
const root = resolve(__dirname, '../..');
const output = resolve(root, 'dist-iconography');
if (!existsSync(resolve(output, 'iconography.html'))) throw new Error('Build the iconography Vite entry first');
copyFileSync(resolve(output, 'iconography.html'), resolve(output, 'index.html'));
mkdirSync(resolve(output, 'iconography'), { recursive: true });
cpSync(resolve(root, 'public/iconography'), resolve(output, 'iconography'), { recursive: true });
copyFileSync(resolve(root, 'scripts/iconography/static-hosting.vercel.json'), resolve(output, 'vercel.json'));
