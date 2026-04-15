import { useState, useEffect, useCallback } from 'react';
import { getBuildings, getBuilding, searchNOC } from '../utils/api';

export function useBuildings() {
  const [buildings, setBuildings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchBuildings = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getBuildings();
      setBuildings(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBuildings();
  }, [fetchBuildings]);

  return { buildings, loading, error, refetch: fetchBuildings };
}

export function useBuildingDetail(buildingId) {
  const [building, setBuilding] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!buildingId) return;

    let cancelled = false;
    setLoading(true);

    getBuilding(buildingId)
      .then((data) => {
        if (!cancelled) {
          setBuilding(data);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [buildingId]);

  return { building, loading, error };
}

export function useNOCSearch() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ q: '', hazard_only: false, expired_only: false });

  const search = useCallback(async (params = filters) => {
    try {
      setLoading(true);
      const data = await searchNOC(params);
      setResults(data);
    } catch (err) {
      console.error('NOC search failed:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    search(filters);
  }, [filters]); // eslint-disable-line react-hooks/exhaustive-deps

  return { results, loading, filters, setFilters, search };
}
