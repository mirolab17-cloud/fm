import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';
import {defineConfig, type Plugin} from 'vite';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const SKIP = new Set(['node_modules', 'dist', 'build', '.git', 'coverage']);
const EXTS = ['.tsx', '.ts', '.jsx', '.js', '.json', '.css'];

// Fallback resolver: if a relative import points to a file that was moved/renamed
// folder, find it anywhere in the project by file name (works on Windows/Linux/GitHub).
function smartResolve(): Plugin {
  let index: Map<string, string[]> | null = null;
  const build = () => {
    const map = new Map<string, string[]>();
    const walk = (dir: string) => {
      for (const e of fs.readdirSync(dir, {withFileTypes: true})) {
        if (SKIP.has(e.name) || e.name.startsWith('.')) continue;
        const p = path.join(dir, e.name);
        if (e.isDirectory()) { walk(p); continue; }
        const ext = path.extname(e.name);
        if (!EXTS.includes(ext)) continue;
        const key = e.name.slice(0, -ext.length).toLowerCase();
        const list = map.get(key) || [];
        list.push(p);
        map.set(key, list);
        const k2 = e.name.toLowerCase();
        map.set(k2, [...(map.get(k2) || []), p]);
      }
    };
    walk(ROOT);
    return map;
  };
  return {
    name: 'smart-resolve',
    enforce: 'pre',
    async resolveId(source, importer, opts) {
      if (!importer || !(source.startsWith('./') || source.startsWith('../'))) return null;
      if (importer.includes('node_modules')) return null;
      const r = await this.resolve(source, importer, {...opts, skipSelf: true});
      if (r) return r;
      index ||= build();
      const parts = source.split('/').filter((s) => s && s !== '.' && s !== '..');
      const base = (parts.pop() || '').toLowerCase();
      let cands = index.get(base) || [];
      if (!cands.length) return null;
      if (cands.length > 1) {
        // prefer the candidate sharing the most trailing folders with the import path
        const score = (c: string) => {
          const segs = path.dirname(c).split(path.sep).map((s) => s.toLowerCase());
          let n = 0;
          for (let i = parts.length - 1, j = segs.length - 1; i >= 0 && j >= 0 && parts[i].toLowerCase() === segs[j]; i--, j--) n++;
          return n;
        };
        cands = [...cands].sort((a, b) => score(b) - score(a));
      }
      return cands[0];
    },
  };
}

export default defineConfig(() => ({
  base: './', // relative asset paths: works on GitHub Pages, Windows, any sub-folder
  plugins: [smartResolve(), react(), tailwindcss()],
  resolve: {
    alias: {'@': ROOT},
  },
  server: {
    hmr: process.env.DISABLE_HMR !== 'true',
    watch: process.env.DISABLE_HMR === 'true' ? null : {},
  },
}));
