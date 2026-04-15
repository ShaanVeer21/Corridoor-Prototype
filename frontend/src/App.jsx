import { useState, useEffect, useRef, useCallback } from 'react';
import Sidebar from './components/layout/Sidebar';
import DashboardPage from './pages/DashboardPage';
import AlertsPage from './pages/AlertsPage';
import BuildingsPage from './pages/BuildingsPage';
import NOCPage from './pages/NOCPage';
import UploadPage from './pages/UploadPage';
import AlertToast from './components/alerts/AlertToast';
import IncidentPacket from './components/alerts/IncidentPacket';
import NOCDetail from './components/noc/NOCDetail';
import { useTheme } from './hooks/useTheme';
import { getStations, connectStationWS } from './utils/api';
import './styles/theme.css';

export default function App() {
  const { theme, toggleTheme } = useTheme();
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [toastAlert, setToastAlert] = useState(null);
  const [incidentAlert, setIncidentAlert] = useState(null);
  const [nocBuilding, setNocBuilding] = useState(null);
  const wsConnections = useRef([]);

  // Connect WebSocket to ALL fire stations for real-time alerts
  useEffect(() => {
    let mounted = true;

    getStations().then((stations) => {
      if (!mounted) return;

      stations.forEach((station) => {
        const ws = connectStationWS(station.id, (message) => {
          if (message.type === 'NEW_ALERT') {
            // Show toast notification
            setToastAlert(message.data);
          }
        });
        wsConnections.current.push(ws);
      });
    }).catch(console.error);

    return () => {
      mounted = false;
      wsConnections.current.forEach((ws) => ws?.close());
      wsConnections.current = [];
    };
  }, []);

  const openIncidentPacket = useCallback((alert) => {
    setIncidentAlert(alert);
    setToastAlert(null);
  }, []);

  const openFullNOC = useCallback((building) => {
    setNocBuilding(building);
  }, []);

  // If viewing full NOC from incident packet
  if (nocBuilding) {
    return (
      <div className="app-layout">
        <div className="app-sidebar">
          <Sidebar currentPage={currentPage} onNavigate={(p) => { setNocBuilding(null); setIncidentAlert(null); setCurrentPage(p); }} theme={theme} onToggleTheme={toggleTheme} />
        </div>
        <main className="app-main">
          <div className="app-content">
            <NOCDetail building={nocBuilding} onClose={() => setNocBuilding(null)} />
          </div>
        </main>
      </div>
    );
  }

  // If viewing incident packet
  if (incidentAlert) {
    return (
      <div className="app-layout">
        <div className="app-sidebar">
          <Sidebar currentPage={currentPage} onNavigate={(p) => { setIncidentAlert(null); setCurrentPage(p); }} theme={theme} onToggleTheme={toggleTheme} />
        </div>
        <main className="app-main">
          <div className="app-content">
            <IncidentPacket
              alert={incidentAlert}
              onClose={() => setIncidentAlert(null)}
              onViewFullNOC={openFullNOC}
            />
          </div>
        </main>
      </div>
    );
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return (
          <DashboardPage
            onNavigate={setCurrentPage}
            onSelectAlert={openIncidentPacket}
            onSelectBuilding={() => setCurrentPage('buildings')}
          />
        );
      case 'alerts':
        return <AlertsPage onOpenIncident={openIncidentPacket} />;
      case 'buildings':
        return <BuildingsPage />;
      case 'noc':
        return <NOCPage />;
      case 'upload':
        return <UploadPage />;
      default:
        return <DashboardPage onNavigate={setCurrentPage} />;
    }
  };

  return (
    <div className="app-layout">
      <div className="app-sidebar">
        <Sidebar
          currentPage={currentPage}
          onNavigate={setCurrentPage}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
      </div>
      <main className="app-main">
        <div className="app-content">
          {renderPage()}
        </div>
      </main>

      {/* Toast notification — appears on top of everything */}
      {toastAlert && (
        <AlertToast
          alert={toastAlert}
          onOpen={openIncidentPacket}
          onDismiss={() => setToastAlert(null)}
        />
      )}
    </div>
  );
}