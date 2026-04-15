import { useState, useEffect, useCallback, useRef } from 'react';
import { getAlerts, connectStationWS } from '../utils/api';

export function useAlerts(stationId = null) {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const wsRef = useRef(null);

  const fetchAlerts = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (stationId) params.station_id = stationId;
      const data = await getAlerts(params);
      setAlerts(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [stationId]);

  // Initial fetch
  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  // WebSocket connection for real-time alerts
  useEffect(() => {
    if (!stationId) return;

    const ws = connectStationWS(stationId, (message) => {
      if (message.type === 'NEW_ALERT') {
        setAlerts((prev) => [message.data, ...prev]);
      } else if (message.type === 'REAL_TIME_UPDATE') {
        // Trigger a refresh or update in-place
        fetchAlerts();
      }
    });

    wsRef.current = ws;

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [stationId, fetchAlerts]);

  const activeAlerts = alerts.filter((a) => a.status === 'active');
  const acknowledgedAlerts = alerts.filter((a) => a.status === 'acknowledged');
  const resolvedAlerts = alerts.filter((a) => a.status === 'resolved');

  return {
    alerts,
    activeAlerts,
    acknowledgedAlerts,
    resolvedAlerts,
    loading,
    error,
    refetch: fetchAlerts,
  };
}
