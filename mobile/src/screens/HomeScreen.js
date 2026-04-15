import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, StatusBar,
  SafeAreaView, Image, Alert, Linking, ActivityIndicator,
} from 'react-native';
import { getNearestStation, createAlert } from '../utils/api';
import { COLORS, SPACING, RADIUS } from '../utils/theme';

const FIRE_STATION_PHONE = '+918879499824';

export default function HomeScreen({ user, onAlertCreated, onLogout }) {
  const [station, setStation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [calling, setCalling] = useState(false);

  useEffect(() => {
    getNearestStation(user.building_id)
      .then(setStation)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user.building_id]);

  const handleEmergencyCall = async () => {
    setCalling(true);
    try {
      const alert = await createAlert({
        building_id: user.building_id,
        reported_by: user.id,
        alert_type: 'fire',
      });

      const phoneUrl = `tel:${FIRE_STATION_PHONE}`;
      await Linking.openURL(phoneUrl).catch(() => {
        Alert.alert('Error', 'Could not open phone dialer');
      });

      onAlertCreated(alert);
    } catch (err) {
      Alert.alert('Alert Failed', err.message);
      setCalling(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bgSecondary} />

      <View style={styles.topBar}>
        <Image source={require('../assets/corridoor_logo.png')} style={styles.logo} />
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
          <Text style={styles.infoId}>{user.building_id}</Text>
        </View>
        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>ROLE</Text>
          <Text style={styles.infoRole}>{user.role.toUpperCase()}</Text>
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
          style={[styles.callButton, calling && styles.callButtonDisabled]}
          onPress={handleEmergencyCall}
          disabled={calling}
          activeOpacity={0.8}
        >
          {calling ? (
            <ActivityIndicator color={COLORS.white} size="large" />
          ) : (
            <>
              <Text style={styles.callIcon}>🚨</Text>
              <Text style={styles.callTitle}>EMERGENCY CALL</Text>
              <Text style={styles.callSub}>
                Calls fire station & sends{'\n'}building data instantly
              </Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.callNote}>
          Tapping this will immediately alert the nearest fire station with your building's NOC data and dial them directly
        </Text>
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
  logo: { width: 36, height: 36, borderRadius: RADIUS.sm },
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
  infoId: { fontSize: 16, fontFamily: 'monospace', fontWeight: '700', color: COLORS.primary },
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
  callButtonDisabled: { opacity: 0.6 },
  callIcon: { fontSize: 52, marginBottom: SPACING.md },
  callTitle: { fontSize: 24, fontWeight: '800', color: COLORS.white, letterSpacing: 2 },
  callSub: {
    fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: SPACING.sm,
    textAlign: 'center', lineHeight: 18,
  },
  callNote: {
    fontSize: 11, color: COLORS.textTertiary, textAlign: 'center',
    marginTop: SPACING.lg, lineHeight: 16, paddingHorizontal: SPACING.xl,
  },
  footer: { padding: SPACING.lg, alignItems: 'center' },
  footerText: { fontSize: 11, color: COLORS.success },
});