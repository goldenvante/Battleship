import createGameboard from './gameboard.js';
import { coordKey, inBounds, BOARD_SIZE } from './constants.js';

/**
 * Fábrica de jugadores.
 * Interface pública: name, isComputer, gameboard,
 *   getAttack(enemyBoard), notifyAttack(...), resetMemory()
 *
 * La computadora implementa una IA "caza y destruye":
 * dispara al azar hasta obtener un impacto, entonces prueba las casillas
 * adyacentes hasta hundir la nave. Nunca repite una coordenada.
 */
export default function createPlayer(name, { isComputer = false, smart = true } = {}) {
  const gameboard = createGameboard();

  // Memoria de la IA (sólo se usa para jugadores controlados por ordenador).
  let hits = [];
  let queue = [];

  const resetMemory = () => {
    hits = [];
    queue = [];
  };

  const isAttacked = (enemyBoard, x, y) => {
    const cell = enemyBoard.getCell(x, y);
    return Boolean(cell && cell.attacked);
  };

  const pushNeighbors = (x, y, enemyBoard) => {
    for (const neighbor of enemyBoard.neighborsOf(x, y)) {
      if (isAttacked(enemyBoard, neighbor.x, neighbor.y)) continue;
      const key = coordKey(neighbor.x, neighbor.y);
      if (queue.some((c) => coordKey(c.x, c.y) === key)) continue;
      queue.push(neighbor);
    }
  };

  /** Devuelve una coordenada legal (nunca disparada dos veces). */
  const getAttack = (enemyBoard) => {
    if (!enemyBoard) return null;

    // Descartar objetivo de la cola que ya fue disparado.
    while (queue.length && isAttacked(enemyBoard, queue[0].x, queue[0].y)) {
      queue.shift();
    }
    if (queue.length) return queue.shift();

    if (smart && isComputer && hits.length) {
      const candidates = [];
      for (const hit of hits) {
        // Ignorar impactos de barcos ya hundidos.
        const cell = enemyBoard.getCell(hit.x, hit.y);
        if (cell && cell.shipSunk) continue;
        for (const neighbor of enemyBoard.neighborsOf(hit.x, hit.y)) {
          if (isAttacked(enemyBoard, neighbor.x, neighbor.y)) continue;
          const key = coordKey(neighbor.x, neighbor.y);
          if (!candidates.some((c) => coordKey(c.x, c.y) === key)) {
            candidates.push(neighbor);
          }
        }
      }
      if (candidates.length) {
        queue.push(...candidates.slice(1));
        return candidates[0];
      }
    }

    const available = enemyBoard.availableCells();
    if (!available.length) return null;
    return available[Math.floor(Math.random() * available.length)];
  };

  /** Informa a la IA del resultado para actualizar su memoria. */
  const notifyAttack = ({ coordinate, result, sunk, enemyBoard }) => {
    if (!isComputer || !smart || !coordinate || result === 'miss' || result === 'invalid') return;

    if (result === 'hit') {
      const key = coordKey(coordinate.x, coordinate.y);
      if (!hits.some((c) => coordKey(c.x, c.y) === key)) {
        hits.push({ ...coordinate });
      }
      if (!sunk && enemyBoard) pushNeighbors(coordinate.x, coordinate.y, enemyBoard);
    }
  };

  return {
    name,
    isComputer,
    smart,
    gameboard,
    getAttack,
    notifyAttack,
    resetMemory,
    get memory() {
      return { hits: [...hits], queue: [...queue] };
    },
  };
}
