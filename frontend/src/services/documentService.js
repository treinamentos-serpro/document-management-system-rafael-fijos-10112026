const API_PREFIX = '/api';

export class ApiError extends Error {
  constructor(message, code, status) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

async function request(path, { ownerId, signal, ...options } = {}) {
  const headers = new Headers(options.headers);
  if (ownerId) {
    headers.set('X-User-Id', ownerId);
  }

  let response;
  try {
    response = await fetch(`${API_PREFIX}${path}`, {
      ...options,
      headers,
      signal,
    });
  } catch (error) {
    if (error.name === 'AbortError') {
      throw error;
    }
    throw new ApiError('Não foi possível conectar ao servidor.', 'NETWORK_ERROR');
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new ApiError(
      payload?.error?.message || 'Não foi possível concluir a operação.',
      payload?.error?.code || 'REQUEST_FAILED',
      response.status,
    );
  }

  return response;
}

export async function uploadDocument(file, ownerId) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await request('/upload', {
    method: 'POST',
    ownerId,
    body: formData,
  });

  return (await response.json()).document;
}

export async function listDocuments(ownerId, { signal } = {}) {
  const response = await request('/documents', { ownerId, signal });
  return (await response.json()).documents;
}

export async function getDocumentDownload(id, ownerId) {
  const response = await request(
    `/documents/${encodeURIComponent(id)}/download`,
    { ownerId },
  );
  return response.blob();
}