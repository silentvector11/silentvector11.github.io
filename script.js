/* ───────────────────────────────────────────────────────
   GAMES ARRAY
   name  : display name
   cat   : action | puzzle | io | sports | racing | adventure | casual | other
   url   : path to game folder index.html
   thumb : path to thumbnail image
─────────────────────────────────────────────────────── */
const GAMES = [
  { name: "Slope",       cat: "action", url: "games/slope/index.html",       thumb: "thumbnails/slope.jpeg" },
  { name: "Drive Mad",   cat: "racing", url: "games/drive-mad/index.html",   thumb: "thumbnails/drive-mad.jpg" },
  { name: "Crossy Road", cat: "casual", url: "games/crossyroad/index.html", thumb: "thumbnails/crossyroad.jpg" },
];

/* ─── STATE ─────────────────────────────────────────── */
let favorites    = JSON.parse(localStorage.getItem('vp_favs')      || '[]');
let recentPlayed = JSON.parse(localStorage.getItem('vp_recent')    || '[]');
let playCounts   = JSON.parse(localStorage.getItem('vp_plays')     || '{}');
let ratings      = JSON.parse(localStorage.getItem('vp_ratings')   || '{}');
let bestTimes    = JSON.parse(localStorage.getItem('vp_best')      || '{}');
let currentGame  = null;
let currentCat   = 'all';
let searchQuery  = '';
let sortMode     = localStorage.getItem('vp_sort')    || 'default';
let compactView  = localStorage.getItem('vp_view')    === 'compact';
let cardSize     = localStorage.getItem('vp_csize')   || 'medium';
let accentColor  = localStorage.getItem('vp_accent')  || '#7c5cfc';
let bgStyle      = localStorage.getItem('vp_bg')      || 'default';
let tabTitle     = localStorage.getItem('vp_tabtitle')|| '';

/* ─── TIMER ─────────────────────────────────────────── */
let timerInterval  = null;
let timerSeconds   = 0;
let sidebarVisible = true;

/* ─── SHORTCUTS ─────────────────────────────────────── */
const DEFAULT_SHORTCUTS = {
  random:     { key: 'r',      alt: false, ctrl: false, desc: 'Random Game',      hint: 'Opens a random game' },
  panic:      { key: 'x',      alt: true,  ctrl: false, desc: 'Panic',            hint: 'Redirects to Google' },
  closeGame:  { key: 'escape', alt: false, ctrl: false, desc: 'Close Game',       hint: 'Closes the game player' },
  stats:      { key: 's',      alt: false, ctrl: false, desc: 'Stats',            hint: 'Opens personal stats' },
  shortcuts:  { key: '?',      alt: false, ctrl: false, desc: 'Shortcuts Panel',  hint: 'Opens this panel' },
  toggleView: { key: 'v',      alt: false, ctrl: false, desc: 'Toggle View',      hint: 'Grid / Compact view' },
  spotlight:  { key: 'c',      alt: true,  ctrl: false, desc: 'Spotlight',        hint: 'Opens game search' },
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

/* ─── TOAST (with auto icon) ────────────────────────── */
function showToast(msg) {
  const t    = document.getElementById('toast');
  const icon = document.getElementById('toastIcon');
  const text = document.getElementById('toastMsg');
  /* auto icon based on message content */
  if      (msg.includes('✅') || msg.includes('saved') || msg.includes('updated')) icon.textContent = '✅';
  else if (msg.includes('❤️') || msg.includes('favorites')) icon.textContent = '❤️';
  else if (msg.includes('Removed'))  icon.textContent = '💔';
  else if (msg.includes('Rated'))    icon.textContent = '⭐';
  else if (msg.includes('reset'))    icon.textContent = '↺';
  else if (msg.includes('view'))     icon.textContent = '⊞';
  else if (msg.includes('mode'))     icon.textContent = '🌓';
  else icon.textContent = 'ℹ️';
  /* strip emoji from msg since icon handles it */
  text.textContent = msg.replace(/^[✅❤️💔⭐↺⊞🌓ℹ️]\s*/,'').replace('❤️ ','');
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2200);
}

/* ─── SCROLL PROGRESS BAR ───────────────────────────── */
window.addEventListener('scroll', () => {
  const scrolled = window.scrollY;
  const total    = document.body.scrollHeight - window.innerHeight;
  const pct      = total > 0 ? (scrolled / total) * 100 : 0;
  document.getElementById('scrollProgress').style.width = pct + '%';
  /* back to top button */
  const btn = document.getElementById('backToTop');
  btn.classList.toggle('visible', scrolled > 300);
});
document.getElementById('backToTop').addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

/* ─── SEARCH CLEAR BUTTON ───────────────────────────── */
document.getElementById('searchInput').addEventListener('input', e => {
  const val = e.target.value;
  document.getElementById('searchClear').classList.toggle('visible', val.length > 0);
  searchQuery = val.trim();
  renderAll();
});
document.getElementById('searchClear').addEventListener('click', () => {
  document.getElementById('searchInput').value = '';
  document.getElementById('searchClear').classList.remove('visible');
  searchQuery = '';
  renderAll();
  document.getElementById('searchInput').focus();
});

/* ─── PAGE LOAD SECTION ANIMATION ───────────────────── */
function animateSections() {
  const sections = document.querySelectorAll('.page-section');
  sections.forEach((s, i) => {
    setTimeout(() => s.classList.add('section-visible'), i * 120);
  });
  document.body.classList.remove('page-loading');
}

/* ─── SKELETON GRID ─────────────────────────────────── */
function showSkeleton(count = 6) {
  const sg = document.getElementById('skeletonGrid');
  sg.classList.remove('hidden');
  sg.innerHTML = Array.from({length: count}, () => `
    <div class="skeleton-card">
      <div class="skeleton-card-thumb"></div>
      <div class="skeleton-card-body">
        <div class="skeleton-line"></div>
        <div class="skeleton-line short"></div>
      </div>
    </div>`).join('');
}
function hideSkeleton() {
  const sg = document.getElementById('skeletonGrid');
  sg.classList.add('hidden');
  sg.innerHTML = '';
}

/* ─── GRID TRANSITION ───────────────────────────────── */
function transitionGrid(fn) {
  const grid = document.getElementById('gameGrid');
  grid.classList.add('transitioning');
  grid.classList.remove('visible');
  setTimeout(() => {
    fn();
    grid.classList.remove('transitioning');
    grid.classList.add('visible');
  }, 200);
}

/* ─── ACTIVE PILL SCROLL ────────────────────────────── */
function scrollActivePill() {
  const bar  = document.getElementById('catTopbar');
  const pill = bar.querySelector('.cat-pill.active');
  if (!pill) return;
  const barRect  = bar.getBoundingClientRect();
  const pillRect = pill.getBoundingClientRect();
  const offset   = pillRect.left - barRect.left - (barRect.width / 2) + (pillRect.width / 2);
  bar.scrollBy({ left: offset, behavior: 'smooth' });
}

/* ─── COUNT BADGE BOUNCE ────────────────────────────── */
function bounceCount(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('bounce');
  void el.offsetWidth; /* reflow */
  el.classList.add('bounce');
  el.addEventListener('animationend', () => el.classList.remove('bounce'), { once: true });
}

/* ─── FULLSCREEN DETECTION ──────────────────────────── */
document.addEventListener('fullscreenchange', () => {
  const bar = document.getElementById('playerBar');
  if (document.fullscreenElement) bar.classList.add('bar-hidden');
  else bar.classList.remove('bar-hidden');
});
document.addEventListener('keydown', e => {
  /* pressing Escape from fullscreen also restores bar */
  if (e.key === 'Escape' && !document.fullscreenElement) {
    document.getElementById('playerBar').classList.remove('bar-hidden');
  }
}, true);


function isFav(name) { return favorites.includes(name); }

function toggleFav(name, e) {
  if (e) e.stopPropagation();
  if (isFav(name)) { favorites = favorites.filter(f => f !== name); showToast('Removed from favorites'); }
  else             { favorites.push(name); showToast('❤️ Added to favorites!'); }
  /* heart pop on card */
  if (e) {
    const btn = e.currentTarget;
    btn.classList.add('pop');
    btn.addEventListener('animationend', () => btn.classList.remove('pop'), { once: true });
  }
  saveState(); renderAll();
}

function addRecent(game) {
  recentPlayed = recentPlayed.filter(r => r !== game.name);
  recentPlayed.unshift(game.name);
  if (recentPlayed.length > 10) recentPlayed.pop();
  playCounts[game.name] = (playCounts[game.name] || 0) + 1;
  saveState();
}

function starsHtml(n) {
  if (!n) return '';
  return '⭐'.repeat(n);
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
  document.getElementById('playerSessionClock').textContent = '00:00';
  timerInterval = setInterval(() => {
    timerSeconds++;
    const t = formatTime(timerSeconds);
    document.getElementById('gisTimer').textContent = t;
    document.getElementById('playerSessionClock').textContent = t;
  }, 1000);
}
function stopTimer() {
  if (!timerInterval) return;
  clearInterval(timerInterval);
  timerInterval = null;
  if (currentGame && timerSeconds > 0) {
    const prev = bestTimes[currentGame.name] || 0;
    if (timerSeconds > prev) { bestTimes[currentGame.name] = timerSeconds; saveState(); }
  }
}
function resetTimer() {
  timerSeconds = 0;
  document.getElementById('gisTimer').textContent = '00:00';
  document.getElementById('playerSessionClock').textContent = '00:00';
}

/* ─── STAR RATING ───────────────────────────────────── */
const starLabels = ['', 'Terrible 😬', 'Meh 😐', 'OK 👍', 'Great 😄', 'Amazing! 🔥'];
function renderStars(gameName) {
  const cur = ratings[gameName] || 0;
  document.querySelectorAll('.gis-star').forEach(s => s.classList.toggle('active', parseInt(s.dataset.star) <= cur));
  document.getElementById('gisStarLabel').textContent = cur > 0 ? starLabels[cur] : 'Tap to rate';
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
  document.getElementById('gisPlayCount').textContent  = playCounts[game.name] || 1;
  document.getElementById('gisBestTime').textContent   = bestTimes[game.name] ? formatTime(bestTimes[game.name]) : '—';
  document.getElementById('gisCat').textContent        = game.cat.charAt(0).toUpperCase() + game.cat.slice(1);
  const totalPlays = Object.values(playCounts).reduce((a,b) => a+b, 0);
  document.getElementById('gisTotalPlays').textContent = totalPlays;
  renderStars(game.name);
}

document.getElementById('sidebarToggleBtn').addEventListener('click', () => sidebarVisible ? closeSidebar() : openSidebar());
document.getElementById('gisCloseBtn').addEventListener('click', closeSidebar);
document.getElementById('gisResetTimer').addEventListener('click', resetTimer);

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
const bgClasses    = ['bg-gradient','bg-animated','bg-dots'];
let   starsAnimReq = null;
function applyBg(style) {
  bgStyle = style;
  bgClasses.forEach(c => document.body.classList.remove(c));
  const canvas = document.getElementById('bgCanvas');
  canvas.classList.remove('visible');
  if (starsAnimReq) { cancelAnimationFrame(starsAnimReq); starsAnimReq = null; }
  if      (style === 'gradient')  document.body.classList.add('bg-gradient');
  else if (style === 'animated')  document.body.classList.add('bg-animated');
  else if (style === 'dots')      document.body.classList.add('bg-dots');
  else if (style === 'stars')   { canvas.classList.add('visible'); drawStars(canvas); }
  localStorage.setItem('vp_bg', style);
}
function drawStars(canvas) {
  const ctx   = canvas.getContext('2d');
  const stars = Array.from({length:160}, () => ({ x:Math.random(), y:Math.random(), r:Math.random()*1.5+.3, a:Math.random(), da:(Math.random()-.5)*.005 }));
  const resize = () => { canvas.width = innerWidth; canvas.height = innerHeight; };
  resize(); window.addEventListener('resize', resize);
  const frame = () => {
    canvas.width = canvas.width;
    stars.forEach(s => {
      s.a = Math.max(.05, Math.min(1, s.a + s.da));
      if (s.a <= .05 || s.a >= 1) s.da *= -1;
      ctx.beginPath(); ctx.arc(s.x*canvas.width, s.y*canvas.height, s.r, 0, Math.PI*2);
      ctx.fillStyle = `rgba(255,255,255,${s.a})`; ctx.fill();
    });
    starsAnimReq = requestAnimationFrame(frame);
  };
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

/* ─── TAB TITLE ─────────────────────────────────────── */
function applyTabTitle() {
  document.title = tabTitle || 'Vault';
}

/* ─── SORT ──────────────────────────────────────────── */
document.getElementById('sortSelect').value = sortMode;
document.getElementById('sortSelect').addEventListener('change', e => {
  sortMode = e.target.value; saveState(); renderAll();
});
function sortGames(list) {
  const l = [...list];
  if (sortMode === 'az')          return l.sort((a,b) => a.name.localeCompare(b.name));
  if (sortMode === 'za')          return l.sort((a,b) => b.name.localeCompare(a.name));
  if (sortMode === 'most-played') return l.sort((a,b) => (playCounts[b.name]||0) - (playCounts[a.name]||0));
  if (sortMode === 'top-rated')   return l.sort((a,b) => (ratings[b.name]||0) - (ratings[a.name]||0));
  return l;
}

/* ─── STATS MODAL ───────────────────────────────────── */
function openStatsModal() {
  const totalPlays  = Object.values(playCounts).reduce((a,b)=>a+b,0);
  const totalGames  = Object.keys(playCounts).length;
  const topGame     = Object.entries(playCounts).sort((a,b)=>b[1]-a[1])[0];
  const topRated    = Object.entries(ratings).sort((a,b)=>b[1]-a[1])[0];
  const avgRating   = Object.values(ratings).length
    ? (Object.values(ratings).reduce((a,b)=>a+b,0)/Object.values(ratings).length).toFixed(1) : '—';
  const favCat = (() => {
    const cats = {};
    Object.entries(playCounts).forEach(([n,c]) => {
      const g = GAMES.find(x => x.name === n);
      if (g) cats[g.cat] = (cats[g.cat]||0)+c;
    });
    const top = Object.entries(cats).sort((a,b)=>b[1]-a[1])[0];
    return top ? top[0] : '—';
  })();
  const mostTime = Object.entries(bestTimes).sort((a,b)=>b[1]-a[1])[0];

  document.getElementById('statsModalBody').innerHTML = `
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-card-value">${totalPlays}</div><div class="stat-card-label">Total Sessions</div></div>
      <div class="stat-card"><div class="stat-card-value">${totalGames}</div><div class="stat-card-label">Games Played</div></div>
      <div class="stat-card"><div class="stat-card-value">${avgRating}⭐</div><div class="stat-card-label">Avg Rating</div></div>
      <div class="stat-card"><div class="stat-card-value">${favorites.length}</div><div class="stat-card-label">Favorites</div></div>
    </div>
    ${topGame ? `<div class="stats-highlight"><div class="stats-highlight-icon">🏆</div><div class="stats-highlight-text"><div class="stats-highlight-label">Most Played</div><div class="stats-highlight-value">${topGame[0]} — ${topGame[1]} sessions</div></div></div>` : ''}
    ${topRated ? `<div class="stats-highlight"><div class="stats-highlight-icon">⭐</div><div class="stats-highlight-text"><div class="stats-highlight-label">Top Rated</div><div class="stats-highlight-value">${topRated[0]} — ${'⭐'.repeat(topRated[1])}</div></div></div>` : ''}
    ${mostTime ? `<div class="stats-highlight"><div class="stats-highlight-icon">⏱️</div><div class="stats-highlight-text"><div class="stats-highlight-label">Most Time Spent</div><div class="stats-highlight-value">${mostTime[0]} — ${formatTime(mostTime[1])} best session</div></div></div>` : ''}
    <div class="stats-section-title">🎮 Game Breakdown</div>
    <table class="stats-table">
      <thead><tr><th>Game</th><th>Plays</th><th>Best Session</th><th>Rating</th><th>Category</th></tr></thead>
      <tbody>${Object.entries(playCounts).sort((a,b)=>b[1]-a[1]).map(([name,count]) => {
        const game = GAMES.find(g => g.name === name);
        return `<tr>
          <td class="td-name">${name}</td>
          <td>${count}</td>
          <td>${bestTimes[name] ? formatTime(bestTimes[name]) : '—'}</td>
          <td>${ratings[name] ? '⭐'.repeat(ratings[name]) : '—'}</td>
          <td style="color:var(--muted)">${game ? game.cat : '—'}</td>
        </tr>`;
      }).join('')}</tbody>
    </table>
    <div style="margin-top:14px;font-size:13px;color:var(--muted)">Favourite category: <strong style="color:var(--text)">${favCat}</strong></div>`;
  document.getElementById('statsModal').classList.add('open');
}
document.getElementById('statsBtn').addEventListener('click', openStatsModal);
document.getElementById('statsModalClose').addEventListener('click', () => document.getElementById('statsModal').classList.remove('open'));
document.getElementById('statsModal').addEventListener('click', e => { if(e.target===document.getElementById('statsModal')) document.getElementById('statsModal').classList.remove('open'); });

/* ─── SHORTCUTS MODAL ───────────────────────────────── */
function renderShortcutsList() {
  const list = document.getElementById('shortcutsList');
  list.innerHTML = Object.entries(shortcuts).map(([id,sc]) => {
    const modifiers = [sc.ctrl ? 'Ctrl+' : '', sc.alt ? 'Alt+' : ''].join('');
    const keyLabel  = sc.key === 'escape' ? 'Esc' : sc.key.toUpperCase();
    return `<div class="shortcut-row">
      <div class="shortcut-desc">${sc.desc}<small>${sc.hint}</small></div>
      <button class="shortcut-key" data-id="${id}">${modifiers}${keyLabel}</button>
    </div>`;
  }).join('');
  list.querySelectorAll('.shortcut-key').forEach(btn => {
    btn.addEventListener('click', () => {
      if (listeningFor) { const p = list.querySelector(`[data-id="${listeningFor}"]`); if(p) p.classList.remove('listening'); }
      listeningFor = btn.dataset.id;
      btn.textContent = 'Press key…';
      btn.classList.add('listening');
    });
  });
}
document.getElementById('shortcutsBtn').addEventListener('click', () => { renderShortcutsList(); document.getElementById('shortcutsModal').classList.add('open'); });
document.getElementById('shortcutsModalClose').addEventListener('click', () => { document.getElementById('shortcutsModal').classList.remove('open'); listeningFor = null; });
document.getElementById('shortcutsModal').addEventListener('click', e => { if(e.target===document.getElementById('shortcutsModal')){ document.getElementById('shortcutsModal').classList.remove('open'); listeningFor = null; }});

/* ─── SETTINGS MODAL ────────────────────────────────── */
document.getElementById('settingsBtn').addEventListener('click', () => {
  document.getElementById('tabTitleInput').value = tabTitle;
  document.getElementById('currentTabTitle').textContent = document.title;
  document.getElementById('bgStyleSelect').value = bgStyle;
  document.querySelectorAll('.swatch').forEach(s => s.classList.toggle('active', s.dataset.color === accentColor));
  document.getElementById('customColorPicker').value = accentColor;
  document.querySelectorAll('.size-btn[data-size]').forEach(b => b.classList.toggle('active', b.dataset.size === cardSize));
  document.getElementById('settingsModal').classList.add('open');
});
document.getElementById('settingsModalClose').addEventListener('click', () => document.getElementById('settingsModal').classList.remove('open'));
document.getElementById('settingsModal').addEventListener('click', e => { if(e.target===document.getElementById('settingsModal')) document.getElementById('settingsModal').classList.remove('open'); });
document.getElementById('settingsThemeBtn').addEventListener('click', () => { darkMode = !darkMode; applyTheme(); showToast(darkMode ? '🌙 Dark mode' : '☀️ Light mode'); });

/* color swatches — live preview */
document.querySelectorAll('.swatch').forEach(s => { s.addEventListener('click', () => applyAccent(s.dataset.color)); });
document.getElementById('customColorPicker').addEventListener('input', e => applyAccent(e.target.value));

/* bg style — live preview */
document.getElementById('bgStyleSelect').addEventListener('change', e => applyBg(e.target.value));

/* card size buttons */
document.querySelectorAll('.size-btn[data-size]').forEach(b => { b.addEventListener('click', () => applyCardSize(b.dataset.size)); });

document.getElementById('resetTabTitleBtn').addEventListener('click', () => {
  tabTitle = ''; document.getElementById('tabTitleInput').value = '';
  applyTabTitle(); saveState(); showToast('Tab title reset to "Vault"');
});

/* save */
document.getElementById('saveSettingsBtn').addEventListener('click', () => {
  tabTitle = document.getElementById('tabTitleInput').value.trim();
  applyTabTitle(); saveState();
  showToast('✅ Settings saved!');
  document.getElementById('settingsModal').classList.remove('open');
});

/* clear all data */
document.getElementById('clearDataBtn').addEventListener('click', () => {
  if (!confirm('Wipe all favorites, history, ratings, stats and settings?')) return;
  ['vp_favs','vp_recent','vp_plays','vp_ratings','vp_best','vp_shortcuts','vp_sort','vp_view','vp_csize','vp_accent','vp_bg','vp_tabtitle','vp_theme'].forEach(k => localStorage.removeItem(k));
  location.reload();
});

/* ─── RENDER CARD ───────────────────────────────────── */
function createCard(game, idx = 0) {
  const div = document.createElement('div');
  div.className = 'game-card';
  /* stagger animation — no max cap so each card gets its own delay */
  div.style.animationDelay = `${idx * 0.04}s`;
  const fav    = isFav(game.name);
  const rating = ratings[game.name] || 0;
  const plays  = playCounts[game.name] || 0;

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
      <div class="card-meta-row">
        <span class="card-cat">${game.cat}</span>
        ${rating ? `<span class="card-rating">${'⭐'.repeat(rating)}</span>` : ''}
        ${plays  ? `<span class="card-played-badge"><svg width="9" height="9" fill="currentColor" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>${plays}</span>` : ''}
      </div>
    </div>`;

  div.querySelector('.fav-btn').addEventListener('click', e => toggleFav(game.name, e));
  div.addEventListener('click', () => openGame(game));
  return div;
}

/* ─── OPEN / CLOSE GAME ─────────────────────────────── */
function openGame(game) {
  currentGame = game;

  /* player bar: thumb + title */
  const pThumb = document.getElementById('playerThumb');
  if (game.thumb) pThumb.innerHTML = `<img src="${game.thumb}" alt="${game.name}">`;
  else pThumb.innerHTML = '';
  document.getElementById('playerTitle').textContent = game.name;

  /* loading overlay: thumb + name */
  const lThumb = document.getElementById('loadingThumb');
  if (game.thumb) lThumb.innerHTML = `<img src="${game.thumb}" alt="${game.name}">`;
  else lThumb.innerHTML = '';
  document.getElementById('loadingName').textContent = game.name;

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
  if      (currentCat === 'favorites') list = list.filter(g => isFav(g.name));
  else if (currentCat === 'recent')    list = recentPlayed.map(n => GAMES.find(g => g.name === n)).filter(Boolean);
  else if (currentCat !== 'all')       list = list.filter(g => g.cat === currentCat);
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    list = list.filter(g => g.name.toLowerCase().includes(q) || g.cat.toLowerCase().includes(q));
  }
  return sortGames(list);
}

/* ─── RENDER ALL ────────────────────────────────────── */
function renderAll() {
  const filtered = getFilteredGames();
  const prevCounts = {};
  ['all','fav','recent','action','puzzle','io','sports','racing','adventure','casual','other'].forEach(c => {
    const el = document.getElementById('cnt-'+c);
    if (el) prevCounts[c] = el.textContent;
  });

  /* counts */
  const newCounts = {
    all: GAMES.length, fav: favorites.length, recent: recentPlayed.length,
    action: GAMES.filter(g=>g.cat==='action').length,
    puzzle: GAMES.filter(g=>g.cat==='puzzle').length,
    io:     GAMES.filter(g=>g.cat==='io').length,
    sports: GAMES.filter(g=>g.cat==='sports').length,
    racing: GAMES.filter(g=>g.cat==='racing').length,
    adventure: GAMES.filter(g=>g.cat==='adventure').length,
    casual: GAMES.filter(g=>g.cat==='casual').length,
    other:  GAMES.filter(g=>g.cat==='other').length,
  };
  Object.entries(newCounts).forEach(([c, val]) => {
    const el = document.getElementById('cnt-'+c);
    if (!el) return;
    el.textContent = val;
    if (String(prevCounts[c]) !== String(val)) bounceCount('cnt-'+c);
  });

  /* notices */
  document.getElementById('addNotice').style.display = GAMES.length === 0 ? 'block' : 'none';

  /* skeleton then grid */
  hideSkeleton();
  const grid = document.getElementById('gameGrid');
  grid.classList.add('visible');
  grid.innerHTML = '';
  filtered.forEach((g,i) => grid.appendChild(createCard(g,i)));

  /* empty states */
  document.getElementById('emptyState').classList.toggle('visible',
    GAMES.length > 0 && filtered.length === 0 && currentCat === 'all' && !!searchQuery);
  document.getElementById('emptyFavState').classList.toggle('visible',
    currentCat === 'favorites' && filtered.length === 0);
  document.getElementById('emptyRecentState').classList.toggle('visible',
    currentCat === 'recent' && filtered.length === 0);

  /* section title */
  const catLabels = { all:'All Games', favorites:'Favorites', recent:'Recently Played', action:'Action', puzzle:'Puzzle', io:'IO Games', sports:'Sports', racing:'Racing', adventure:'Adventure', casual:'Casual', other:'Other' };
  const catIcons  = { all:'🎮', favorites:'❤️', recent:'🕐', action:'⚔️', puzzle:'🧩', io:'🌐', sports:'⚽', racing:'🏎️', adventure:'🗺️', casual:'🎈', other:'✨' };
  document.getElementById('sectionTitle').innerHTML =
    `<span class="section-accent"></span> ${catIcons[currentCat]||''} ${catLabels[currentCat]||'Games'} <span class="section-count">(${filtered.length})</span>`;

  /* favorites mini-section on home */
  const favSecGames = GAMES.filter(g => isFav(g.name));
  const favSec      = document.getElementById('favSection');
  const favSecGrid  = document.getElementById('favGrid');
  favSecGrid.innerHTML = '';
  if (favSecGames.length > 0 && currentCat === 'all' && !searchQuery) {
    favSec.classList.add('visible');
    sortGames(favSecGames).forEach((g,i) => favSecGrid.appendChild(createCard(g,i)));
  } else { favSec.classList.remove('visible'); }

  /* recently played chips */
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
      const plays  = playCounts[name] || 0;
      const rating = ratings[name] || 0;
      chip.innerHTML = `
        <div class="recent-chip-thumb">
          ${game.thumb ? `<img src="${game.thumb}" alt="${game.name}" loading="lazy">` : `<div class="chip-icon">🎮</div>`}
        </div>
        <div class="chip-meta">
          <span class="chip-name">${game.name}</span>
          <span class="chip-sub">${plays ? `▶ ${plays}` : ''}${rating ? ` · ${'⭐'.repeat(rating)}` : ''}</span>
        </div>`;
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
    scrollActivePill();
    showSkeleton(6);
    setTimeout(() => renderAll(), 180);
  });
});

/* ─── RANDOM ────────────────────────────────────────── */
document.getElementById('randomBtn').addEventListener('click', () => {
  if (!GAMES.length) { showToast('Add some games first!'); return; }
  openGame(GAMES[Math.floor(Math.random()*GAMES.length)]);
});

/* ─── PLAYER BUTTONS ────────────────────────────────── */
document.getElementById('backBtn').addEventListener('click', closeGame);
document.getElementById('fullscreenBtn').addEventListener('click', () => {
  const f = document.getElementById('gameFrame');
  if (f.requestFullscreen) f.requestFullscreen();
  else if (f.webkitRequestFullscreen) f.webkitRequestFullscreen();
});
document.getElementById('favInPlayer').addEventListener('click', () => {
  if (!currentGame) return; toggleFav(currentGame.name, null); updatePlayerFavBtn();
});

/* ─── PANIC ─────────────────────────────────────────── */
function triggerPanic() { location.replace('https://www.google.com'); }
document.getElementById('panicBtn').addEventListener('click', triggerPanic);

/* ─── SPOTLIGHT ─────────────────────────────────────── */
let spotlightIndex    = -1;
let spotlightFiltered = [];
let spotlightCat      = 'all';

function openSpotlight() {
  document.getElementById('spotlightOverlay').classList.add('open');
  document.getElementById('spotlightInput').value = '';
  spotlightIndex = -1; spotlightCat = 'all';
  document.querySelectorAll('.spot-cat').forEach(b => b.classList.toggle('active', b.dataset.cat === 'all'));
  renderSpotlight('');
  setTimeout(() => document.getElementById('spotlightInput').focus(), 50);
}
function closeSpotlight() {
  document.getElementById('spotlightOverlay').classList.remove('open');
  spotlightIndex = -1;
}
function highlightMatch(text, query) {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return text.slice(0,idx) + `<mark>${text.slice(idx,idx+query.length)}</mark>` + text.slice(idx+query.length);
}
function renderSpotlight(query) {
  const container = document.getElementById('spotlightResults');
  const q = query.trim().toLowerCase();
  let list = q
    ? GAMES.filter(g => g.name.toLowerCase().includes(q) || g.cat.toLowerCase().includes(q))
    : [...GAMES].sort((a,b) => (playCounts[b.name]||0) - (playCounts[a.name]||0));
  if (spotlightCat !== 'all') list = list.filter(g => g.cat === spotlightCat);
  spotlightFiltered = list;

  if (!list.length) {
    container.innerHTML = `<div class="spotlight-empty"><span>🔍</span>No games found</div>`;
    return;
  }
  const sectionLabel = !q && spotlightCat === 'all'
    ? `<div class="spotlight-section-label">Recently Played & Most Played</div>` : '';

  container.innerHTML = sectionLabel + list.map((game,i) => {
    const plays  = playCounts[game.name] || 0;
    const rating = ratings[game.name] || 0;
    const fav    = isFav(game.name);
    return `<div class="spotlight-result ${i===spotlightIndex?'selected':''}" data-idx="${i}">
      <div class="sr-thumb">
        ${game.thumb ? `<img src="${game.thumb}" alt="${game.name}" loading="lazy">` : `<div class="sr-thumb-placeholder">🎮</div>`}
      </div>
      <div class="sr-info">
        <div class="sr-name">${highlightMatch(game.name, query)}</div>
        <div class="sr-sub">
          <span class="sr-cat">${game.cat}</span>
          ${rating ? `<span class="sr-rating">${'⭐'.repeat(rating)}</span>` : ''}
        </div>
      </div>
      <div class="sr-right">
        ${fav ? '<div class="sr-fav-dot" title="Favorited"></div>' : ''}
        <div class="sr-play-count">${plays ? `▶ ${plays}x` : 'Never played'}</div>
      </div>
    </div>`;
  }).join('');

  container.querySelectorAll('.spotlight-result').forEach(row => {
    row.addEventListener('click', () => { closeSpotlight(); openGame(spotlightFiltered[parseInt(row.dataset.idx)]); });
    row.addEventListener('mouseenter', () => { spotlightIndex = parseInt(row.dataset.idx); updateSpotlightSelection(); });
  });
}
function updateSpotlightSelection() {
  const rows = document.querySelectorAll('.spotlight-result');
  rows.forEach((r,i) => r.classList.toggle('selected', i === spotlightIndex));
  const sel = rows[spotlightIndex];
  if (sel) sel.scrollIntoView({ block: 'nearest' });
}

document.getElementById('spotlightInput').addEventListener('input', e => { spotlightIndex = -1; renderSpotlight(e.target.value); });
document.getElementById('spotlightInput').addEventListener('keydown', e => {
  if (e.key === 'ArrowDown') { e.preventDefault(); spotlightIndex = Math.min(spotlightIndex+1, spotlightFiltered.length-1); updateSpotlightSelection(); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); spotlightIndex = Math.max(spotlightIndex-1, 0); updateSpotlightSelection(); }
  else if (e.key === 'Enter') { const g = spotlightFiltered[spotlightIndex] || spotlightFiltered[0]; if (g) { closeSpotlight(); openGame(g); } }
  else if (e.key === 'Escape') closeSpotlight();
});
document.getElementById('spotlightOverlay').addEventListener('click', e => { if(e.target===document.getElementById('spotlightOverlay')) closeSpotlight(); });
document.getElementById('spotlightBtn').addEventListener('click', openSpotlight);

/* spotlight category filter */
document.querySelectorAll('.spot-cat').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.spot-cat').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    spotlightCat = btn.dataset.cat;
    renderSpotlight(document.getElementById('spotlightInput').value);
  });
});

/* ─── KEYBOARD HANDLER ──────────────────────────────── */
document.addEventListener('keydown', e => {
  if (listeningFor) {
    e.preventDefault();
    /* ignore modifier-only keypresses — wait for the actual key */
    if (['Alt','Control','Shift','Meta'].includes(e.key)) return;
    if (e.key === 'Escape') { listeningFor = null; renderShortcutsList(); return; }
    shortcuts[listeningFor].key  = e.key.toLowerCase();
    shortcuts[listeningFor].alt  = e.altKey;
    shortcuts[listeningFor].ctrl = e.ctrlKey;
    listeningFor = null; saveState(); renderShortcutsList();
    showToast('✅ Shortcut updated!'); return;
  }
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

  /* helper — key must match AND modifiers must match exactly */
  function matches(sc) {
    return e.key.toLowerCase() === sc.key
      && !!e.altKey  === !!sc.alt
      && !!e.ctrlKey === !!sc.ctrl;
  }

  const sc = shortcuts;
  /* close game */
  if (matches(sc.closeGame) && document.getElementById('gamePlayer').classList.contains('open')) { e.preventDefault(); closeGame(); return; }
  /* panic */
  if (matches(sc.panic)) { e.preventDefault(); triggerPanic(); return; }
  /* spotlight */
  if (matches(sc.spotlight)) { e.preventDefault(); openSpotlight(); return; }

  /* below shortcuts only fire when game player is closed */
  if (document.getElementById('gamePlayer').classList.contains('open')) return;
  /* random */
  if (matches(sc.random)) { if (GAMES.length) openGame(GAMES[Math.floor(Math.random()*GAMES.length)]); return; }
  /* stats */
  if (matches(sc.stats)) { openStatsModal(); return; }
  /* shortcuts panel */
  if (matches(sc.shortcuts)) { renderShortcutsList(); document.getElementById('shortcutsModal').classList.toggle('open'); return; }
  /* toggle view */
  if (matches(sc.toggleView)) { compactView = !compactView; applyView(); showToast(compactView ? 'Compact view' : 'Grid view'); return; }
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
applyAccent(accentColor);
applyBg(bgStyle);
applyCardSize(cardSize);
applyTabTitle();
applyView();
renderAll();
/* stagger page sections in */
requestAnimationFrame(() => animateSections());
/* center active pill on load */
setTimeout(() => scrollActivePill(), 100);