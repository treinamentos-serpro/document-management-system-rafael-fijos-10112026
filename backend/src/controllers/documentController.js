const path = require('node:path');
const documentService = require('../services/documentService');

function requireOwner(req, res, next) {
  const owner = req.get('X-User-Id')?.trim();
  if (!owner) {
    return res.status(400).json({
      error: {
        code: 'USER_ID_REQUIRED',
        message: 'Informe o identificador do usuário no cabeçalho X-User-Id.',
      },
    });
  }

  req.ownerId = owner;
  return next();
}

async function prepareUpload(req, res, next) {
  try {
    await documentService.initializeStorageUsage();
    return next();
  } catch (error) {
    return next(error);
  }
}

async function uploadDocument(req, res, next) {
  if (!req.file) {
    return res.status(400).json({
      error: {
        code: 'FILE_REQUIRED',
        message: "Envie um arquivo no campo 'file'.",
      },
    });
  }

  try {
    const document = await documentService.createDocument(req.file, req.ownerId);
    return res.status(201).json({ document });
  } catch (error) {
    return next(error);
  }
}

function listDocuments(req, res, next) {
  try {
    const documents = documentService.listDocuments(req.ownerId);
    return res.json({ documents });
  } catch (error) {
    return next(error);
  }
}

async function downloadDocument(req, res, next) {
  try {
    const document = await documentService.getDocumentForDownload(
      req.params.id,
      req.ownerId,
    );

    if (!document) {
      return res.status(404).json({
        error: {
          code: 'DOCUMENT_NOT_FOUND',
          message: 'Documento não encontrado.',
        },
      });
    }

    const downloadName = path.basename(document.originalName)
      .replace(/[\u0000-\u001f\u007f]/g, '')
      .trim() || 'document';
    const extension = path.extname(downloadName);
    res.type(extension || 'application/octet-stream');

    return res.download(document.filePath, downloadName, (error) => {
      if (!error) {
        return;
      }
      if (res.headersSent) {
        return res.destroy(error);
      }
      return next(error);
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  downloadDocument,
  listDocuments,
  prepareUpload,
  requireOwner,
  uploadDocument,
};