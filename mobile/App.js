import { useState } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import RegisterScreen from './src/screens/RegisterScreen';
import HomeScreen from './src/screens/HomeScreen';
import UpdateScreen from './src/screens/UpdateScreen';
import { useUser } from './src/hooks/useUser';
import { COLORS } from './src/utils/theme';

export default function App() {
  const { user, loading, register, logout, isRegistered } = useUser();
  const [activeAlert, setActiveAlert] = useState(null);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!isRegistered) {
    return <RegisterScreen onRegister={register} />;
  }

  if (activeAlert) {
    return (
      <UpdateScreen
        alert={activeAlert}
        user={user}
        onBack={() => setActiveAlert(null)}
      />
    );
  }

  return (
    <HomeScreen
      user={user}
      onAlertCreated={(alert) => setActiveAlert(alert)}
      onLogout={logout}
    />
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: COLORS.bgSecondary,
  },
});