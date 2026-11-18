import createShip from '../src/modules/ship.js';

describe('Ship', () => {
  test('expone su longitud', () => {
    expect(createShip(4).length).toBe(4);
  });

  test('hit() incrementa el contador de impactos', () => {
    const ship = createShip(3);
    expect(ship.hits).toBe(0);
    ship.hit();
    ship.hit();
    expect(ship.hits).toBe(2);
  });

  test('isSunk() es false hasta alcanzar la longitud y true después', () => {
    const ship = createShip(2);
    expect(ship.isSunk()).toBe(false);
    ship.hit();
    expect(ship.isSunk()).toBe(false);
    ship.hit();
    expect(ship.isSunk()).toBe(true);
    ship.hit();
    expect(ship.isSunk()).toBe(true);
  });

  test('rechaza longitudes inválidas', () => {
    expect(() => createShip(0)).toThrow();
    expect(() => createShip(2.5)).toThrow();
  });
});
