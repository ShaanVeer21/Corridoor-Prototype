import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { registerUser } from '../utils/api';

const USER_KEY = 'corridoor_user';

export function useUser() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load saved user on mount
  useEffect(() => {
    AsyncStorage.getItem(USER_KEY)
      .then((data) => {
        if (data) setUser(JSON.parse(data));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const register = useCallback(async (name, role, buildingId) => {
    const data = await registerUser({ name, role, building_id: buildingId });
    setUser(data);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(data));
    return data;
  }, []);

  const logout = useCallback(async () => {
    setUser(null);
    await AsyncStorage.removeItem(USER_KEY);
  }, []);

  return { user, loading, register, logout, isRegistered: !!user };
}