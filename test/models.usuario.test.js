// test/models.usuario.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const Usuario = require('../models/Usuario');

test('Usuario: requiere nombre y correo', () => {
  const u = new Usuario({});
  const err = u.validateSync();
  assert.ok(err);
  assert.ok(err.errors?.nombre);
  assert.ok(err.errors?.correo);
});

test('Usuario: instancia válida pasa validateSync()', () => {
  const u = new Usuario({
    nombre: 'Edu',
    apellidoPaterno: 'Ortiz',
    correo: 'edu@example.com',
    contraseña: 'hash'
  });
  const err = u.validateSync();
  assert.equal(err, undefined);
});
