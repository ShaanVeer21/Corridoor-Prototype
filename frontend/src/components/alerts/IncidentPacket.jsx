import { useState, useEffect } from 'react';
import StatusBadge from '../common/StatusBadge';
import FloorplanViewer from '../noc/FloorplanViewer';
import LiveUpdateFeed from '../alerts/LiveUpdateFeed';
import { getBuilding, updateAlertStatus, getPhotoUrl, getNocPdfUrl } from '../../utils/api';
import { formatDate, formatNumber, formatDateTime, timeAgo } from '../../utils/helpers';
import './IncidentPacket.css';

const CATEGORY_CONFIG = {
  fire:     { icon: '🔥', label: 'Fire',           className: 'incident-packet__cat--fire' },
  rescue:   { icon: '🚑', label: 'Rescue',         className: 'incident-packet__cat--rescue' },
  collapse: { icon: '🏚️', label: 'House Collapse', className: 'incident-packet__cat--collapse' },
  other:    { icon: '⚠️', label: 'Other',          className: 'incident-packet__cat--other' },
};

function ElapsedTimer({ since }) {
  const [elapsed, setElapsed] = useState('0:00');
  useEffect(() => {
    const calc = () => {
      const now = new Date();
      const then = new Date(since);
      const thenUTC = since.includes('Z') || since.includes('+') ? then : new Date(since + 'Z');
      const diff = Math.max(0, Math.floor((now - thenUTC) / 1000));
      const m = Math.floor(diff / 60);
      const s = diff % 60;
      setElapsed(`${m}:${s.toString().padStart(2, '0')}`);
    };
    calc();
    const interval = setInterval(calc, 1000);
    return () => clearInterval(interval);
  }, [since]);
  return <span className="incident-packet__elapsed">{elapsed} ago</span>;
}

export default function IncidentPacket({ alert, onClose, onViewFullNOC }) {
  const [building, setBuilding] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showFloorPlan, setShowFloorPlan] = useState(false);

  useEffect(() => {
    if (!alert?.building_id) return;
    getBuilding(alert.building_id)
      .then(setBuilding)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [alert?.building_id]);

  const handleResolve = async () => {
    try { await updateAlertStatus(alert.id, 'resolved'); onClose(); } catch (err) { console.error(err); }
  };

  if (loading || !building) {
    return <div className="incident-packet"><div className="incident-packet__loading">Loading incident data...</div></div>;
  }

  const a = building.section_a;
  const b = building.section_b;
  const category = CATEGORY_CONFIG[alert.incident_category] || CATEGORY_CONFIG.fire;
  const avgOccupancy = Math.round((a.daytime_occupancy + a.nighttime_occupancy) / 2);
  const totalFloors = a.floors_above_ground + a.floors_below_ground;

  // Map URL using OpenStreetMap embed
  const mapQuery = encodeURIComponent(a.address || building.name);
  const mapUrl = building.latitude && building.longitude && building.latitude !== 0
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${building.longitude-0.005},${building.latitude-0.003},${building.longitude+0.005},${building.latitude+0.003}&layer=mapnik&marker=${building.latitude},${building.longitude}`
    : null;

  return (
    <div className="incident-packet animate-in">
      {/* Top bar */}
      <div className="incident-packet__topbar">
        <button className="incident-packet__back" onClick={onClose}>← Back to Dashboard</button>
        <button className="incident-packet__resolve-btn" onClick={handleResolve}>Mark Resolved</button>
      </div>

      {/* Alert Header Banner */}
      <div className="incident-packet__alert-banner">
        <div className="incident-packet__alert-banner-left">
          <div className="incident-packet__alert-name-row">
            <h1 className="incident-packet__alert-name">{building.name}</h1>
            {alert.is_high_hazard && <StatusBadge type="hazard">HIGH HAZARD</StatusBadge>}
          </div>
          <div className="incident-packet__alert-chips">
            {category && (
              <span className={`incident-packet__cat-chip ${category.className}`}>
                {category.icon} {category.label}
              </span>
            )}
            {alert.floor && (
              <span className="incident-packet__floor-chip">📍 {alert.floor}</span>
            )}
          </div>
          <div className="incident-packet__alert-meta">
            <span className="incident-packet__alert-id">{building.building_id}</span>
            {alert.ward && <><span className="incident-packet__dot">•</span><span>{alert.ward}</span></>}
            {alert.area_name && <><span className="incident-packet__dot">•</span><span>{alert.area_name}</span></>}
            <span className="incident-packet__dot">•</span>
            <span>Alert #{alert.id}</span>
            <span className="incident-packet__dot">•</span>
            <ElapsedTimer since={alert.created_at} />
          </div>
        </div>
        <div className="incident-packet__noc-buttons">
          <a href={getNocPdfUrl(building.building_id)} target="_blank" rel="noopener noreferrer" className="incident-packet__noc-btn">View NOC PDF</a>
          <button className="incident-packet__noc-btn incident-packet__noc-btn--secondary" onClick={() => onViewFullNOC(building)}>View Extracted Data</button>
        </div>
      </div>

      {/* Main 2-column grid */}
      <div className="incident-packet__grid">
        {/* Left column */}
        <div className="incident-packet__left">
          {/* Location + Floor Plan row */}
          <div className="incident-packet__loc-row">
            <div className="incident-packet__loc-map">
              <div className="incident-packet__section-label">LOCATION</div>
              <div className="incident-packet__map-container">
                {mapUrl ? (
                  <iframe src={mapUrl} width="100%" height="160" style={{ border: 0, display: 'block' }} loading="lazy" />
                ) : (
                  <div className="incident-packet__map-placeholder">
                    <span>📍</span>
                    <span>{a.address}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="incident-packet__loc-fp">
              <div className="incident-packet__section-label">FLOOR PLAN</div>
              <button className="incident-packet__fp-button" onClick={() => setShowFloorPlan(true)}>
                <span className="incident-packet__fp-icon">📐</span>
                <span className="incident-packet__fp-text">FLOOR PLAN</span>
              </button>
            </div>
          </div>

          {/* Building Type */}
          <div>
            <div className="incident-packet__section-label">TYPE OF BUILDING</div>
            <div className="incident-packet__info-card">
              <span className="incident-packet__info-big">{building.building_type}</span>
            </div>
          </div>

          {/* Floors + Occupancy row */}
          <div className="incident-packet__stats-row">
            <div>
              <div className="incident-packet__section-label">NO. OF FLOORS</div>
              <div className="incident-packet__info-card incident-packet__info-card--stat">
                <span className="incident-packet__stat-num">{totalFloors}</span>
                <span className="incident-packet__stat-detail">
                  {a.floors_above_ground} above + {a.floors_below_ground} basement
                </span>
              </div>
            </div>
            <div>
              <div className="incident-packet__section-label">AVG OCCUPANCY</div>
              <div className="incident-packet__info-card incident-packet__info-card--stat">
                <span className="incident-packet__stat-num">{formatNumber(avgOccupancy)}</span>
                <span className="incident-packet__stat-detail">people</span>
              </div>
            </div>
          </div>

          {/* Fire Systems quick info */}
          <div>
            <div className="incident-packet__section-label">FIRE SYSTEMS</div>
            <div className="incident-packet__info-card incident-packet__systems-grid">
              <div className="incident-packet__sys-item">
                <span className="incident-packet__sys-label">Sprinkler</span>
                <span className="incident-packet__sys-value">{a.sprinkler_system}</span>
              </div>
              <div className="incident-packet__sys-item">
                <span className="incident-packet__sys-label">Wet Riser</span>
                <span className="incident-packet__sys-value">{a.wet_riser || '—'}</span>
              </div>
              <div className="incident-packet__sys-item">
                <span className="incident-packet__sys-label">Hydrants</span>
                <span className="incident-packet__sys-value">{a.internal_hydrants} int · {a.external_hydrants} ext</span>
              </div>
              <div className="incident-packet__sys-item">
                <span className="incident-packet__sys-label">Pump</span>
                <span className="incident-packet__sys-value">{b.fire_pump_capacity || '—'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right column — Live Updates */}
        <div className="incident-packet__right">
          <div className="incident-packet__section-label">LIVE UPDATES</div>
          <div className="incident-packet__updates-card">
            {/* Reporter info */}
            {alert.reporter_name && (
              <div className="incident-packet__reporter">
                <div className="incident-packet__reporter-avatar">
                  {alert.reporter_name.charAt(0).toUpperCase()}
                </div>
                <div className="incident-packet__reporter-info">
                  <span className="incident-packet__reporter-name">{alert.reporter_name}</span>
                  <span className="incident-packet__reporter-role">{alert.reporter_role || 'Point of Contact'}</span>
                </div>
                {alert.reporter_phone && (
                  <a href={`tel:${alert.reporter_phone}`} className="incident-packet__call-btn">📞 Call</a>
                )}
              </div>
            )}
            <LiveUpdateFeed alertId={alert.id} />
          </div>
        </div>
      </div>

      {/* Floor Plan Modal */}
      {showFloorPlan && (
        <div className="incident-packet__modal-overlay" onClick={() => setShowFloorPlan(false)}>
          <div className="incident-packet__modal" onClick={(e) => e.stopPropagation()}>
            <div className="incident-packet__modal-header">
              <h2 className="incident-packet__modal-title">Floor Plan</h2>
              <button className="incident-packet__modal-close" onClick={() => setShowFloorPlan(false)}>×</button>
            </div>
            <FloorplanViewer
              floorPlans={building.floor_plans}
              activeFloor={alert.floor_number}
              path={building.floorplan_path}
            />
          </div>
        </div>
      )}
    </div>
  );
}