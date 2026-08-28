import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..', 'dist');
const htmlFiles = [];
const walk = (directory) => {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) walk(path);
    else if (extname(path) === '.html') htmlFiles.push(path);
  }
};
walk(root);

const broken = [];
for (const file of htmlFiles) {
  const html = readFileSync(file, 'utf8');
  for (const [, href] of html.matchAll(/href="([^"#]+)(?:#[^"]*)?"/g)) {
    if (/^(https?:|mailto:)/.test(href)) continue;
    const pathname = href.startsWith('/') ? href : new URL(href, `file://${file}`).pathname;
    const target = pathname.endsWith('/') ? join(root, pathname, 'index.html') : join(root, pathname);
    if (!existsSync(target)) broken.push(`${file.replace(root, '')}: ${href}`);
  }
}
if (broken.length) throw new Error(`Broken internal links:\n${broken.join('\n')}`);
console.log(`Validated ${htmlFiles.length} HTML pages and their internal links.`);
