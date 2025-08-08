const Usuario = require('../models/Usuario');
const Tarea = require('../models/Tarea');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

// 🔐 Generar código OTP
function generarOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ✅ Registro de usuario con OTP
exports.registrar = async (req, res) => {
  try {
    const { nombre, apellidoPaterno, apellidoMaterno, correo, contraseña, confirmar } = req.body;

    if (contraseña !== confirmar) {
      return res.status(400).json({ mensaje: 'Las contraseñas no coinciden' });
    }

    const existe = await Usuario.findOne({ correo });
    if (existe) {
      return res.status(400).json({ mensaje: 'Correo ya registrado' });
    }

    const otp = generarOTP();
    const expiracion = new Date(Date.now() + 5 * 60000); // 5 minutos

    const nuevo = new Usuario({
      nombre,
      apellidoPaterno,
      apellidoMaterno,
      correo,
      contraseña,
      otp,
      otpExpiracion: expiracion,
      puntosGastados: 0
    });

    await nuevo.save();

    // 📧 Enviar OTP por correo
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS
      }
    });

    await transporter.sendMail({
      from: '"DoItNow 👋"',
      to: correo,
      subject: 'Tu código OTP',
      html: `<h3>Tu OTP es: <b>${otp}</b></h3>`
    });

    res.json({ mensaje: 'OTP enviado al correo' });
  } catch (err) {
    res.status(500).json({ mensaje: 'Error en el registro', error: err.message });
  }
};

// ✅ Verificar OTP
exports.verificarOTP = async (req, res) => {
  const { correo, otp } = req.body;

  const usuario = await Usuario.findOne({ correo });
  if (!usuario) return res.status(404).json({ mensaje: 'Usuario no encontrado' });

  if (usuario.otp !== otp || usuario.otpExpiracion < Date.now()) {
    return res.status(400).json({ mensaje: 'OTP inválido o expirado' });
  }

  usuario.otp = undefined;
  usuario.otpExpiracion = undefined;
  await usuario.save();

  res.json({ mensaje: 'Verificación exitosa. Ya puedes iniciar sesión' });
};

// ✅ Login de usuario
// ✅ Login de usuario con puntos totales
exports.login = async (req, res) => {
  const { correo, contraseña } = req.body;

  const usuario = await Usuario.findOne({ correo });
  if (!usuario) return res.status(404).json({ mensaje: 'Correo no registrado' });

  const valida = await bcrypt.compare(contraseña, usuario.contraseña);
  if (!valida) return res.status(401).json({ mensaje: 'Contraseña incorrecta' });

  const token = jwt.sign({ id: usuario._id }, process.env.JWT_SECRET, { expiresIn: '2h' });

  const totalGanado = await calcularPuntosUsuario(usuario._id);

  res.json({
    mensaje: 'Login exitoso',
    usuario: {
      id: usuario._id,
      nombre: usuario.nombre,
      correo: usuario.correo,
      puntosGastados: usuario.puntosGastados,
      totalGanado
    },
    token
  });
};


// ✅ Calcular puntos ganados por tareas cumplidas
async function calcularPuntosUsuario(userId) {
  const tareas = await Tarea.find({ usuario: userId, cumplida: true });
  return tareas.reduce((acc, t) => acc + (t.puntos || 0), 0);
}
// ✅ Restar puntos al canjear recompensa
exports.restarPuntos = async (req, res) => {
  const userId = req.usuarioId;
  const puntos = Number(req.body.puntos); // 👈 asegura tipo número

  console.log("✅ ID del usuario:", userId);
  console.log("📦 Puntos recibidos para restar:", puntos);

  if (!userId) {
    return res.status(400).json({ mensaje: 'ID de usuario no válido' });
  }

  if (isNaN(puntos)) {
    return res.status(400).json({ mensaje: 'El valor de puntos debe ser un número válido' });
  }

  try {
    const usuario = await Usuario.findById(userId);
    if (!usuario) return res.status(404).json({ mensaje: 'Usuario no encontrado' });

    const totalGanado = await calcularPuntosUsuario(userId);
    const disponibles = totalGanado - usuario.puntosGastados;

    console.log("🧮 Total ganado:", totalGanado);
    console.log("💰 Puntos gastados antes:", usuario.puntosGastados);
    console.log("🎯 Puntos disponibles:", disponibles);

    if (puntos > disponibles) {
      console.warn("❌ Intento de canjear más de lo disponible");
      return res.status(400).json({ mensaje: 'No tienes suficientes puntos disponibles' });
    }

    // 🔄 Actualizamos puntosGastados
    usuario.puntosGastados = usuario.puntosGastados + puntos;
    await usuario.save(); // 👈 Asegura que se guarda en MongoDB

    console.log("✅ Nuevo puntosGastados:", usuario.puntosGastados);

    res.json({
      mensaje: '✅ Puntos restados correctamente',
      puntosDisponibles: totalGanado - usuario.puntosGastados
    });
  } catch (err) {
    console.error("🔥 Error al restar puntos:", err.message);
    res.status(500).json({ mensaje: 'Error al restar puntos', error: err.message });
  }
};
// Al final del archivo (o junto con los exports existentes)
exports.saldo = async (req, res) => {
  try {
    const userId = req.usuarioId;
    const usuario = await Usuario.findById(userId);
    if (!usuario) return res.status(404).json({ mensaje: 'Usuario no encontrado' });

    const totalGanado = await calcularPuntosUsuario(userId);
    const disponibles = totalGanado - (usuario.puntosGastados || 0);

    return res.json({
      totalGanado,
      puntosGastados: usuario.puntosGastados || 0,
      disponibles
    });
  } catch (err) {
    console.error('🔥 Error al obtener saldo:', err.message);
    res.status(500).json({ mensaje: 'Error al obtener saldo', error: err.message });
  }
};
