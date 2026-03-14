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
    cat: "action",
    url: "games/crossyroad/index.html",
    thumb: "thumbnails/crossyroad.jpg",
  },
];

/* ─── STATE ─────────────────────────────────────────── */
let favorites    = JSON.parse(localStorage.getItem('vp_favs')   || '[]');
let recentPlayed = JSON.parse(localStorage.getItem('vp_recent') || '[]');
let playCounts   = JSON.parse(localStorage.getItem('vp_plays')  || '{}');
let ratings      = JSON.parse(localStorage.getItem('vp_ratings')|| '{}');
let bestTimes    = JSON.parse(localStorage.getItem('vp_best')   || '{}');
let currentGame  = null;
let currentCat   = 'all';
let searchQuery  = '';

/* ─── TIMER STATE ───────────────────────────────────── */
let timerInterval  = null;
let timerSeconds   = 0;
let sidebarVisible = true;

/* ─── HELPERS ───────────────────────────────────────── */
function saveState() {
  localStorage.setItem('vp_favs',    JSON.stringify(favorites));
  localStorage.setItem('vp_recent',  JSON.stringify(recentPlayed));
  localStorage.setItem('vp_plays',   JSON.stringify(playCounts));
  localStorage.setItem('vp_ratings', JSON.stringify(ratings));
  localStorage.setItem('vp_best',    JSON.stringify(bestTimes));
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
    /* save best time */
    if (currentGame && timerSeconds > 0) {
      const prev = bestTimes[currentGame.name] || 0;
      if (timerSeconds > prev) {
        bestTimes[currentGame.name] = timerSeconds;
        saveState();
      }
    }
  }
}

/* ─── STAR RATING ───────────────────────────────────── */
const starLabels = ['', 'Terrible 😬', 'Meh 😐', 'OK 👍', 'Great 😄', 'Amazing! 🔥'];

function renderStars(gameName) {
  const current = ratings[gameName] || 0;
  const stars   = document.querySelectorAll('.gis-star');
  const label   = document.getElementById('gisStarLabel');
  stars.forEach(s => {
    const v = parseInt(s.dataset.star);
    s.classList.toggle('active', v <= current);
  });
  label.textContent = current > 0 ? starLabels[current] : 'Tap to rate';
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
    document.querySelectorAll('.gis-star').forEach(s => {
      s.classList.toggle('active', parseInt(s.dataset.star) <= v);
    });
  });
  star.addEventListener('mouseleave', () => {
    if (currentGame) renderStars(currentGame.name);
  });
});

/* ─── SIDEBAR ───────────────────────────────────────── */
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
  /* thumbnail */
  const thumb = document.getElementById('gisThumbnail');
  thumb.innerHTML = game.thumb
    ? `<img src="${game.thumb}" alt="${game.name}">`
    : `<div class="gis-thumb-placeholder">🎮</div>`;

  /* play count */
  document.getElementById('gisPlayCount').textContent = playCounts[game.name] || 1;

  /* best time */
  const best = bestTimes[game.name];
  document.getElementById('gisBestTime').textContent = best ? formatTime(best) : '—';

  /* category */
  document.getElementById('gisCat').textContent = game.cat.charAt(0).toUpperCase() + game.cat.slice(1);

  /* stars */
  renderStars(game.name);
}

document.getElementById('sidebarToggleBtn').addEventListener('click', () => {
  sidebarVisible ? closeSidebar() : openSidebar();
});
document.getElementById('gisCloseBtn').addEventListener('click', closeSidebar);

/* ─── RENDER CARD ───────────────────────────────────── */
function createCard(game, idx = 0) {
  const div = document.createElement('div');
  div.className = 'game-card';
  div.style.animationDelay = `${Math.min(idx * 0.05, 0.4)}s`;

  const plays = playCounts[game.name] || 0;
  const fav   = isFav(game.name);

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
      <div class="card-meta">
        <span class="card-cat">${game.cat}</span>
      </div>
    </div>`;

  div.querySelector('.fav-btn').addEventListener('click', e => toggleFav(game.name, e));
  div.addEventListener('click', () => openGame(game));
  return div;
}

/* ─── OPEN GAME ─────────────────────────────────────── */
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

  /* sidebar counts */
  document.getElementById('cnt-all').textContent    = GAMES.length;
  document.getElementById('cnt-fav').textContent    = favorites.length;
  document.getElementById('cnt-recent').textContent = recentPlayed.length;
  ['action','puzzle','io','sports','racing','adventure','casual','other'].forEach(c => {
    const el = document.getElementById('cnt-' + c);
    if (el) el.textContent = GAMES.filter(g => g.cat === c).length;
  });

  /* no games notice */
  document.getElementById('addNotice').style.display = GAMES.length === 0 ? 'block' : 'none';

  /* main game grid */
  const grid = document.getElementById('gameGrid');
  grid.innerHTML = '';
  filtered.forEach((g, i) => grid.appendChild(createCard(g, i)));

  /* empty search state */
  const empty = document.getElementById('emptyState');
  empty.classList.toggle('visible',
    GAMES.length > 0 && filtered.length === 0 &&
    (currentCat === 'all' || currentCat === 'favorites' || currentCat === 'recent')
  );

  /* section title */
  const titles = {
    all: 'All Games', favorites: 'Favorites', recent: 'Recently Played',
    action: 'Action', puzzle: 'Puzzle', io: 'IO Games', sports: 'Sports',
    racing: 'Racing', adventure: 'Adventure', casual: 'Casual', other: 'Other'
  };
  document.getElementById('sectionTitle').innerHTML = `<span class="dot"></span> ${titles[currentCat] || 'Games'}`;

  /* favorites section (homepage only) */
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

  /* recently played chips (homepage only) */
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
          ${game.thumb
            ? `<img src="${game.thumb}" alt="${game.name}" loading="lazy">`
            : `<div class="chip-icon">🎮</div>`}
        </div>
        ${game.name}`;
      chip.addEventListener('click', () => openGame(game));
      chips.appendChild(chip);
    });
  } else {
    recentSec.classList.remove('visible');
  }

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
  const g = GAMES[Math.floor(Math.random() * GAMES.length)];
  openGame(g);
});

/* ─── BACK / ESC TO CLOSE ───────────────────────────── */
document.getElementById('backBtn').addEventListener('click', closeGame);

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && document.getElementById('gamePlayer').classList.contains('open')) {
    closeGame();
  }
  /* Alt+X — panic toggle */
  if (e.altKey && e.key === 'x') {
    e.preventDefault();
    togglePanic();
  }
});

/* ─── FULLSCREEN ────────────────────────────────────── */
document.getElementById('fullscreenBtn').addEventListener('click', () => {
  const frame = document.getElementById('gameFrame');
  if (frame.requestFullscreen) frame.requestFullscreen();
  else if (frame.webkitRequestFullscreen) frame.webkitRequestFullscreen();
});

/* ─── FAVORITE BUTTON IN PLAYER ─────────────────────── */
document.getElementById('favInPlayer').addEventListener('click', () => {
  if (!currentGame) return;
  toggleFav(currentGame.name, null);
  updatePlayerFavBtn();
});

/* ─── PANIC BUTTON ──────────────────────────────────── */
let panicActive = false;

function togglePanic() {
  panicActive = !panicActive;
  document.getElementById('panicOverlay').classList.toggle('active', panicActive);
  if (panicActive) {
    /* change tab title to look like Google */
    document.title = 'Google';
  } else {
    document.title = 'VaultPlay — Free Games Online';
  }
}

document.getElementById('panicBtn').addEventListener('click', togglePanic);

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
renderAll();