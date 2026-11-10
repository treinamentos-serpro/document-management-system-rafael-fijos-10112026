import DownloadButton from './DownloadButton';

function formatFileSize(size) {
  if (size < 1024) {
    return `${size} B`;
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Data indisponível';
  }
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function fileLabel(name) {
  const extension = name.includes('.') ? name.split('.').pop() : 'ARQ';
  return extension.slice(0, 4).toUpperCase();
}

export default function DocumentList({
  documents,
  ownerId,
  isLoading,
  error,
  onRetry,
}) {
  return (
    <section className="documents-panel" aria-labelledby="documents-heading">
      <div className="documents-heading section-heading">
        <span className="section-index">02</span>
        <div>
          <h2 id="documents-heading">Seus documentos</h2>
          <p>{documents.length} {documents.length === 1 ? 'arquivo' : 'arquivos'}</p>
        </div>
        <button
          className="text-button refresh-button"
          type="button"
          onClick={onRetry}
          disabled={!ownerId || isLoading}
        >
          {isLoading ? 'Atualizando...' : 'Atualizar'}
        </button>
      </div>

      {!ownerId ? (
        <div className="list-state empty-state">
          <span className="state-rule" aria-hidden="true" />
          <h3>Identifique sua sessão</h3>
          <p>Informe um usuário para consultar os documentos.</p>
        </div>
      ) : isLoading ? (
        <div className="list-state" role="status">Carregando documentos...</div>
      ) : error ? (
        <div className="list-state error-state" role="alert">
          <p>{error}</p>
          <button className="text-button" type="button" onClick={onRetry}>Tentar novamente</button>
        </div>
      ) : documents.length === 0 ? (
        <div className="list-state empty-state">
          <span className="state-rule" aria-hidden="true" />
          <h3>Nenhum documento ainda</h3>
          <p>Os arquivos enviados aparecerão aqui.</p>
        </div>
      ) : (
        <ul className="document-list">
          {documents.map((document) => (
            <li className="document-row" key={document.id}>
              <span className="file-type" aria-hidden="true">{fileLabel(document.originalName)}</span>
              <div className="document-details">
                <strong className="document-name" title={document.originalName}>
                  {document.originalName}
                </strong>
                <span className="document-meta">
                  {formatFileSize(document.size)} <span aria-hidden="true">·</span> {formatDate(document.uploadedAt)}
                </span>
              </div>
              <DownloadButton document={document} ownerId={ownerId} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}