// test/controllers.tareas.test.js
const test = require('node:test');
const assert = require('node:assert/strict');

process.env.NODE_ENV = 'test';
const { stubModel } = require('./helpers/stub-model');

const Tarea = require('../models/Tarea');
const tareasCtrl = require('../controllers/tareas.controller');

function resMock() {
  return {
    statusCode: 200,
    body: null,
    status(c) { this.statusCode = c; return this; },
    json(p) { this.body = p; return this; }
  };
}

test('obtenerTareas => devuelve solo tareas del usuario', async () => {
  const userId = '507f1f77bcf86cd799439011';
  const restore = stubModel(Tarea, {
    statics: {
      find: async () => ([
        { _id: 't1', nombre: 'A', usuario: userId, cumplida: false },
        { _id: 't2', nombre: 'B', usuario: userId, cumplida: true }
      ])
    }
  });

  const req = { usuarioId: userId };
  const res = resMock();
  try {
    await tareasCtrl.obtenerTareas(req, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.length, 2);
  } finally { restore(); }
});

test('crearTarea => crea con defaults y usuario del token', async () => {
  const userId = '507f1f77bcf86cd799439011';
  const payload = { nombre: 'Nueva', fechaLimite: new Date().toISOString(), prioridad: 'alto' };

  const restore = stubModel(Tarea, {
    proto: {
      save: async function () { return this; } // devuelve la instancia creada
    }
  });

  const req = { usuarioId: userId, body: payload };
  const res = resMock();
  try {
    await tareasCtrl.crearTarea(req, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.nombre, 'Nueva');
    // ⚠️ usuario es ObjectId -> conviértelo a string
    assert.equal(String(res.body.usuario), userId);
    assert.equal(res.body.cumplida, false);
  } finally { restore(); }
});

test('cumplirTarea => 400 si faltan imagen o notas', async () => {
  const restore = stubModel(Tarea, {
    statics: { findById: async () => ({ _id: 't4', prioridad: 'medio' }) }
  });
  const req = { params: { id: 't4' }, file: null, body: { notas: '' } };
  const res = resMock();
  try {
    await tareasCtrl.cumplirTarea(req, res);
    assert.equal(res.statusCode, 400);
  } finally { restore(); }
});

test('cumplirTarea => calcula puntos y guarda', async () => {
  // Doc con set/save “fake”
  const doc = {
    _id: 't5',
    prioridad: 'alto',
    set(upd) { Object.assign(this, upd); },
    async save() { return this; }
  };

  const restore = stubModel(Tarea, { statics: { findById: async () => doc } });

  const req = { params: { id: 't5' }, file: { filename: 'img.png' }, body: { notas: 'hecha' } };
  const res = resMock();
  try {
    await tareasCtrl.cumplirTarea(req, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.cumplida, true);
    assert.equal(res.body.puntos, 30);
    assert.equal(res.body.imagenCompletada, 'img.png');
  } finally { restore(); }
});
