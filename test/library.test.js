import assert from 'node:assert/strict';
import test from 'node:test';
import { matchingVideos } from '../dist/library.js';

const videos = [
  { id: 'a', title: 'Árboles', level: 'Beginner', source: 'A', seconds: 60, cefr: 'A1' },
  { id: 'b', title: 'Una historia', level: 'Superbeginner', source: 'B', seconds: 25 },
  { id: 'c', title: 'Viaje', level: 'Intermediate', source: 'A', seconds: 210 },
  { id: 'd', title: 'Cocina', level: 'Advanced', source: 'C', seconds: null },
  { id: 'e', title: 'Paseo', level: 'Beginner', source: 'B', seconds: 0 },
];
const defaults = {
  levels: new Set(), sources: new Set(['A', 'B', 'C']), watched: new Set(),
  watchedOnly: false, hideWatched: true, query: '', sort: 'default',
};
const ids = options => matchingVideos(videos, { ...defaults, ...options }).map(video => video.id);

test('selects multiple levels and sources, and returns no videos with no sources selected', () => {
  assert.deepEqual(ids({ levels: new Set(['Beginner', 'Superbeginner']), sources: new Set(['A', 'B']) }), ['a', 'b', 'e']);
  assert.deepEqual(ids({ levels: new Set(['Beginner']), sources: new Set(['B']) }), ['e']);
  assert.deepEqual(ids({ sources: new Set() }), []);
});

test('matches accented titles and course labels', () => {
  assert.deepEqual(ids({ query: ' ARBOLES ' }), ['a']);
  assert.deepEqual(ids({ query: 'a1' }), ['a']);
});

test('respects hide watched and the history view', () => {
  const watched = new Set(['a', 'c']);
  assert.deepEqual(ids({ watched }), ['b', 'd', 'e']);
  assert.deepEqual(ids({ watched, hideWatched: false }), ['a', 'b', 'c', 'd', 'e']);
  assert.deepEqual(ids({ watched, watchedOnly: true }), ['a', 'c']);
});

test('sorts without mutating the catalogue and puts unknown lengths last', () => {
  assert.deepEqual(ids({ sort: 'shortest' }), ['b', 'a', 'c', 'd', 'e']);
  assert.deepEqual(ids({ sort: 'longest' }), ['c', 'a', 'b', 'd', 'e']);
  assert.deepEqual(ids({ sort: 'easiest' }), ['b', 'a', 'e', 'c', 'd']);
  assert.deepEqual(ids({ sort: 'hardest' }), ['d', 'c', 'a', 'e', 'b']);
  assert.deepEqual(ids({ sort: 'title' }), ['a', 'd', 'e', 'b', 'c']);
  assert.deepEqual(ids(), ['a', 'b', 'c', 'd', 'e']);
});
