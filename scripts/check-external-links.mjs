import { allContent } from '../src/data/content.ts';

const urls = new Set([
  ...allContent.en.socialLinks.map(({ href }) => href),
  ...allContent.en.projects.flatMap(({ links }) => links.map(({ href }) => href)),
  ...allContent.en.research.links.map(({ href }) => href),
].filter((url) => url.startsWith('http')));

const failures = [];
for (const url of urls) {
  try {
    let response = await fetch(url, { method: 'HEAD', redirect: 'follow', signal: AbortSignal.timeout(10_000) });
    if (response.status >= 400) response = await fetch(url, { redirect: 'follow', headers: { 'User-Agent': 'Mozilla/5.0 portfolio-link-check' }, signal: AbortSignal.timeout(10_000) });
    if (response.status >= 400) failures.push(`${response.status} ${url}`);
  } catch (error) { failures.push(`${url}: ${error instanceof Error ? error.message : error}`); }
}
if (failures.length) throw new Error(`External link check failed:\n${failures.join('\n')}`);
console.log(`Validated ${urls.size} external links.`);
