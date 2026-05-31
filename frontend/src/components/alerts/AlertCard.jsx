import StatusBadge from '../common/StatusBadge';
import { formatDateTime, timeAgo, buildingIcon } from '../../utils/helpers';
import './AlertCard.css';

const CATEGORY_ICONS = {
  fire: '🔥',
  rescue: '🚑',
  collapse: '🏚️',
  other: '⚠️',
};

export default function AlertCard({ alert, onClick }) {
  const isActive = alert.status === 'active';
  const categoryIcon = CATEGORY_ICONS[alert.incident_category] || '🚨';

  return (
    <div
      className={`alert-card ${isActive ? 'alert-card--active' : ''} ${alert.is_high_hazard ? 'alert-card--hazard' : ''}`}
      onClick={() => onClick?.(alert)}
      role="button"
      tabIndex={0}
    >
      <div className="alert-card__left">
        <span className="alert-card__icon">{categoryIcon}</span>
      </div>

      <div className="alert-card__body">
        <div className="alert-card__top">
          <span className="alert-card__name">{alert.building_name || alert.building_id}</span>
          <div className="alert-card__badges">
            {alert.is_high_hazard && <StatusBadge type="hazard">HIGH HAZARD</StatusBadge>}
            <StatusBadge type={alert.status}>{alert.status}</StatusBadge>
          </div>
        </div>

        <div className="alert-card__meta">
          <span className="alert-card__id">{alert.building_id}</span>
          <span className="alert-card__sep">·</span>
          <span className="alert-card__category">{alert.incident_category || alert.alert_type}</span>
          {alert.ward && (
            <>
              <span className="alert-card__sep">·</span>
              <span className="alert-card__ward">{alert.ward}</span>
            </>
          )}
          {alert.floor && (
            <>
              <span className="alert-card__sep">·</span>
              <span className="alert-card__floor">{alert.floor}</span>
            </>
          )}
          <span className="alert-card__sep">·</span>
          <span className="alert-card__time" title={formatDateTime(alert.created_at)}>
            {timeAgo(alert.created_at)}
          </span>
        </div>

        <div className="alert-card__bottom">
          {alert.building_type && (
            <span className="alert-card__building-type">{alert.building_type}</span>
          )}
          {alert.reporter_name && (
            <span className="alert-card__reporter">
              Reported by {alert.reporter_name}
              {alert.reporter_role ? ` (${alert.reporter_role})` : ''}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}