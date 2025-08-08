const express = require('express');
const router = express.Router();
const usuarioCtrl = require('../controllers/usuario.controller'); // ✅ CORRECTO
const verificarToken = require('../middlewares/auth');

// Registro, verificación OTP y login
router.post('/registrar', usuarioCtrl.registrar);
router.post('/verificar-otp', usuarioCtrl.verificarOTP);
router.post('/login', usuarioCtrl.login);
router.get('/saldo', verificarToken, usuarioCtrl.saldo);
// ✅ Ruta para restar puntos al canjear recompensas
router.post('/restar-puntos', verificarToken, usuarioCtrl.restarPuntos);

module.exports = router;
