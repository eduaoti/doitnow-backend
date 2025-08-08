// ✅ index.js
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const https = require('https');
require('dotenv').config();

const tareasRoutes = require('./routes/tareas.routes');
const usuariosRoutes = require('./routes/usuarios.routes');

const app = express();
const PORT = process.env.PORT || 3000;

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

app.use(cors({
  origin: 'https://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(express.json());
app.use('/uploads', express.static(uploadsDir));
app.use('/api/tareas', tareasRoutes);
app.use('/api/usuarios', usuariosRoutes);

const sslOptions = {
  key: fs.readFileSync(path.join(__dirname, 'ssl', 'localhost-key.pem')),
  cert: fs.readFileSync(path.join(__dirname, 'ssl', 'localhost.pem'))
};

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ Conectado a MongoDB');
    https.createServer(sslOptions, app).listen(PORT, () => {
      console.log(`🚀 Servidor HTTPS corriendo en https://localhost:${PORT}`);
    });
  })
  .catch(err => console.error('❌ Error conectando a MongoDB', err));
