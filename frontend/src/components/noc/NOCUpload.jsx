import { useState, useRef } from 'react';
import { uploadNOC } from '../../utils/api';
import StatusBadge from '../common/StatusBadge';
import './NOCUpload.css';

export default function NOCUpload() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  const handleDrop = (e) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files[0];
    if (dropped?.type === 'application/pdf') {
      setFile(dropped);
      setError(null);
    } else {
      setError('Only PDF files are accepted');
    }
  };

  const handleSelect = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      setFile(selected);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError(null);
    setResult(null);

    try {
      const data = await uploadNOC(file);
      setResult(data);
      setFile(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="noc-upload">
      {/* Drop zone */}
      <div
        className={`noc-upload__dropzone ${file ? 'noc-upload__dropzone--has-file' : ''}`}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf"
          onChange={handleSelect}
          hidden
        />
        {file ? (
          <div className="noc-upload__file-info">
            <span className="noc-upload__file-icon">📄</span>
            <span className="noc-upload__file-name">{file.name}</span>
            <span className="noc-upload__file-size">
              {(file.size / 1024 / 1024).toFixed(2)} MB
            </span>
          </div>
        ) : (
          <div className="noc-upload__placeholder">
            <span className="noc-upload__placeholder-icon">📤</span>
            <span className="noc-upload__placeholder-title">Drop NOC PDF here</span>
            <span className="noc-upload__placeholder-sub">or click to browse</span>
          </div>
        )}
      </div>

      {/* Upload button */}
      {file && (
        <button
          className="noc-upload__button"
          onClick={handleUpload}
          disabled={uploading}
        >
          {uploading ? 'Extracting data...' : 'Upload & Extract'}
        </button>
      )}

      {/* Error */}
      {error && (
        <div className="noc-upload__error">{error}</div>
      )}

      {/* Results */}
      {result && (
        <div className="noc-upload__result animate-in">
          <h3 className="noc-upload__result-title">Extraction Complete</h3>
          <div className="noc-upload__result-stats">
            <div className="noc-upload__stat">
              <span className="noc-upload__stat-num">{result.total_extracted}</span>
              <span className="noc-upload__stat-label">Extracted</span>
            </div>
            <div className="noc-upload__stat noc-upload__stat--success">
              <span className="noc-upload__stat-num">{result.total_saved}</span>
              <span className="noc-upload__stat-label">New Saved</span>
            </div>
            <div className="noc-upload__stat">
              <span className="noc-upload__stat-num">{result.total_skipped}</span>
              <span className="noc-upload__stat-label">Already Exist</span>
            </div>
          </div>

          <div className="noc-upload__result-list">
            {result.buildings.map((b) => (
              <div key={b.building_id} className="noc-upload__result-item">
                <span className="noc-upload__result-id">{b.building_id}</span>
                <span className="noc-upload__result-name">{b.name}</span>
                {b.is_high_hazard && <StatusBadge type="hazard">HAZARD</StatusBadge>}
                {result.saved.includes(b.building_id) ? (
                  <StatusBadge type="valid">NEW</StatusBadge>
                ) : (
                  <span className="noc-upload__result-skip">exists</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
