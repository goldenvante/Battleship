import createShip from './ship.js';
import {
  BOARD_SIZE,
  DIRECTIONS,
  coordKey,
  inBounds,
  normalizeSize,
} from './constants.js';

export default function createGameboard(size = BOARD_SIZE) {
  const { width, height } = normalizeSize(size);

  // Cada casilla: { ship, shipIndex, attacked, result }
  const board = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => ({
      ship: null,
      shipIndex: null,
      attacked: false,
      result: null, // 'hit' | 'miss' | null
    })),
  );

  // Cada elemento: { ship, coords: [{x, y}], index }
  const ships = [];
  const missedAttacks = [];

  const getCell = (x, y) => {
    if (!inBounds(x, y, size)) return null;
    const cell = board[y][x];
    return {
      x,
      y,
      attacked: cell.attacked,
      result: cell.result,
      hasShip: Boolean(cell.ship),
      shipIndex: cell.shipIndex,
      shipLength: cell.ship ? cell.ship.length : null,
      shipName: cell.ship ? cell.ship.name : null,
      shipSunk: cell.ship ? cell.ship.isSunk() : false,
    };
  };

  /**
   * Valida que una lista de coordenadas forme una línea recta, contigua,
   * dentro del tablero y sin solapar otra nave.
   */
  const canPlaceShip = (coords) => {
    if (!Array.isArray(coords) || coords.length === 0) return false;

    const keys = new Set();
    for (const { x, y } of coords) {
      if (!inBounds(x, y, { width, height })) return false;
      const key = coordKey(x, y);
      if (keys.has(key)) return false;
      keys.add(key);
      if (board[y][x].ship) return false;
    }

    const xs = coords.map((c) => c.x);
    const ys = coords.map((c) => c.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    const horizontal = minY === maxY;
    const vertical = minX === maxX;
    if (!horizontal && !vertical) return false;

    const expected = horizontal
      ? Array.from({ length: maxX - minX + 1 }, (_, i) => coordKey(minX + i, minY))
      : Array.from({ length: maxY - minY + 1 }, (_, i) => coordKey(minX, minY + i));

    return expected.length === coords.length && expected.every((k) => keys.has(k));
  };

  const placeShip = (ship, coords) => {
    if (!ship || !canPlaceShip(coords)) return false;

    const index = ships.length;
    for (const { x, y } of coords) {
      board[y][x].ship = ship;
      board[y][x].shipIndex = index;
    }
    ships.push({ ship, coords: coords.map(({ x, y }) => ({ x, y })), index });
    return true;
  };

  /** Coloca toda una flota en posiciones legales aleatorias. */
  const placeShipsRandomly = (lengths, names = []) => {
    const placed = [];
    lengths.forEach((length, i) => {
      let coords = null;
      let attempts = 0;
      while (!coords && attempts < 500) {
        attempts += 1;
        const horizontal = Math.random() < 0.5;
        const x = Math.floor(Math.random() * (horizontal ? width - length + 1 : width));
        const y = Math.floor(Math.random() * (horizontal ? height : height - length + 1));
        const candidate = Array.from({ length }, (_, k) => ({
          x: horizontal ? x + k : x,
          y: horizontal ? y : y + k,
        }));
        if (canPlaceShip(candidate)) coords = candidate;
      }
      if (coords) {
        const ship = createShip(length, names[i] || '');
        if (placeShip(ship, coords)) placed.push(ship);
      }
    });
    return placed;
  };

  /**
   * Procesa un disparo. Nunca modifica nada si la casilla ya fue atacada.
   * Devuelve un objeto con el resultado para que la capa de UI pueda animarlo.
   */
  const receiveAttack = (x, y) => {
    if (!inBounds(x, y, { width, height })) return { result: 'invalid', x, y };

    const cell = board[y][x];
    if (cell.attacked) {
      return { result: 'already', x, y, previous: cell.result };
    }

    cell.attacked = true;

    if (cell.ship) {
      cell.result = 'hit';
      cell.ship.hit();
      return {
        result: 'hit',
        x,
        y,
        ship: cell.ship,
        shipIndex: cell.shipIndex,
        sunk: cell.ship.isSunk(),
        shipCoords: ships[cell.shipIndex] ? ships[cell.shipIndex].coords : [],
      };
    }

    cell.result = 'miss';
    missedAttacks.push({ x, y });
    return { result: 'miss', x, y };
  };

  const allShipsSunk = () => ships.length > 0 && ships.every(({ ship }) => ship.isSunk());

  const remainingShips = () => ships.filter(({ ship }) => !ship.isSunk()).length;

  /** Devuelve todas las coordenadas aún no disparadas (útil para la IA). */
  const availableCells = () => {
    const available = [];
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        if (!board[y][x].attacked) available.push({ x, y });
      }
    }
    return available;
  };

  return {
    get size() {
      return width;
    },
    get width() {
      return width;
    },
    get height() {
      return height;
    },
    get board() {
      return board;
    },
    ships,
    missedAttacks,
    getCell,
    canPlaceShip,
    placeShip,
    placeShipsRandomly,
    receiveAttack,
    allShipsSunk,
    remainingShips,
    availableCells,
    neighborsOf(x, y) {
      return DIRECTIONS.map(([dx, dy]) => ({ x: x + dx, y: y + dy })).filter((c) =>
        inBounds(c.x, c.y, { width, height }),
      );
    },
  };
}
