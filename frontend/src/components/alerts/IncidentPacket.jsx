import { useState, useEffect } from 'react';
import StatusBadge from '../common/StatusBadge';
import FloorplanViewer from '../noc/FloorplanViewer';
import LiveUpdateFeed from '../alerts/LiveUpdateFeed';
import { getBuilding } from '../../utils/api';
import { formatDate, formatNumber, formatDateTime, buildingIcon } from '../../utils/helpers';
import { updateAlertStatus } from '../../utils/api';
import './IncidentPacket.css';

export default function IncidentPacket({ alert, onClose, onViewFullNOC }) {
  const [building, setBuilding] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!alert?.building_id) return;
    getBuilding(alert.building_id)
      .then(setBuilding)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [alert?.building_id]);

  const handleAcknowledge = async () => {
    try {
      await updateAlertStatus(alert.id, 'acknowledged');
    } catch (err) {
      console.error('Failed to acknowledge:', err);
    }
  };

  const handleResolve = async () => {
    try {
      await updateAlertStatus(alert.id, 'resolved');
      onClose();
    } catch (err) {
      console.error('Failed to resolve:', err);
    }
  };

  if (loading || !building) {
    return (
      <div className="incident-packet">
        <div className="incident-packet__loading">Loading incident data...</div>
      </div>
    );
  }

  const a = building.section_a;
  const b = building.section_b;
  const c = building.section_c;

  return (
    <div className="incident-packet animate-in">
      {/* Top bar */}
      <div className="incident-packet__topbar">
        <button className="incident-packet__back" onClick={onClose}>← Back to Dashboard</button>
        <div className="incident-packet__topbar-right">
          <button className="incident-packet__btn incident-packet__btn--ack" onClick={handleAcknowledge}>
            Acknowledge
          </button>
          <button className="incident-packet__btn incident-packet__btn--resolve" onClick={handleResolve}>
            Mark Resolved
          </button>
        </div>
      </div>

      {/* Header */}
      <div className="incident-packet__header">
        <h1 className="incident-packet__title">Incoming Emergency Alert</h1>
        <div className="incident-packet__header-badges">
          {alert.is_high_hazard && <StatusBadge type="hazard">HIGH HAZARD</StatusBadge>}
          <StatusBadge type={alert.status}>{alert.status}</StatusBadge>
        </div>
      </div>

      {/* Three column layout */}
      <div className="incident-packet__grid">
        {/* Column 1: Building Data */}
        <div className="incident-packet__col">
          <h2 className="incident-packet__col-title">Building Data</h2>

          <div className="incident-packet__field">
            <span className="incident-packet__field-label">Building Name</span>
            <span className="incident-packet__field-value">{building.name}</span>
          </div>

          <div className="incident-packet__field">
            <span className="incident-packet__field-label">Building Type</span>
            <span className="incident-packet__field-value">{building.building_type}</span>
          </div>

          <div className="incident-packet__field">
            <span className="incident-packet__field-label">Address</span>
            <span className="incident-packet__field-value">{a.address}</span>
          </div>

          <div className="incident-packet__field">
            <span className="incident-packet__field-label">Floors</span>
            <span className="incident-packet__field-value">
              {a.floors_above_ground} above + {a.floors_below_ground} basement
            </span>
          </div>

          <div className="incident-packet__field">
            <span className="incident-packet__field-label">Height</span>
            <span className="incident-packet__field-value">{a.total_height_metres} metres</span>
          </div>

          <div className="incident-packet__field">
            <span className="incident-packet__field-label">Daytime Occupancy</span>
            <span className="incident-packet__field-value">{formatNumber(a.daytime_occupancy)} persons</span>
          </div>

          <div className="incident-packet__field">
            <span className="incident-packet__field-label">Nighttime Occupancy</span>
            <span className="incident-packet__field-value">{formatNumber(a.nighttime_occupancy)} persons</span>
          </div>
        </div>

        {/* Column 2: Floor Plan */}
        <div className="incident-packet__col incident-packet__col--wide">
          <h2 className="incident-packet__col-title">Floor Plan</h2>
          <FloorplanViewer path={building.floorplan_path} />
        </div>

        {/* Column 3: Fire Systems & Access */}
        <div className="incident-packet__col">
          <h2 className="incident-packet__col-title">Fire Systems</h2>

          <div className="incident-packet__field">
            <span className="incident-packet__field-label">Fire Alarm</span>
            <span className="incident-packet__field-value">{a.fire_alarm_make}</span>
          </div>

          <div className="incident-packet__field">
            <span className="incident-packet__field-label">Sprinkler System</span>
            <span className="incident-packet__field-value">{a.sprinkler_system}</span>
          </div>

          <div className="incident-packet__field">
            <span className="incident-packet__field-label">Hydrants</span>
            <span className="incident-packet__field-value">
              {a.internal_hydrants} internal · {a.external_hydrants} external
            </span>
          </div>

          <div className="incident-packet__field">
            <span className="incident-packet__field-label">Wet Riser</span>
            <span className="incident-packet__field-value">{a.wet_riser || 'None'}</span>
          </div>

          <div className="incident-packet__field">
            <span className="incident-packet__field-label">Pump Capacity</span>
            <span className="incident-packet__field-value">{b.fire_pump_capacity || '—'}</span>
          </div>

          <div className="incident-packet__field">
            <span className="incident-packet__field-label">Generator Backup</span>
            <span className="incident-packet__field-value">{b.generator_backup || '—'}</span>
          </div>

          <div className="incident-packet__divider" />

          <h2 className="incident-packet__col-title">Access Routes</h2>

          <div className="incident-packet__field">
            <span className="incident-packet__field-label">Entry Points</span>
            <span className="incident-packet__field-value">{c.entry_points || '—'}</span>
          </div>

          <div className="incident-packet__field">
            <span className="incident-packet__field-label">Exit Routes</span>
            <span className="incident-packet__field-value">{c.exit_routes || '—'}</span>
          </div>

          <div className="incident-packet__field">
            <span className="incident-packet__field-label">Refuge Floors</span>
            <span className="incident-packet__field-value">{b.refuge_floors || 'N/A'}</span>
          </div>

          <div className="incident-packet__field">
            <span className="incident-packet__field-label">First Contact</span>
            <span className="incident-packet__field-value incident-packet__field-value--highlight">
              {c.first_contact_on_site || '—'}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom section: Live updates + View Full NOC */}
      <div className="incident-packet__bottom">
        <div className="incident-packet__bottom-left">
          <LiveUpdateFeed alertId={alert.id} />
        </div>
        <div className="incident-packet__bottom-right">
          <button className="incident-packet__noc-btn" onClick={() => onViewFullNOC(building)}>
            📋 View Full NOC Document
          </button>
          <div className="incident-packet__noc-info">
            <span>NOC: {building.noc_number}</span>
            <span>Valid: {formatDate(building.noc_valid_till)}</span>
            <span>Owner: {b.owner_name}</span>
            <span>Contact: {b.owner_contact}</span>
          </div>
        </div>
      </div>
    </div>
  );
}