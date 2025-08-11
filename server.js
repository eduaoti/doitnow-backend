// ✅ index.js (listo para local y Azure) — versión con logs tempranos y server inmediato
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const tareasRoutes = require('./routes/tareas.routes');
const usuariosRoutes = require('./routes/usuarios.routes');

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_PROD = NODE_ENV === 'production';

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

// (Opcional) Log de requests para ver tráfico en ACI/App Service
try {
  const morgan = require('morgan');
  app.use(morgan('combined'));
} catch (_) { /* morgan no instalado, no pasa nada */ }

app.use(express.json());
app.use('/uploads', express.static(uploadsDir));

// --- Rutas ---
app.use('/api/tareas', tareasRoutes);
app.use('/api/usuarios', usuariosRoutes);

// Ruta de salud SIEMPRE disponible (sin depender de la DB)
app.get('/health', (_req, res) => {
  const state = mongoose.connection?.readyState; // 0=disconnected 1=connected 2=connecting 3=disconnecting
  res.json({ ok: true, env: NODE_ENV, dbState: state });
});

// --- Arrancar el servidor de inmediato ---
if (IS_PROD) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 HTTP server listening on :${PORT} (env=${NODE_ENV})`);
  });
} else {
  const https = require('https');
  const sslOptions = {
    key: fs.readFileSync(path.join(__dirname, 'ssl', 'localhost-key.pem')),
    cert: fs.readFileSync(path.join(__dirname, 'ssl', 'localhost.pem'))
  };
  https.createServer(sslOptions, app).listen(PORT, () => {
    console.log(`🚀 HTTPS local on https://localhost:${PORT} (env=${NODE_ENV})`);
  });
}

// --- Conexión a Mongo (con eventos para loguear estado) ---
if (IS_PROD) {
  // Actívalo si quieres ver queries (ruidoso): mongoose.set('debug', true);
}

mongoose.connection.on('connecting', () => console.log('⏳ MongoDB connecting…'));
mongoose.connection.on('error', err => console.error('❌ MongoDB error:', err?.message || err));
mongoose.connection.on('disconnected', () => console.warn('⚠️  MongoDB disconnected'));
mongoose.connection.once('open', () => console.log('✅ MongoDB connected'));

mongoose.connect(process.env.MONGO_URI, {
  // Opcionales: ajusta si usas SRV/Atlas moderno (normalmente basta con la URI)
  // serverSelectionTimeoutMS: 10000,
  // maxPoolSize: 10,
}).catch(err => {
  // No matamos el proceso: dejamos que el contenedor siga vivo y /health funcione
  console.error('❌ Error inicial conectando a MongoDB:', err?.message || err);
});

// Manejo de errores globales para que se vean en logs
process.on('unhandledRejection', (reason) => {
  console.error('🔥 UnhandledRejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('🔥 UncaughtException:', err);
});
