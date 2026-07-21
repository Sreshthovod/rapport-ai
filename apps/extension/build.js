import esbuild from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';

const isDev = process.argv.includes('--watch');
const distDir = path.resolve('dist');

// Delete dist directory completely before build to prevent stale/unbundled outputs
if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true, force: true });
}

const buildConfigs = [
  {
    entryPoints: ['src/background/index.ts'],
    outfile: 'dist/background/index.js',
    bundle: true,
    format: 'iife',
    target: 'es2022',
    sourcemap: true,
  },
  {
    entryPoints: ['src/content/index.ts'],
    outfile: 'dist/content/index.js',
    bundle: true,
    format: 'iife',
    target: 'es2022',
    sourcemap: true,
    define: { 'process.env.NODE_ENV': '"production"' },
  },
  {
    entryPoints: ['src/popup/index.tsx'],
    outfile: 'dist/popup/index.js',
    bundle: true,
    format: 'iife',
    target: 'es2022',
    sourcemap: true,
    define: { 'process.env.NODE_ENV': '"production"' },
  },
  {
    entryPoints: ['src/sidepanel/index.tsx'],
    outfile: 'dist/sidepanel/index.js',
    bundle: true,
    format: 'iife',
    target: 'es2022',
    sourcemap: true,
    define: { 'process.env.NODE_ENV': '"production"' },
  },
];

async function runBuild() {
  if (isDev) {
    const contexts = await Promise.all(buildConfigs.map((config) => esbuild.context(config)));
    await Promise.all(contexts.map((ctx) => ctx.watch()));
    console.log('[Extension Bundler] Watching for file changes...');
  } else {
    await Promise.all(buildConfigs.map((config) => esbuild.build(config)));
    console.log('[Extension Bundler] Bundled Chrome extension assets successfully.');
  }
}

runBuild().catch((err) => {
  console.error('[Extension Bundler:ERROR]', err);
  process.exit(1);
});
