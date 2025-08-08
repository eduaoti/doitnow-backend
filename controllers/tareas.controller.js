const Tarea = require('../models/Tarea');

// Obtener solo las tareas del usuario autenticado
exports.obtenerTareas = async (req, res) => {
  const tareas = await Tarea.find({ usuario: req.usuarioId });
  res.json(tareas);
};

// Crear tarea
exports.crearTarea = async (req, res) => {
  const { nombre, fechaLimite, colaborativa, usuariosAsignados, prioridad } = req.body;

  const nuevaTarea = new Tarea({
    nombre,
    fechaLimite,
    cumplida: false,
    puntos: 0,
    colaborativa: colaborativa || false,
    usuariosAsignados: colaborativa ? usuariosAsignados || [] : [],
    prioridad: prioridad || 'medio',
    usuario: req.usuarioId
  });

  await nuevaTarea.save();
  res.json(nuevaTarea);
};

// ✅ Marcar tarea como cumplida (imagen + notas + puntos + fechaCumplimiento)
exports.cumplirTarea = async (req, res) => {
  try {
    const tarea = await Tarea.findById(req.params.id);
    if (!tarea) return res.status(404).json({ error: 'Tarea no encontrada' });

    const archivo = req.file;
    const notas = req.body.notas;

    if (!archivo || !notas) {
      return res.status(400).json({ error: 'Faltan imagen o notas' });
    }

    // Asignar puntaje según prioridad
    let puntos = 0;
    if (tarea.prioridad === 'alto') puntos = 30;
    else if (tarea.prioridad === 'medio') puntos = 20;
    else if (tarea.prioridad === 'bajo') puntos = 10;

    // ✅ Actualizar todos los campos
    tarea.set({
      cumplida: true,
      notas,
      imagenCompletada: archivo.filename,
      puntos,
      fechaCumplimiento: new Date()
    });

    await tarea.save(); // ✅ Se guarda correctamente en Mongo
    res.json(tarea);
  } catch (err) {
    console.error('Error al completar tarea:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Obtener puntaje total del usuario
exports.obtenerPuntaje = async (req, res) => {
  try {
    const [tareas, usuario] = await Promise.all([
      Tarea.find({ usuario: req.usuarioId, cumplida: true }),
      Usuario.findById(req.usuarioId, 'puntosGastados')
    ]);
    const totalGanado = tareas.reduce((sum, t) => sum + (t.puntos || 0), 0);
    const puntosGastados = usuario?.puntosGastados || 0;
    const disponibles = totalGanado - puntosGastados;

    res.json({ totalGanado, puntosGastados, disponibles });
  } catch (err) {
    console.error('🔥 Error al obtener puntaje:', err.message);
    res.status(500).json({ mensaje: 'Error al obtener puntaje', error: err.message });
  }
};