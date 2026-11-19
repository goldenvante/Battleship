import createGameboard from './gameboard.js';
import { coordKey } from './constants.js';

export default function createPlayer(name, { isComputer = false, smart = true, size } = {}) {
  const gameboard = createGameboard(size);

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

  
  const getAttack = (enemyBoard) => {
    if (!enemyBoard) return null;

    
    while (queue.length && isAttacked(enemyBoard, queue[0].x, queue[0].y)) {
      queue.shift();
    }
    if (queue.length) return queue.shift();

    if (smart && isComputer && hits.length) {
      const candidates = [];
      for (const hit of hits) {
        
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
