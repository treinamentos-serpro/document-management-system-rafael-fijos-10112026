const { randomUUID } = require('node:crypto');
const documentRepository = require('../repositories/documentRepository');
const { toPublicDocument } = require('./documentProjection');

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

  return toPublicDocument(document);
}

function initializeStorageUsage() {
  return documentRepository.initializeStorageUsage();
}

module.exports = {
  createDocument,
  initializeStorageUsage,
};
