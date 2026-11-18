/**
 * Fábrica de barcos.
 * Interface pública: length, hits, hit(), isSunk().
 * El estado (hits) se mantiene privado y se expone sólo lectura.
 */
export default function createShip(length, name = '') {
  if (!Number.isInteger(length) || length < 1) {
    throw new TypeError('La longitud del barco debe ser un entero positivo');
  }

  let hits = 0;

  const hit = () => {
    hits += 1;
  };

  const isSunk = () => hits >= length;

  return {
    name,
    get length() {
      return length;
    },
    get hits() {
      return hits;
    },
    hit,
    isSunk,
  };
}
