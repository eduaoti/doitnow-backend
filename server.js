// ✅ index.js (listo para local y Azure) — logs tempranos, AI y server condicional
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// --- Telemetría centralizada (opcional) ---
let ai, track, exception, trace;
try {
  const tel = require('./lib/telemetry'); // { ai, track, exception, trace, metric }
  ai = tel.ai;
  track = tel.track;
  exception = tel.exception;
  trace = tel.trace;
} catch (e) {
  console.warn('ℹ️ Telemetry helper no disponible:', e?.message || e);
}

// --- Rutas ---
const tareasRoutes = require('./routes/tareas.routes');
const usuariosRoutes = require('./routes/usuarios.routes');

// --- App / Env ---
const app = express();
app.set('trust proxy', true); // ✅ para IP real detrás del proxy de Azure
const PORT = Number(process.env.PORT) || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_PROD = NODE_ENV === 'production';
const IS_TEST = NODE_ENV === 'test';

console.log('🟨 Booting backend… NODE_ENV=%s PORT=%s', NODE_ENV, PORT);

// --- Carpeta de uploads ---
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// --- CORS ---
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || (IS_PROD ? '*' : 'https://localhost:5173');
app.use(cors({
  origin: FRONTEND_ORIGIN,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// (Opcional) Log de requests para ver tráfico en App Service
try {
  const morgan = require('morgan');
  // ✅ fecha ISO | IP | MÉTODO | URL | STATUS | bytes | tiempo
  app.use(morgan(':date[iso] :remote-addr :method :url :status :res[content-length] - :response-time ms'));
} catch (_) { /* morgan no instalado, no pasa nada */ }

// --- Middlewares base ---
app.use(express.json());
app.use('/uploads', express.static(uploadsDir));

// --- Rutas de negocio ---
app.use('/api/tareas', tareasRoutes);
app.use('/api/usuarios', usuariosRoutes);

// --- Ruta de salud (no depende de la conexión a DB) ---
app.get('/health', (_req, res) => {
  const state = mongoose.connection?.readyState; // 0=disc 1=conn 2=connecting 3=disconnecting
  res.json({ ok: true, env: NODE_ENV, dbState: state });
});

// --- Conexión a Mongo con logs de estado (omitida en tests) ---
if (!IS_TEST) {
  if (IS_PROD) {
    // mongoose.set('debug', true); // si quieres ver queries (ruidoso)
  }

  mongoose.connection.on('connecting', () => console.log('⏳ MongoDB connecting…'));
  mongoose.connection.on('error', err => {
    console.error('❌ MongoDB error:', err?.message || err);
    exception && exception(err, { origin: 'mongoose.connection' });
  });
  mongoose.connection.on('disconnected', () => console.warn('⚠️  MongoDB disconnected'));
  mongoose.connection.once('open', () => {
    console.log('✅ MongoDB connected');
    track && track('mongo_connected');
  });

  mongoose.connect(process.env.MONGO_URI, {
    // serverSelectionTimeoutMS: 10000,
    // maxPoolSize: 10,
  }).catch(err => {
    console.error('❌ Error inicial conectando a MongoDB:', err?.message || err);
    exception && exception(err, { origin: 'mongoose.connect' });
  });
}

// --- Manejo de errores HTTP (reporta a AI) ---
app.use((err, req, res, next) => {
  exception && exception(err, { path: req.path, method: req.method });
  res.status(500).json({ message: 'Error interno' });
});

// 👉 Exporta `app` para pruebas y para ser usado por server.js
module.exports = app;

// --- Arranque del servidor (solo si se ejecuta directamente y no en test) ---
if (require.main === module && !IS_TEST) {
  if (IS_PROD) {
    // En Azure/App Service el TLS se termina antes; usa HTTP aquí
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 HTTP server listening on :${PORT} (env=${NODE_ENV})`);
      track && track('server_started', { env: NODE_ENV, port: String(PORT) });
    });
  } else {
    // HTTPS local; si faltan certificados, cae a HTTP sin romper
    try {
      const https = require('https');
      const sslOptions = {
        key: fs.readFileSync(path.join(__dirname, 'ssl', 'localhost-key.pem')),
        cert: fs.readFileSync(path.join(__dirname, 'ssl', 'localhost.pem'))
      };
      https.createServer(sslOptions, app).listen(PORT, () => {
        console.log(`🔒 HTTPS local on https://localhost:${PORT} (env=${NODE_ENV})`);
      });
    } catch (e) {
      console.warn('⚠️ SSL local no disponible, iniciando HTTP:', e?.message || e);
      app.listen(PORT, () => {
        console.log(`🚀 HTTP local on http://localhost:${PORT} (env=${NODE_ENV})`);
      });
    }
  }

  // Cierre elegante y errores globales SOLO en proceso principal
  process.on('unhandledRejection', (reason) => {
    console.error('🔥 UnhandledRejection:', reason);
    const ex = reason instanceof Error ? reason : new Error(String(reason));
    exception && exception(ex, { origin: 'unhandledRejection' });
  });
  process.on('uncaughtException', (err) => {
    console.error('🔥 UncaughtException:', err);
    exception && exception(err, { origin: 'uncaughtException' });
  });
  process.on('SIGTERM', () => {
    console.log('🛑 SIGTERM recibido, cerrando servidor…');
    track && track('server_stopping', { reason: 'SIGTERM' });
    setTimeout(() => process.exit(0), 500);
  });
}
