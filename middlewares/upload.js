// ✅ middlewares/upload.js
const fs = require('fs');
const path = require('path');
const multer = require('multer');

// En prod usamos el volumen montado /app/uploads; en local, la carpeta del proyecto
const UPLOAD_DIR =
  process.env.NODE_ENV === 'production'
    ? '/app/uploads'
    : path.join(__dirname, '..', 'uploads');

// Crea la carpeta si no existe (por si corre local)
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${file.fieldname}-${unique}${path.extname(file.originalname)}`);
  },
});

module.exports = multer({ storage });
