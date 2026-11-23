#!/usr/bin/env node
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, devices } from 'playwright';

const journeys = { browse, watched, player, pwa };
const selection = process.argv[2] ?? 'all';
assert(selection === 'all' || Object.hasOwn(journeys, selection),
  'Usage: ./verify.mjs [all|browse|watched|player|pwa]');
const root = fileURLToPath(new URL('../../../', import.meta.url));
const evidence = resolve(root, 'verification-evidence', new Date().toISOString().replace(/[:.]/g, '-') + '-' + process.pid);
await mkdir(evidence, { recursive: true });

const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png' };
const server = createServer(async (request, response) => {
  try {
    const path = new URL(request.url, 'http://localhost').pathname;
    const file = path === '/' ? '/index.html' : path;
    if (!/^\/[a-z\d.-]+$/i.test(file) || !types[extname(file)]) throw new Error('Unknown asset');
    const body = await readFile(resolve(root, 'dist', file.slice(1)));
    response.writeHead(200, { 'Content-Type': types[extname(file)], 'Cache-Control': 'no-store',
      'Referrer-Policy': 'no-referrer' });
    response.end(body);
  } catch {
    response.writeHead(404).end();
  }
});
await new Promise((ready, fail) => {
  server.once('error', fail);
  server.listen(0, '127.0.0.1', ready);
});
const url = 'http://127.0.0.1:' + server.address().port + '/';
const report = [];
function record(message) {
  report.push(message);
  console.log(message);
}

let browser;
try {
  const catalogue = await doctor();
  browser = await chromium.launch();
  for (const [id, run] of Object.entries(journeys)) {
    if (selection !== 'all' && id !== selection) continue;
    const context = await browser.newContext(id === 'pwa' ? devices['iPhone 13'] : { viewport: { width: 1150, height: 850 } });
    const page = await context.newPage();
    page.setDefaultTimeout(8000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    try {
      record('START ' + id);
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await page.getByRole('button', { name: 'Mark watched:', exact: false }).first().waitFor();
      await run(page, catalogue, context);
      assert.deepEqual(errors, [], 'Uncaught page errors');
      record('PASS ' + id);
    } catch (error) {
      process.exitCode = 1;
      record('FAIL ' + id + '\n' + error.stack);
      if (!page.isClosed()) await capture(page, id + '-failure').catch(() => {});
    } finally {
      await context.close();
    }
  }
} finally {
  try {
    await browser?.close();
  } finally {
    await new Promise(done => server.close(done));
    await writeFile(resolve(evidence, 'run.txt'), report.join('\n') + '\n');
    console.log('Evidence retained at ' + evidence);
  }
}

async function doctor() {
  const [home, catalogue] = await Promise.all(['', 'catalog.json'].map(async file => {
    const response = await fetch(url + file);
    assert.equal(response.status, 200, file || 'home');
    const body = await response.text();
    assert.equal(body, await readFile(resolve(root, 'dist', file || 'index.html'), 'utf8'));
    return body;
  }));
  assert.match(home, /<title>The Listening Room<\/title>/);
  const videos = JSON.parse(catalogue);
  assert(videos.length > 24, 'Catalogue must contain more than one page');
  assert.equal(new Set(videos.map(video => video.id)).size, videos.length, 'Catalogue contains duplicate video IDs');
  record('Doctor ready: ' + url + ' serves this checkout with ' + videos.length + ' distinct video records');
  return videos;
}

async function capture(page, name) {
  await writeFile(resolve(evidence, name + '.aria.txt'), await page.locator('body').ariaSnapshot());
  await page.screenshot({ path: resolve(evidence, name + '.png'), timeout: 8000 });
}

async function browse(page, catalogue) {
  const cards = page.getByRole('article');
  assert.equal(await cards.count(), 24);
  await page.getByRole('button', { name: 'Show more' }).click();
  assert.equal(await cards.count(), 48);
  record('Show more: 24 → 48 cards');
  const source = 'VideoEle';
  const level = 'Beginner';
  await page.getByRole('button', { name: level, exact: true }).click();
  const beginner = page.getByRole('button', { name: level, exact: true });
  const advanced = page.getByRole('button', { name: 'Advanced', exact: true });
  await advanced.click();
  assert.equal(await beginner.getAttribute('aria-pressed'), 'true');
  assert.equal(await advanced.getAttribute('aria-pressed'), 'true');
  await advanced.click();
  const sources = page.getByRole('group', { name: 'Sources' });
  for (const name of [...new Set(catalogue.map(video => video.source))]) {
    if (name !== source) await sources.getByRole('checkbox', { name, exact: true }).uncheck();
  }
  const eligible = catalogue.filter(video => video.source === source && video.level === level);
  assert(eligible.length, 'Missing VideoEle beginner videos');
  assert.equal(await page.locator('#result-count').textContent(), eligible.length + ' videos');
  assert((await cards.locator('.creator').allTextContents()).every(name => name === source));
  assert((await cards.locator('.level').allTextContents()).every(label => ['A1', 'A2'].includes(label)));
  const sorting = page.getByRole('combobox', { name: 'Sort by' });
  await sorting.selectOption('shortest');
  const shortest = [...eligible].sort((a, b) => (a.seconds || Infinity) - (b.seconds || Infinity))[0];
  assert.equal(await cards.first().getByRole('heading').textContent(), shortest.title);
  await sorting.selectOption('default');
  const title = eligible[0].title;
  const search = page.getByRole('searchbox', { name: 'Search videos' });
  await search.fill(title);
  await page.getByRole('button', { name: title, exact: true }).waitFor();
  record('Beginner + VideoEle + title search: ' + title);
  await capture(page, 'browse-match');
  await search.fill('zxq-verification-no-matches-qxz');
  await page.getByText('No videos match these filters.', { exact: true }).waitFor();
  assert.equal(await cards.count(), 0);
  await capture(page, 'browse-empty');
  await search.clear();
  assert.equal(await page.locator('#result-count').textContent(), eligible.length + ' videos');
}

async function watched(page) {
  const title = await page.getByRole('article').first().getByRole('heading').textContent();
  const mark = page.getByRole('button', { name: 'Mark watched: ' + title, exact: true });
  const unmark = page.getByRole('button', { name: 'Mark unwatched: ' + title, exact: true });
  await mark.click();
  assert.equal(await mark.count(), 0);
  await page.getByRole('checkbox', { name: 'Hide watched' }).uncheck();
  await unmark.waitFor();
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Show watched videos' }).click();
  await page.getByRole('heading', { name: 'Watched videos' }).waitFor();
  await unmark.waitFor();
  assert.equal(await page.getByRole('article').count(), 1);
  record('Marked and reloaded: ' + title + ' is in watched history');
  await capture(page, 'watched-persisted');
  await unmark.click();
  await page.getByText('Videos you finish or mark as watched will appear here.').waitFor();
  await page.reload({ waitUntil: 'domcontentloaded' });
  await mark.waitFor();
  record('Unmarked and reloaded: video returned to the unwatched library');
  await capture(page, 'watched-restored');
}

async function player(page, catalogue) {
  const video = catalogue[0];
  const dialog = page.getByRole('dialog');
  const card = page.getByRole('article').first();
  const name = card.getByRole('button', { name: video.title, exact: true });
  const embedRequest = page.waitForRequest(request =>
    request.url().startsWith('https://www.youtube-nocookie.com/embed/' + video.id));
  await name.click();
  await dialog.getByRole('heading', { name: video.title, exact: true }).waitFor();
  const frame = dialog.getByTitle('YouTube player: ' + video.title, { exact: true });
  assert.equal(await frame.getAttribute('referrerpolicy'), 'strict-origin-when-cross-origin');
  assert.equal(await (await embedRequest).headerValue('referer'), url);
  record('The browser sent the app origin to YouTube despite the page’s no-referrer header.');
  const link = dialog.getByRole('link', { name: 'Watch on YouTube' });
  assert.equal(await link.getAttribute('href'), 'https://www.youtube.com/watch?v=' + video.id);
  await dialog.getByRole('button', { name: 'Close video' }).click();
  await dialog.waitFor({ state: 'hidden' });
  await card.getByRole('button', { name: 'Play ' + video.title, exact: true }).click();
  await dialog.getByRole('heading', { name: video.title, exact: true }).waitFor();
  await capture(page, 'player-dialog');
  await dialog.getByRole('button', { name: 'Mark watched: ' + video.title, exact: true }).click();
  await dialog.getByRole('button', { name: 'Mark unwatched: ' + video.title, exact: true }).waitFor();
  await page.keyboard.press('Escape');
  await dialog.waitFor({ state: 'hidden' });
  assert.equal(await name.count(), 0);
  record('Both player entry points opened the correct video. Manual marking hid the card.');
  record('External playback and automatic completion require the live playback check in features/player.md.');
}

async function pwa(page, catalogue, context) {
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller), null, { timeout: 12000 });
  const manifestLink = await page.locator('link[rel=manifest]').getAttribute('href');
  const response = await context.request.get(new URL(manifestLink, url).href);
  assert.equal(response.status(), 200);
  const manifest = await response.json();
  assert.equal(manifest.display, 'standalone');
  assert.equal(new URL(manifest.start_url, response.url()).href, url);
  for (const size of ['192x192', '512x512']) {
    const icon = manifest.icons.find(entry => entry.sizes === size);
    assert(icon, 'Missing app icon: ' + size);
    const iconResponse = await context.request.get(new URL(icon.src, response.url()).href);
    assert.equal(iconResponse.status(), 200);
    assert.match(iconResponse.headers()['content-type'], /image\/png/);
    const png = await iconResponse.body();
    const pixels = Number(size.split('x')[0]);
    assert.equal(png.readUInt32BE(16), pixels);
    assert.equal(png.readUInt32BE(20), pixels);
  }
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), 'Mobile layout overflows the viewport');
  const dock = page.getByRole('navigation', { name: 'Library navigation' });
  const browse = dock.getByRole('button', { name: 'Browse', exact: true });
  const search = dock.getByRole('button', { name: 'Search', exact: true });
  const history = dock.getByRole('button', { name: 'Watched', exact: true });
  assert.equal(await browse.getAttribute('aria-pressed'), 'true');
  const cards = page.getByRole('article');
  const first = await cards.nth(0).boundingBox();
  const second = await cards.nth(1).boundingBox();
  assert(first && second && first.x < second.x && first.y === second.y, 'Expected two cards across on iPhone');
  await page.waitForFunction(() => [...document.querySelectorAll('.card img')].slice(0, 4)
    .every(img => img.complete), null, { timeout: 4000 }).catch(() => {});
  await capture(page, 'pwa-iphone-browse');
  const filters = page.getByRole('button', { name: 'Filters', exact: true });
  const sheet = page.getByRole('dialog', { name: 'Filters', exact: true });
  await filters.click();
  assert.equal(await sheet.getByRole('button', { name: 'Advanced', exact: true }).isVisible(), true);
  await sheet.getByRole('button', { name: 'Beginner', exact: true }).click();
  const sources = sheet.getByRole('group', { name: 'Sources' });
  for (const name of [...new Set(catalogue.map(video => video.source))]) {
    if (name !== 'VideoEle') await sources.getByRole('checkbox', { name, exact: true }).uncheck();
  }
  await sheet.getByRole('combobox', { name: 'Sort by' }).selectOption('shortest');
  await capture(page, 'pwa-iphone-filters');
  await sheet.getByRole('button', { name: 'Done', exact: true }).click();
  await sheet.waitFor({ state: 'hidden' });
  assert.equal(await page.locator('#filter-summary').textContent(), 'Beginner · VideoEle · Shortest first');
  assert((await cards.locator('.creator').allTextContents()).every(name => name === 'VideoEle'));
  await filters.click();
  await sheet.getByRole('button', { name: 'Reset', exact: true }).click();
  assert.equal(await sheet.getByRole('checkbox', { name: 'Hide watched' }).isChecked(), true);
  assert.equal(await sheet.getByRole('combobox', { name: 'Sort by' }).inputValue(), 'default');
  assert.equal(await sources.getByRole('checkbox', { checked: false }).count(), 0);
  await sheet.getByRole('button', { name: 'Done', exact: true }).click();
  assert.equal(await page.locator('#filter-summary').textContent(), '');
  record('iPhone viewport: the filter sheet applies level and source and resets to defaults.');
  await search.click();
  const input = page.getByRole('searchbox', { name: 'Search videos' });
  assert(await input.evaluate(node => node === document.activeElement));
  await input.fill('zxq-verification-no-matches-qxz');
  await page.getByText('No videos match these filters.', { exact: true }).waitFor();
  await browse.click();
  assert.equal(await search.getAttribute('aria-pressed'), 'false');
  assert.equal(await input.count(), 0);
  assert.equal(await page.locator('#search').inputValue(), '');
  await cards.first().waitFor();
  record('iPhone viewport: two cards across; the dock opens Search and returns to Browse.');
  await context.setOffline(true);
  await page.reload({ waitUntil: 'domcontentloaded' });
  const card = page.getByRole('article').first();
  await card.waitFor();
  await card.getByRole('button', { name: 'Mark watched:', exact: false }).click();
  await history.click();
  assert.equal(await history.getAttribute('aria-pressed'), 'true');
  await page.getByRole('heading', { name: 'Watched videos' }).waitFor();
  await page.getByRole('button', { name: 'Mark unwatched:', exact: false }).waitFor();
  record('Phone viewport: app registered its service worker, then reloaded and saved watched progress offline.');
  await capture(page, 'pwa-offline');
  record('Home Screen installation itself requires the physical phone check in features/pwa.md.');
}
