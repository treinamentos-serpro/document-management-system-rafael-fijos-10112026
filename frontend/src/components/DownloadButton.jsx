import { useState } from 'react';
import { getDocumentDownload } from '../services/documentService';

function safeDownloadName(name) {
  return name.split(/[\\/]/).pop()?.replace(/[\u0000-\u001f\u007f]/g, '').trim()
    || 'document';
}

export default function DownloadButton({ document, ownerId }) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState('');

  async function handleDownload() {
    if (isDownloading) {
      return;
    }

    setIsDownloading(true);
    setError('');
    try {
      const blob = await getDocumentDownload(document.id, ownerId);
      const objectUrl = URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = objectUrl;
      link.download = safeDownloadName(document.originalName);
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (downloadError) {
      setError(downloadError.message);
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <div className="download-control">
      <button
        className="secondary-button"
        type="button"
        onClick={handleDownload}
        disabled={!ownerId || isDownloading}
        aria-label={`Baixar ${document.originalName}`}
      >
        {isDownloading ? 'Baixando...' : 'Baixar'}
      </button>
      {error && <span className="download-error" role="alert">{error}</span>}
    </div>
  );
}