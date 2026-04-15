import { useState } from 'react';
import Header from '../components/layout/Header';
import BuildingCard from '../components/buildings/BuildingCard';
import NOCDetail from '../components/noc/NOCDetail';
import { useBuildings, useBuildingDetail } from '../hooks/useBuildings';
import './BuildingsPage.css';

export default function BuildingsPage() {
  const { buildings, loading } = useBuildings();
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const { building: selectedBuilding } = useBuildingDetail(selectedId);

  const filtered = buildings.filter((b) => {
    const q = search.toLowerCase();
    return (
      b.building_id.toLowerCase().includes(q) ||
      b.name.toLowerCase().includes(q) ||
      b.address.toLowerCase().includes(q) ||
      b.building_type.toLowerCase().includes(q)
    );
  });

  if (selectedId && selectedBuilding) {
    return (
      <div className="buildings-page">
        <NOCDetail building={selectedBuilding} onClose={() => setSelectedId(null)} />
      </div>
    );
  }

  return (
    <div className="buildings-page">
      <Header title="Buildings" subtitle={`${buildings.length} buildings in jurisdiction`}>
        <input
          type="text"
          className="buildings-page__search"
          placeholder="Search buildings..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </Header>

      {loading ? (
        <p className="dashboard__loading">Loading buildings...</p>
      ) : (
        <div className="buildings-page__grid">
          {filtered.map((b, i) => (
            <div key={b.building_id} style={{ animationDelay: `${i * 0.03}s` }}>
              <BuildingCard
                building={b}
                onClick={(b) => setSelectedId(b.building_id)}
              />
            </div>
          ))}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="dashboard__empty">
          <p>No buildings match "{search}"</p>
        </div>
      )}
    </div>
  );
}
