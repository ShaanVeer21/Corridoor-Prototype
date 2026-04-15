import './StatusBadge.css';

export default function StatusBadge({ type, children }) {
  return (
    <span className={`status-badge status-badge--${type}`}>
      {type === 'active' && <span className="status-badge__dot" />}
      {type === 'hazard' && <span className="status-badge__icon">⚠</span>}
      {children}
    </span>
  );
}
