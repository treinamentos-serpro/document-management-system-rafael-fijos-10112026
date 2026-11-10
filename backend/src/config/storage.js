const path = require('node:path');

const projectRoot = path.resolve(__dirname, '../../..');
const storageDirectory = process.env.STORAGE_DIR
  ? path.resolve(projectRoot, process.env.STORAGE_DIR)
  : path.join(projectRoot, 'backend', 'storage');
const configuredMaxUploadBytes = Number(process.env.MAX_UPLOAD_BYTES);
const maxUploadBytes = Number.isSafeInteger(configuredMaxUploadBytes)
  && configuredMaxUploadBytes > 0
  ? configuredMaxUploadBytes
  : 10 * 1024 * 1024;
const configuredMaxStorageBytes = Number(process.env.MAX_STORAGE_BYTES);
const maxStorageBytes = Number.isSafeInteger(configuredMaxStorageBytes)
  && configuredMaxStorageBytes > 0
  ? configuredMaxStorageBytes
  : 1024 * 1024 * 1024;

function resolveStoragePath(storageKey) {
  if (typeof storageKey !== 'string' || path.basename(storageKey) !== storageKey) {
    throw new Error('Chave de armazenamento inválida.');
  }

  const resolvedPath = path.resolve(storageDirectory, storageKey);
  if (path.dirname(resolvedPath) !== storageDirectory) {
    throw new Error('Chave de armazenamento inválida.');
  }

  return resolvedPath;
}

module.exports = {
  maxUploadBytes,
  maxStorageBytes,
  resolveStoragePath,
  storageDirectory,
};