import createGame from '../src/modules/game.js';

const placeFleet = (game, coordsByIndex) => {
  coordsByIndex.forEach((coords, index) => game.placeShip(index, coords));
};

const horizontalShip = (y, startX, length) =>
  Array.from({ length }, (_, i) => ({ x: startX + i, y }));

describe('Game controller', () => {
  test('configure crea los jugadores y coloca la flota de la CPU', () => {
    const game = createGame();
    game.configure({ mode: 'cpu' });
    const state = game.getState();

    expect(state.phase).toBe('placement');
    expect(state.placingFor).toBe('player1');
    expect(state.players.player2.isComputer).toBe(true);
    expect(state.players.player2.totalShips).toBe(5);
    expect(state.fleets.player2.every((ship) => ship.placed)).toBe(true);
  });

  test('el jugador ataca y se cambia el turno', () => {
    const game = createGame();
    game.configure({ mode: 'cpu' });
    game.randomizeFleet();
    game.start();

    const events = [];
    game.on('turn:changed', ({ current }) => events.push(current));

    expect(game.current).toBe('player1');
    const result = game.attack(0, 0);
    expect(result.ok).toBe(true);
    expect(game.current).toBe('player2');
    expect(events).toEqual(['player2']);

    // No se puede atacar dos veces ni fuera de turno.
    expect(game.attack(0, 0).ok).toBe(false);
  });

  test('la CPU devuelve el turno tras un disparo legal', () => {
    const game = createGame();
    game.configure({ mode: 'cpu' });
    game.randomizeFleet();
    game.start();

    game.attack(0, 0);
    const cpuTurn = game.computerTurn();
    expect(cpuTurn.ok).toBe(true);
    expect(game.current).toBe('player1');
    expect(game.getState().round).toBe(2);
  });

  test('termina la partida cuando se hunden todos los barcos del rival', () => {
    const game = createGame();
    game.configure({ mode: 'cpu' });
    const coords = [
      horizontalShip(0, 0, 5),
      horizontalShip(1, 0, 4),
      horizontalShip(2, 0, 3),
      horizontalShip(3, 0, 3),
      horizontalShip(4, 0, 2),
    ];
    placeFleet(game, coords);
    game.start();

    let winner = null;
    game.on('game:over', (payload) => { winner = payload.winnerKey; });

    const enemyBoard = game.getState().players.player2.board;
    const shipCells = [];
    enemyBoard.forEach((row, y) => row.forEach((cell, x) => {
      if (cell.hasShip) shipCells.push({ x, y });
    }));

    shipCells.forEach(({ x, y }) => {
      game.attack(x, y);
      if (game.phase === 'playing' && game.current === 'player2') {
        game.computerTurn(); // devuelve el turno al jugador 1
      }
    });
    expect(game.phase).toBe('gameover');
    expect(winner).toBe('player1');
    expect(game.winner).toBe('player1');
  });

  test('en modo local se entrega el dispositivo para colocar la segunda flota', () => {
    const game = createGame();
    const handoffs = [];
    game.on('handoff', (payload) => handoffs.push(payload));

    game.configure({ mode: 'pvp', names: { player1: 'Ana', player2: 'Beto' } });
    expect(game.getPlacingFleet()).toHaveLength(5);
    game.randomizeFleet();

    expect(handoffs).toEqual([{ playerKey: 'player2', purpose: 'placement' }]);
    expect(game.getState().placingFor).toBe('player2');
    expect(game.getState().players.player1.totalShips).toBe(5);
  });
});
