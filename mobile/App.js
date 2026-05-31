import { useState } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
// Staff screens
import RegisterScreen from './src/screens/RegisterScreen';
import IncidentTypeScreen from './src/screens/IncidentTypeScreen';
import HomeScreen from './src/screens/HomeScreen';
import UpdateScreen from './src/screens/UpdateScreen';
// Responder screens
import RoleSelectScreen from './src/screens/RoleSelectScreen';
import ResponderLoginScreen from './src/screens/ResponderLoginScreen';
import ResponderAlertListScreen from './src/screens/ResponderAlertListScreen';
import ResponderIncidentScreen from './src/screens/ResponderIncidentScreen';
// Hooks
import { useUser } from './src/hooks/useUser';
import { COLORS } from './src/utils/theme';

export default function App() {
  const { user, loading, register, registerResponder, logout, isRegistered } = useUser();
  const [screen, setScreen] = useState('home');
  const [activeAlert, setActiveAlert] = useState(null);
  const [incidentData, setIncidentData] = useState(null);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  // ── Not registered — show role selection first ──
  if (!isRegistered) {
    if (screen === 'register-staff') {
      return <RegisterScreen onRegister={register} onBack={() => setScreen('role-select')} />;
    }
    if (screen === 'register-responder') {
      return <ResponderLoginScreen onLogin={registerResponder} onBack={() => setScreen('role-select')} />;
    }
    // Default: show role selection
    return (
      <RoleSelectScreen
        onSelectStaff={() => setScreen('register-staff')}
        onSelectResponder={() => setScreen('register-responder')}
      />
    );
  }

  // ── Registered as responder ──
  if (user?.is_responder) {
    if (screen === 'responder-incident' && activeAlert) {
      return (
        <ResponderIncidentScreen
          alert={activeAlert}
          user={user}
          onBack={() => { setActiveAlert(null); setScreen('responder-alerts'); }}
        />
      );
    }

    return (
      <ResponderAlertListScreen
        user={user}
        onSelectAlert={(alert) => { setActiveAlert(alert); setScreen('responder-incident'); }}
        onLogout={logout}
      />
    );
  }

  // ── Registered as staff ──
  
  if (screen === 'incident-type') {
    return (
      <IncidentTypeScreen
        user={user}
        onConfirm={(data) => { setIncidentData(data); setScreen('calling'); }}
      />
    );
  }

  if (screen === 'calling' && incidentData) {
    return (
      <HomeScreen
        user={user}
        incidentData={incidentData}
        onAlertCreated={(alert) => { setActiveAlert(alert); setScreen('update'); }}
        onLogout={logout}
        onBack={() => setScreen('home')}
      />
    );
  }

  if (screen === 'update' && activeAlert) {
    return (
      <UpdateScreen
        alert={activeAlert}
        user={user}
        onBack={() => { setActiveAlert(null); setIncidentData(null); setScreen('home'); }}
      />
    );
  }

  return (
    <HomeScreen
      user={user}
      onStartEmergency={() => setScreen('incident-type')}
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