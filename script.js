/* ───────────────────────────────────────────────────────
   GAMES ARRAY — add your games here!
   Each object:
     name  : display name
     cat   : action | puzzle | io | sports | racing | adventure | casual | other
     url   : path to the game folder (e.g. games/slope/index.html)
     thumb : path to thumbnail image (e.g. thumbnails/slope.png)
─────────────────────────────────────────────────────── */
const GAMES = [
  {
    name: "Slope",
    cat: "action",
    url: "games/slope/index.html",
    thumb: "thumbnails/slope.jpeg",
  },
  {
    name: "Drive Mad",
    cat: "racing",
    url: "games/drive-mad/index.html",
    thumb: "thumbnails/drive-mad.jpg",
  },
  {
    name: "Crossy Road",
    cat: "casual",
    url: "games/crossy-road/index.html",
    thumb: "thumbnails/crossy-road.jpg",
  },
];

/* ─── STATE ─────────────────────────────────────────── */
let favorites    = JSON.parse(localStorage.getItem('vp_favs')    || '[]');
let recentPlayed = JSON.parse(localStorage.getItem('vp_recent')  || '[]');
let playCounts   = JSON.parse(localStorage.getItem('vp_plays')   || '{}');
let ratings      = JSON.parse(localStorage.getItem('vp_ratings') || '{}');
let bestTimes    = JSON.parse(localStorage.getItem('vp_best')    || '{}');
let sessionLog   = JSON.parse(localStorage.getItem('vp_sessions')|| '[]');
let currentGame  = null;
let currentCat   = 'all';
let searchQuery  = '';
let compactView  = localStorage.getItem('vp_view') === 'compact';

/* ─── TIMER STATE ───────────────────────────────────── */
let timerInterval  = null;
let timerSeconds   = 0;
let sidebarVisible = true;

/* ─── KEYBOARD SHORTCUTS ────────────────────────────── */
const DEFAULT_SHORTCUTS = {
  random:     { key: 'r',      desc: 'Random Game',        hint: 'Opens a random game' },
  panic:      { key: 'x',      desc: 'Panic (Alt+)',       hint: 'Shows fake Google page', alt: true },
  closeGame:  { key: 'Escape', desc: 'Close Game',         hint: 'Closes the game player' },
  stats:      { key: 's',      desc: 'Stats',              hint: 'Opens your personal stats' },
  shortcuts:  { key: '?',      desc: 'Shortcuts Panel',    hint: 'Opens this panel' },
  toggleView: { key: 'v',      desc: 'Toggle View',        hint: 'Grid / Compact view' },
};
let shortcuts = JSON.parse(localStorage.getItem('vp_shortcuts') || 'null') || JSON.parse(JSON.stringify(DEFAULT_SHORTCUTS));
let listeningFor = null;

/* ─── SITE NAME ─────────────────────────────────────── */
let siteName = localStorage.getItem('vp_sitename') || 'VaultPlay';

/* ─── HELPERS ───────────────────────────────────────── */
function saveState() {
  localStorage.setItem('vp_favs',      JSON.stringify(favorites));
  localStorage.setItem('vp_recent',    JSON.stringify(recentPlayed));
  localStorage.setItem('vp_plays',     JSON.stringify(playCounts));
  localStorage.setItem('vp_ratings',   JSON.stringify(ratings));
  localStorage.setItem('vp_best',      JSON.stringify(bestTimes));
  localStorage.setItem('vp_sessions',  JSON.stringify(sessionLog));
  localStorage.setItem('vp_shortcuts', JSON.stringify(shortcuts));
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2200);
}

function isFav(name) { return favorites.includes(name); }

function toggleFav(name, event) {
  if (event) event.stopPropagation();
  if (isFav(name)) {
    favorites = favorites.filter(f => f !== name);
    showToast('Removed from favorites');
  } else {
    favorites.push(name);
    showToast('❤️ Added to favorites!');
  }
  saveState();
  renderAll();
}

function addRecent(game) {
  recentPlayed = recentPlayed.filter(r => r !== game.name);
  recentPlayed.unshift(game.name);
  if (recentPlayed.length > 10) recentPlayed.pop();
  playCounts[game.name] = (playCounts[game.name] || 0) + 1;
  saveState();
}

/* ─── CLOCK ─────────────────────────────────────────── */
function updateClock() {
  const now  = new Date();
  const h    = String(now.getHours()).padStart(2, '0');
  const m    = String(now.getMinutes()).padStart(2, '0');
  const s    = String(now.getSeconds()).padStart(2, '0');
  document.getElementById('navClock').textContent = `${h}:${m}:${s}`;
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
      /* save best time */
      const prev = bestTimes[currentGame.name] || 0;
      if (timerSeconds > prev) {
        bestTimes[currentGame.name] = timerSeconds;
      }
      /* log session */
      sessionLog.unshift({
        game: currentGame.name,
        secs: timerSeconds,
        date: new Date().toLocaleDateString()
      });
      if (sessionLog.length > 50) sessionLog.pop();
      saveState();
    }
  }
}

/* ─── STAR RATING ───────────────────────────────────── */
const starLabels = ['', 'Terrible 😬', 'Meh 😐', 'OK 👍', 'Great 😄', 'Amazing! 🔥'];

function renderStars(gameName) {
  const current = ratings[gameName] || 0;
  document.querySelectorAll('.gis-star').forEach(s => {
    s.classList.toggle('active', parseInt(s.dataset.star) <= current);
  });
  document.getElementById('gisStarLabel').textContent = current > 0 ? starLabels[current] : 'Tap to rate';
}

document.querySelectorAll('.gis-star').forEach(star => {
  star.addEventListener('click', () => {
    if (!currentGame) return;
    const val = parseInt(star.dataset.star);
    ratings[currentGame.name] = val;
    saveState();
    renderStars(currentGame.name);
    showToast(`Rated ${starLabels[val]}`);
  });
  star.addEventListener('mouseenter', () => {
    const v = parseInt(star.dataset.star);
    document.querySelectorAll('.gis-star').forEach(s => s.classList.toggle('active', parseInt(s.dataset.star) <= v));
  });
  star.addEventListener('mouseleave', () => { if (currentGame) renderStars(currentGame.name); });
});

/* ─── GAME INFO SIDEBAR ─────────────────────────────── */
function openSidebar() {
  sidebarVisible = true;
  document.getElementById('gameInfoSidebar').classList.remove('collapsed');
  document.getElementById('sidebarToggleBtn').classList.add('active');
}
function closeSidebar() {
  sidebarVisible = false;
  document.getElementById('gameInfoSidebar').classList.add('collapsed');
  document.getElementById('sidebarToggleBtn').classList.remove('active');
}
function populateSidebar(game) {
  const thumb = document.getElementById('gisThumbnail');
  thumb.innerHTML = game.thumb
    ? `<img src="${game.thumb}" alt="${game.name}">`
    : `<div class="gis-thumb-placeholder">🎮</div>`;
  document.getElementById('gisPlayCount').textContent = playCounts[game.name] || 1;
  const best = bestTimes[game.name];
  document.getElementById('gisBestTime').textContent = best ? formatTime(best) : '—';
  document.getElementById('gisCat').textContent = game.cat.charAt(0).toUpperCase() + game.cat.slice(1);
  renderStars(game.name);
}
document.getElementById('sidebarToggleBtn').addEventListener('click', () => sidebarVisible ? closeSidebar() : openSidebar());
document.getElementById('gisCloseBtn').addEventListener('click', closeSidebar);

/* ─── VIEW TOGGLE ───────────────────────────────────── */
function applyView() {
  const grids = document.querySelectorAll('.game-grid');
  const icon  = document.getElementById('viewIcon');
  grids.forEach(g => g.classList.toggle('compact-view', compactView));
  icon.innerHTML = compactView
    ? `<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>`
    : `<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>`;
  localStorage.setItem('vp_view', compactView ? 'compact' : 'grid');
}
document.getElementById('viewToggleBtn').addEventListener('click', () => {
  compactView = !compactView;
  applyView();
  showToast(compactView ? 'Compact view' : 'Grid view');
});

/* ─── SITE NAME ─────────────────────────────────────── */
function applySiteName() {
  const parts = siteName.split(/(?=[A-Z])/).join('');
  const half  = Math.ceil(siteName.length / 2);
  const first = siteName.slice(0, half);
  const second= siteName.slice(half);
  document.getElementById('navLogo').innerHTML = `${first}<span>${second}</span>`;
  document.title = `${siteName} — Free Games Online`;
  document.getElementById('siteNameInput').value = siteName;
  localStorage.setItem('vp_sitename', siteName);
}

/* ─── STATS MODAL ───────────────────────────────────── */
function openStatsModal() {
  const totalPlays  = Object.values(playCounts).reduce((a, b) => a + b, 0);
  const totalSecs   = sessionLog.reduce((a, s) => a + s.secs, 0);
  const totalGames  = Object.keys(playCounts).length;
  const topGame     = Object.entries(playCounts).sort((a, b) => b[1] - a[1])[0];
  const avgRating   = Object.values(ratings).length > 0
    ? (Object.values(ratings).reduce((a, b) => a + b, 0) / Object.values(ratings).length).toFixed(1)
    : '—';
  const favCat = (() => {
    const cats = {};
    Object.entries(playCounts).forEach(([name, count]) => {
      const game = GAMES.find(g => g.name === name);
      if (game) cats[game.cat] = (cats[game.cat] || 0) + count;
    });
    const top = Object.entries(cats).sort((a, b) => b[1] - a[1])[0];
    return top ? top[0] : '—';
  })();

  const body = document.getElementById('statsModalBody');
  body.innerHTML = `
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-card-value">${totalPlays}</div>
        <div class="stat-card-label">Total Play Sessions</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-value">${formatTime(totalSecs)}</div>
        <div class="stat-card-label">Total Time Played</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-value">${totalGames}</div>
        <div class="stat-card-label">Games Played</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-value">${avgRating}⭐</div>
        <div class="stat-card-label">Avg Rating Given</div>
      </div>
    </div>

    <div class="stats-section-title">🏆 Most Played</div>
    <table class="stats-table">
      <thead><tr><th>Game</th><th>Plays</th><th>Best Session</th><th>Rating</th></tr></thead>
      <tbody>
        ${Object.entries(playCounts).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([name, count]) => `
          <tr>
            <td class="td-name">${name}</td>
            <td>${count}</td>
            <td>${bestTimes[name] ? formatTime(bestTimes[name]) : '—'}</td>
            <td>${ratings[name] ? '⭐'.repeat(ratings[name]) : '—'}</td>
          </tr>`).join('')}
      </tbody>
    </table>

    ${sessionLog.length > 0 ? `
    <div class="stats-section-title" style="margin-top:20px">📅 Recent Sessions</div>
    <table class="stats-table">
      <thead><tr><th>Game</th><th>Duration</th><th>Date</th></tr></thead>
      <tbody>
        ${sessionLog.slice(0,6).map(s => `
          <tr>
            <td class="td-name">${s.game}</td>
            <td>${formatTime(s.secs)}</td>
            <td>${s.date}</td>
          </tr>`).join('')}
      </tbody>
    </table>` : ''}

    <div style="margin-top:16px;font-size:13px;color:var(--muted)">
      Favourite category: <strong style="color:var(--text)">${favCat}</strong>
      &nbsp;·&nbsp; Favourite game: <strong style="color:var(--text)">${topGame ? topGame[0] : '—'}</strong>
    </div>`;

  document.getElementById('statsModal').classList.add('open');
}

document.getElementById('statsBtn').addEventListener('click', openStatsModal);
document.getElementById('statsModalClose').addEventListener('click', () => document.getElementById('statsModal').classList.remove('open'));
document.getElementById('statsModal').addEventListener('click', e => { if (e.target === document.getElementById('statsModal')) document.getElementById('statsModal').classList.remove('open'); });

/* ─── SHORTCUTS MODAL ───────────────────────────────── */
function renderShortcutsList() {
  const list = document.getElementById('shortcutsList');
  list.innerHTML = Object.entries(shortcuts).map(([id, sc]) => `
    <div class="shortcut-row">
      <div class="shortcut-desc">
        ${sc.desc}
        <small>${sc.hint}</small>
      </div>
      <button class="shortcut-key" data-id="${id}">
        ${sc.alt ? 'Alt+' : ''}${sc.key === 'Escape' ? 'Esc' : sc.key.toUpperCase()}
      </button>
    </div>`).join('');

  list.querySelectorAll('.shortcut-key').forEach(btn => {
    btn.addEventListener('click', () => {
      /* clear any previous listening */
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

document.getElementById('shortcutsBtn').addEventListener('click', () => {
  renderShortcutsList();
  document.getElementById('shortcutsModal').classList.add('open');
});
document.getElementById('shortcutsModalClose').addEventListener('click', () => {
  document.getElementById('shortcutsModal').classList.remove('open');
  listeningFor = null;
});
document.getElementById('shortcutsModal').addEventListener('click', e => {
  if (e.target === document.getElementById('shortcutsModal')) {
    document.getElementById('shortcutsModal').classList.remove('open');
    listeningFor = null;
  }
});

/* ─── SETTINGS MODAL ────────────────────────────────── */
document.getElementById('settingsBtn').addEventListener('click', () => {
  document.getElementById('siteNameInput').value = siteName;
  document.getElementById('settingsModal').classList.add('open');
});
document.getElementById('settingsModalClose').addEventListener('click', () => document.getElementById('settingsModal').classList.remove('open'));
document.getElementById('settingsModal').addEventListener('click', e => { if (e.target === document.getElementById('settingsModal')) document.getElementById('settingsModal').classList.remove('open'); });
document.getElementById('settingsThemeBtn').addEventListener('click', () => { darkMode = !darkMode; applyTheme(); showToast(darkMode ? '🌙 Dark mode' : '☀️ Light mode'); });
document.getElementById('saveSettingsBtn').addEventListener('click', () => {
  const val = document.getElementById('siteNameInput').value.trim();
  if (val.length > 0) {
    siteName = val;
    applySiteName();
    showToast('✅ Settings saved!');
    document.getElementById('settingsModal').classList.remove('open');
  }
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
      <div class="card-play">
        <div class="card-play-btn">
          <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>
        </div>
      </div>
      <button class="fav-btn ${fav ? 'active' : ''}" title="${fav ? 'Remove from favorites' : 'Add to favorites'}">
        <svg width="13" height="13" fill="${fav ? '#fff' : 'none'}" stroke="#fff" stroke-width="2" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
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
  updatePlayerFavBtn();
  populateSidebar(game);
  openSidebar();
  document.getElementById('gamePlayer').classList.add('open');
  document.body.style.overflow = 'hidden';
  addRecent(game);
  renderAll();
  startTimer();
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
  const favBtn = document.getElementById('favInPlayer');
  const f = isFav(currentGame.name);
  favBtn.innerHTML = `
    <svg width="13" height="13" fill="${f ? '#fc5c7d' : 'none'}" stroke="${f ? '#fc5c7d' : 'currentColor'}" stroke-width="2" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
    ${f ? 'Unfavorite' : 'Favorite'}`;
}

/* ─── PIP MODE ──────────────────────────────────────── */
document.getElementById('pipBtn').addEventListener('click', async () => {
  const frame = document.getElementById('gameFrame');
  try {
    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture();
    } else {
      /* create a video element to proxy PiP since iframes can't do PiP directly */
      showToast('⚠️ PiP works best with video content. Use Fullscreen instead.');
      /* fallback: open game in new tab */
      if (currentGame) window.open(currentGame.url, '_blank');
    }
  } catch(e) {
    if (currentGame) window.open(currentGame.url, '_blank');
    showToast('Opening game in new tab');
  }
});

/* ─── FILTER LOGIC ──────────────────────────────────── */
function getFilteredGames() {
  let list = [...GAMES];
  if (currentCat === 'favorites') {
    list = list.filter(g => isFav(g.name));
  } else if (currentCat === 'recent') {
    list = recentPlayed.map(n => GAMES.find(g => g.name === n)).filter(Boolean);
  } else if (currentCat !== 'all') {
    list = list.filter(g => g.cat === currentCat);
  }
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    list = list.filter(g => g.name.toLowerCase().includes(q) || g.cat.toLowerCase().includes(q));
  }
  return list;
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

  const empty = document.getElementById('emptyState');
  empty.classList.toggle('visible',
    GAMES.length > 0 && filtered.length === 0 &&
    ['all','favorites','recent'].includes(currentCat)
  );

  const titles = { all:'All Games', favorites:'Favorites', recent:'Recently Played', action:'Action', puzzle:'Puzzle', io:'IO Games', sports:'Sports', racing:'Racing', adventure:'Adventure', casual:'Casual', other:'Other' };
  document.getElementById('sectionTitle').innerHTML = `<span class="dot"></span> ${titles[currentCat] || 'Games'}`;

  const favSecGames = GAMES.filter(g => isFav(g.name));
  const favSec      = document.getElementById('favSection');
  const favSecGrid  = document.getElementById('favGrid');
  favSecGrid.innerHTML = '';
  if (favSecGames.length > 0 && currentCat === 'all' && !searchQuery) {
    favSec.classList.add('visible');
    favSecGames.forEach((g, i) => favSecGrid.appendChild(createCard(g, i)));
  } else {
    favSec.classList.remove('visible');
  }

  const recentSec = document.getElementById('recentSection');
  const chips     = document.getElementById('recentChips');
  chips.innerHTML = '';
  if (recentPlayed.length > 0 && currentCat === 'all' && !searchQuery) {
    recentSec.classList.add('visible');
    recentPlayed.slice(0, 8).forEach(name => {
      const game = GAMES.find(g => g.name === name);
      if (!game) return;
      const chip = document.createElement('div');
      chip.className = 'recent-chip';
      chip.innerHTML = `
        <div class="recent-chip-thumb">
          ${game.thumb ? `<img src="${game.thumb}" alt="${game.name}" loading="lazy">` : `<div class="chip-icon">🎮</div>`}
        </div>${game.name}`;
      chip.addEventListener('click', () => openGame(game));
      chips.appendChild(chip);
    });
  } else {
    recentSec.classList.remove('visible');
  }

  applyView();
  updatePlayerFavBtn();
}

/* ─── CATEGORY BUTTONS ──────────────────────────────── */
document.querySelectorAll('.cat-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentCat = btn.dataset.cat;
    renderAll();
  });
});

/* ─── SEARCH ────────────────────────────────────────── */
document.getElementById('searchInput').addEventListener('input', e => {
  searchQuery = e.target.value.trim();
  renderAll();
});

/* ─── RANDOM GAME ───────────────────────────────────── */
document.getElementById('randomBtn').addEventListener('click', () => {
  if (GAMES.length === 0) { showToast('Add some games first!'); return; }
  openGame(GAMES[Math.floor(Math.random() * GAMES.length)]);
});

/* ─── PLAYER BUTTONS ────────────────────────────────── */
document.getElementById('backBtn').addEventListener('click', closeGame);
document.getElementById('fullscreenBtn').addEventListener('click', () => {
  const frame = document.getElementById('gameFrame');
  if (frame.requestFullscreen) frame.requestFullscreen();
  else if (frame.webkitRequestFullscreen) frame.webkitRequestFullscreen();
});
document.getElementById('favInPlayer').addEventListener('click', () => {
  if (!currentGame) return;
  toggleFav(currentGame.name, null);
  updatePlayerFavBtn();
});

/* ─── PANIC ─────────────────────────────────────────── */
let panicActive = false;
function togglePanic() {
  panicActive = !panicActive;
  document.getElementById('panicOverlay').classList.toggle('active', panicActive);
  document.title = panicActive ? 'Google' : `${siteName} — Free Games Online`;
}
document.getElementById('panicBtn').addEventListener('click', togglePanic);

/* ─── KEYBOARD HANDLER ──────────────────────────────── */
document.addEventListener('keydown', e => {
  /* if shortcuts modal is listening for a new key */
  if (listeningFor) {
    e.preventDefault();
    if (e.key === 'Escape') {
      listeningFor = null;
      renderShortcutsList();
      return;
    }
    shortcuts[listeningFor].key = e.key.toLowerCase();
    shortcuts[listeningFor].alt = e.altKey;
    listeningFor = null;
    saveState();
    renderShortcutsList();
    showToast('✅ Shortcut updated!');
    return;
  }

  /* don't fire shortcuts while typing in inputs */
  if (e.target.tagName === 'INPUT') return;

  const sc = shortcuts;

  /* close game */
  if (e.key === sc.closeGame.key && document.getElementById('gamePlayer').classList.contains('open')) {
    closeGame(); return;
  }
  /* panic */
  if (e.key === sc.panic.key && (sc.panic.alt ? e.altKey : true)) {
    e.preventDefault(); togglePanic(); return;
  }
  /* random */
  if (e.key === sc.random.key && !document.getElementById('gamePlayer').classList.contains('open')) {
    if (GAMES.length > 0) openGame(GAMES[Math.floor(Math.random() * GAMES.length)]);
    return;
  }
  /* stats */
  if (e.key === sc.stats.key && !document.getElementById('gamePlayer').classList.contains('open')) {
    openStatsModal(); return;
  }
  /* shortcuts panel */
  if (e.key === sc.shortcuts.key) {
    renderShortcutsList();
    document.getElementById('shortcutsModal').classList.toggle('open');
    return;
  }
  /* toggle view */
  if (e.key === sc.toggleView.key && !document.getElementById('gamePlayer').classList.contains('open')) {
    compactView = !compactView; applyView();
    showToast(compactView ? 'Compact view' : 'Grid view');
    return;
  }
});

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
applySiteName();
applyView();
renderAll();