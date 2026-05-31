import { useState, useRef } from 'react';
import { uploadNOC, uploadFloorplan } from '../../utils/api';
import StatusBadge from '../common/StatusBadge';
import './NOCUpload.css';

export default function NOCUpload() {
  // Step 1: NOC upload
  const [nocFile, setNocFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [nocResult, setNocResult] = useState(null);
  const [error, setError] = useState(null);
  const nocInputRef = useRef(null);

  // Step 2: Floorplan upload
  const [fpFile, setFpFile] = useState(null);
  const [fpUploading, setFpUploading] = useState(false);
  const [fpResult, setFpResult] = useState(null);
  const [fpError, setFpError] = useState(null);
  const fpInputRef = useRef(null);

  const handleNocDrop = (e) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files[0];
    if (dropped?.type === 'application/pdf') {
      setNocFile(dropped);
      setError(null);
    } else {
      setError('Only PDF files are accepted');
    }
  };

  const handleNocUpload = async () => {
    if (!nocFile) return;
    setUploading(true);
    setError(null);
    setNocResult(null);
    setFpResult(null);

    try {
      const data = await uploadNOC(nocFile);
      setNocResult(data);
      setNocFile(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleFpDrop = (e) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files[0];
    if (dropped?.type === 'application/pdf') {
      setFpFile(dropped);
      setFpError(null);
    } else {
      setFpError('Only PDF files are accepted');
    }
  };

  const handleFpUpload = async () => {
    if (!fpFile || !nocResult?.building_id) return;
    setFpUploading(true);
    setFpError(null);

    try {
      const data = await uploadFloorplan(nocResult.building_id, fpFile);
      setFpResult(data);
      setFpFile(null);
    } catch (err) {
      setFpError(err.message);
    } finally {
      setFpUploading(false);
    }
  };

  return (
    <div className="noc-upload">
      {/* ── Step 1: NOC Document ── */}
      <div className="noc-upload__step">
        <div className="noc-upload__step-header">
          <span className="noc-upload__step-num">1</span>
          <div>
            <h3 className="noc-upload__step-title">Upload NOC Document</h3>
            <p className="noc-upload__step-desc">Upload a Fire NOC PDF — AI will extract all building data automatically</p>
          </div>
        </div>

        <div
          className={`noc-upload__dropzone ${nocFile ? 'noc-upload__dropzone--has-file' : ''} ${nocResult ? 'noc-upload__dropzone--done' : ''}`}
          onDrop={handleNocDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => !nocResult && nocInputRef.current?.click()}
        >
          <input ref={nocInputRef} type="file" accept=".pdf" onChange={(e) => { setNocFile(e.target.files[0]); setError(null); }} hidden />
          {nocResult ? (
            <div className="noc-upload__file-info">
              <span className="noc-upload__file-icon">✅</span>
              <div>
                <span className="noc-upload__file-name">{nocResult.building_name}</span>
                <span className="noc-upload__file-detail">
                  {nocResult.building_id} · {nocResult.ward} · {nocResult.area_name} · {nocResult.fields_extracted} fields extracted
                </span>
              </div>
            </div>
          ) : nocFile ? (
            <div className="noc-upload__file-info">
              <span className="noc-upload__file-icon">📄</span>
              <span className="noc-upload__file-name">{nocFile.name}</span>
              <span className="noc-upload__file-size">{(nocFile.size / 1024 / 1024).toFixed(2)} MB</span>
            </div>
          ) : (
            <div className="noc-upload__placeholder">
              <span className="noc-upload__placeholder-icon">📤</span>
              <span className="noc-upload__placeholder-title">Drop NOC PDF here</span>
              <span className="noc-upload__placeholder-sub">or click to browse</span>
            </div>
          )}
        </div>

        {nocFile && !nocResult && (
          <button className="noc-upload__button" onClick={handleNocUpload} disabled={uploading}>
            {uploading ? 'Extracting with AI...' : 'Upload & Extract NOC'}
          </button>
        )}

        {error && <div className="noc-upload__error">{error}</div>}
      </div>

      {/* ── Step 2: Floorplan (shown after NOC upload succeeds) ── */}
      {nocResult && (
        <div className="noc-upload__step animate-in">
          <div className="noc-upload__step-header">
            <span className="noc-upload__step-num">2</span>
            <div>
              <h3 className="noc-upload__step-title">Upload Floorplan (Optional)</h3>
              <p className="noc-upload__step-desc">
                Upload the building floorplan PDF for {nocResult.building_name} — individual floor plans will be cropped automatically
              </p>
            </div>
          </div>

          {!fpResult ? (
            <>
              <div
                className={`noc-upload__dropzone ${fpFile ? 'noc-upload__dropzone--has-file' : ''}`}
                onDrop={handleFpDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => fpInputRef.current?.click()}
              >
                <input ref={fpInputRef} type="file" accept=".pdf" onChange={(e) => { setFpFile(e.target.files[0]); setFpError(null); }} hidden />
                {fpFile ? (
                  <div className="noc-upload__file-info">
                    <span className="noc-upload__file-icon">📐</span>
                    <span className="noc-upload__file-name">{fpFile.name}</span>
                    <span className="noc-upload__file-size">{(fpFile.size / 1024 / 1024).toFixed(2)} MB</span>
                  </div>
                ) : (
                  <div className="noc-upload__placeholder">
                    <span className="noc-upload__placeholder-icon">📐</span>
                    <span className="noc-upload__placeholder-title">Drop Floorplan PDF here</span>
                    <span className="noc-upload__placeholder-sub">or click to browse · not required</span>
                  </div>
                )}
              </div>

              {fpFile && (
                <button className="noc-upload__button" onClick={handleFpUpload} disabled={fpUploading}>
                  {fpUploading ? 'Processing floorplans...' : 'Upload & Process Floorplan'}
                </button>
              )}

              <button
                className="noc-upload__skip"
                onClick={() => { setNocResult(null); setNocFile(null); }}
              >
                Skip floorplan — upload another NOC
              </button>
            </>
          ) : (
            <div className="noc-upload__result animate-in">
              <h3 className="noc-upload__result-title">✅ Floorplan Processed</h3>
              <p className="noc-upload__result-msg">{fpResult.message}</p>
              <div className="noc-upload__fp-list">
                {fpResult.floor_plans.map((fp) => (
                  <div key={fp.id} className="noc-upload__fp-item">
                    <span className="noc-upload__fp-label">{fp.floor_label}</span>
                    <span className="noc-upload__fp-path">{fp.image_path}</span>
                  </div>
                ))}
              </div>
              <button
                className="noc-upload__button noc-upload__button--secondary"
                onClick={() => { setNocResult(null); setFpResult(null); setNocFile(null); setFpFile(null); }}
              >
                Upload Another Building
              </button>
            </div>
          )}

          {fpError && <div className="noc-upload__error">{fpError}</div>}
        </div>
      )}

      {/* NOC Result details */}
      {nocResult && !fpResult && (
        <div className="noc-upload__result animate-in">
          <h3 className="noc-upload__result-title">NOC Extraction Complete</h3>
          <p className="noc-upload__result-msg">{nocResult.message}</p>
          <div className="noc-upload__result-stats">
            <div className="noc-upload__stat noc-upload__stat--success">
              <span className="noc-upload__stat-num">{nocResult.fields_extracted}</span>
              <span className="noc-upload__stat-label">Fields Extracted</span>
            </div>
          </div>
          <div className="noc-upload__result-detail">
            <div className="noc-upload__result-row">
              <span className="noc-upload__result-key">Building ID</span>
              <span className="noc-upload__result-val">{nocResult.building_id}</span>
            </div>
            <div className="noc-upload__result-row">
              <span className="noc-upload__result-key">Building Name</span>
              <span className="noc-upload__result-val">{nocResult.building_name}</span>
            </div>
            {nocResult.ward && (
              <div className="noc-upload__result-row">
                <span className="noc-upload__result-key">Ward</span>
                <span className="noc-upload__result-val">{nocResult.ward}</span>
              </div>
            )}
            {nocResult.area_name && (
              <div className="noc-upload__result-row">
                <span className="noc-upload__result-key">Area</span>
                <span className="noc-upload__result-val">{nocResult.area_name}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}