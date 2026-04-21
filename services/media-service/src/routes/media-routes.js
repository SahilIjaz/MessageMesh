const express = require('express');
const multer = require('multer');
const path = require('path');
const controller = require('../controllers/media-controller');

const router = express.Router();

const uploadDir = process.env.UPLOAD_DIR || '/app/uploads';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 10 * 1024 * 1024,
  },
});

router.post('/upload', upload.single('file'), controller.uploadFile);
router.get('/files/:fileId', controller.getFileMetadata);
router.get('/serve/:fileId', controller.serveFile);
router.delete('/files/:fileId', controller.deleteFile);

module.exports = router;
