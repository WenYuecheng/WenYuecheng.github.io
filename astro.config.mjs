import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://wenyuecheng.cn',
  output: 'static',
  integrations: [sitemap()],
  build: { assets: '_assets' },
  vite: { build: { target: 'es2022' } },
});
