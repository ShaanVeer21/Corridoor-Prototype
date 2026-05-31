import { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, StatusBar,
  SafeAreaView, Image, Alert, Linking, ActivityIndicator,
  AppState,
} from 'react-native';
import { getNearestStation, createAlert } from '../utils/api';
import { COLORS, SPACING, RADIUS } from '../utils/theme';

const FIRE_STATION_PHONE = '+918879499824';

export default function HomeScreen({ user, incidentData, onAlertCreated, onStartEmergency, onLogout, onBack }) {
  const [station, setStation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState('idle'); // idle, dialing, creating-alert
  const appStateRef = useRef(AppState.currentState);
  const waitingForCallReturn = useRef(false);

  const buildingId = incidentData?.building_id || user.building_id;

  useEffect(() => {
    if (!buildingId) { setLoading(false); return; }
    getNearestStation(buildingId)
      .then(setStation)
      .catch(() => {}) // Silently handle — station mapping may not exist yet
      .finally(() => setLoading(false));
  }, [buildingId]);

  // Listen for app coming back to foreground after call
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextState) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextState === 'active' &&
        waitingForCallReturn.current
      ) {
        // User returned from call — now create the alert
        waitingForCallReturn.current = false;
        setPhase('creating-alert');
        try {
          const alertData = {
            building_id: incidentData?.building_id || user.building_id,
            reported_by: user.id,
            incident_category: incidentData?.incident_category || 'fire',
            alert_type: incidentData?.alert_type || 'fire',
            floor: incidentData?.floor || null,
            floor_number: incidentData?.floor_number ?? null,
          };
          const alert = await createAlert(alertData);
          onAlertCreated(alert);
        } catch (err) {
          Alert.alert('Alert Failed', err.message);
          setPhase('idle');
          if (onBack) onBack();
        }
      }
      appStateRef.current = nextState;
    });

    return () => subscription.remove();
  }, [incidentData]);

  // If incidentData is passed, auto-trigger the call (but NOT the alert)
  useEffect(() => {
    if (incidentData && phase === 'idle') {
      handleDial();
    }
  }, [incidentData]);

  const handleDial = async () => {
    setPhase('dialing');
    waitingForCallReturn.current = true;

    const phoneUrl = `tel:${FIRE_STATION_PHONE}`;
    try {
      await Linking.openURL(phoneUrl);
      // App goes to background — AppState listener will catch the return
    } catch (err) {
      Alert.alert('Error', 'Could not open phone dialer');
      waitingForCallReturn.current = false;
      setPhase('idle');
      if (onBack) onBack();
    }
  };

  // If we have incidentData, show a "calling/creating" state
  if (incidentData) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.hazard} />
        <View style={styles.callingView}>
          <ActivityIndicator size="large" color={COLORS.white} />
          <Text style={styles.callingText}>
            {phase === 'creating-alert' ? 'Sending alert to station...' : 'Calling fire station...'}
          </Text>
          <Text style={styles.callingSubtext}>
            {incidentData.incident_category?.toUpperCase()} · {incidentData.floor}
          </Text>
          {phase === 'dialing' && (
            <Text style={styles.callingHint}>
              Alert will be sent after you finish the call
            </Text>
          )}
        </View>
      </SafeAreaView>
    );
  }

  // Normal home screen with emergency button
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bgSecondary} />

      <View style={styles.topBar}>
        <View style={styles.logoBox}>
          <Text style={styles.logoText}>🚒</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.brand}>CORRIDOOR</Text>
          <Text style={styles.greeting}>Hi, {user.name}</Text>
        </View>
        <TouchableOpacity onPress={onLogout} style={styles.logoutBtn}>
          <Text style={styles.logoutTxt}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.infoSection}>
        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>YOUR BUILDING</Text>
          <Text style={styles.infoId}>{user.building_id || '—'}</Text>
        </View>
        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>ROLE</Text>
          <Text style={styles.infoRole}>{user.role?.toUpperCase()}</Text>
        </View>
      </View>

      {station && (
        <View style={styles.stationCard}>
          <Text style={styles.stationLabel}>NEAREST FIRE STATION</Text>
          <Text style={styles.stationName}>{station.name}</Text>
          <Text style={styles.stationAddr}>{station.address}</Text>
        </View>
      )}

      <View style={styles.buttonArea}>
        <TouchableOpacity
          style={styles.callButton}
          onPress={onStartEmergency}
          activeOpacity={0.8}
        >
          <Text style={styles.callIcon}>🚨</Text>
          <Text style={styles.callTitle}>EMERGENCY</Text>
          <Text style={styles.callSub}>Report an incident</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>🔒 End-to-end encrypted · Zero-access architecture</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgSecondary },
  topBar: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    paddingHorizontal: SPACING.xl, paddingVertical: SPACING.lg,
    backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight,
  },
  logoBox: {
    width: 36, height: 36, borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center',
  },
  logoText: { fontSize: 18 },
  brand: { fontSize: 12, fontWeight: '800', color: COLORS.primary, letterSpacing: 1.5 },
  greeting: { fontSize: 15, fontWeight: '500', color: COLORS.textPrimary },
  logoutBtn: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm },
  logoutTxt: { fontSize: 13, color: COLORS.textTertiary },
  infoSection: {
    flexDirection: 'row', gap: SPACING.md,
    paddingHorizontal: SPACING.xl, paddingTop: SPACING.xl,
  },
  infoCard: {
    flex: 1, padding: SPACING.lg, backgroundColor: COLORS.white,
    borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border,
  },
  infoLabel: { fontSize: 10, fontWeight: '600', color: COLORS.textTertiary, letterSpacing: 0.5, marginBottom: 4 },
  infoId: { fontSize: 14, fontFamily: 'monospace', fontWeight: '700', color: COLORS.primary },
  infoRole: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
  stationCard: {
    marginHorizontal: SPACING.xl, marginTop: SPACING.md, padding: SPACING.lg,
    backgroundColor: COLORS.cream, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.creamDark,
  },
  stationLabel: { fontSize: 10, fontWeight: '600', color: COLORS.textTertiary, letterSpacing: 0.5, marginBottom: 4 },
  stationName: { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary },
  stationAddr: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  buttonArea: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  callButton: {
    width: '100%', backgroundColor: COLORS.hazard, borderRadius: RADIUS.xl,
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 48, paddingHorizontal: SPACING.xxl,
    shadowColor: COLORS.hazard, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4, shadowRadius: 20, elevation: 10,
  },
  callIcon: { fontSize: 52, marginBottom: SPACING.md },
  callTitle: { fontSize: 24, fontWeight: '800', color: COLORS.white, letterSpacing: 2 },
  callSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: SPACING.sm },
  callingView: {
    flex: 1, backgroundColor: COLORS.hazard, alignItems: 'center',
    justifyContent: 'center', gap: SPACING.lg,
  },
  callingText: { fontSize: 20, fontWeight: '700', color: COLORS.white },
  callingSubtext: { fontSize: 14, color: 'rgba(255,255,255,0.7)' },
  callingHint: { fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: SPACING.md, textAlign: 'center' },
  footer: { padding: SPACING.lg, alignItems: 'center' },
  footerText: { fontSize: 11, color: COLORS.success },
});