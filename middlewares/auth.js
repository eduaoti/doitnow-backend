// ✅ middlewares/auth.js
const jwt = require('jsonwebtoken');

function verificarToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  console.log("🔐 Token recibido:", authHeader);

  if (!authHeader) {
    return res.status(403).json({ mensaje: 'Token requerido' });
  }

  const [scheme, token] = authHeader.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ mensaje: 'Formato de token inválido' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // ✅ Guardar ID como variable directa e interna
    req.usuarioId = decoded.id;
    req.usuario = { id: decoded.id }; // Para compatibilidad

    console.log("✅ Usuario autenticado:", decoded.id);

    next();
  } catch (err) {
    console.error("❌ Token inválido:", err.message);
    return res.status(401).json({ mensaje: 'Token inválido' });
  }
}

module.exports = verificarToken;
