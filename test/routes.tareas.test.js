// test/routes.tareas.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'secret-test';

const { stubModel } = require('./helpers/stub-model');
const Tarea = require('../models/Tarea');
const tareasRoutes = require('../routes/tareas.routes');

// App mínima para montar SOLO estas rutas
const app = express();
app.use(express.json());
app.use('/api/tareas', tareasRoutes);

function token(id = '507f1f77bcf86cd799439011') {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '1h' });
}

test('GET /api/tareas => lista del usuario', async () => {
  const userId = '507f1f77bcf86cd799439011';
  const restore = stubModel(Tarea, { statics: { find: async () => ([{ _id: 't1', nombre: 'A', usuario: userId }]) } });

  try {
    const res = await request(app)
      .get('/api/tareas')
      .set('Authorization', `Bearer ${token(userId)}`);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.length, 1);
    assert.equal(res.body[0].nombre, 'A');
  } finally { restore(); }
});

test('POST /api/tareas => crea tarea', async () => {
  const userId = '507f1f77bcf86cd799439011';
  const body = { nombre: 'Nueva', fechaLimite: new Date().toISOString(), prioridad: 'medio' };

  const restore = stubModel(Tarea, {
    proto: { save: async function () { return this; } }
  });

  try {
    const res = await request(app)
      .post('/api/tareas')
      .send(body)
      .set('Authorization', `Bearer ${token(userId)}`)
      .set('Accept', 'application/json');

    assert.equal(res.statusCode, 200);
    assert.ok(res.body._id);                 // no asumas un id específico
    assert.equal(typeof res.body._id, 'string');
    assert.equal(res.body.nombre, 'Nueva');
  } finally { restore(); }
});
