

// ✅ models/Tarea.js
const mongoose = require('mongoose');

const tareaSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  fechaLimite: { type: Date, required: true },
  cumplida: { type: Boolean, default: false },
  puntos: { type: Number, default: 0 },
  colaborativa: { type: Boolean, default: false },
  usuariosAsignados: [String],
  prioridad: { type: String, enum: ['bajo', 'medio', 'alto'], default: 'medio' },
  imagenCompletada: String,
  notas: String,
  fechaCumplimiento: Date,
  usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true }
});

module.exports = mongoose.model('Tarea', tareaSchema);

