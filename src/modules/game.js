import createShip from './ship.js';
import createPlayer from './player.js';
import {
  FLEET,
  FLEET_LENGTHS,
  BOARD_SIZE,
} from './constants.js';

/**
 * Controlador del juego: turnos, fase, victoria y colocación.
 * Expone un pequeño bus de eventos para que la capa DOM reaccione sin
 * conocer las reglas. Toda la lógica se prueba sin tocar el DOM.
 */
export default function createGame() {
  let mode = 'cpu';
  let phase = 'idle'; // idle | placement | playing | gameover
  let players = {};
  let fleets = {};
  let placingFor = null;
  let current = 'player1';
  let winner = null;
  let round = 1;
  let names = { player1: 'Jugador 1', player2: 'CPU' };

  const listeners = new Map();

  const on = (event, callback) => {
    if (!listeners.has(event)) listeners.set(event, new Set());
    listeners.get(event).add(callback);
    return () => listeners.get(event)?.delete(callback);
  };

  const emit = (event, payload = {}) => {
    listeners.get(event)?.forEach((callback) => callback(payload));
    if (event !== 'state:changed') {
      listeners.get('state:changed')?.forEach((callback) => callback({ event, ...payload }));
    }
  };

  const opponent = (key) => (key === 'player1' ? 'player2' : 'player1');

  const freshFleet = () =>
    FLEET.map((entry) => ({ ...entry, placed: false, coords: null }));

  const configure = ({ mode: nextMode = 'cpu', names: nextNames } = {}) => {
    mode = nextMode === 'pvp' ? 'pvp' : 'cpu';
    names = {
      player1: nextNames?.player1 || 'Jugador 1',
      player2: nextNames?.player2 || (mode === 'cpu' ? 'CPU' : 'Jugador 2'),
    };

    players = {
      player1: createPlayer(names.player1),
      player2: createPlayer(names.player2, { isComputer: mode === 'cpu', smart: true }),
    };

    fleets = { player1: freshFleet(), player2: freshFleet() };

    // La flota de la CPU ya está lista; los humanos la colocarán después.
    if (mode === 'cpu') {
      players.player2.gameboard.placeShipsRandomly(FLEET_LENGTHS, FLEET.map((s) => s.name));
      fleets.player2 = fleets.player2.map((entry) => ({ ...entry, placed: true }));
    }

    phase = 'placement';
    placingFor = 'player1';
    current = 'player1';
    winner = null;
    round = 1;

    emit('configured', { mode, placingFor, names: { ...names } });
    return true;
  };

  const getPlacingFleet = () => (placingFor ? fleets[placingFor] : null);

  const advancePlacement = () => {
    const fleet = fleets[placingFor];
    if (!fleet || !fleet.every((entry) => entry.placed)) return false;
    emit('placement:complete', { playerKey: placingFor });

    if (placingFor === 'player1' && mode === 'pvp') {
      placingFor = 'player2';
      emit('handoff', { playerKey: 'player2', purpose: 'placement' });
    } else {
      placingFor = null;
      emit('placement:ready', { mode });
    }
    return true;
  };

  const placeShip = (index, coords) => {
    if (phase !== 'placement' || !placingFor) return { ok: false, reason: 'Ahora no toca colocar' };
    const entry = fleets[placingFor][index];
    if (!entry || entry.placed) return { ok: false, reason: 'Ese barco ya está colocado' };

    const ship = createShip(entry.length, entry.name);
    if (!players[placingFor].gameboard.placeShip(ship, coords)) {
      return { ok: false, reason: 'Posición no válida' };
    }

    entry.placed = true;
    entry.coords = coords.map(({ x, y }) => ({ x, y }));
    emit('ship:placed', { playerKey: placingFor, index, coords: entry.coords, ship });
    advancePlacement();
    return { ok: true, index, coords: entry.coords };
  };

  const randomizeFleet = () => {
    if (phase !== 'placement' || !placingFor) return false;
    const board = players[placingFor].gameboard;
    const pending = fleets[placingFor]
      .map((entry, index) => ({ entry, index }))
      .filter(({ entry }) => !entry.placed);
    if (!pending.length) return false;

    const startIndex = board.ships.length;
    board.placeShipsRandomly(
      pending.map(({ entry }) => entry.length),
      pending.map(({ entry }) => entry.name),
    );

    pending.forEach(({ entry }, i) => {
      const placement = board.ships[startIndex + i];
      if (!placement) return;
      entry.placed = true;
      entry.coords = placement.coords.map(({ x, y }) => ({ x, y }));
      emit('ship:placed', { playerKey: placingFor, index: entry.index || fleets[placingFor].indexOf(entry), coords: entry.coords });
    });

    advancePlacement();
    return true;
  };

  const start = () => {
    if (phase !== 'placement' || placingFor !== null) return false;
    phase = 'playing';
    current = 'player1';
    winner = null;
    round = 1;
    players.player1.resetMemory();
    players.player2.resetMemory();
    emit('game:started', { mode });
    emit('turn:changed', { current, round });
    return true;
  };

  const finish = (winnerKey) => {
    phase = 'gameover';
    winner = winnerKey;
    emit('game:over', { winnerKey, loserKey: opponent(winnerKey) });
  };

  const switchTurn = () => {
    current = opponent(current);
    if (current === 'player1') round += 1;
    emit('turn:changed', { current, round });
  };

  const performAttack = (attackerKey, defenderKey, x, y) => {
    const attacker = players[attackerKey];
    const defender = players[defenderKey];
    const attack = defender.gameboard.receiveAttack(x, y);

    if (attack.result === 'invalid') return { ok: false, reason: 'Fuera del tablero' };
    if (attack.result === 'already') return { ok: false, reason: 'Ya disparaste ahí' };

    attacker.notifyAttack({
      coordinate: { x, y },
      result: attack.result,
      sunk: attack.sunk,
      enemyBoard: defender.gameboard,
    });

    const payload = {
      attackerKey,
      defenderKey,
      coordinate: { x, y },
      result: attack.result,
      sunk: Boolean(attack.sunk),
      ship: attack.ship || null,
      shipCoords: attack.shipCoords || [],
    };
    emit('attack:resolved', payload);

    if (defender.gameboard.allShipsSunk()) {
      finish(attackerKey);
    } else {
      switchTurn();
    }
    return { ok: true, ...attack };
  };

  /** Disparo del jugador humano (o del jugador 1 en modo local). */
  const attack = (x, y) => {
    if (phase !== 'playing') return { ok: false, reason: 'La partida no está en curso' };
    if (players[current].isComputer) return { ok: false, reason: 'Es el turno de la CPU' };
    return performAttack(current, opponent(current), x, y);
  };

  /** Turno de la computadora: elige un movimiento legal y dispara. */
  const computerTurn = () => {
    if (phase !== 'playing' || !players[current]?.isComputer) {
      return { ok: false, reason: 'No es turno de la CPU' };
    }
    const target = players[current].getAttack(players.player1.gameboard);
    if (!target) return { ok: false, reason: 'No quedan movimientos' };
    return performAttack(current, 'player1', target.x, target.y);
  };

  const serializePlayer = (key) => {
    const player = players[key];
    if (!player) return null;
    const board = [];
    for (let y = 0; y < BOARD_SIZE; y += 1) {
      board.push(
        Array.from({ length: BOARD_SIZE }, (_, x) => player.gameboard.getCell(x, y)),
      );
    }
    return {
      name: player.name,
      isComputer: player.isComputer,
      board,
      remainingShips: player.gameboard.remainingShips(),
      totalShips: player.gameboard.ships.length,
    };
  };

  const getState = () => ({
    mode,
    phase,
    current,
    winner,
    round,
    placingFor,
    players: {
      player1: serializePlayer('player1'),
      player2: serializePlayer('player2'),
    },
    fleets: {
      player1: fleets.player1 ? fleets.player1.map((f) => ({ ...f })) : [],
      player2: fleets.player2 ? fleets.player2.map((f) => ({ ...f })) : [],
    },
  });

  return {
    on,
    emit,
    configure,
    placeShip,
    randomizeFleet,
    getPlacingFleet,
    start,
    attack,
    computerTurn,
    getState,
    opponent,
    get current() {
      return current;
    },
    get phase() {
      return phase;
    },
    get winner() {
      return winner;
    },
  };
}
