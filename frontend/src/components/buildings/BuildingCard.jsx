import StatusBadge from '../common/StatusBadge';
import { isNocExpired, formatDate, buildingIcon, formatNumber } from '../../utils/helpers';
import './BuildingCard.css';

export default function BuildingCard({ building, onClick }) {
  const expired = isNocExpired(building.noc_valid_till);

  return (
    <div
      className={`building-card ${building.is_high_hazard ? 'building-card--hazard' : ''}`}
      onClick={() => onClick?.(building)}
      role="button"
      tabIndex={0}
    >
      <div className="building-card__header">
        <span className="building-card__icon">{buildingIcon(building.building_type)}</span>
        <div className="building-card__badges">
          {building.is_high_hazard && <StatusBadge type="hazard">HAZARD</StatusBadge>}
          {expired ? (
            <StatusBadge type="expired">NOC Expired</StatusBadge>
          ) : (
            <StatusBadge type="valid">NOC Valid</StatusBadge>
          )}
        </div>
      </div>

      <h3 className="building-card__name">{building.name}</h3>
      <span className="building-card__id">{building.building_id}</span>

      <p className="building-card__type">{building.building_type}</p>
      <p className="building-card__address">{building.address}</p>

      <div className="building-card__stats">
        <div className="building-card__stat">
          <span className="building-card__stat-value">{building.floors_above_ground || '—'}</span>
          <span className="building-card__stat-label">Floors</span>
        </div>
        <div className="building-card__stat">
          <span className="building-card__stat-value">{formatNumber(building.daytime_occupancy)}</span>
          <span className="building-card__stat-label">Occupancy</span>
        </div>
        <div className="building-card__stat">
          <span className="building-card__stat-value">{building.total_height_metres || '—'}m</span>
          <span className="building-card__stat-label">Height</span>
        </div>
      </div>

      <div className="building-card__footer">
        <span className="building-card__noc">NOC: {formatDate(building.noc_valid_till)}</span>
      </div>
    </div>
  );
}
