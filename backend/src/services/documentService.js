const { randomUUID } = require('node:crypto');
const documentRepository = require('../repositories/documentRepository');

async function createDocument(file, owner) {
  const document = {
    id: randomUUID(),
    originalName: file.originalname,
    size: file.size,
    uploadedAt: new Date().toISOString(),
    owner,
    storageKey: file.filename,
  };

  try {
    documentRepository.add(document);
  } catch (error) {
    await documentRepository.removeFile(file.filename).catch(() => {});
    throw error;
  }

  const { storageKey, ...publicDocument } = document;
  return publicDocument;
}

function listDocuments(owner) {
  return documentRepository.findByOwner(owner);
}

async function getDocumentForDownload(id, owner) {
  const document = documentRepository.findById(id);
  if (!document || document.owner !== owner) {
    return null;
  }

  if (!await documentRepository.fileExists(document.storageKey)) {
    return null;
  }

  return {
    ...document,
    filePath: documentRepository.getFilePath(document.storageKey),
  };
}

function initializeStorageUsage() {
  return documentRepository.initializeStorageUsage();
}

module.exports = {
  createDocument,
  getDocumentForDownload,
  initializeStorageUsage,
  listDocuments,
};