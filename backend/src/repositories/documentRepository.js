const fs = require('node:fs/promises');
const { resolveStoragePath } = require('../config/storage');

const documents = new Map();

function add(document) {
  documents.set(document.id, document);
  return document;
}

function findById(id) {
  return documents.get(id) || null;
}

function findByOwner(owner) {
  return [...documents.values()]
    .filter((document) => document.owner === owner)
    .sort((left, right) => right.uploadedAt.localeCompare(left.uploadedAt))
    .map(({ storageKey, ...document }) => document);
}

function getFilePath(storageKey) {
  return resolveStoragePath(storageKey);
}

async function fileExists(storageKey) {
  try {
    await fs.access(getFilePath(storageKey));
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

async function removeFile(storageKey) {
  try {
    await fs.unlink(getFilePath(storageKey));
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
}

module.exports = {
  add,
  fileExists,
  findById,
  findByOwner,
  getFilePath,
  removeFile,
};