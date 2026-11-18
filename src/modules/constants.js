// Tamaño clásico del tablero de batalla naval.
export const BOARD_SIZE = 10;

// Flota estándar. Cada entrada se usa tanto para colocar como para renderizar.
export const FLEET = [
  { name: 'Portaaviones', length: 5, code: 'CV' },
  { name: 'Acorazado', length: 4, code: 'BB' },
  { name: 'Crucero', length: 3, code: 'CG' },
  { name: 'Submarino', length: 3, code: 'SS' },
  { name: 'Destructor', length: 2, code: 'DD' },
];

export const FLEET_LENGTHS = FLEET.map((ship) => ship.length);

// Direcciones usadas por el tablero (colocación) y por la IA (disparos).
export const DIRECTIONS = [
  [0, -1], // norte
  [1, 0],  // este
  [0, 1],  // sur
  [-1, 0], // oeste
];

export const COLS = 'ABCDEFGHIJ';

export const coordKey = (x, y) => `${x},${y}`;

export const inBounds = (x, y, size = BOARD_SIZE) =>
  x >= 0 && y >= 0 && x < size && y < size;

export const coordLabel = (x, y) => `${COLS[x]}${y + 1}`;
