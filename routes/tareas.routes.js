// rutas/tareas.routes.js
const express = require('express');
const router = express.Router();
const controller = require('../controllers/tareas.controller');
const verificarToken = require('../middlewares/auth');
const upload = require('../middlewares/upload');

router.get('/', verificarToken, controller.obtenerTareas);
router.post('/', verificarToken, controller.crearTarea);

// ⬇️ Esta ruta DEBE estar antes que la dinámica (como /:id)
router.get('/puntos/total', verificarToken, controller.obtenerPuntaje);

router.put('/:id/cumplir', verificarToken, upload.single('imagen'), controller.cumplirTarea);

module.exports = router;
