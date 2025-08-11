// test/middlewares.auth.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'secret-test';

// Ajusta si tu archivo tiene otro nombre:
const auth = require('../middlewares/auth');

function resMock() {
  return {
    statusCode: 0,
    body: null,
    status(c){ this.statusCode=c; return this; },
    json(p){ this.body=p; return this; }
  };
}

test('auth => 403 si no hay Authorization', async () => {
  const req = { headers: {} };
  const res = resMock(); let called = false;
  await auth(req, res, () => { called = true; });
  assert.equal(called, false);
  assert.equal(res.statusCode, 403);
});

test('auth => 401 si formato Bearer es inválido', async () => {
  const req = { headers: { authorization: 'Token xyz' } };
  const res = resMock(); let called = false;
  await auth(req, res, () => { called = true; });
  assert.equal(called, false);
  assert.equal(res.statusCode, 401);
});

test('auth => next() con token válido', async () => {
  const token = jwt.sign({ id: 'user123' }, process.env.JWT_SECRET, { expiresIn: '1h' });
  const req = { headers: { authorization: `Bearer ${token}` } };
  const res = resMock(); let called = false;
  await auth(req, res, () => { called = true; });
  assert.equal(called, true);
  assert.equal(req.usuarioId, 'user123');
});
