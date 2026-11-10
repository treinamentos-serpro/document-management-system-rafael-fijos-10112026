import { useEffect, useState } from 'react';
import DocumentList from './components/DocumentList';
import UploadComponent from './components/UploadComponent';
import { listDocuments, uploadDocument } from './services/documentService';
import './App.css';

function getSavedUserId() {
  try {
    return window.localStorage.getItem('dms-user-id') || '';
  } catch {
    return '';
  }
}

function saveUserId(value) {
  try {
    window.localStorage.setItem('dms-user-id', value);
  } catch {
    // A sessão continua funcional mesmo quando o navegador bloqueia storage.
  }
}

export default function App() {
  const [ownerId, setOwnerId] = useState(getSavedUserId);
  const [userIdDraft, setUserIdDraft] = useState(getSavedUserId);
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    if (!ownerId) {
      setDocuments([]);
      setLoadError('');
      setIsLoading(false);
      return undefined;
    }

    const controller = new AbortController();
    setIsLoading(true);
    setLoadError('');

    listDocuments(ownerId, { signal: controller.signal })
      .then(setDocuments)
      .catch((error) => {
        if (error.name !== 'AbortError') {
          setDocuments([]);
          setLoadError(error.message);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      });

    return () => controller.abort();
  }, [ownerId, refreshToken]);

  function handleUserSubmit(event) {
    event.preventDefault();
    const nextOwnerId = userIdDraft.trim();
    setUserIdDraft(nextOwnerId);
    setOwnerId(nextOwnerId);
    saveUserId(nextOwnerId);
  }

  async function handleUpload(file) {
    await uploadDocument(file, ownerId);
    setRefreshToken((current) => current + 1);
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Pular para o conteúdo</a>
      <header className="topbar">
        <a className="brand" href="/" aria-label="DMS, início">
          <span className="brand-mark" aria-hidden="true"><i /><i /></span>
          <span>ARQUIVO<span className="brand-divider">/</span>DMS</span>
        </a>
        <span className="storage-indicator"><i aria-hidden="true" /> ARMAZENAMENTO LOCAL</span>
      </header>

      <main id="main-content" className="workspace" tabIndex="-1">
        <div className="workspace-heading">
          <div className="page-title">
            <p className="eyebrow">BIBLIOTECA DIGITAL <span>01 / 01</span></p>
            <h1>Documentos<span>.</span></h1>
          </div>

          <form className="user-form" onSubmit={handleUserSubmit}>
            <label htmlFor="user-id">Identificador do usuário</label>
            <div className="user-field-row">
              <input
                id="user-id"
                required
                value={userIdDraft}
                onChange={(event) => setUserIdDraft(event.target.value)}
                placeholder="Ex.: usuario-123"
                autoComplete="username"
              />
              <button className="user-submit" type="submit" disabled={!userIdDraft.trim()}>
                Aplicar
              </button>
            </div>
          </form>
        </div>

        <div className="workspace-grid">
          <UploadComponent ownerId={ownerId} onUpload={handleUpload} />
          <DocumentList
            documents={documents}
            ownerId={ownerId}
            isLoading={isLoading}
            error={loadError}
            onRetry={() => setRefreshToken((current) => current + 1)}
          />
        </div>
      </main>

      <footer className="app-footer">
        <span>DMS <span aria-hidden="true">/</span> GESTÃO DOCUMENTAL</span>
        <span>SESSÃO: {ownerId || 'NÃO IDENTIFICADA'}</span>
      </footer>
    </div>
  );
}