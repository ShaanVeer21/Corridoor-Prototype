import './EncryptionBadge.css';

export default function EncryptionBadge() {
  return (
    <div className="encryption-badge">
      <div className="encryption-badge__icon">🔒</div>
      <div className="encryption-badge__text">
        <span className="encryption-badge__title">End-to-End Encrypted</span>
        <span className="encryption-badge__sub">Zero-access architecture — Corridoor has no access to your NOC data</span>
      </div>
    </div>
  );
}
