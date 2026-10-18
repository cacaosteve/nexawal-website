import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../public');
async function files(dir) {
  return (await Promise.all((await readdir(dir, { withFileTypes: true })).map(e => e.isDirectory() ? files(join(dir, e.name)) : join(dir, e.name)))).flat();
}
const pages = (await files(root)).filter(p => p.endsWith('.html'));
test('all local links and SVG fragment references exist', async () => {
  for (const path of pages) {
    const html = await readFile(path, 'utf8');
    for (const [, raw] of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
      const url = new URL(raw, `https://nexawal.com/${path.slice(root.length + 1)}`);
      if (url.origin !== 'https://nexawal.com') continue;
      let target = join(root, decodeURIComponent(url.pathname));
      if ((await stat(target)).isDirectory()) target = join(target, 'index.html');
      assert.ok((await stat(target)).isFile(), `${path}: missing ${raw}`);
      if (url.hash) assert.ok((await readFile(target, 'utf8')).includes(`id="${url.hash.slice(1)}"`), `${path}: missing anchor ${raw}`);
    }
  }
});
test('no scripts, forms, third-party assets, or inline execution', async () => {
  for (const path of pages) {
    const html = await readFile(path, 'utf8');
    assert.doesNotMatch(html, /<script\b|<form\b|\son\w+\s*=|javascript:|\sstyle\s*=/i);
    for (const [, src] of html.matchAll(/\ssrc="([^"]+)"/g)) assert.ok(src.startsWith('/assets/'));
    assert.match(html, /<html lang="en">/);
    assert.match(html, /name="viewport"/);
    assert.equal([...html.matchAll(/<h1\b/g)].length, 1);
    const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]);
    assert.equal(new Set(ids).size, ids.length, `${path}: duplicate IDs`);
  }
  assert.doesNotMatch(await readFile(join(root, 'assets/site.css'), 'utf8'), /@import|url\(/i);
});
test('release status and illustrative data remain explicit', async () => {
  const home = await readFile(join(root, 'index.html'), 'utf8');
  for (const text of ['Illustrative interface', 'not undergone an independent security audit', 'clearnet HTTPS', 'does not yet link a store listing']) assert.ok(home.includes(text));
  assert.doesNotMatch(home, /rpc\.nexatrode\.com|rates\.nexatrode\.com/);
});
test('requested homepage copy removals stay removed', async () => {
  const home = await readFile(join(root, 'index.html'), 'utf8');
  for (const text of ['not a stable-release promise', 'Is it ready for large amounts?', 'Does it support other coins or swaps?', 'Do I need my own node?', 'How do optional fiat estimates work?', 'Where can I get help or report a bug?', 'KEEP IT YOURS.', 'Your next move.', '<footer']) assert.ok(!home.includes(text), text);
  assert.ok(home.includes('Is NexaWal custodial?'));
});

const origin = process.env.SITE_ORIGIN;
test('live server routes, headers, and cache policy', { skip: !origin }, async () => {
  for (const path of ['/', '/privacy/', '/terms/', '/robots.txt', '/sitemap.xml', '/assets/site.css?v=1', '/assets/nexawal.png']) {
    const response = await fetch(new URL(path, origin), { signal: AbortSignal.timeout(15000) });
    assert.equal(response.status, 200, path);
    assert.equal(response.headers.get('referrer-policy'), 'no-referrer');
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
    assert.match(response.headers.get('content-security-policy'), /script-src 'none'/);
    assert.match(response.headers.get('content-security-policy'), /connect-src 'none'/);
    // Railway adds its own edge header after our server strips Caddy's.
    assert.ok([null, 'railway-hikari'].includes(response.headers.get('server')));
    assert.equal(response.headers.get('cache-control'), path.startsWith('/assets/') ? 'public, max-age=86400' : 'no-cache');
    await response.arrayBuffer();
  }
  const health = await fetch(new URL('/healthz', origin));
  assert.equal(health.status, 200);
  assert.equal(await health.text(), 'ok');
  const missing = await fetch(new URL('/not-a-real-page', origin));
  assert.equal(missing.status, 404);
  assert.match(await missing.text(), /Wrong turn|WRONG TURN/);
  const redirect = await fetch(new URL('/privacy', origin), { redirect: 'manual' });
  assert.equal(redirect.status, 308);
  assert.match(redirect.headers.get('location'), /\/privacy\/$/);
});
