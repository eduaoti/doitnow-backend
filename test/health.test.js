// test/health.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

process.env.NODE_ENV = 'test';
const server = require('../server');   // usa el http/https server

test('GET /health responde 200 y ok:true', async () => {
  const res = await request(server).get('/health');
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.ok, true);
});
