// ✅ index.js (listo para local y Azure)
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

// --- Carpeta de uploads (si no existe, se crea) ---
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// --- CORS ---
// En prod puedes pasar FRONTEND_ORIGIN="https://tu-frontend.azurecontainer.io"
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || (IS_PROD ? '*' : 'https://localhost:5173');

app.use(cors({
  origin: FRONTEND_ORIGIN,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json());
app.use('/uploads', express.static(uploadsDir));

// --- Rutas ---
app.use('/api/tareas', tareasRoutes);
app.use('/api/usuarios', usuariosRoutes);

// Ruta de salud para pruebas en Azure
app.get('/health', (_req, res) => {
  res.json({ ok: true, env: NODE_ENV });
});

// --- DB + servidor ---
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ Conectado a MongoDB');

    if (IS_PROD) {
      // En Azure/producción: HTTP simple (el proxy de Azure maneja HTTPS)
      app.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 Servidor HTTP corriendo en puerto ${PORT} (modo ${NODE_ENV})`);
      });
    } else {
      // En local: HTTPS con certificados
      const https = require('https');
      const sslOptions = {
        key: fs.readFileSync(path.join(__dirname, 'ssl', 'localhost-key.pem')),
        cert: fs.readFileSync(path.join(__dirname, 'ssl', 'localhost.pem'))
      };
      https.createServer(sslOptions, app).listen(PORT, () => {
        console.log(`🚀 Servidor HTTPS corriendo en https://localhost:${PORT} (modo ${NODE_ENV})`);
      });
    }
  })
  .catch(err => {
    console.error('❌ Error conectando a MongoDB', err);
    process.exit(1);
  });
