import Header from '../components/layout/Header';
import EncryptionBadge from '../components/common/EncryptionBadge';
import AlertCard from '../components/alerts/AlertCard';
import StatusBadge from '../components/common/StatusBadge';
import { useAlerts } from '../hooks/useAlerts';
import { useBuildings } from '../hooks/useBuildings';
import { useLanguage } from '../context/LanguageContext';
import { isNocExpired, formatNumber } from '../utils/helpers';
import './DashboardPage.css';

export default function DashboardPage({ onNavigate, onSelectAlert, onSelectBuilding }) {
  const { alerts, activeAlerts, loading: alertsLoading } = useAlerts();
  const { buildings, loading: buildingsLoading } = useBuildings();
  const { t } = useLanguage();

  const highHazard = buildings.filter((b) => b.is_high_hazard);
  const expiredNOC = buildings.filter((b) => isNocExpired(b.noc_valid_till));

  const stats = [
    { label: t('dashboard.totalBuildings'), value: buildings.length, icon: '🏢' },
    { label: t('dashboard.activeAlerts'), value: activeAlerts.length, icon: '🚨', danger: activeAlerts.length > 0 },
    { label: t('dashboard.highHazard'), value: highHazard.length, icon: '⚠️', danger: true },
    { label: t('dashboard.expiredNocs'), value: expiredNOC.length, icon: '📋', warning: expiredNOC.length > 0 },
  ];

  return (
    <div className="dashboard">
      <Header
        title={t('dashboard.title')}
        subtitle={t('dashboard.subtitle')}
      />

      <EncryptionBadge />

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

      <div className="dashboard__section">
        <div className="dashboard__section-header">
          <h2 className="dashboard__section-title">{t('dashboard.recentAlerts')}</h2>
          <button className="dashboard__view-all" onClick={() => onNavigate('alerts')}>
            {t('dashboard.viewAll')} →
          </button>
        </div>

        {alertsLoading ? (
          <div className="dashboard__loading">Loading...</div>
        ) : activeAlerts.length > 0 ? (
          <div className="dashboard__alerts">
            {activeAlerts.slice(0, 5).map((alert) => (
              <AlertCard key={alert.id} alert={alert} onClick={onSelectAlert} />
            ))}
          </div>
        ) : (
          <div className="dashboard__empty">{t('dashboard.noAlerts')}</div>
        )}
      </div>
    </div>
  );
}