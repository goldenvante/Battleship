import { columnLabel, normalizeSize } from './constants.js';

export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

export function buildBoard(container, size = 10) {
  const { width, height } = normalizeSize(size);
  container.innerHTML = '';
  const grid = document.createElement('div');
  grid.className = 'board-grid';
  grid.style.setProperty('--board-cols', String(width));
  grid.style.setProperty('--board-rows', String(height));

  for (let y = -1; y < height; y += 1) {
    for (let x = -1; x < width; x += 1) {
      const el = document.createElement('div');
      if (x === -1 && y === -1) {
        el.className = 'board-grid__corner';
      } else if (x === -1) {
        el.className = 'board-grid__label board-grid__label--row';
        el.textContent = String(y + 1);
      } else if (y === -1) {
        el.className = 'board-grid__label board-grid__label--col';
        el.textContent = columnLabel(x);
      } else {
        el.className = 'cell';
        el.dataset.x = String(x);
        el.dataset.y = String(y);
        el.dataset.coord = `${columnLabel(x)}${y + 1}`;
        const content = document.createElement('span');
        content.className = 'cell__content';
        el.appendChild(content);
      }
      grid.appendChild(el);
    }
  }

  container.appendChild(grid);
  return grid;
}

export const cellAt = (container, x, y) =>
  $(`.cell[data-x="${x}"][data-y="${y}"]`, container);

export function updateSizePresets(size) {
  $$('.size-preset').forEach((button) => {
    const active = Number(button.dataset.cols) === size.width && Number(button.dataset.rows) === size.height;
    button.classList.toggle('is-active', active);
  });
}

function shipPartInfo(matrix, x, y) {
  const index = matrix[y][x].shipIndex;
  const same = (xx, yy) => Boolean(matrix[yy] && matrix[yy][xx] && matrix[yy][xx].shipIndex === index);

  if (same(x - 1, y) || same(x + 1, y)) {
    const first = !same(x - 1, y);
    const last = !same(x + 1, y);
    return { orientation: 'horizontal', part: first ? 'start' : last ? 'end' : 'mid' };
  }

  const first = !same(x, y - 1);
  const last = !same(x, y + 1);
  return { orientation: 'vertical', part: first ? 'start' : last ? 'end' : 'mid' };
}

const describeCell = (cell, revealShips) => {
  if (cell.result === 'hit') return cell.shipSunk ? 'barco hundido' : 'impacto confirmado';
  if (cell.result === 'miss') return 'disparo al agua';
  if (cell.hasShip && revealShips) return `${cell.shipName || 'barco'} (${cell.shipLength})`;
  return 'sin explorar';
};


export function renderBoard(container, matrix, { revealShips = false } = {}) {
  const grid = $('.board-grid', container) || buildBoard(container);

  $$('.cell', grid).forEach((el) => {
    const x = Number(el.dataset.x);
    const y = Number(el.dataset.y);
    const data = matrix[y] && matrix[y][x];
    if (!data) return;

    el.className = 'cell';
    el.removeAttribute('data-part');
    el.removeAttribute('data-orientation');
    el.style.removeProperty('--ship-index');
    const content = $('.cell__content', el);
    if (content) content.innerHTML = '';
    el.title = `${el.dataset.coord} — ${describeCell(data, revealShips)}`;

    if (data.attacked && data.result === 'miss') el.classList.add('cell--miss');
    if (data.attacked && data.result === 'hit') {
      el.classList.add('cell--hit');
      if (data.shipSunk) el.classList.add('cell--sunk');
    }

    const showShip = data.hasShip && (revealShips || data.result === 'hit' || data.shipSunk);
    if (showShip) {
      el.classList.add('cell--ship');
      el.classList.add(revealShips ? 'cell--ship-owned' : 'cell--ship-revealed');
      const info = shipPartInfo(matrix, x, y);
      el.dataset.part = info.part;
      el.dataset.orientation = info.orientation;
      el.style.setProperty('--ship-index', String(data.shipIndex ?? 0));
      const ship = document.createElement('span');
      ship.className = `ship-part ship-part--${info.part}`;
      content.appendChild(ship);
    }
  });
}

export function clearPreview(container) {
  $$('.cell', container).forEach((cell) => {
    cell.classList.remove('cell--preview-ok', 'cell--preview-bad');
  });
}

export function applyPreview(container, coords, valid) {
  clearPreview(container);
  coords.forEach(({ x, y }) => {
    const el = cellAt(container, x, y);
    if (el) el.classList.add(valid ? 'cell--preview-ok' : 'cell--preview-bad');
  });
}

/* ------------------------------------------------------------------ */
/* Flota, pips y HUD                                                   */
/* ------------------------------------------------------------------ */

export function renderShipTray(container, fleet, { selectedIndex = null } = {}) {
  container.innerHTML = '';
  fleet.forEach((entry, index) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'ship-card';
    card.dataset.index = String(index);
    card.draggable = !entry.placed;
    if (entry.placed) card.classList.add('is-placed');
    if (index === selectedIndex) card.classList.add('is-selected');

    const pips = Array.from({ length: entry.length }, () => '<i></i>').join('');
    card.innerHTML = `
      <span class="ship-card__code">${entry.code}</span>
      <span class="ship-card__body">
        <span class="ship-card__name">${entry.name}</span>
        <span class="ship-card__pips">${pips}</span>
      </span>
      <img class="ship-card__icon" src="./src/assets/ships/placeholder-ship-icon.svg" alt="" />
      <span class="ship-card__status">${entry.placed ? 'DESPLEGADO' : 'LISTO'}</span>
    `;
    container.appendChild(card);
  });
}

export function renderFleetPips(container, board) {
  const groups = new Map();
  board.forEach((row) => row.forEach((cell) => {
    if (!cell.hasShip) return;
    if (!groups.has(cell.shipIndex)) groups.set(cell.shipIndex, []);
    groups.get(cell.shipIndex).push(cell);
  }));

  container.innerHTML = '';
  [...groups.keys()].sort((a, b) => a - b).forEach((index) => {
    const cells = groups.get(index);
    const sunk = cells.every((cell) => cell.result === 'hit');
    const pip = document.createElement('span');
    pip.className = `pip${sunk ? ' pip--sunk' : ''}`;
    pip.title = cells[0]?.shipName || `Nave ${index + 1}`;
    container.appendChild(pip);
  });
}

export function updateHud(state, viewer) {
  const { players, current, round, mode, phase } = state;
  const ownKey = viewer || 'player1';
  const enemyKey = ownKey === 'player1' ? 'player2' : 'player1';

  const setText = (id, value) => {
    const el = $(id);
    if (el) el.textContent = value;
  };

  setText('#own-title', players[ownKey]?.name || '—');
  setText('#enemy-title', players[enemyKey]?.name || '—');
  setText('#round', `RONDA ${String(round).padStart(2, '0')}`);

  const indicator = $('#turn-indicator');
  if (indicator) {
    const isViewerTurn = current === ownKey;
    indicator.classList.toggle('turn-indicator--enemy', !isViewerTurn);
    indicator.classList.toggle('turn-indicator--live', phase === 'playing' && isViewerTurn);
    setText('#turn-label', phase === 'gameover' ? 'FIN' : isViewerTurn ? 'TU TURNO' : 'ESPERANDO');
    setText('#turn-name', players[current]?.name || '—');
  }

  setText('#mode-label', mode === 'cpu' ? 'CAMPAÑA' : 'VERSUS LOCAL');
  setText('#own-health', `${players[ownKey]?.remainingShips ?? 0}/${players[ownKey]?.totalShips ?? 0}`);
  setText('#enemy-health', `${players[enemyKey]?.remainingShips ?? 0}/${players[enemyKey]?.totalShips ?? 0}`);
}

/* ------------------------------------------------------------------ */
/* Pantallas, mensajes y overlays                                      */
/* ------------------------------------------------------------------ */

export function setScreen(id) {
  $$('.screen').forEach((screen) => screen.classList.toggle('screen--active', screen.id === id));
  document.body.classList.toggle('screen-setup', id === 'screen-setup');
  document.body.classList.toggle('screen-game', id === 'screen-game');
}

let toastTimer;
export function showToast(text, type = 'info') {
  const area = $('#toast-area');
  if (!area) return;
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.innerHTML = `<span class="toast__icon"></span><span>${text}</span>`;
  area.appendChild(toast);
  void toast.offsetWidth; // forzar reflow para que la transición se active
  toast.classList.add('is-visible');
  clearTimeout(toastTimer);
  setTimeout(() => {
    toast.classList.remove('is-visible');
    setTimeout(() => toast.remove(), 350);
  }, 2600);
}

let overlayHideTimer;
export function showOverlay(config = {}) {
  const overlay = $('#overlay');
  const card = $('#overlay-card');
  if (!overlay || !card) return;
  clearTimeout(overlayHideTimer);

  const theme = config.theme || 'info';
  card.className = `overlay__card overlay__card--${theme}`;
  card.innerHTML = `
    <div class="overlay__grid" aria-hidden="true"></div>
    <span class="overlay__tag">${config.tag || 'SISTEMA'}</span>
    <h2 class="overlay__title" data-text="${config.title || ''}">${config.title || ''}</h2>
    ${config.text ? `<p class="overlay__text">${config.text}</p>` : ''}
    ${config.html || ''}
    <div class="overlay__actions">
      ${config.secondary ? `<button type="button" class="btn btn--ghost" data-overlay="secondary">${config.secondary.label}</button>` : ''}
      <button type="button" class="btn btn--primary" data-overlay="primary">${config.primary?.label || 'Continuar'}</button>
    </div>
  `;

  overlay.classList.remove('is-hidden');
  void overlay.offsetWidth; // forzar reflow para que la transición se active
  overlay.classList.add('is-visible');

  const primary = $('[data-overlay="primary"]', card);
  const secondary = $('[data-overlay="secondary"]', card);
  if (primary) primary.addEventListener('click', () => config.primary?.onClick?.());
  if (secondary) secondary.addEventListener('click', () => config.secondary?.onClick?.());
}

export function hideOverlay() {
  const overlay = $('#overlay');
  if (!overlay) return;
  overlay.classList.remove('is-visible');
  overlayHideTimer = setTimeout(() => overlay.classList.add('is-hidden'), 260);
}

export function addLogEntry(text, type = 'info') {
  const log = $('#combat-log');
  if (!log) return;
  const entry = document.createElement('div');
  entry.className = `log-entry log-entry--${type}`;
  entry.innerHTML = `<span class="log-entry__dot"></span><span>${text}</span>`;
  log.prepend(entry);
  while (log.children.length > 6) log.lastElementChild.remove();
}

export function clearLog() {
  const log = $('#combat-log');
  if (log) log.innerHTML = '';
}

/* ------------------------------------------------------------------ */
/* Efectos especiales                                                  */
/* ------------------------------------------------------------------ */

const rectCenter = (el) => {
  const rect = el.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
};

export function fireAnimation(fromEl, toEl, kind, sunkCells = []) {
  const layer = $('#fx-layer');
  if (!layer) return Promise.resolve();

  if (fromEl && toEl) {
    const from = rectCenter(fromEl);
    const to = rectCenter(toEl);
    const length = Math.hypot(to.x - from.x, to.y - from.y);
    const angle = (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI;
    const tracer = document.createElement('div');
    tracer.className = `tracer tracer--${kind}`;
    tracer.style.left = `${from.x}px`;
    tracer.style.top = `${from.y}px`;
    tracer.style.width = `${length}px`;
    tracer.style.transform = `rotate(${angle}deg)`;
    layer.appendChild(tracer);
    setTimeout(() => tracer.remove(), 700);
  }

  if (toEl) {
    const { x, y } = rectCenter(toEl);
    const burst = document.createElement('div');
    burst.className = `burst burst--${kind}`;
    burst.style.left = `${x}px`;
    burst.style.top = `${y}px`;
    layer.appendChild(burst);
    setTimeout(() => burst.remove(), 950);

    const fxClass = kind === 'hit' ? 'cell--fx-hit' : 'cell--fx-miss';
    toEl.classList.add(fxClass);
    setTimeout(() => toEl.classList.remove(fxClass), 650);
  }

  sunkCells.forEach(({ x, y, container }) => {
    const el = container && cellAt(container, x, y);
    if (!el) return;
    el.classList.add('cell--fx-sink');
    setTimeout(() => el.classList.remove('cell--fx-sink'), 1400);
  });

  return new Promise((resolve) => setTimeout(resolve, 620));
}

export function shake(el) {
  if (!el) return;
  el.classList.remove('panel--shake');
  void el.offsetWidth;
  el.classList.add('panel--shake');
  setTimeout(() => el.classList.remove('panel--shake'), 500);
}

export function celebrate() {
  const layer = $('#fx-layer');
  if (!layer) return;
  for (let i = 0; i < 46; i += 1) {
    const particle = document.createElement('span');
    particle.className = 'confetti';
    particle.style.left = `${Math.random() * 100}vw`;
    particle.style.setProperty('--delay', `${Math.random() * 0.6}s`);
    particle.style.setProperty('--drift', `${(Math.random() - 0.5) * 220}px`);
    particle.style.setProperty('--hue', `${Math.floor(Math.random() * 80) + 160}`);
    layer.appendChild(particle);
    setTimeout(() => particle.remove(), 3200);
  }
}

export function createReticle(container) {
  if (!container) return { move() {}, show() {}, hide() {} };
  const reticle = document.createElement('div');
  reticle.className = 'reticle';
  reticle.innerHTML = '<span class="reticle__ring"></span><span class="reticle__label">--</span>';
  container.appendChild(reticle);

  return {
    move(clientX, clientY, label) {
      const rect = container.getBoundingClientRect();
      reticle.style.left = `${clientX - rect.left}px`;
      reticle.style.top = `${clientY - rect.top}px`;
      $('.reticle__label', reticle).textContent = label || '--';
      reticle.classList.add('is-visible');
    },
    hide() {
      reticle.classList.remove('is-visible');
    },
  };
}
