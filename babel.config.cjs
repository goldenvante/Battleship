// Jest no soporta ESM de forma estable: Babel transforma nuestros módulos
// ES6 (import/export) a CommonJS cuando ejecutamos las pruebas.
module.exports = {
  presets: [['@babel/preset-env', { targets: { node: 'current' } }]],
};
