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

// Ninguna dimensión puede ser menor que el barco más grande.
export const MIN_BOARD_SIZE = Math.max(...FLEET_LENGTHS);
export const MAX_BOARD_SIZE = 20;

export const DIRECTIONS = [
  [0, -1], // norte
  [1, 0],  // este
  [0, 1],  // sur
  [-1, 0], // oeste
];

export const COLS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export const coordKey = (x, y) => `${x},${y}`;

/** Acepta un número (cuadrado) o { width, height } / { cols, rows }. */
export const normalizeSize = (size = BOARD_SIZE) => {
  if (typeof size === 'number') return { width: size, height: size };
  return {
    width: Number(size?.width ?? size?.cols ?? BOARD_SIZE),
    height: Number(size?.height ?? size?.rows ?? BOARD_SIZE),
  };
};

export const clampSize = (size) => {
  const { width, height } = normalizeSize(size);
  const clamp = (value) =>
    Math.min(MAX_BOARD_SIZE, Math.max(MIN_BOARD_SIZE, Math.round(Number(value) || BOARD_SIZE)));
  return { width: clamp(width), height: clamp(height) };
};

export const inBounds = (x, y, size = BOARD_SIZE) => {
  const { width, height } = normalizeSize(size);
  return x >= 0 && y >= 0 && x < width && y < height;
};

/** Etiquetas de columna: A, B, ... Z, AA, AB, ... */
export function columnLabel(index) {
  let n = index + 1;
  let label = '';
  while (n > 0) {
    const rest = (n - 1) % 26;
    label = String.fromCharCode(65 + rest) + label;
    n = Math.floor((n - 1) / 26);
  }
  return label;
}

export const coordLabel = (x, y) => `${columnLabel(x)}${y + 1}`;
