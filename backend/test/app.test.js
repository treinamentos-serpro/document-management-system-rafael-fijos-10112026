const assert = require('node:assert/strict');
const fsSync = require('node:fs');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { after, test } = require('node:test');

const storageDirectory = fsSync.mkdtempSync(
  path.join(os.tmpdir(), 'dms-backend-test-'),
);
process.env.STORAGE_DIR = storageDirectory;
process.env.MAX_UPLOAD_BYTES = '5';
process.env.MAX_STORAGE_BYTES = '8';
fsSync.writeFileSync(path.join(storageDirectory, 'orphaned-file'), 'old');

const app = require('../src/app');

after(async () => {
  await fs.rm(storageDirectory, { recursive: true, force: true });
});

async function withServer(callback) {
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const address = server.address();

  try {
    await callback(`http://127.0.0.1:${address.port}`);
  } finally {
    server.closeAllConnections();
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

function createUploadForm(contents, filename = 'document.txt') {
  const form = new FormData();
  form.append('file', new Blob([contents], { type: 'text/plain' }), filename);
  return form;
}

test('o app backend é exportado', () => {
  assert.ok(app, 'o app deve estar definido');
  assert.strictEqual(typeof app, 'function', 'o app Express deve ser uma função');
});

test('envia, lista e baixa documentos somente para o dono', async () => {
  await withServer(async (baseUrl) => {
    const uploadResponse = await fetch(`${baseUrl}/upload`, {
      method: 'POST',
      headers: { 'X-User-Id': 'user-a' },
      body: createUploadForm('hello', 'notes.txt'),
    });

    assert.equal(uploadResponse.status, 201);
    const { document } = await uploadResponse.json();
    assert.deepEqual(Object.keys(document), [
      'id',
      'originalName',
      'size',
      'uploadedAt',
      'owner',
    ]);
    assert.equal(document.originalName, 'notes.txt');
    assert.equal(document.size, 5);
    assert.equal(document.owner, 'user-a');

    const ownerListResponse = await fetch(`${baseUrl}/documents`, {
      headers: { 'X-User-Id': 'user-a' },
    });
    assert.deepEqual(await ownerListResponse.json(), { documents: [document] });

    const otherOwnerListResponse = await fetch(`${baseUrl}/documents`, {
      headers: { 'X-User-Id': 'user-b' },
    });
    assert.deepEqual(await otherOwnerListResponse.json(), { documents: [] });

    const deniedDownload = await fetch(
      `${baseUrl}/documents/${document.id}/download`,
      { headers: { 'X-User-Id': 'user-b' } },
    );
    assert.equal(deniedDownload.status, 404);

    const downloadResponse = await fetch(
      `${baseUrl}/documents/${document.id}/download`,
      { headers: { 'X-User-Id': 'user-a' } },
    );
    assert.equal(downloadResponse.status, 200);
    assert.equal(await downloadResponse.text(), 'hello');
    assert.match(downloadResponse.headers.get('content-disposition'), /notes\.txt/);

    const overCapacityResponse = await fetch(`${baseUrl}/upload`, {
      method: 'POST',
      headers: { 'X-User-Id': 'user-a' },
      body: createUploadForm('x'),
    });
    assert.equal(overCapacityResponse.status, 507);
    assert.equal(
      (await overCapacityResponse.json()).error.code,
      'STORAGE_LIMIT_EXCEEDED',
    );
    assert.equal((await fs.readdir(storageDirectory)).length, 2);
  });
});

test('valida o usuário, o arquivo e o limite de tamanho', async () => {
  await withServer(async (baseUrl) => {
    const missingOwnerResponse = await fetch(`${baseUrl}/upload`, {
      method: 'POST',
      body: createUploadForm('abc'),
    });
    assert.equal(missingOwnerResponse.status, 400);
    assert.equal((await missingOwnerResponse.json()).error.code, 'USER_ID_REQUIRED');

    const missingFileResponse = await fetch(`${baseUrl}/upload`, {
      method: 'POST',
      headers: { 'X-User-Id': 'user-a' },
    });
    assert.equal(missingFileResponse.status, 400);
    assert.equal((await missingFileResponse.json()).error.code, 'FILE_REQUIRED');

    const oneByteOverLimitResponse = await fetch(`${baseUrl}/upload`, {
      method: 'POST',
      headers: { 'X-User-Id': 'user-a' },
      body: createUploadForm('123456'),
    });
    assert.equal(oneByteOverLimitResponse.status, 413);
    assert.equal((await oneByteOverLimitResponse.json()).error.code, 'FILE_TOO_LARGE');

    const tooLargeResponse = await fetch(`${baseUrl}/upload`, {
      method: 'POST',
      headers: { 'X-User-Id': 'user-a' },
      body: createUploadForm('larger than five bytes'),
    });
    assert.equal(tooLargeResponse.status, 413);
    assert.equal((await tooLargeResponse.json()).error.code, 'FILE_TOO_LARGE');
  });
});
