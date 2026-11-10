const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const express = require('express');
const multer = require('multer');
const documentController = require('../controllers/documentController');
const { maxUploadBytes, storageDirectory } = require('../config/storage');

const router = express.Router();
const upload = multer({
  storage: multer.diskStorage({
    destination(req, file, callback) {
      fs.mkdir(storageDirectory, { recursive: true })
        .then(() => callback(null, storageDirectory))
        .catch(callback);
    },
    filename(req, file, callback) {
      callback(null, crypto.randomUUID());
    },
  }),
  limits: {
    files: 1,
    fileSize: maxUploadBytes + 1,
  },
});

router.post(
  '/upload',
  documentController.requireOwner,
  upload.single('file'),
  documentController.uploadDocument,
);
router.get('/documents', documentController.requireOwner, documentController.listDocuments);
router.get(
  '/documents/:id/download',
  documentController.requireOwner,
  documentController.downloadDocument,
);

module.exports = router;