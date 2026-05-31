import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { registerUser, responderLogin } from '../utils/api';

const USER_KEY = 'corridoor_user';

export function useUser() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(USER_KEY)
      .then((data) => {
        if (data) setUser(JSON.parse(data));
      })
      .finally(() => setLoading(false));
  }, []);

  const register = async (data) => {
    const registered = await registerUser(data);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(registered));
    setUser(registered);
    return registered;
  };

  const registerResponder = async (data) => {
    const registered = await responderLogin(data);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(registered));
    setUser(registered);
    return registered;
  };

  const logout = async () => {
    await AsyncStorage.removeItem(USER_KEY);
    setUser(null);
  };

  return {
    user,
    loading,
    register,
    registerResponder,
    logout,
    isRegistered: !!user,
  };
}