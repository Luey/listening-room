export const levels = ['All levels', 'Superbeginner', 'Beginner', 'Intermediate', 'Advanced'];

const searchKey = value => value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
const length = video => Number.isFinite(video.seconds) && video.seconds > 0 ? video.seconds : null;

export function matchingVideos(videos, { levels: selectedLevels, sources, watched, watchedOnly, hideWatched, query, sort }) {
  const term = searchKey(query.trim());
  const results = videos.filter(video =>
    (!selectedLevels.size || selectedLevels.has(video.level))
    && sources.has(video.source)
    && (watchedOnly ? watched.has(video.id) : !hideWatched || !watched.has(video.id))
    && (!term || searchKey(video.title + ' ' + (video.cefr ?? '')).includes(term)));

  if (sort === 'title') results.sort((a, b) => a.title.localeCompare(b.title));
  if (sort === 'shortest') results.sort((a, b) => (length(a) ?? Infinity) - (length(b) ?? Infinity));
  if (sort === 'longest') results.sort((a, b) => (length(b) ?? -1) - (length(a) ?? -1));
  if (sort === 'easiest') results.sort((a, b) => levels.indexOf(a.level) - levels.indexOf(b.level));
  if (sort === 'hardest') results.sort((a, b) => levels.indexOf(b.level) - levels.indexOf(a.level));
  return results;
}
