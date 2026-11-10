const fs = require('node:fs/promises');
const path = require('node:path');
const {
  maxStorageBytes,
  resolveStoragePath,
  storageDirectory,
} = require('../config/storage');

const documents = new Map();
let storedBytes = 0;
let storageUsageInitialized = false;
let storageUsageInitialization;

async function initializeStorageUsage() {
  if (storageUsageInitialized) {
    return;
  }

  if (!storageUsageInitialization) {
    storageUsageInitialization = (async () => {
      await fs.mkdir(storageDirectory, { recursive: true });
      const entries = await fs.readdir(storageDirectory, { withFileTypes: true });
      const fileSizes = await Promise.all(entries
        .filter((entry) => entry.isFile())
        .map(async (entry) => (
          await fs.stat(path.join(storageDirectory, entry.name))
        ).size));

      storedBytes = fileSizes.reduce((total, size) => total + size, 0);
      storageUsageInitialized = true;
    })().catch((error) => {
      storageUsageInitialization = undefined;
      throw error;
    });
  }

  return storageUsageInitialization;
}

function add(document) {
  if (!storageUsageInitialized) {
    throw new Error('O uso do armazenamento ainda não foi inicializado.');
  }

  if (storedBytes + document.size > maxStorageBytes) {
    const error = new Error('O armazenamento atingiu o limite configurado.');
    error.code = 'STORAGE_LIMIT_EXCEEDED';
    error.status = 507;
    throw error;
  }

  documents.set(document.id, document);
  storedBytes += document.size;
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
  initializeStorageUsage,
  removeFile,
};