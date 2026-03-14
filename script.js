/* ───────────────────────────────────────────────────────
   GAMES ARRAY — add your games here!
   Each object:
     name  : display name
     cat   : action | puzzle | io | sports | racing | adventure | casual | other
     url   : path to the game folder (e.g. games/slope/index.html)
     thumb : path to thumbnail image (e.g. thumbnails/slope.png)
─────────────────────────────────────────────────────── */
const GAMES = [
  { name: "Slope",       cat: "action", url: "games/slope/index.html",       thumb: "thumbnails/slope.jpeg" },
  { name: "Drive Mad",   cat: "racing", url: "games/drive-mad/index.html",   thumb: "thumbnails/drive-mad.jpg" },
  { name: "Crossy Road", cat: "casual", url: "games/crossyroad/index.html", thumb: "thumbnails/crossy-road.jpg" },
];

/* ─── STATE ─────────────────────────────────────────── */
let favorites    = JSON.parse(localStorage.getItem('vp_favs')    || '[]');
let recentPlayed = JSON.parse(localStorage.getItem('vp_recent')  || '[]');
let playCounts   = JSON.parse(localStorage.getItem('vp_plays')   || '{}');
let ratings      = JSON.parse(localStorage.getItem('vp_ratings') || '{}');
let bestTimes    = JSON.parse(localStorage.getItem('vp_best')    || '{}');
let currentGame  = null;
let currentCat   = 'all';
let searchQuery  = '';
let sortMode     = localStorage.getItem('vp_sort')   || 'default';
let compactView  = localStorage.getItem('vp_view')   === 'compact';
let cardSize     = localStorage.getItem('vp_csize')  || 'medium';
let accentColor  = localStorage.getItem('vp_accent') || '#7c5cfc';
let bgStyle      = localStorage.getItem('vp_bg')     || 'default';
let tabTitle     = localStorage.getItem('vp_tabtitle') || '';

/* ─── TIMER STATE ───────────────────────────────────── */
let timerInterval  = null;
let timerSeconds   = 0;
let sidebarVisible = true;

/* ─── KEYBOARD SHORTCUTS ────────────────────────────── */
const DEFAULT_SHORTCUTS = {
  random:     { key: 'r',      desc: 'Random Game',     hint: 'Opens a random game',          alt: false },
  panic:      { key: 'x',      desc: 'Panic (Alt+)',    hint: 'Shows the disguised page',      alt: true  },
  closeGame:  { key: 'escape', desc: 'Close Game',      hint: 'Closes the game player',        alt: false },
  stats:      { key: 's',      desc: 'Stats',           hint: 'Opens your personal stats',     alt: false },
  shortcuts:  { key: '?',      desc: 'Shortcuts Panel', hint: 'Opens this shortcuts panel',    alt: false },
  toggleView: { key: 'v',      desc: 'Toggle View',     hint: 'Switch grid / compact view',    alt: false },
};
let shortcuts    = JSON.parse(localStorage.getItem('vp_shortcuts') || 'null') || JSON.parse(JSON.stringify(DEFAULT_SHORTCUTS));
let listeningFor = null;

/* ─── SAVE ──────────────────────────────────────────── */
function saveState() {
  localStorage.setItem('vp_favs',      JSON.stringify(favorites));
  localStorage.setItem('vp_recent',    JSON.stringify(recentPlayed));
  localStorage.setItem('vp_plays',     JSON.stringify(playCounts));
  localStorage.setItem('vp_ratings',   JSON.stringify(ratings));
  localStorage.setItem('vp_best',      JSON.stringify(bestTimes));
  localStorage.setItem('vp_shortcuts', JSON.stringify(shortcuts));
  localStorage.setItem('vp_sort',      sortMode);
  localStorage.setItem('vp_view',      compactView ? 'compact' : 'grid');
  localStorage.setItem('vp_csize',     cardSize);
  localStorage.setItem('vp_accent',    accentColor);
  localStorage.setItem('vp_bg',        bgStyle);
  localStorage.setItem('vp_tabtitle',  tabTitle);
}

/* ─── TOAST ─────────────────────────────────────────── */
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2200);
}

/* ─── FAVORITES ─────────────────────────────────────── */
function isFav(name) { return favorites.includes(name); }
function toggleFav(name, event) {
  if (event) event.stopPropagation();
  if (isFav(name)) { favorites = favorites.filter(f => f !== name); showToast('Removed from favorites'); }
  else             { favorites.push(name); showToast('❤️ Added to favorites!'); }
  saveState(); renderAll();
}
function addRecent(game) {
  recentPlayed = recentPlayed.filter(r => r !== game.name);
  recentPlayed.unshift(game.name);
  if (recentPlayed.length > 10) recentPlayed.pop();
  playCounts[game.name] = (playCounts[game.name] || 0) + 1;
  saveState();
}

/* ─── CLOCK (12h) ───────────────────────────────────── */
function updateClock() {
  const now  = new Date();
  let   h    = now.getHours();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  const m = String(now.getMinutes()).padStart(2, '0');
  const s = String(now.getSeconds()).padStart(2, '0');
  document.getElementById('navClock').textContent = `${h}:${m}:${s} ${ampm}`;
}
updateClock();
setInterval(updateClock, 1000);

/* ─── TIMER ─────────────────────────────────────────── */
function formatTime(secs) {
  const m = String(Math.floor(secs / 60)).padStart(2, '0');
  const s = String(secs % 60).padStart(2, '0');
  return `${m}:${s}`;
}
function startTimer() {
  stopTimer();
  timerSeconds = 0;
  document.getElementById('gisTimer').textContent = '00:00';
  timerInterval = setInterval(() => {
    timerSeconds++;
    document.getElementById('gisTimer').textContent = formatTime(timerSeconds);
  }, 1000);
}
function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
    if (currentGame && timerSeconds > 0) {
      const prev = bestTimes[currentGame.name] || 0;
      if (timerSeconds > prev) { bestTimes[currentGame.name] = timerSeconds; saveState(); }
    }
  }
}

/* ─── STAR RATING ───────────────────────────────────── */
const starLabels = ['', 'Terrible 😬', 'Meh 😐', 'OK 👍', 'Great 😄', 'Amazing! 🔥'];
function renderStars(gameName) {
  const current = ratings[gameName] || 0;
  document.querySelectorAll('.gis-star').forEach(s => s.classList.toggle('active', parseInt(s.dataset.star) <= current));
  document.getElementById('gisStarLabel').textContent = current > 0 ? starLabels[current] : 'Tap to rate';
}
document.querySelectorAll('.gis-star').forEach(star => {
  star.addEventListener('click', () => {
    if (!currentGame) return;
    const val = parseInt(star.dataset.star);
    ratings[currentGame.name] = val; saveState(); renderStars(currentGame.name);
    showToast(`Rated ${starLabels[val]}`);
  });
  star.addEventListener('mouseenter', () => {
    const v = parseInt(star.dataset.star);
    document.querySelectorAll('.gis-star').forEach(s => s.classList.toggle('active', parseInt(s.dataset.star) <= v));
  });
  star.addEventListener('mouseleave', () => { if (currentGame) renderStars(currentGame.name); });
});

/* ─── GAME INFO SIDEBAR ─────────────────────────────── */
function openSidebar()  { sidebarVisible = true;  document.getElementById('gameInfoSidebar').classList.remove('collapsed'); document.getElementById('sidebarToggleBtn').classList.add('active'); }
function closeSidebar() { sidebarVisible = false; document.getElementById('gameInfoSidebar').classList.add('collapsed');    document.getElementById('sidebarToggleBtn').classList.remove('active'); }
function populateSidebar(game) {
  const thumb = document.getElementById('gisThumbnail');
  thumb.innerHTML = game.thumb ? `<img src="${game.thumb}" alt="${game.name}">` : `<div class="gis-thumb-placeholder">🎮</div>`;
  document.getElementById('gisPlayCount').textContent = playCounts[game.name] || 1;
  const best = bestTimes[game.name];
  document.getElementById('gisBestTime').textContent = best ? formatTime(best) : '—';
  document.getElementById('gisCat').textContent = game.cat.charAt(0).toUpperCase() + game.cat.slice(1);
  renderStars(game.name);
}
document.getElementById('sidebarToggleBtn').addEventListener('click', () => sidebarVisible ? closeSidebar() : openSidebar());
document.getElementById('gisCloseBtn').addEventListener('click', closeSidebar);

/* ─── ACCENT COLOR ──────────────────────────────────── */
function applyAccent(color) {
  accentColor = color;
  const r = parseInt(color.slice(1,3),16);
  const g = parseInt(color.slice(3,5),16);
  const b = parseInt(color.slice(5,7),16);
  document.documentElement.style.setProperty('--accent', color);
  document.documentElement.style.setProperty('--accent-glow', `rgba(${r},${g},${b},.35)`);
  document.querySelectorAll('.swatch').forEach(s => s.classList.toggle('active', s.dataset.color === color));
  localStorage.setItem('vp_accent', color);
}

/* ─── BACKGROUND STYLE ──────────────────────────────── */
const bgClasses = ['bg-gradient','bg-animated','bg-dots'];
let   starsAnimFrame = null;

function applyBg(style) {
  bgStyle = style;
  bgClasses.forEach(c => document.body.classList.remove(c));
  const canvas = document.getElementById('bgCanvas');
  canvas.classList.remove('visible');
  if (starsAnimFrame) { cancelAnimationFrame(starsAnimFrame); starsAnimFrame = null; }

  if (style === 'gradient')  { document.body.classList.add('bg-gradient'); }
  else if (style === 'animated') { document.body.classList.add('bg-animated'); }
  else if (style === 'dots') { document.body.classList.add('bg-dots'); }
  else if (style === 'stars') { canvas.classList.add('visible'); drawStars(canvas); }
  localStorage.setItem('vp_bg', style);
}

function drawStars(canvas) {
  const ctx = canvas.getContext('2d');
  const stars = Array.from({length: 150}, () => ({
    x: Math.random(), y: Math.random(),
    r: Math.random() * 1.5 + 0.3,
    a: Math.random(), da: (Math.random() - 0.5) * 0.005
  }));
  function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
  resize();
  window.addEventListener('resize', resize);
  function frame() {
    canvas.width = canvas.width;
    stars.forEach(s => {
      s.a = Math.max(0.1, Math.min(1, s.a + s.da));
      if (s.a <= 0.1 || s.a >= 1) s.da *= -1;
      ctx.beginPath();
      ctx.arc(s.x * canvas.width, s.y * canvas.height, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${s.a})`;
      ctx.fill();
    });
    starsAnimFrame = requestAnimationFrame(frame);
  }
  frame();
}

/* ─── CARD SIZE ─────────────────────────────────────── */
function applyCardSize(size) {
  cardSize = size;
  document.body.classList.remove('card-small','card-medium','card-large');
  document.body.classList.add(`card-${size}`);
  document.querySelectorAll('.size-btn[data-size]').forEach(b => b.classList.toggle('active', b.dataset.size === size));
  localStorage.setItem('vp_csize', size);
}

/* ─── VIEW TOGGLE ───────────────────────────────────── */
function applyView() {
  document.querySelectorAll('.game-grid').forEach(g => g.classList.toggle('compact-view', compactView));
  const icon = document.getElementById('viewIcon');
  icon.innerHTML = compactView
    ? `<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>`
    : `<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>`;
  localStorage.setItem('vp_view', compactView ? 'compact' : 'grid');
}
document.getElementById('viewToggleBtn').addEventListener('click', () => {
  compactView = !compactView; applyView(); showToast(compactView ? 'Compact view' : 'Grid view');
});

/* ─── SORT ──────────────────────────────────────────── */
document.getElementById('sortSelect').value = sortMode;
document.getElementById('sortSelect').addEventListener('change', e => {
  sortMode = e.target.value; saveState(); renderAll();
});
function sortGames(list) {
  if (sortMode === 'az')          return [...list].sort((a,b) => a.name.localeCompare(b.name));
  if (sortMode === 'za')          return [...list].sort((a,b) => b.name.localeCompare(a.name));
  if (sortMode === 'most-played') return [...list].sort((a,b) => (playCounts[b.name]||0) - (playCounts[a.name]||0));
  if (sortMode === 'top-rated')   return [...list].sort((a,b) => (ratings[b.name]||0) - (ratings[a.name]||0));
  return list;
}

/* ─── STATS MODAL ───────────────────────────────────── */
function openStatsModal() {
  const totalPlays = Object.values(playCounts).reduce((a,b) => a+b, 0);
  const totalSecs  = Object.values(bestTimes).reduce((a,b) => a+b, 0);
  const totalGames = Object.keys(playCounts).length;
  const topGame    = Object.entries(playCounts).sort((a,b)=>b[1]-a[1])[0];
  const avgRating  = Object.values(ratings).length > 0
    ? (Object.values(ratings).reduce((a,b)=>a+b,0)/Object.values(ratings).length).toFixed(1) : '—';
  const favCat = (() => {
    const cats = {};
    Object.entries(playCounts).forEach(([name,count]) => {
      const game = GAMES.find(g => g.name === name);
      if (game) cats[game.cat] = (cats[game.cat]||0) + count;
    });
    const top = Object.entries(cats).sort((a,b)=>b[1]-a[1])[0];
    return top ? top[0] : '—';
  })();
  document.getElementById('statsModalBody').innerHTML = `
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-card-value">${totalPlays}</div><div class="stat-card-label">Total Sessions</div></div>
      <div class="stat-card"><div class="stat-card-value">${totalGames}</div><div class="stat-card-label">Games Played</div></div>
      <div class="stat-card"><div class="stat-card-value">${avgRating}⭐</div><div class="stat-card-label">Avg Rating</div></div>
      <div class="stat-card"><div class="stat-card-value">${favorites.length}</div><div class="stat-card-label">Favorites</div></div>
    </div>
    <div class="stats-section-title">🏆 Most Played</div>
    <table class="stats-table">
      <thead><tr><th>Game</th><th>Plays</th><th>Best Session</th><th>Rating</th></tr></thead>
      <tbody>${Object.entries(playCounts).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([name,count]) => `
        <tr>
          <td class="td-name">${name}</td>
          <td>${count}</td>
          <td>${bestTimes[name] ? formatTime(bestTimes[name]) : '—'}</td>
          <td>${ratings[name] ? '⭐'.repeat(ratings[name]) : '—'}</td>
        </tr>`).join('')}
      </tbody>
    </table>
    <div style="margin-top:16px;font-size:13px;color:var(--muted)">
      Favourite category: <strong style="color:var(--text)">${favCat}</strong>
      &nbsp;·&nbsp; Top game: <strong style="color:var(--text)">${topGame ? topGame[0] : '—'}</strong>
    </div>`;
  document.getElementById('statsModal').classList.add('open');
}
document.getElementById('statsBtn').addEventListener('click', openStatsModal);
document.getElementById('statsModalClose').addEventListener('click', () => document.getElementById('statsModal').classList.remove('open'));
document.getElementById('statsModal').addEventListener('click', e => { if(e.target===document.getElementById('statsModal')) document.getElementById('statsModal').classList.remove('open'); });

/* ─── SHORTCUTS MODAL ───────────────────────────────── */
function renderShortcutsList() {
  const list = document.getElementById('shortcutsList');
  list.innerHTML = Object.entries(shortcuts).map(([id, sc]) => `
    <div class="shortcut-row">
      <div class="shortcut-desc">${sc.desc}<small>${sc.hint}</small></div>
      <button class="shortcut-key" data-id="${id}">
        ${sc.alt ? 'Alt+' : ''}${sc.key === 'escape' ? 'Esc' : sc.key.toUpperCase()}
      </button>
    </div>`).join('');
  list.querySelectorAll('.shortcut-key').forEach(btn => {
    btn.addEventListener('click', () => {
      if (listeningFor) {
        const prev = list.querySelector(`[data-id="${listeningFor}"]`);
        if (prev) prev.classList.remove('listening');
      }
      listeningFor = btn.dataset.id;
      btn.textContent = 'Press key…';
      btn.classList.add('listening');
    });
  });
}
document.getElementById('shortcutsBtn').addEventListener('click', () => { renderShortcutsList(); document.getElementById('shortcutsModal').classList.add('open'); });
document.getElementById('shortcutsModalClose').addEventListener('click', () => { document.getElementById('shortcutsModal').classList.remove('open'); listeningFor = null; });
document.getElementById('shortcutsModal').addEventListener('click', e => { if(e.target===document.getElementById('shortcutsModal')){ document.getElementById('shortcutsModal').classList.remove('open'); listeningFor = null; }});

/* ─── SETTINGS MODAL CLOSE/OVERLAY ─────────────────── */
document.getElementById('settingsModalClose').addEventListener('click', () => document.getElementById('settingsModal').classList.remove('open'));
document.getElementById('settingsModal').addEventListener('click', e => { if(e.target===document.getElementById('settingsModal')) document.getElementById('settingsModal').classList.remove('open'); });
document.getElementById('settingsThemeBtn').addEventListener('click', () => { darkMode = !darkMode; applyTheme(); showToast(darkMode ? '🌙 Dark mode' : '☀️ Light mode'); });

/* color swatches */
document.querySelectorAll('.swatch').forEach(s => {
  s.addEventListener('click', () => applyAccent(s.dataset.color));
});
document.getElementById('customColorPicker').addEventListener('input', e => applyAccent(e.target.value));

/* bg style */
document.getElementById('bgStyleSelect').addEventListener('change', e => applyBg(e.target.value));

/* card size buttons */
document.querySelectorAll('.size-btn[data-size]').forEach(b => {
  b.addEventListener('click', () => applyCardSize(b.dataset.size));
});

document.getElementById('saveSettingsBtn').addEventListener('click', () => {
  tabTitle = document.getElementById('tabTitleInput').value.trim();
  applyTabTitle();
  saveState();
  showToast('✅ Settings saved!');
  document.getElementById('settingsModal').classList.remove('open');
});

/* clear all data */
document.getElementById('clearDataBtn').addEventListener('click', () => {
  if (!confirm('Are you sure? This will wipe all your favorites, history, ratings, and stats.')) return;
  ['vp_favs','vp_recent','vp_plays','vp_ratings','vp_best','vp_shortcuts','vp_sort','vp_view','vp_csize','vp_accent','vp_bg','vp_tabtitle','vp_theme'].forEach(k => localStorage.removeItem(k));
  location.reload();
});

/* ─── RENDER CARD ───────────────────────────────────── */
function createCard(game, idx = 0) {
  const div = document.createElement('div');
  div.className = 'game-card';
  div.style.animationDelay = `${Math.min(idx * 0.05, 0.4)}s`;
  const fav = isFav(game.name);
  div.innerHTML = `
    <div class="card-thumb">
      ${game.thumb
        ? `<img src="${game.thumb}" alt="${game.name}" loading="lazy" onerror="this.style.display='none'">`
        : `<div style="display:flex;align-items:center;justify-content:center;height:100%;font-size:42px;">🎮</div>`}
      <div class="card-overlay"></div>
      <div class="card-play"><div class="card-play-btn"><svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg></div></div>
      <button class="fav-btn ${fav?'active':''}" title="${fav?'Remove from favorites':'Add to favorites'}">
        <svg width="13" height="13" fill="${fav?'#fff':'none'}" stroke="#fff" stroke-width="2" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
      </button>
    </div>
    <div class="card-body">
      <div class="card-name">${game.name}</div>
      <div class="card-meta"><span class="card-cat">${game.cat}</span></div>
    </div>`;
  div.querySelector('.fav-btn').addEventListener('click', e => toggleFav(game.name, e));
  div.addEventListener('click', () => openGame(game));
  return div;
}

/* ─── OPEN / CLOSE GAME ─────────────────────────────── */
function openGame(game) {
  currentGame = game;
  document.getElementById('playerTitle').textContent = game.name;
  document.getElementById('gameFrame').src = '';
  document.getElementById('loadingOverlay').classList.remove('hidden');
  updatePlayerFavBtn(); populateSidebar(game); openSidebar();
  document.getElementById('gamePlayer').classList.add('open');
  document.body.style.overflow = 'hidden';
  addRecent(game); renderAll(); startTimer();
  setTimeout(() => {
    document.getElementById('gameFrame').src = game.url;
    document.getElementById('gameFrame').onload = () => {
      setTimeout(() => document.getElementById('loadingOverlay').classList.add('hidden'), 400);
    };
  }, 100);
}
function closeGame() {
  stopTimer();
  document.getElementById('gamePlayer').classList.remove('open');
  document.getElementById('gameFrame').src = '';
  document.body.style.overflow = '';
  currentGame = null;
}
function updatePlayerFavBtn() {
  if (!currentGame) return;
  const f = isFav(currentGame.name);
  document.getElementById('favInPlayer').innerHTML = `
    <svg width="13" height="13" fill="${f?'#fc5c7d':'none'}" stroke="${f?'#fc5c7d':'currentColor'}" stroke-width="2" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
    ${f ? 'Unfavorite' : 'Favorite'}`;
}

/* ─── FILTER + SORT ─────────────────────────────────── */
function getFilteredGames() {
  let list = [...GAMES];
  if (currentCat === 'favorites')     list = list.filter(g => isFav(g.name));
  else if (currentCat === 'recent')   list = recentPlayed.map(n => GAMES.find(g => g.name === n)).filter(Boolean);
  else if (currentCat !== 'all')      list = list.filter(g => g.cat === currentCat);
  if (searchQuery) { const q = searchQuery.toLowerCase(); list = list.filter(g => g.name.toLowerCase().includes(q) || g.cat.toLowerCase().includes(q)); }
  return sortGames(list);
}

/* ─── RENDER ALL ────────────────────────────────────── */
function renderAll() {
  const filtered = getFilteredGames();

  document.getElementById('cnt-all').textContent    = GAMES.length;
  document.getElementById('cnt-fav').textContent    = favorites.length;
  document.getElementById('cnt-recent').textContent = recentPlayed.length;
  ['action','puzzle','io','sports','racing','adventure','casual','other'].forEach(c => {
    const el = document.getElementById('cnt-' + c);
    if (el) el.textContent = GAMES.filter(g => g.cat === c).length;
  });

  document.getElementById('addNotice').style.display = GAMES.length === 0 ? 'block' : 'none';

  const grid = document.getElementById('gameGrid');
  grid.innerHTML = '';
  filtered.forEach((g, i) => grid.appendChild(createCard(g, i)));

  document.getElementById('emptyState').classList.toggle('visible',
    GAMES.length > 0 && filtered.length === 0 && ['all','favorites','recent'].includes(currentCat)
  );

  const titles = { all:'All Games', favorites:'Favorites', recent:'Recently Played', action:'Action', puzzle:'Puzzle', io:'IO Games', sports:'Sports', racing:'Racing', adventure:'Adventure', casual:'Casual', other:'Other' };
  document.getElementById('sectionTitle').innerHTML = `<span class="dot"></span> ${titles[currentCat]||'Games'}`;

  const favSecGames = GAMES.filter(g => isFav(g.name));
  const favSec      = document.getElementById('favSection');
  const favSecGrid  = document.getElementById('favGrid');
  favSecGrid.innerHTML = '';
  if (favSecGames.length > 0 && currentCat === 'all' && !searchQuery) {
    favSec.classList.add('visible');
    sortGames(favSecGames).forEach((g,i) => favSecGrid.appendChild(createCard(g,i)));
  } else { favSec.classList.remove('visible'); }

  const recentSec = document.getElementById('recentSection');
  const chips     = document.getElementById('recentChips');
  chips.innerHTML = '';
  if (recentPlayed.length > 0 && currentCat === 'all' && !searchQuery) {
    recentSec.classList.add('visible');
    recentPlayed.slice(0,8).forEach(name => {
      const game = GAMES.find(g => g.name === name);
      if (!game) return;
      const chip = document.createElement('div');
      chip.className = 'recent-chip';
      chip.innerHTML = `<div class="recent-chip-thumb">${game.thumb?`<img src="${game.thumb}" alt="${game.name}" loading="lazy">`:`<div class="chip-icon">🎮</div>`}</div>${game.name}`;
      chip.addEventListener('click', () => openGame(game));
      chips.appendChild(chip);
    });
  } else { recentSec.classList.remove('visible'); }

  applyView();
  updatePlayerFavBtn();
}

/* ─── CATEGORY BUTTONS ──────────────────────────────── */
document.querySelectorAll('.cat-pill').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.cat-pill').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentCat = btn.dataset.cat;
    renderAll();
  });
});

/* ─── SEARCH ────────────────────────────────────────── */
document.getElementById('searchInput').addEventListener('input', e => { searchQuery = e.target.value.trim(); renderAll(); });

/* ─── RANDOM ────────────────────────────────────────── */
document.getElementById('randomBtn').addEventListener('click', () => {
  if (GAMES.length === 0) { showToast('Add some games first!'); return; }
  openGame(GAMES[Math.floor(Math.random() * GAMES.length)]);
});

/* ─── PLAYER BUTTONS ────────────────────────────────── */
document.getElementById('backBtn').addEventListener('click', closeGame);
document.getElementById('fullscreenBtn').addEventListener('click', () => {
  const f = document.getElementById('gameFrame');
  if (f.requestFullscreen) f.requestFullscreen();
  else if (f.webkitRequestFullscreen) f.webkitRequestFullscreen();
});
document.getElementById('favInPlayer').addEventListener('click', () => {
  if (!currentGame) return;
  toggleFav(currentGame.name, null); updatePlayerFavBtn();
});

/* ─── PANIC ─────────────────────────────────────────── */
function triggerPanic() {
  location.replace('https://www.google.com');
}
document.getElementById('panicBtn').addEventListener('click', triggerPanic);

/* ─── KEYBOARD HANDLER ──────────────────────────────── */
document.addEventListener('keydown', e => {
  /* Alt+C spotlight */
  if (e.altKey && e.key.toLowerCase() === 'c') {
    e.preventDefault(); openSpotlight(); return;
  }
  if (listeningFor) {
    e.preventDefault();
    if (e.key === 'Escape') { listeningFor = null; renderShortcutsList(); return; }
    shortcuts[listeningFor].key = e.key.toLowerCase();
    shortcuts[listeningFor].alt = e.altKey;
    listeningFor = null; saveState(); renderShortcutsList();
    showToast('✅ Shortcut updated!'); return;
  }
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

  const sc = shortcuts;
  if (e.key.toLowerCase() === sc.closeGame.key && document.getElementById('gamePlayer').classList.contains('open')) { closeGame(); return; }
  if (e.key.toLowerCase() === sc.panic.key && (sc.panic.alt ? e.altKey : true)) { e.preventDefault(); triggerPanic(); return; }
  if (e.key.toLowerCase() === sc.random.key && !document.getElementById('gamePlayer').classList.contains('open')) {
    if (GAMES.length > 0) openGame(GAMES[Math.floor(Math.random() * GAMES.length)]); return;
  }
  if (e.key.toLowerCase() === sc.stats.key && !document.getElementById('gamePlayer').classList.contains('open')) { openStatsModal(); return; }
  if (e.key === sc.shortcuts.key) { renderShortcutsList(); document.getElementById('shortcutsModal').classList.toggle('open'); return; }
  if (e.key.toLowerCase() === sc.toggleView.key && !document.getElementById('gamePlayer').classList.contains('open')) {
    compactView = !compactView; applyView(); showToast(compactView ? 'Compact view' : 'Grid view'); return;
  }
});

/* ─── TAB TITLE CHANGER ─────────────────────────────── */
function applyTabTitle() {
  document.title = tabTitle || 'VaultPlay — Free Games Online';
  const el = document.getElementById('currentTabTitle');
  if (el) el.textContent = tabTitle || 'VaultPlay — Free Games Online';
}

document.getElementById('settingsBtn').addEventListener('click', () => {
  document.getElementById('tabTitleInput').value = tabTitle;
  document.getElementById('currentTabTitle').textContent = document.title;
  document.querySelectorAll('.tab-preset').forEach(b =>
    b.classList.toggle('active', b.dataset.title === tabTitle)
  );
  document.getElementById('bgStyleSelect').value = bgStyle;
  document.querySelectorAll('.swatch').forEach(s => s.classList.toggle('active', s.dataset.color === accentColor));
  document.getElementById('customColorPicker').value = accentColor;
  document.querySelectorAll('.size-btn[data-size]').forEach(b => b.classList.toggle('active', b.dataset.size === cardSize));
  document.getElementById('settingsModal').classList.add('open');
});

document.querySelectorAll('.tab-preset').forEach(btn => {
  btn.addEventListener('click', () => {
    document.getElementById('tabTitleInput').value = btn.dataset.title;
    document.querySelectorAll('.tab-preset').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });
});

document.getElementById('resetTabTitleBtn').addEventListener('click', () => {
  tabTitle = '';
  document.getElementById('tabTitleInput').value = '';
  document.querySelectorAll('.tab-preset').forEach(b => b.classList.remove('active'));
  applyTabTitle();
  saveState();
  showToast('Tab title reset');
});

/* ─── CTRL+K SPOTLIGHT ──────────────────────────────── */
let spotlightIndex = -1;
let spotlightFiltered = [];

function openSpotlight() {
  document.getElementById('spotlightOverlay').classList.add('open');
  document.getElementById('spotlightInput').value = '';
  spotlightIndex = -1;
  renderSpotlight('');
  setTimeout(() => document.getElementById('spotlightInput').focus(), 50);
}

function closeSpotlight() {
  document.getElementById('spotlightOverlay').classList.remove('open');
  document.getElementById('spotlightInput').blur();
  spotlightIndex = -1;
}

function highlightMatch(text, query) {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return text.slice(0, idx) +
    `<mark>${text.slice(idx, idx + query.length)}</mark>` +
    text.slice(idx + query.length);
}

function renderSpotlight(query) {
  const container = document.getElementById('spotlightResults');
  const q = query.trim().toLowerCase();

  spotlightFiltered = q
    ? GAMES.filter(g => g.name.toLowerCase().includes(q) || g.cat.toLowerCase().includes(q))
    : [...GAMES].sort((a, b) => (playCounts[b.name] || 0) - (playCounts[a.name] || 0));

  if (spotlightFiltered.length === 0) {
    container.innerHTML = `<div class="spotlight-empty"><span>🔍</span>No games match "${query}"</div>`;
    return;
  }

  container.innerHTML = spotlightFiltered.map((game, i) => `
    <div class="spotlight-result ${i === spotlightIndex ? 'selected' : ''}" data-idx="${i}">
      <div class="sr-thumb">
        ${game.thumb
          ? `<img src="${game.thumb}" alt="${game.name}" loading="lazy">`
          : `<div class="sr-thumb-placeholder">🎮</div>`}
      </div>
      <div class="sr-info">
        <div class="sr-name">${highlightMatch(game.name, query)}</div>
        <span class="sr-cat">${game.cat}</span>
      </div>
      ${isFav(game.name) ? '<div class="sr-fav-dot" title="Favorited"></div>' : ''}
      <div class="sr-play-hint">
        ${playCounts[game.name] ? `▶ ${playCounts[game.name]}x` : ''}
      </div>
    </div>`).join('');

  container.querySelectorAll('.spotlight-result').forEach(row => {
    row.addEventListener('click', () => {
      const game = spotlightFiltered[parseInt(row.dataset.idx)];
      closeSpotlight();
      openGame(game);
    });
    row.addEventListener('mouseenter', () => {
      spotlightIndex = parseInt(row.dataset.idx);
      updateSpotlightSelection();
    });
  });
}

function updateSpotlightSelection() {
  const rows = document.querySelectorAll('.spotlight-result');
  rows.forEach((r, i) => r.classList.toggle('selected', i === spotlightIndex));
  const selected = rows[spotlightIndex];
  if (selected) selected.scrollIntoView({ block: 'nearest' });
}

document.getElementById('spotlightInput').addEventListener('input', e => {
  spotlightIndex = -1;
  renderSpotlight(e.target.value);
});

document.getElementById('spotlightInput').addEventListener('keydown', e => {
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    spotlightIndex = Math.min(spotlightIndex + 1, spotlightFiltered.length - 1);
    updateSpotlightSelection();
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    spotlightIndex = Math.max(spotlightIndex - 1, 0);
    updateSpotlightSelection();
  } else if (e.key === 'Enter') {
    const game = spotlightFiltered[spotlightIndex] || spotlightFiltered[0];
    if (game) { closeSpotlight(); openGame(game); }
  } else if (e.key === 'Escape') {
    closeSpotlight();
  }
});

document.getElementById('spotlightOverlay').addEventListener('click', e => {
  if (e.target === document.getElementById('spotlightOverlay')) closeSpotlight();
});
document.getElementById('spotlightBtn').addEventListener('click', openSpotlight);

/* ─── THEME TOGGLE ──────────────────────────────────── */
const themeBtn  = document.getElementById('themeBtn');
const themeIcon = document.getElementById('themeIcon');
let darkMode = localStorage.getItem('vp_theme') !== 'light';
function applyTheme() {
  document.body.classList.toggle('light-mode', !darkMode);
  themeIcon.innerHTML = darkMode
    ? `<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>`
    : `<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>`;
  localStorage.setItem('vp_theme', darkMode ? 'dark' : 'light');
}
themeBtn.addEventListener('click', () => { darkMode = !darkMode; applyTheme(); });
applyTheme();

/* ─── INIT ──────────────────────────────────────────── */
applyAccent(accentColor);
applyBg(bgStyle);
applyCardSize(cardSize);
applyTabTitle();
applyView();
renderAll();