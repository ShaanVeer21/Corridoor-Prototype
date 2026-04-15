import { useState } from 'react';
import Header from '../components/layout/Header';
import AlertCard from '../components/alerts/AlertCard';
import LiveUpdateFeed from '../components/alerts/LiveUpdateFeed';
import NOCDetail from '../components/noc/NOCDetail';
import StatusBadge from '../components/common/StatusBadge';
import { useAlerts } from '../hooks/useAlerts';
import { useBuildingDetail } from '../hooks/useBuildings';
import { updateAlertStatus } from '../utils/api';
import { formatDateTime } from '../utils/helpers';
import './AlertsPage.css';

export default function AlertsPage() {
  const { alerts, activeAlerts, acknowledgedAlerts, resolvedAlerts, loading, refetch } = useAlerts();
  const [filter, setFilter] = useState('all');
  const [selectedAlert, setSelectedAlert] = useState(null);
  const { building } = useBuildingDetail(selectedAlert?.building_id);

  const filteredAlerts =
    filter === 'all' ? alerts :
    filter === 'active' ? activeAlerts :
    filter === 'acknowledged' ? acknowledgedAlerts :
    resolvedAlerts;

  const handleStatusChange = async (alertId, newStatus) => {
    try {
      await updateAlertStatus(alertId, newStatus);
      refetch();
      if (selectedAlert?.id === alertId) {
        setSelectedAlert((prev) => ({ ...prev, status: newStatus }));
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  // Detail view
  if (selectedAlert) {
    return (
      <div className="alerts-page">
        <div className="alerts-page__detail animate-in">
          <button className="alerts-page__back" onClick={() => setSelectedAlert(null)}>
            ← Back to alerts
          </button>

          <div className="alerts-page__detail-header">
            <div>
              <h2 className="alerts-page__detail-title">
                {selectedAlert.building_name || selectedAlert.building_id}
              </h2>
              <p className="alerts-page__detail-meta">
                Alert #{selectedAlert.id} · {selectedAlert.alert_type} · {formatDateTime(selectedAlert.created_at)}
              </p>
            </div>
            <div className="alerts-page__detail-badges">
              {selectedAlert.is_high_hazard && <StatusBadge type="hazard">HIGH HAZARD</StatusBadge>}
              <StatusBadge type={selectedAlert.status}>{selectedAlert.status}</StatusBadge>
            </div>
          </div>

          {/* Status actions */}
          <div className="alerts-page__actions">
            {selectedAlert.status === 'active' && (
              <button
                className="alerts-page__action alerts-page__action--ack"
                onClick={() => handleStatusChange(selectedAlert.id, 'acknowledged')}
              >
                Acknowledge Alert
              </button>
            )}
            {selectedAlert.status !== 'resolved' && (
              <button
                className="alerts-page__action alerts-page__action--resolve"
                onClick={() => handleStatusChange(selectedAlert.id, 'resolved')}
              >
                Mark Resolved
              </button>
            )}
          </div>

          {/* Two-column: NOC data + Live feed */}
          <div className="alerts-page__detail-grid">
            <div className="alerts-page__detail-noc">
              {building ? (
                <NOCDetail building={building} onClose={() => setSelectedAlert(null)} />
              ) : (
                <p className="dashboard__loading">Loading building data...</p>
              )}
            </div>
            <div className="alerts-page__detail-feed">
              <LiveUpdateFeed alertId={selectedAlert.id} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="alerts-page">
      <Header title="Alert Inbox" subtitle="Incoming fire alerts from building staff">
        <div className="alerts-page__filters">
          {['all', 'active', 'acknowledged', 'resolved'].map((f) => (
            <button
              key={f}
              className={`alerts-page__filter ${filter === f ? 'alerts-page__filter--active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
              {f === 'active' && activeAlerts.length > 0 && (
                <span className="alerts-page__filter-count">{activeAlerts.length}</span>
              )}
            </button>
          ))}
        </div>
      </Header>

      {loading ? (
        <p className="dashboard__loading">Loading alerts...</p>
      ) : filteredAlerts.length === 0 ? (
        <div className="dashboard__empty">
          <span className="dashboard__empty-icon">{filter === 'active' ? '✅' : '📭'}</span>
          <p>No {filter === 'all' ? '' : filter} alerts</p>
        </div>
      ) : (
        <div className="alerts-page__list">
          {filteredAlerts.map((alert) => (
            <AlertCard key={alert.id} alert={alert} onClick={setSelectedAlert} />
          ))}
        </div>
      )}
    </div>
  );
}
