const documentRepository = require('../repositories/documentRepository');
const { toPublicDocument } = require('./documentProjection');

function listDocuments(owner) {
  return documentRepository.findByOwner(owner).map(toPublicDocument);
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

module.exports = {
  getDocumentForDownload,
  listDocuments,
};
