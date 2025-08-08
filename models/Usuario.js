

// ✅ models/Usuario.js
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const usuarioSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  apellidoPaterno: { type: String, required: true },
  apellidoMaterno: { type: String },
  correo: { type: String, required: true, unique: true },
  contraseña: { type: String, required: true },
  otp: String,
  otpExpiracion: Date,
  puntosGastados: { type: Number, default: 0 }
});

usuarioSchema.pre('save', async function (next) {
  if (!this.isModified('contraseña')) return next();
  this.contraseña = await bcrypt.hash(this.contraseña, 10);
  next();
});

module.exports = mongoose.model('Usuario', usuarioSchema);

