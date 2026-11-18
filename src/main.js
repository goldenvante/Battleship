import createGame from './modules/game.js';
import { BOARD_SIZE } from './modules/constants.js';
import * as dom from './modules/dom.js';
import { sound } from './modules/sound.js';

const game = createGame();
const { $, $$ } = dom;

/* ------------------------------------------------------------------ */
/* Estado de la interfaz                                               */
/* ------------------------------------------------------------------ */

let mode = 'cpu';
let orientation = 'horizontal';
let selectedShip = null;
let hoverAnchor = null;
let setupBoard = null;
let viewerKey = 'player1';
let busy = false;

const boardSetup = $('#placement-board');
const boardOwn = $('#board-own');
const boardEnemy = $('#board-enemy');

dom.buildBoard(boardSetup);
dom.buildBoard(boardOwn);
dom.buildBoard(boardEnemy);
const reticle = dom.createReticle($('.board-frame--enemy'));

const readNames = () => ({
  player1: $('#name-p1').value.trim() || 'Jugador 1',
  player2: $('#name-p2').value.trim() || (mode === 'cpu' ? 'CPU' : 'Jugador 2'),
});

const activeViewer = () => (game.getState().mode === 'pvp' ? viewerKey : 'player1');

/* ------------------------------------------------------------------ */
/* Render                                                              */
/* ------------------------------------------------------------------ */

function renderSetup() {
  const state = game.getState();
  const placingKey = state.placingFor || 'player1';
  const fleet = state.fleets[placingKey];

  setupBoard = state.players[placingKey].board;
  dom.renderBoard(boardSetup, setupBoard, { revealShips: true });

  if (selectedShip === null || selectedShip >= fleet.length || fleet[selectedShip]?.placed) {
    const next = fleet.findIndex((entry) => !entry.placed);
    selectedShip = next === -1 ? null : next;
  }
  dom.renderShipTray($('#ship-tray'), fleet, { selectedIndex: selectedShip });

  const ready = state.placingFor === null;
  $('#btn-start').disabled = !ready;
  $('#btn-random').disabled = ready;
  $('#mode-label').textContent = mode === 'cpu' ? 'CAMPAÑA' : 'VERSUS LOCAL';
  $('.names-row').classList.toggle('is-hidden', mode !== 'pvp');
  $$('.mode-card').forEach((card) => card.classList.toggle('is-active', card.dataset.mode === mode));

  const name = state.players[placingKey].name;
  $('#setup-hint').innerHTML = ready
    ? 'Flota desplegada. Pulsa <strong>Iniciar batalla</strong> para comenzar.'
    : `<strong>${name}</strong>: arrastra un barco al tablero o selecciónalo y haz clic. Usa <kbd>R</kbd> para rotar.`;
}

function renderBattle() {
  const state = game.getState();
  const viewer = activeViewer() || 'player1';
  const ownKey = viewer;
  const enemyKey = game.opponent(viewer);
  const own = state.players[ownKey];
  const enemy = state.players[enemyKey];

  dom.renderBoard(boardOwn, own.board, { revealShips: true });
  dom.renderBoard(boardEnemy, enemy.board, { revealShips: false });
  dom.renderFleetPips($('#own-pips'), own.board);
  dom.renderFleetPips($('#enemy-pips'), enemy.board);
  dom.updateHud(state, viewer);

  const canFire = state.phase === 'playing' && state.current === viewer && !busy;
  boardEnemy.classList.toggle('is-live', canFire);
  $('#panel-enemy').classList.toggle('is-targetable', canFire);
  if (!canFire) reticle.hide();

  $('#battle-hint').textContent =
    state.phase === 'gameover'
      ? 'Partida finalizada.'
      : canFire
        ? 'Haz clic en una coordenada enemiga para abrir fuego.'
        : 'Esperando al oponente…';
}

/* ------------------------------------------------------------------ */
/* Colocación de barcos                                                */
/* ------------------------------------------------------------------ */

function anchorCoords(anchor, length) {
  if (orientation === 'vertical') {
    const y0 = Math.max(0, Math.min(anchor.y, BOARD_SIZE - length));
    return Array.from({ length }, (_, i) => ({ x: anchor.x, y: y0 + i }));
  }
  const x0 = Math.max(0, Math.min(anchor.x, BOARD_SIZE - length));
  return Array.from({ length }, (_, i) => ({ x: x0 + i, y: anchor.y }));
}

function coordsAreFree(coords) {
  return coords.every(({ x, y }) => {
    const cell = setupBoard && setupBoard[y] && setupBoard[y][x];
    return Boolean(cell && !cell.hasShip);
  });
}

function previewAt(anchor) {
  hoverAnchor = anchor;
  const fleet = game.getPlacingFleet();
  if (!fleet || selectedShip === null) return;
  const entry = fleet[selectedShip];
  if (!entry || entry.placed) return;
  const coords = anchorCoords(anchor, entry.length);
  dom.applyPreview(boardSetup, coords, coordsAreFree(coords));
}

function placeAt(anchor) {
  const fleet = game.getPlacingFleet();
  if (!fleet || selectedShip === null) return;
  const entry = fleet[selectedShip];
  if (!entry || entry.placed) return;

  const coords = anchorCoords(anchor, entry.length);
  const result = game.placeShip(selectedShip, coords);
  if (!result.ok) {
    dom.showToast(result.reason, 'warn');
    sound.ui();
    return;
  }

  sound.place();
  dom.clearPreview(boardSetup);
  if (game.getState().placingFor) {
    dom.showToast(`${entry.name} desplegado`, 'success');
  }
  renderSetup();
}

function toggleOrientation() {
  orientation = orientation === 'horizontal' ? 'vertical' : 'horizontal';
  $('#btn-rotate').querySelector('.rotate-label').textContent =
    orientation === 'horizontal' ? 'Horizontal' : 'Vertical';
  $('#btn-rotate').classList.toggle('is-vertical', orientation === 'vertical');
  sound.rotate();
  if (hoverAnchor) previewAt(hoverAnchor);
}

/* ------------------------------------------------------------------ */
/* Flujo de turnos                                                     */
/* ------------------------------------------------------------------ */

function showTurnHandoff(playerKey) {
  const name = game.getState().players[playerKey].name;
  viewerKey = null;
  dom.showOverlay({
    tag: 'CAMBIO DE TURNO',
    title: `Pasa el dispositivo a ${name}`,
    text: 'Asegúrate de que el otro jugador no vea la pantalla antes de continuar.',
    theme: 'handoff',
    primary: {
      label: 'Estoy listo',
      onClick: () => {
        viewerKey = playerKey;
        dom.hideOverlay();
        renderBattle();
        sound.turn();
      },
    },
  });
}

function runCpuTurn() {
  if (busy || game.phase !== 'playing' || game.current !== 'player2') return;
  const result = game.computerTurn();
  if (!result.ok) dom.showToast(result.reason, 'warn');
}

function resetToSetup() {
  busy = false;
  viewerKey = 'player1';
  selectedShip = null;
  hoverAnchor = null;
  orientation = 'horizontal';
  toggleOrientationSilently();
  dom.clearLog();
  dom.hideOverlay();
  reticle.hide();
  game.configure({ mode, names: readNames() });
  dom.setScreen('screen-setup');
  renderSetup();
}

function toggleOrientationSilently() {
  $('#btn-rotate').querySelector('.rotate-label').textContent = 'Horizontal';
  $('#btn-rotate').classList.remove('is-vertical');
}

/* ------------------------------------------------------------------ */
/* Eventos del modelo                                                  */
/* ------------------------------------------------------------------ */

game.on('ship:placed', () => {
  // renderSetup se llama desde placeAt / randomizeFleet.
});

game.on('handoff', ({ playerKey, purpose }) => {
  if (purpose !== 'placement') return;
  const name = game.getState().players[playerKey].name;
  dom.showOverlay({
    tag: 'DESPLIEGUE',
    title: `Turno de ${name}`,
    text: 'Ha llegado el momento de ocultar la pantalla y desplegar tu flota en secreto.',
    theme: 'handoff',
    primary: {
      label: 'Desplegar flota',
      onClick: () => {
        viewerKey = playerKey;
        dom.hideOverlay();
        renderSetup();
        sound.ui();
      },
    },
  });
});

game.on('game:started', () => {
  dom.setScreen('screen-game');
  dom.addLogEntry('Batalla iniciada — sensores activos', 'info');
  renderBattle();
});

game.on('turn:changed', ({ current }) => {
  const state = game.getState();
  if (state.mode === 'pvp' && state.phase === 'playing') {
    setTimeout(() => showTurnHandoff(current), 750);
    return;
  }
  dom.updateHud(state, 'player1');
  if (state.phase === 'playing' && current === 'player2') {
    setTimeout(runCpuTurn, 850);
  } else if (state.phase === 'playing') {
    sound.turn();
  }
});

game.on('attack:resolved', async (payload) => {
  busy = true;
  sound.fire();

  const state = game.getState();
  const viewer = activeViewer() || 'player1';
  const defenderIsOwn = payload.defenderKey === viewer;
  const targetContainer = defenderIsOwn ? boardOwn : boardEnemy;
  const originContainer = defenderIsOwn ? boardEnemy : boardOwn;
  const targetEl = dom.cellAt(targetContainer, payload.coordinate.x, payload.coordinate.y);
  const originEl =
    $('.cell.cell--ship', originContainer) || $('.cell', originContainer);
  const hit = payload.result === 'hit';

  const sunkCells = payload.sunk
    ? (payload.shipCoords || []).map(({ x, y }) => ({ x, y, container: targetContainer }))
    : [];

  await dom.fireAnimation(originEl, targetEl, hit ? 'hit' : 'miss', sunkCells);

  if (hit && payload.sunk) {
    sound.sink();
    dom.shake($(`#panel-${defenderIsOwn ? 'own' : 'enemy'}`));
  } else if (hit) {
    sound.hit();
  } else {
    sound.miss();
  }

  const label = targetEl ? targetEl.dataset.coord : '--';
  const attackerName = state.players[payload.attackerKey]?.name || '?';
  dom.addLogEntry(
    `${attackerName} · ${label} · ${payload.sunk ? 'HUNDIDO' : hit ? 'IMPACTO' : 'AGUA'}`,
    hit ? 'hit' : 'miss',
  );

  busy = false;
  renderBattle();
});

game.on('game:over', ({ winnerKey }) => {
  const state = game.getState();
  const viewer = activeViewer() || 'player1';
  const won = winnerKey === viewer;
  const rival = state.players[game.opponent(viewer)]?.name || 'el rival';

  if (won) {
    sound.victory();
    dom.celebrate();
  } else {
    sound.defeat();
  }

  setTimeout(() => {
    dom.showOverlay({
      tag: won ? 'MISIÓN CUMPLIDA' : 'FLOTA PERDIDA',
      title: won ? '¡VICTORIA!' : 'DERROTA',
      text: won
        ? `Hundiste la flota de ${rival} en ${state.round} rondas.`
        : `${rival} hundió toda tu flota. Mejor suerte en la próxima.`,
      theme: won ? 'victory' : 'defeat',
      html: `
        <div class="result-stats">
          <div><span>RONDAS</span><strong>${String(state.round).padStart(2, '0')}</strong></div>
          <div><span>NAVES PROPIAS</span><strong>${state.players[viewer].remainingShips}/${state.players[viewer].totalShips}</strong></div>
          <div><span>NAVES RIVALES</span><strong>${state.players[game.opponent(viewer)].remainingShips}/${state.players[game.opponent(viewer)].totalShips}</strong></div>
        </div>`,
      primary: { label: 'Revancha', onClick: resetToSetup },
      secondary: { label: 'Ver tableros', onClick: () => dom.hideOverlay() },
    });
  }, 950);
});

/* ------------------------------------------------------------------ */
/* Eventos de la interfaz                                              */
/* ------------------------------------------------------------------ */

$$('.mode-card').forEach((card) => {
  card.addEventListener('click', () => {
    mode = card.dataset.mode;
    sound.ui();
    resetToSetup();
  });
});

['#name-p1', '#name-p2'].forEach((selector) => {
  $(selector).addEventListener('change', () => {
    if (game.phase === 'placement') resetToSetup();
  });
});

const tray = $('#ship-tray');
tray.addEventListener('dragstart', (event) => {
  const card = event.target.closest('.ship-card');
  if (!card || card.classList.contains('is-placed')) return;
  selectedShip = Number(card.dataset.index);
  event.dataTransfer.setData('text/plain', String(selectedShip));
  event.dataTransfer.effectAllowed = 'move';
  $$('.ship-card', tray).forEach((item) => item.classList.toggle('is-selected', item === card));
});

tray.addEventListener('click', (event) => {
  const card = event.target.closest('.ship-card');
  if (!card || card.classList.contains('is-placed')) return;
  selectedShip = Number(card.dataset.index);
  $$('.ship-card', tray).forEach((item) => item.classList.toggle('is-selected', item === card));
  sound.ui();
});

boardSetup.addEventListener('mousemove', (event) => {
  const cell = event.target.closest('.cell');
  if (!cell) return;
  previewAt({ x: Number(cell.dataset.x), y: Number(cell.dataset.y) });
});

boardSetup.addEventListener('mouseleave', () => dom.clearPreview(boardSetup));

boardSetup.addEventListener('click', (event) => {
  const cell = event.target.closest('.cell');
  if (!cell) return;
  placeAt({ x: Number(cell.dataset.x), y: Number(cell.dataset.y) });
});

boardSetup.addEventListener('dragover', (event) => {
  if (selectedShip === null) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = 'move';
  const cell = event.target.closest('.cell');
  if (cell) previewAt({ x: Number(cell.dataset.x), y: Number(cell.dataset.y) });
});

boardSetup.addEventListener('drop', (event) => {
  event.preventDefault();
  const cell = event.target.closest('.cell');
  if (!cell) return;
  if (selectedShip === null) selectedShip = Number(event.dataTransfer.getData('text/plain'));
  placeAt({ x: Number(cell.dataset.x), y: Number(cell.dataset.y) });
});

$('#btn-rotate').addEventListener('click', toggleOrientation);

window.addEventListener('keydown', (event) => {
  if (event.key.toLowerCase() === 'r' && $('#screen-setup').classList.contains('screen--active')) {
    toggleOrientation();
  }
});

$('#btn-random').addEventListener('click', () => {
  if (game.randomizeFleet()) {
    sound.place();
    if (game.getState().placingFor) dom.showToast('Flota desplegada aleatoriamente', 'success');
    renderSetup();
  }
});

$('#btn-start').addEventListener('click', () => {
  if (!game.start()) dom.showToast('Coloca toda la flota primero', 'warn');
});

$('#btn-restart').addEventListener('click', () => resetToSetup());

$('#sound-toggle').addEventListener('click', () => {
  const on = sound.toggle();
  $('#sound-toggle').classList.toggle('is-muted', !on);
  $('#sound-toggle').setAttribute('aria-label', on ? 'Silenciar' : 'Activar sonido');
  if (on) sound.ui();
});

boardEnemy.addEventListener('click', (event) => {
  const cell = event.target.closest('.cell');
  if (!cell) return;
  const state = game.getState();
  const viewer = activeViewer();
  if (busy || state.phase !== 'playing' || !viewer || state.current !== viewer) return;

  const result = game.attack(Number(cell.dataset.x), Number(cell.dataset.y));
  if (!result.ok) dom.showToast(result.reason, 'warn');
});

boardEnemy.addEventListener('mousemove', (event) => {
  const cell = event.target.closest('.cell');
  if (!cell) return;
  const state = game.getState();
  const viewer = activeViewer();
  if (busy || state.phase !== 'playing' || !viewer || state.current !== viewer) {
    reticle.hide();
    return;
  }
  reticle.move(event.clientX, event.clientY, cell.dataset.coord);
  $('#coord-readout').textContent = `OBJETIVO ${cell.dataset.coord}`;
});

boardEnemy.addEventListener('mouseleave', () => {
  reticle.hide();
  $('#coord-readout').textContent = '--';
});

/* ------------------------------------------------------------------ */
/* Arranque                                                            */
/* ------------------------------------------------------------------ */

game.configure({ mode, names: readNames() });
dom.setScreen('screen-setup');
renderSetup();
