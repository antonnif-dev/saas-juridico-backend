const multer = require("multer");

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error("Tipo de arquivo não permitido."));
    }
    cb(null, true);
  },
});

module.exports = upload;
