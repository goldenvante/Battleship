# Battleship // Tactical Command

Implementación completa del juego de Acorazados de The Odin Project con interfaz de estilo arcade, animaciones CSS y efectos de sonido sintetizados.

## Ejecutar

```bash
npm install
npm start      # servidor en http://localhost:8080
npm test       # 20 pruebas unitarias (Jest + Babel)
```

> Los módulos se cargan como ESM nativos en el navegador. Jest no soporta ESM de forma estable, por eso `babel.config.cjs` transforma `import/export` a CommonJS al ejecutar las pruebas.

## Arquitectura

| Archivo | Responsabilidad |
| --- | --- |
| `src/modules/ship.js` | Fábrica de `Ship`: `length`, `hits`, `hit()`, `isSunk()` |
| `src/modules/gameboard.js` | Tablero: colocación validada, `receiveAttack()`, disparos fallidos, flota hundida |
| `src/modules/player.js` | Jugador humano y CPU con IA "caza y destruye" (nunca repite disparo) |
| `src/modules/game.js` | Reglas, turnos, fases, colocación y victoria. Expone un bus de eventos |
| `src/modules/dom.js` | Render del tablero, HUD, overlays, reticle y efectos visuales |
| `src/modules/sound.js` | Efectos WebAudio sin archivos externos |
| `src/main.js` | Conecta eventos del modelo con la interfaz |

## Funcionalidades

- Modo **Campaña** (contra CPU táctica) y **Versus local** con pantalla de entrega de dispositivo.
- Colocación de barcos por **arrastrar y soltar** o seleccionando barco + clic, con rotación (`R` o botón) y vista previa válida/inválida.
- Despliegue aleatorio de la flota.
- Ataques rápidos: la casilla se marca al instante y los efectos (trazador, explosión, salpicadura) son decorativos y no bloquean el siguiente disparo.
- Marcas permanentes: impactos con anillo rojo y fallos con la X de `images/shoot.png`.
- Retícula de puntería con lectura de coordenadas, radar, registro de combate e indicador de turno.
- Pantallas de victoria/derrota con confeti y estadísticas.
- Diseño responsive y soporte para `prefers-reduced-motion`.

## Recursos visuales

Fondos y marcadores en `images/`:

- `images/inicio.jpg` → fondo de la pantalla de batalla.
- `images/lobby.jpg` → fondo de la pantalla de despliegue.
- `images/winner-optimized.jpg` → fondo de la pantalla de victoria (versión reducida de `winner.jpg`, que pesaba 12 MB; el original se conserva).
- `images/loser.jpg` → fondo de la pantalla de derrota.
- `images/shoot.png` → X permanente en las casillas donde no hay barco.

Todavía son placeholders los recursos en `src/assets/`:

- `src/assets/ships/placeholder-ship.svg` → textura aplicada a cada segmento de barco.
- `src/assets/ships/placeholder-ship-icon.svg` → icono en la bandeja de despliegue.
- `src/assets/ui/placeholder-emblem.svg` → emblema del encabezado.

Las animaciones de los barcos viven en `src/css/style.css` (`@keyframes deploy`, `sink`, `explode`, `ripple`, etc.). Puedes reemplazarlas por sprites o secuencias de imágenes manteniendo las clases `.ship-part`, `.cell--hit`, `.cell--miss`, `.cell--sunk` y `.cell--fx-sink`.
