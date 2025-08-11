// test/controllers.usuarios.test.js
const test = require('node:test');
const assert = require('node:assert/strict');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'secret-test';

const { stubModel } = require('./helpers/stub-model');

const Usuario = require('../models/Usuario');
const Tarea = require('../models/Tarea');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');

// Stub global para email (evita salir a internet)
nodemailer.createTransport = () => ({ sendMail: async () => ({ accepted: ['ok'] }) });

const usuarioCtrl = require('../controllers/usuario.controller');

function resMock() {
  return {
    statusCode: 200,
    body: null,
    status(c) { this.statusCode = c; return this; },
    json(p) { this.body = p; return this; }
  };
}

test('registrar => envía OTP y guarda usuario', async () => {
  const restore = stubModel(Usuario, {
    statics: {
      findOne: async () => null // no existe
    },
    proto: {
      save: async function () { return this; } // evita hooks y DB
    }
  });

  const req = { body: {
    nombre: 'Edu', apellidoPaterno: 'Ortiz', correo: 'edu@example.com',
    contraseña: '123456', confirmar: '123456'
  } };
  const res = resMock();
  try {
    await usuarioCtrl.registrar(req, res);
    assert.equal(res.statusCode, 200);
    assert.ok(res.body.mensaje.includes('OTP'));
  } finally { restore(); }
});

test('verificarOTP => valida código y limpia campos', async () => {
  const now = Date.now() + 60_000;
  const userDoc = {
    _id: 'u1', correo: 'edu@example.com', otp: '111111', otpExpiracion: new Date(now),
    async save() { return this; }
  };

  const restore = stubModel(Usuario, { statics: { findOne: async () => userDoc } });

  const req = { body: { correo: 'edu@example.com', otp: '111111' } };
  const res = resMock();
  try {
    await usuarioCtrl.verificarOTP(req, res);
    assert.equal(res.statusCode, 200);
    assert.ok(res.body.mensaje.includes('Verificación exitosa'));
  } finally { restore(); }
});

test('login => devuelve token y totalGanado', async () => {
  // Stub compare para no calcular hash
  const originalCompare = bcrypt.compare;
  bcrypt.compare = async () => true;

  const restoreUser = stubModel(Usuario, { statics: {
    findOne: async () => ({ _id: 'u1', nombre: 'Edu', correo: 'edu@example.com', contraseña: 'hash', puntosGastados: 10 })
  }});
  const restoreTask = stubModel(Tarea, { statics: {
    find: async () => ([{ puntos: 20 }, { puntos: 30 }]) // totalGanado = 50
  }});

  const req = { body: { correo: 'edu@example.com', contraseña: '123456' } };
  const res = resMock();
  try {
    await usuarioCtrl.login(req, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.mensaje, 'Login exitoso');
    assert.equal(res.body.usuario.totalGanado, 50);
    assert.ok(res.body.token);
  } finally {
    restoreUser(); restoreTask();
    bcrypt.compare = originalCompare;
  }
});

test('restarPuntos => descuenta dentro del disponible', async () => {
  // Usuario con 5 gastados; tareas suman 50
  const restoreUser = stubModel(Usuario, {
    statics: {
      findById: async () => ({
        _id: 'u1',
        puntosGastados: 5,
        async save() { return this; } // ❗ NO modificar aquí puntosGastados
      })
    }
  });
  const restoreTask = stubModel(Tarea, { statics: { find: async () => ([{ puntos: 20 }, { puntos: 30 }]) } });

  const req = { usuarioId: 'u1', body: { puntos: 10 } };
  const res = resMock();
  try {
    await usuarioCtrl.restarPuntos(req, res);
    assert.equal(res.statusCode, 200);
    assert.ok(res.body.mensaje.includes('Puntos restados'));
    assert.equal(res.body.puntosDisponibles, 35); // 50 - (5 + 10)
  } finally { restoreUser(); restoreTask(); }
});
