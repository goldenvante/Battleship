import createPlayer from '../src/modules/player.js';
import createGameboard from '../src/modules/gameboard.js';

describe('Player', () => {
  test('todo jugador posee su propio tablero', () => {
    const human = createPlayer('Ana');
    const cpu = createPlayer('CPU', { isComputer: true });

    expect(human.name).toBe('Ana');
    expect(human.isComputer).toBe(false);
    expect(cpu.isComputer).toBe(true);
    expect(human.gameboard).not.toBe(cpu.gameboard);
    expect(human.gameboard.size).toBe(10);
  });

  test('la CPU nunca repite coordenadas y agota el tablero', () => {
    const cpu = createPlayer('CPU', { isComputer: true });
    const enemy = createGameboard();
    enemy.placeShipsRandomly([5, 4, 3, 3, 2]);
    const used = new Set();

    for (let i = 0; i < 100; i += 1) {
      const move = cpu.getAttack(enemy);
      expect(move).not.toBeNull();
      const key = `${move.x},${move.y}`;
      expect(used.has(key)).toBe(false);
      used.add(key);

      const attack = enemy.receiveAttack(move.x, move.y);
      cpu.notifyAttack({
        coordinate: move,
        result: attack.result,
        sunk: attack.sunk,
        enemyBoard: enemy,
      });
    }
    expect(used.size).toBe(100);
    expect(cpu.getAttack(enemy)).toBeNull();
  });

  test('la CPU inteligente prueba casillas adyacentes tras un impacto', () => {
    const cpu = createPlayer('CPU', { isComputer: true, smart: true });
    const enemy = createGameboard();
    enemy.placeShipsRandomly([3]);
    const hit = { x: 4, y: 4 };

    cpu.notifyAttack({
      coordinate: hit,
      result: 'hit',
      sunk: false,
      enemyBoard: enemy,
    });

    const next = cpu.getAttack(enemy);
    const distance = Math.abs(next.x - hit.x) + Math.abs(next.y - hit.y);
    expect(distance).toBe(1);
  });

  test('resetMemory limpia la memoria de la IA', () => {
    const cpu = createPlayer('CPU', { isComputer: true });
    cpu.notifyAttack({ coordinate: { x: 1, y: 1 }, result: 'hit', sunk: false });
    expect(cpu.memory.hits).toHaveLength(1);
    cpu.resetMemory();
    expect(cpu.memory.hits).toHaveLength(0);
    expect(cpu.memory.queue).toHaveLength(0);
  });
});
