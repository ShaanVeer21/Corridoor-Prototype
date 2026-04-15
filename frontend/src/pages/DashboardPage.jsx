import Header from '../components/layout/Header';
import EncryptionBadge from '../components/common/EncryptionBadge';
import AlertCard from '../components/alerts/AlertCard';
import StatusBadge from '../components/common/StatusBadge';
import { useAlerts } from '../hooks/useAlerts';
import { useBuildings } from '../hooks/useBuildings';
import { isNocExpired, formatNumber } from '../utils/helpers';
import './DashboardPage.css';

export default function DashboardPage({ onNavigate, onSelectAlert, onSelectBuilding }) {
  const { alerts, activeAlerts, loading: alertsLoading } = useAlerts();
  const { buildings, loading: buildingsLoading } = useBuildings();

  const highHazard = buildings.filter((b) => b.is_high_hazard);
  const expiredNOC = buildings.filter((b) => isNocExpired(b.noc_valid_till));
  const totalOccupancy = buildings.reduce((sum, b) => {
    // Parse daytime_occupancy from label if available, otherwise skip
    return sum;
  }, 0);

  const stats = [
    { label: 'Total Buildings', value: buildings.length, icon: '🏢' },
    { label: 'Active Alerts', value: activeAlerts.length, icon: '🚨', danger: activeAlerts.length > 0 },
    { label: 'High Hazard', value: highHazard.length, icon: '⚠️', danger: true },
    { label: 'Expired NOCs', value: expiredNOC.length, icon: '📋', warning: expiredNOC.length > 0 },
  ];

  return (
    <div className="dashboard">
      <Header
        title="Fire Station Dashboard"
        subtitle="Thane Municipal Corporation — Corridoor Incident Response System"
      />

      <EncryptionBadge />

      {/* Stats Grid */}
      <div className="dashboard__stats">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className={`dashboard__stat-card ${stat.danger ? 'dashboard__stat-card--danger' : ''} ${stat.warning ? 'dashboard__stat-card--warning' : ''}`}
          >
            <span className="dashboard__stat-icon">{stat.icon}</span>
            <div>
              <span className="dashboard__stat-value">{stat.value}</span>
              <span className="dashboard__stat-label">{stat.label}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Active Alerts Section */}
      <div className="dashboard__section">
        <div className="dashboard__section-header">
          <h2 className="dashboard__section-title">
            Active Alerts
            {activeAlerts.length > 0 && (
              <StatusBadge type="active">{activeAlerts.length}</StatusBadge>
            )}
          </h2>
          <button className="dashboard__section-link" onClick={() => onNavigate('alerts')}>
            View all alerts →
          </button>
        </div>

        {alertsLoading ? (
          <p className="dashboard__loading">Loading alerts...</p>
        ) : activeAlerts.length === 0 ? (
          <div className="dashboard__empty">
            <span className="dashboard__empty-icon">✅</span>
            <p>No active alerts — all clear</p>
          </div>
        ) : (
          <div className="dashboard__alert-list">
            {activeAlerts.slice(0, 5).map((alert) => (
              <AlertCard key={alert.id} alert={alert} onClick={onSelectAlert} />
            ))}
          </div>
        )}
      </div>

      {/* High Hazard Buildings */}
      {highHazard.length > 0 && (
        <div className="dashboard__section">
          <div className="dashboard__section-header">
            <h2 className="dashboard__section-title">
              High Hazard Buildings
              <StatusBadge type="hazard">{highHazard.length}</StatusBadge>
            </h2>
          </div>
          <div className="dashboard__hazard-list">
            {highHazard.map((b) => (
              <div
                key={b.building_id}
                className="dashboard__hazard-item"
                onClick={() => onSelectBuilding(b)}
              >
                <span className="dashboard__hazard-id">{b.building_id}</span>
                <span className="dashboard__hazard-name">{b.name}</span>
                <span className="dashboard__hazard-type">{b.building_type}</span>
                <StatusBadge type="hazard">HIGH HAZARD</StatusBadge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Expired NOCs */}
      {expiredNOC.length > 0 && (
        <div className="dashboard__section">
          <div className="dashboard__section-header">
            <h2 className="dashboard__section-title">
              Expired NOCs
              <StatusBadge type="expired">{expiredNOC.length}</StatusBadge>
            </h2>
            <button className="dashboard__section-link" onClick={() => onNavigate('noc')}>
              View NOC database →
            </button>
          </div>
          <div className="dashboard__expired-list">
            {expiredNOC.slice(0, 8).map((b) => (
              <div
                key={b.building_id}
                className="dashboard__expired-item"
                onClick={() => onSelectBuilding(b)}
              >
                <span className="dashboard__hazard-id">{b.building_id}</span>
                <span className="dashboard__hazard-name">{b.name}</span>
                <StatusBadge type="expired">Expired</StatusBadge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
