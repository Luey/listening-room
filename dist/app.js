import { levels, matchingVideos } from './library.js';

const $ = id => document.getElementById(id);
const difficulties = levels.slice(1);
const storageKey = 'listening-room.watched';
const pageSize = 24;
let videos = [];
let watched = new Set();
let selectedLevels = new Set();
let selectedSources = new Set();
let view = 'browse';
const dockButtons = document.querySelectorAll('[data-view-target]');
const mobileLayout = matchMedia('(max-width: 700px)');
let limit = pageSize;
let activeVideo;
let player;
let playerRequest;
let installPrompt;
try {
  const saved = JSON.parse(localStorage.getItem(storageKey) ?? '[]');
  if (Array.isArray(saved)) watched = new Set(saved);
} catch {}

function levelFilters() {
  const container = $('levels');
  if (container.children.length) {
    for (const button of container.children) {
      const name = button.textContent;
      button.setAttribute('aria-pressed', String(name === levels[0] ? selectedLevels.size === 0 : selectedLevels.has(name)));
    }
    return;
  }
  container.replaceChildren(...levels.map(name => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = name;
    button.setAttribute('aria-pressed', String(name === levels[0] ? selectedLevels.size === 0 : selectedLevels.has(name)));
    button.onclick = () => {
      if (name === levels[0]) selectedLevels.clear();
      else if (selectedLevels.has(name)) selectedLevels.delete(name);
      else selectedLevels.add(name);
      limit = pageSize;
      levelFilters();
      render();
    };
    return button;
  }));
}

function sourceFilters() {
  $('sources').replaceChildren(...[...new Set(videos.map(video => video.source))].sort().map(source => {
    const label = document.createElement('label');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = source;
    checkbox.checked = selectedSources.has(source);
    checkbox.onchange = () => {
      if (checkbox.checked) selectedSources.add(source);
      else selectedSources.delete(source);
      limit = pageSize;
      render();
    };
    label.append(checkbox, document.createTextNode(source));
    return label;
  }));
}

const watchUrl = id => 'https://www.youtube.com/watch?v=' + id;

function duration(seconds) {
  const total = Math.round(seconds);
  const rest = String(total % 60).padStart(2, '0');
  if (total < 3600) return Math.floor(total / 60) + ':' + rest;
  return Math.floor(total / 3600) + ':' + String(Math.floor(total / 60) % 60).padStart(2, '0') + ':' + rest;
}

function render() {
  const watchedOnly = view === 'watched';
  const hide = $('hide-watched').checked;
  const sort = $('sort').value;
  const filtered = matchingVideos(videos, {
    levels: selectedLevels, sources: selectedSources, watched, watchedOnly,
    hideWatched: hide, query: $('search').value, sort,
  });
  $('watched-count').textContent = watched.size;
  $('progress').setAttribute('aria-pressed', String(watchedOnly));
  $('progress').setAttribute('aria-label', watchedOnly ? 'Show video library' : 'Show watched videos');
  document.body.dataset.view = view;
  for (const button of dockButtons) {
    button.setAttribute('aria-pressed', String(button.dataset.viewTarget === view));
  }
  $('library-heading').textContent = { browse: 'Browse videos', search: 'Search videos', watched: 'Watched videos' }[view];
  $('hide-watched').disabled = watchedOnly;
  const activeFilters = [
    selectedLevels.size > 0 && selectedLevels.size < difficulties.length && difficulties.filter(name => selectedLevels.has(name)).join(', '),
    selectedSources.size !== $('sources').children.length && (selectedSources.size === 1 ? [...selectedSources][0] : selectedSources.size ? `${selectedSources.size} sources` : 'No sources'),
    sort !== 'default' && $('sort').selectedOptions[0].textContent,
    !watchedOnly && !hide && 'Includes watched'
  ].filter(Boolean);
  $('filter-summary').textContent = activeFilters.join(' · ');
  $('open-filters').classList.toggle('has-filters', activeFilters.length > 0);
  $('result-count').textContent = filtered.length.toLocaleString() + (filtered.length === 1 ? ' video' : ' videos');
  $('more').hidden = filtered.length <= limit;
  $('grid').replaceChildren(...filtered.slice(0, limit).map(makeCard));
  if (!filtered.length) {
    const message = document.createElement('p');
    message.className = 'empty';
    message.textContent = watchedOnly && !watched.size ? 'Videos you finish or mark as watched will appear here.' : 'No videos match these filters.';
    $('grid').append(message);
  }
}

function makeCard(video) {
  const card = $('card').content.firstElementChild.cloneNode(true);
  const thumb = card.querySelector('.thumb');
  const img = thumb.querySelector('img');
  img.src = 'https://i.ytimg.com/vi/' + video.id + '/hqdefault.jpg';
  img.onerror = () => { img.hidden = true; };
  thumb.setAttribute('aria-label', 'Play ' + video.title);
  thumb.onclick = () => openVideo(video);
  const time = card.querySelector('.duration');
  time.textContent = video.seconds > 0 ? duration(video.seconds) : '';
  time.hidden = !time.textContent;
  const name = card.querySelector('.video-name');
  name.textContent = video.title;
  name.onclick = () => openVideo(video);
  const badge = card.querySelector('.level');
  // The signal bars show the broad level used by the library filters.
  badge.dataset.rank = levels.indexOf(video.level);
  badge.textContent = video.cefr ?? video.level;
  card.querySelector('.creator').textContent = video.source;
  const mark = card.querySelector('.mark');
  updateMark(mark, video);
  mark.onclick = () => {
    setWatched(video.id, !watched.has(video.id));
    const buttons = [...$('grid').querySelectorAll('.mark')];
    (buttons.find(button => button.dataset.video === video.id) ?? buttons[0] ?? historyControl()).focus();
  };
  return card;
}

function updateMark(button, video) {
  const done = watched.has(video.id);
  const label = button.querySelector('.control-label') ?? button;
  label.textContent = done ? '✓ Watched' : 'Mark watched';
  button.title = done ? 'Mark unwatched' : 'Mark watched';
  button.setAttribute('aria-pressed', String(done));
  button.setAttribute('aria-label', (done ? 'Mark unwatched: ' : 'Mark watched: ') + video.title);
  button.dataset.video = video.id;
}

function setWatched(id, done) {
  if (done) watched.add(id);
  else watched.delete(id);
  try { localStorage.setItem(storageKey, JSON.stringify([...watched])); }
  catch { $('result-count').title = 'History could not be saved on this device.'; }
  render();
  if (activeVideo) updateMark($('mark-video'), activeVideo);
}

function loadPlayer() {
  if (!playerRequest) {
    playerRequest = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      const timeout = setTimeout(fail, 7000);
      function fail() {
        clearTimeout(timeout);
        script.remove();
        reject(new Error('YouTube could not load'));
      }
      window.onYouTubeIframeAPIReady = () => {
        clearTimeout(timeout);
        resolve(window.YT);
      };
      script.onerror = fail;
      script.src = 'https://www.youtube.com/iframe_api';
      document.head.append(script);
    }).catch(error => {
      playerRequest = undefined;
      throw error;
    });
  }
  return playerRequest;
}

async function openVideo(video) {
  activeVideo = video;
  const dialog = $('video-dialog');
  const slot = $('player-slot');
  $('video-title').textContent = video.title;
  $('external-video').href = watchUrl(video.id);
  updateMark($('mark-video'), video);
  const frame = document.createElement('iframe');
  const embed = new URL('https://www.youtube-nocookie.com/embed/' + video.id);
  embed.search = new URLSearchParams({ enablejsapi: '1', playsinline: '1', origin: location.origin });
  frame.title = 'YouTube player: ' + video.title;
  frame.referrerPolicy = 'strict-origin-when-cross-origin';
  frame.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
  frame.allowFullscreen = true;
  frame.src = embed.href;
  slot.replaceChildren(frame);
  dialog.showModal();
  try {
    const yt = await loadPlayer();
    if (!frame.isConnected || !dialog.open) return;
    player = new yt.Player(frame, {
      events: {
        onStateChange(event) {
          if (event.data === yt.PlayerState.ENDED && event.target === player && dialog.open) {
            setWatched(video.id, true);
          }
        }
      }
    });
  } catch {
    // The embedded player can still play independently of completion tracking.
  }
}

$('close-video').onclick = () => $('video-dialog').close();
$('video-dialog').addEventListener('close', () => {
  player?.destroy();
  player = undefined;
  $('player-slot').replaceChildren();
  const id = activeVideo?.id;
  activeVideo = undefined;
  if (document.activeElement === document.body) {
    const button = [...$('grid').querySelectorAll('.mark')].find(item => item.dataset.video === id);
    (button ?? historyControl()).focus();
  }
});
$('mark-video').onclick = () => {
  if (activeVideo) setWatched(activeVideo.id, !watched.has(activeVideo.id));
};
function historyControl() {
  return mobileLayout.matches ? dockButtons[2] : $('progress');
}

function selectView(next) {
  view = next;
  $('search').value = '';
  limit = pageSize;
  render();
}

$('progress').onclick = () => selectView(view === 'watched' ? 'browse' : 'watched');
for (const button of dockButtons) {
  button.onclick = () => {
    const next = button.dataset.viewTarget;
    if (next !== view) selectView(next);
    window.scrollTo(0, 0);
    if (next === 'search') $('search').focus({ preventScroll: true });
  };
}
function placeFilters() {
  const dialog = $('filter-dialog');
  const fields = $('filter-fields');
  const watchedFilter = $('watched-filter');
  if (mobileLayout.matches) {
    $('sheet-filters').append(fields, watchedFilter);
  } else {
    if (dialog.open) dialog.close();
    $('desktop-filters').append(fields);
    $('results').append(watchedFilter);
  }
}

$('open-filters').onclick = () => $('filter-dialog').showModal();
$('reset-filters').onclick = () => {
  selectedLevels.clear();
  selectedSources = new Set([...new Set(videos.map(video => video.source))]);
  $('sort').value = 'default';
  $('hide-watched').checked = true;
  limit = pageSize;
  levelFilters();
  sourceFilters();
  render();
};
placeFilters();
mobileLayout.addEventListener('change', event => {
  placeFilters();
  // Desktop search remains available in the library header.
  if (!event.matches && view === 'search') {
    view = 'browse';
    render();
  } else if (event.matches && view === 'browse' && $('search').value.trim()) {
    view = 'search';
    render();
  }
});
for (const id of ['search', 'sort', 'hide-watched']) {
  $(id).addEventListener(id === 'search' ? 'input' : 'change', () => {
    limit = pageSize;
    render();
  });
}
$('more').onclick = () => {
  const index = limit;
  limit += pageSize;
  render();
  $('grid').children[index]?.querySelector('.thumb').focus();
};
window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  installPrompt = event;
});
window.addEventListener('appinstalled', () => { $('install').hidden = true; });
$('install').hidden = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
$('install').onclick = async () => {
  if (!installPrompt) return $('install-dialog').showModal();
  const prompt = installPrompt;
  installPrompt = undefined;
  await prompt.prompt();
};
if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});

levelFilters();
try {
  const response = await fetch('./catalog.json');
  if (!response.ok) throw new Error('Catalogue unavailable');
  videos = await response.json();
  selectedSources = new Set(videos.map(video => video.source));
  sourceFilters();
  render();
} catch {
  $('result-count').textContent = 'Could not load the video library. Reopen the app to try again.';
}
