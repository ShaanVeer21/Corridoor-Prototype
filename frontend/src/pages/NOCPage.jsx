import { useState } from 'react';
import Header from '../components/layout/Header';
import NOCDetail from '../components/noc/NOCDetail';
import StatusBadge from '../components/common/StatusBadge';
import { useNOCSearch, useBuildingDetail } from '../hooks/useBuildings';
import { formatDate, buildingIcon } from '../utils/helpers';
import './NOCPage.css';

export default function NOCPage() {
  const { results, loading, filters, setFilters } = useNOCSearch();
  const [selectedId, setSelectedId] = useState(null);
  const { building: selectedBuilding } = useBuildingDetail(selectedId);

  if (selectedId && selectedBuilding) {
    return (
      <div className="noc-page">
        <NOCDetail building={selectedBuilding} onClose={() => setSelectedId(null)} />
      </div>
    );
  }

  return (
    <div className="noc-page">
      <Header title="NOC Database" subtitle="Search, view, and manage Fire NOC records" />

      {/* Search & Filters */}
      <div className="noc-page__controls">
        <input
          type="text"
          className="noc-page__search"
          placeholder="Search by name, ID, address, type..."
          value={filters.q}
          onChange={(e) => setFilters({ ...filters, q: e.target.value })}
        />
        <label className="noc-page__toggle">
          <input
            type="checkbox"
            checked={filters.hazard_only}
            onChange={(e) => setFilters({ ...filters, hazard_only: e.target.checked })}
          />
          <span>High Hazard Only</span>
        </label>
        <label className="noc-page__toggle">
          <input
            type="checkbox"
            checked={filters.expired_only}
            onChange={(e) => setFilters({ ...filters, expired_only: e.target.checked })}
          />
          <span>Expired NOC Only</span>
        </label>
      </div>

      {/* Results count */}
      <p className="noc-page__count">{results.length} building{results.length !== 1 ? 's' : ''} found</p>

      {/* Table */}
      {loading ? (
        <p className="dashboard__loading">Searching...</p>
      ) : (
        <div className="noc-page__table">
          <div className="noc-page__table-header">
            <span className="noc-page__col noc-page__col--id">ID</span>
            <span className="noc-page__col noc-page__col--name">Building</span>
            <span className="noc-page__col noc-page__col--type">Type</span>
            <span className="noc-page__col noc-page__col--floors">Floors</span>
            <span className="noc-page__col noc-page__col--occ">Occupancy</span>
            <span className="noc-page__col noc-page__col--noc">NOC Status</span>
          </div>

          {results.map((b, i) => (
            <div
              key={b.building_id}
              className={`noc-page__table-row ${b.is_high_hazard ? 'noc-page__table-row--hazard' : ''}`}
              onClick={() => setSelectedId(b.building_id)}
              style={{ animationDelay: `${i * 0.02}s` }}
            >
              <span className="noc-page__col noc-page__col--id">
                <span className="noc-page__row-icon">{buildingIcon(b.building_type)}</span>
                {b.building_id}
              </span>
              <span className="noc-page__col noc-page__col--name">
                {b.name}
                {b.is_high_hazard && <StatusBadge type="hazard">HAZARD</StatusBadge>}
              </span>
              <span className="noc-page__col noc-page__col--type">{b.building_type}</span>
              <span className="noc-page__col noc-page__col--floors">{b.floors_above_ground}</span>
              <span className="noc-page__col noc-page__col--occ">{b.daytime_occupancy?.toLocaleString('en-IN')}</span>
              <span className="noc-page__col noc-page__col--noc">
                {b.noc_expired ? (
                  <StatusBadge type="expired">Expired {formatDate(b.noc_valid_till)}</StatusBadge>
                ) : (
                  <StatusBadge type="valid">Valid {formatDate(b.noc_valid_till)}</StatusBadge>
                )}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
