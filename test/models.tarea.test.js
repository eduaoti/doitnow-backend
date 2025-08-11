// test/models.tarea.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const Tarea = require('../models/Tarea');
const mongoose = require('mongoose');

test('Tarea: requiere nombre, fechaLimite y usuario', () => {
  const t = new Tarea({});
  const err = t.validateSync();
  assert.ok(err);
  assert.ok(err.errors?.nombre);
  assert.ok(err.errors?.fechaLimite);
  assert.ok(err.errors?.usuario);
});

test('Tarea válida', () => {
  const t = new Tarea({
    nombre: 'Mi tarea',
    fechaLimite: new Date(),
    usuario: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
    prioridad: 'medio'
  });
  const err = t.validateSync();
  assert.equal(err, undefined);
});
