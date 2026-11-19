import createGameboard from '../src/modules/gameboard.js';
import createShip from '../src/modules/ship.js';

describe('Gameboard', () => {
  test('coloca un barco en coordenadas concretas', () => {
    const board = createGameboard();
    const ship = createShip(3);
    const coords = [{ x: 2, y: 4 }, { x: 3, y: 4 }, { x: 4, y: 4 }];

    expect(board.placeShip(ship, coords)).toBe(true);
    expect(board.getCell(2, 4).hasShip).toBe(true);
    expect(board.getCell(4, 4).hasShip).toBe(true);
    expect(board.getCell(2, 5).hasShip).toBe(false);
    expect(board.ships).toHaveLength(1);
  });

  test('rechaza colocaciones diagonales, fuera de rango y solapadas', () => {
    const board = createGameboard(10);
    const ship = createShip(3);
    expect(
      board.canPlaceShip([{ x: 1, y: 1 }, { x: 2, y: 2 }, { x: 3, y: 3 }]),
    ).toBe(false);
    expect(
      board.canPlaceShip([{ x: 9, y: 9 }, { x: 10, y: 9 }, { x: 11, y: 9 }]),
    ).toBe(false);
    expect(board.placeShip(ship, [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }])).toBe(true);
    expect(
      board.canPlaceShip([{ x: 1, y: 0 }, { x: 1, y: 1 }, { x: 1, y: 2 }]),
    ).toBe(false);
    expect(board.ships).toHaveLength(1);
  });

  test('receiveAttack envía el impacto al barco correcto', () => {
    const board = createGameboard();
    const ship = createShip(2);
    board.placeShip(ship, [{ x: 5, y: 5 }, { x: 6, y: 5 }]);

    const attack = board.receiveAttack(5, 5);
    expect(attack.result).toBe('hit');
    expect(ship.hits).toBe(1);
    expect(attack.sunk).toBe(false);
    expect(board.getCell(5, 5).result).toBe('hit');
  });

  test('registra los disparos fallidos', () => {
    const board = createGameboard();
    const attack = board.receiveAttack(0, 0);

    expect(attack.result).toBe('miss');
    expect(board.missedAttacks).toEqual([{ x: 0, y: 0 }]);
    expect(board.getCell(0, 0).result).toBe('miss');
  });

  test('no permite atacar dos veces la misma casilla', () => {
    const board = createGameboard();
    const ship = createShip(2);
    board.placeShip(ship, [{ x: 1, y: 1 }, { x: 2, y: 1 }]);

    board.receiveAttack(1, 1);
    const second = board.receiveAttack(1, 1);

    expect(second.result).toBe('already');
    expect(ship.hits).toBe(1);
    expect(board.missedAttacks).toHaveLength(0);
  });

  test('allShipsSunk detecta cuándo se hundió toda la flota', () => {
    const board = createGameboard();
    const ship = createShip(1);
    board.placeShip(ship, [{ x: 0, y: 0 }]);

    expect(board.allShipsSunk()).toBe(false);
    board.receiveAttack(0, 0);
    expect(board.allShipsSunk()).toBe(true);
  });

  test('respeta dimensiones personalizadas rectangulares', () => {
    const board = createGameboard({ width: 8, height: 12 });
    expect(board.width).toBe(8);
    expect(board.height).toBe(12);
    expect(board.board).toHaveLength(12);
    expect(board.board[0]).toHaveLength(8);

    expect(board.canPlaceShip([{ x: 8, y: 0 }, { x: 9, y: 0 }])).toBe(false);
    expect(board.getCell(0, 12)).toBeNull();

    const ship = createShip(5);
    expect(board.placeShip(ship, [
      { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }, { x: 4, y: 0 },
    ])).toBe(true);
    // availableCells() cuenta casillas aún no disparadas, no casillas libres.
    expect(board.availableCells()).toHaveLength(96);
    expect(board.board.flat().filter((cell) => !cell.ship)).toHaveLength(96 - 5);
    expect(board.neighborsOf(0, 11)).toHaveLength(2);
  });

  test('placeShipsRandomly coloca toda la flota sin solapes', () => {
    const board = createGameboard();
    const placed = board.placeShipsRandomly([5, 4, 3, 3, 2]);

    expect(placed).toHaveLength(5);
    expect(board.ships).toHaveLength(5);
    board.ships.forEach(({ coords }) => {
      expect(board.canPlaceShip(coords)).toBe(false); // ya están ocupadas
      coords.forEach(({ x, y }) => expect(board.getCell(x, y).hasShip).toBe(true));
    });
    // availableCells() se refiere a casillas aún no disparadas (para la IA).
    expect(board.availableCells()).toHaveLength(100);
    expect(board.board.flat().filter((cell) => !cell.ship)).toHaveLength(100 - 17);
  });
});
