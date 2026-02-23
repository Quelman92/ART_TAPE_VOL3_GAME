import { defineConfig } from 'vite';

// GitHub Pages serves at https://<user>.github.io/<repo-name>/
// Netlify serves at the root, so base should be '/'
// Base MUST match your repo name (with leading and trailing slash) for GitHub Pages, or '/' for Netlify
const repoName = 'ART_TAPE_VOL3_GAME'; // change if your GitHub repo has a different name

// Use NETLIFY env var to detect Netlify builds, or check for netlify.toml
// For Netlify: base = '/'
// For GitHub Pages: base = '/REPO_NAME/'
const isNetlify = process.env.NETLIFY === 'true' || process.env.CONTEXT === 'production';
const base = isNetlify ? '/' : (process.env.NODE_ENV === 'production' ? `/${repoName}/` : '/');

export default defineConfig({
  root: '.',
  base,
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
});
