import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, Alert, StatusBar,
} from 'react-native';
import { getStations } from '../utils/api';
import { COLORS, SPACING, RADIUS } from '../utils/theme';

export default function ResponderLoginScreen({ onLogin, onBack }) {
  const [name, setName] = useState('');
  const [badgeNumber, setBadgeNumber] = useState('');
  const [rank, setRank] = useState('');
  const [stations, setStations] = useState([]);
  const [selectedStation, setSelectedStation] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getStations().then(setStations).catch(console.error);
  }, []);

  const canLogin = name.trim() && badgeNumber.trim() && selectedStation;

  const handleLogin = async () => {
    if (!canLogin) return;
    setLoading(true);
    try {
      await onLogin({
        name: name.trim(),
        role: rank.trim() || 'Fire Responder',
        is_responder: true,
        station_id: selectedStation.id,
        badge_number: badgeNumber.trim(),
        rank: rank.trim() || 'Firefighter',
      });
    } catch (err) {
      Alert.alert('Login Failed', err.message);
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bgSecondary} />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <TouchableOpacity onPress={onBack}><Text style={styles.back}>← Back</Text></TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.headerIcon}>👨‍🚒</Text>
          <Text style={styles.title}>Fire Responder Login</Text>
          <Text style={styles.subtitle}>Enter your credentials to start receiving alerts</Text>
        </View>

        <Text style={styles.label}>FULL NAME *</Text>
        <TextInput style={styles.input} placeholder="Your name" placeholderTextColor={COLORS.textTertiary}
          value={name} onChangeText={setName} />

        <Text style={styles.label}>BADGE NUMBER *</Text>
        <TextInput style={styles.input} placeholder="e.g. FB-2024-0341" placeholderTextColor={COLORS.textTertiary}
          value={badgeNumber} onChangeText={setBadgeNumber} />

        <Text style={styles.label}>RANK</Text>
        <TextInput style={styles.input} placeholder="e.g. Sub Officer, Leading Fireman" placeholderTextColor={COLORS.textTertiary}
          value={rank} onChangeText={setRank} />

        <Text style={styles.label}>FIRE STATION *</Text>
        <View style={styles.stationList}>
          {stations.map((s) => (
            <TouchableOpacity
              key={s.id}
              style={[styles.stationCard, selectedStation?.id === s.id && styles.stationCardActive]}
              onPress={() => setSelectedStation(s)}
            >
              <Text style={[styles.stationName, selectedStation?.id === s.id && styles.stationNameActive]}>{s.name}</Text>
              <Text style={styles.stationAddr}>{s.address}</Text>
              {selectedStation?.id === s.id && <Text style={styles.checkmark}>✓</Text>}
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.loginBtn, !canLogin && styles.loginBtnDisabled]}
          onPress={handleLogin}
          disabled={!canLogin || loading}
        >
          <Text style={styles.loginBtnText}>{loading ? 'Logging in...' : 'Start Receiving Alerts'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgSecondary },
  scroll: { padding: SPACING.xxl, paddingBottom: 60 },
  back: { fontSize: 14, color: COLORS.primary, fontWeight: '500', marginBottom: SPACING.xl },
  header: { alignItems: 'center', marginBottom: 32 },
  headerIcon: { fontSize: 48, marginBottom: SPACING.md },
  title: { fontSize: 22, fontWeight: '700', color: COLORS.textPrimary },
  subtitle: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', marginTop: 4 },
  label: { fontSize: 11, fontWeight: '600', color: COLORS.textTertiary, letterSpacing: 0.5, marginBottom: 6, marginTop: SPACING.lg },
  input: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md,
    padding: SPACING.lg, fontSize: 15, color: COLORS.textPrimary,
    backgroundColor: COLORS.white,
  },
  stationList: { gap: SPACING.sm, marginTop: SPACING.sm },
  stationCard: {
    padding: SPACING.lg, backgroundColor: COLORS.white,
    borderRadius: RADIUS.md, borderWidth: 2, borderColor: COLORS.border,
    flexDirection: 'column', position: 'relative',
  },
  stationCardActive: { borderColor: COLORS.primary, backgroundColor: COLORS.cream },
  stationName: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
  stationNameActive: { color: COLORS.primary },
  stationAddr: { fontSize: 11, color: COLORS.textTertiary, marginTop: 2 },
  checkmark: { position: 'absolute', top: 12, right: 12, fontSize: 18, color: COLORS.primary, fontWeight: '700' },
  loginBtn: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.md,
    padding: SPACING.lg, alignItems: 'center', marginTop: 32,
  },
  loginBtnDisabled: { opacity: 0.4 },
  loginBtnText: { fontSize: 16, fontWeight: '700', color: COLORS.white },
});