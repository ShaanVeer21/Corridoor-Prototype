import { useState } from 'react';
import StatusBadge from '../common/StatusBadge';
import FloorplanViewer from './FloorplanViewer';
import { formatDate, formatNumber, isNocExpired } from '../../utils/helpers';
import './NOCDetail.css';

function DataRow({ label, value, highlight }) {
  if (value == null || value === '' || value === '—') return null;
  return (
    <div className={`noc-detail__row ${highlight ? 'noc-detail__row--highlight' : ''}`}>
      <span className="noc-detail__label">{label}</span>
      <span className="noc-detail__value">{value}</span>
    </div>
  );
}

export default function NOCDetail({ building, onClose }) {
  const [activeTab, setActiveTab] = useState('a');

  if (!building) return null;

  const expired = isNocExpired(building.noc_valid_till);
  const a = building.section_a;
  const b = building.section_b;
  const c = building.section_c;

  const tabs = [
    { id: 'a', label: 'Section A', sub: 'NOC Submission' },
    { id: 'b', label: 'Section B', sub: 'Certificates' },
    { id: 'c', label: 'Section C', sub: 'Access & Compliance' },
    { id: 'floor', label: 'Floorplan', sub: 'Building Layout' },
  ];

  return (
    <div className="noc-detail animate-in">
      {/* Header */}
      <div className="noc-detail__header">
        <div className="noc-detail__header-left">
          <button className="noc-detail__back" onClick={onClose}>← Back</button>
          <h2 className="noc-detail__title">{building.name}</h2>
          <div className="noc-detail__meta">
            <span className="noc-detail__id">{building.building_id}</span>
            <span className="noc-detail__type">{building.building_type}</span>
          </div>
        </div>
        <div className="noc-detail__header-badges">
          {building.is_high_hazard && <StatusBadge type="hazard">HIGH HAZARD</StatusBadge>}
          {expired ? (
            <StatusBadge type="expired">NOC EXPIRED — {formatDate(building.noc_valid_till)}</StatusBadge>
          ) : (
            <StatusBadge type="valid">NOC Valid — {formatDate(building.noc_valid_till)}</StatusBadge>
          )}
        </div>
      </div>

      {/* NOC Number bar */}
      <div className="noc-detail__noc-bar">
        <span>NOC: <strong>{building.noc_number}</strong></span>
        <span>Valid Till: <strong>{formatDate(building.noc_valid_till)}</strong></span>
      </div>

      {/* Tabs */}
      <div className="noc-detail__tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`noc-detail__tab ${activeTab === tab.id ? 'noc-detail__tab--active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="noc-detail__tab-label">{tab.label}</span>
            <span className="noc-detail__tab-sub">{tab.sub}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="noc-detail__content">
        {activeTab === 'a' && a && (
          <div className="noc-detail__section animate-in">
            <h3 className="noc-detail__section-title">Section A — Fire NOC Submission Data</h3>
            <p className="noc-detail__section-desc">Fields submitted by building owner in the annual Fire NOC application</p>
            <div className="noc-detail__grid">
              <DataRow label="Address" value={a.address} />
              <DataRow label="Nearest Landmark" value={a.nearest_landmark} />
              <DataRow label="NBC Occupancy Group" value={a.nbc_occupancy_group} highlight />
              <DataRow label="Floors Above Ground" value={a.floors_above_ground} />
              <DataRow label="Floors Below Ground" value={a.floors_below_ground} />
              <DataRow label="Total Building Height" value={`${a.total_height_metres} metres`} highlight />
              <DataRow label="Plot Area" value={a.plot_area_sqm ? `${formatNumber(a.plot_area_sqm)} sq.m.` : null} />
              <DataRow label="Built-Up Area" value={a.built_up_area_sqm ? `${formatNumber(a.built_up_area_sqm)} sq.m.` : null} />
              <DataRow label="Daytime Occupancy" value={`${formatNumber(a.daytime_occupancy)} persons`} highlight />
              <DataRow label="Nighttime Occupancy" value={`${formatNumber(a.nighttime_occupancy)} persons`} />
              <DataRow label="Fire Alarm System" value={a.fire_alarm_make} highlight />
              <DataRow label="Sprinkler System" value={a.sprinkler_system} highlight />
              <DataRow label="Internal Hydrants" value={a.internal_hydrants} />
              <DataRow label="External Hydrants" value={a.external_hydrants} />
              <DataRow label="Wet Riser" value={a.wet_riser} />
              <DataRow label="Fire Extinguishers" value={a.fire_extinguishers} />
            </div>
          </div>
        )}

        {activeTab === 'b' && b && (
          <div className="noc-detail__section animate-in">
            <h3 className="noc-detail__section-title">Section B — Installation Certificates & Building File</h3>
            <p className="noc-detail__section-desc">From fire system installation certificates, AMC records, and building plan approval</p>
            <div className="noc-detail__grid">
              <DataRow label="Panel Model & Series" value={b.panel_model} />
              <DataRow label="Detection Zones" value={b.detection_zones} />
              <DataRow label="Fire Pump Capacity" value={b.fire_pump_capacity} highlight />
              <DataRow label="Public Address System" value={b.public_address_system} />
              <DataRow label="Generator Backup" value={b.generator_backup} highlight />
              <DataRow label="AMC Vendor" value={b.amc_vendor} />
              <DataRow label="AMC Valid Till" value={formatDate(b.amc_valid_till)} />
              <DataRow label="Last Fire Drill" value={formatDate(b.last_fire_drill)} />
              <DataRow label="Drill Attendance" value={b.drill_attendance_pct ? `${b.drill_attendance_pct}%` : null} highlight />
              <DataRow label="Structural Stability" value={b.structural_stability ? 'Yes — Valid' : 'No'} />
              <DataRow label="Occupancy Certificate" value={b.occupancy_certificate} />
              <DataRow label="Architect" value={b.architect} />
              <DataRow label="MEP / Fire Consultant" value={b.mep_consultant} />
              <DataRow label="Refuge Floors" value={b.refuge_floors} highlight />
              <DataRow label="Owner Name" value={b.owner_name} />
              <DataRow label="Owner Contact" value={b.owner_contact} />
            </div>
          </div>
        )}

        {activeTab === 'c' && c && (
          <div className="noc-detail__section animate-in">
            <h3 className="noc-detail__section-title">Section C — Access Routes & Compliance History</h3>
            <p className="noc-detail__section-desc">From site inspection records and previous NOC files at the fire station</p>
            <div className="noc-detail__grid">
              <DataRow label="Entry Points" value={c.entry_points} highlight />
              <DataRow label="Exit Routes" value={c.exit_routes} highlight />
              <DataRow label="Previous NOC Number" value={c.previous_noc_number} />
              <DataRow label="Previous Violations" value={c.previous_violations} highlight />
              <DataRow label="First Contact on Site" value={c.first_contact_on_site} highlight />
              <DataRow label="Last Inspection" value={formatDate(c.last_inspection_date)} />
              <DataRow label="Inspecting Officer" value={c.inspecting_officer} />
            </div>
          </div>
        )}

        {activeTab === 'floor' && (
          <div className="noc-detail__section animate-in">
            <h3 className="noc-detail__section-title">Building Floorplan</h3>
            <p className="noc-detail__section-desc">Dummy floorplan for prototype — production will use per-building plans from NOC submissions</p>
            <FloorplanViewer floorPlans={building.floor_plans} path={building.floorplan_path} />
          </div>
        )}
      </div>
    </div>
  );
}
