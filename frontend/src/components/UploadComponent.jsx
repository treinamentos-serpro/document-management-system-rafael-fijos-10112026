import { useRef, useState } from 'react';

export default function UploadComponent({ ownerId, onUpload }) {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState(null);
  const fileInputRef = useRef(null);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!file || !ownerId || isUploading) {
      return;
    }

    setIsUploading(true);
    setMessage(null);
    try {
      await onUpload(file);
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setMessage({ type: 'success', text: 'Arquivo enviado com sucesso.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setIsUploading(false);
    }
  }

  function handleFileChange(event) {
    setFile(event.target.files?.[0] || null);
    setMessage(null);
  }

  return (
    <section className="upload-panel" aria-labelledby="upload-heading">
      <div className="section-heading">
        <span className="section-index">01</span>
        <div>
          <h2 id="upload-heading">Adicionar arquivo</h2>
          <p>Envie um documento para a biblioteca.</p>
        </div>
      </div>

      <form className="upload-form" onSubmit={handleSubmit}>
        <label className={`file-picker${file ? ' has-file' : ''}`}>
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileChange}
            disabled={!ownerId || isUploading}
          />
          <span className="file-picker-mark" aria-hidden="true">+</span>
          <span className="file-picker-text">
            <strong>{file ? file.name : 'Escolher arquivo'}</strong>
            <small>{file ? `${(file.size / 1024).toFixed(1)} KB` : 'Qualquer formato'}</small>
          </span>
          <span className="file-picker-action">Selecionar</span>
        </label>

        <button
          className="primary-button upload-button"
          type="submit"
          disabled={!ownerId || !file || isUploading}
        >
          {isUploading ? 'Enviando...' : 'Enviar documento'}
        </button>
      </form>

      {!ownerId && <p className="field-note">Defina um usuário antes de enviar.</p>}
      {message && (
        <p className={`inline-message ${message.type}`} role={message.type === 'error' ? 'alert' : 'status'}>
          {message.text}
        </p>
      )}
    </section>
  );
}