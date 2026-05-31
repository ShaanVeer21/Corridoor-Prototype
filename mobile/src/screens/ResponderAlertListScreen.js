import { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  FlatList, StatusBar, ActivityIndicator,
} from 'react-native';
import { getAlerts, connectStationWS } from '../utils/api';
import { COLORS, SPACING, RADIUS } from '../utils/theme';

const CATEGORY_ICONS = { fire: '🔥', rescue: '🚑', collapse: '🏚️', other: '⚠️' };

function timeAgo(dateStr) {
  const now = new Date();
  const then = new Date(dateStr.includes('Z') || dateStr.includes('+') ? dateStr : dateStr + 'Z');
  const s = Math.floor((now - then) / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

export default function ResponderAlertListScreen({ user, onSelectAlert, onLogout }) {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const wsRef = useRef(null);

  useEffect(() => {
    loadAlerts();
    // Connect WebSocket for real-time alerts
    if (user.station_id) {
      const ws = connectStationWS(user.station_id, (msg) => {
        if (msg.type === 'NEW_ALERT') {
          setAlerts((prev) => [msg.data, ...prev]);
        }
      });
      wsRef.current = ws;
    }
    return () => wsRef.current?.close();
  }, []);

  const loadAlerts = async () => {
    try {
      const data = await getAlerts();
      setAlerts(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const activeAlerts = alerts.filter(a => a.status === 'active');
  const otherAlerts = alerts.filter(a => a.status !== 'active');

  const renderAlert = ({ item }) => {
    const icon = CATEGORY_ICONS[item.incident_category] || '🚨';
    const isActive = item.status === 'active';

    return (
      <TouchableOpacity
        style={[styles.alertCard, isActive && styles.alertCardActive]}
        onPress={() => onSelectAlert(item)}
      >
        <View style={styles.alertLeft}>
          <Text style={styles.alertIcon}>{icon}</Text>
        </View>
        <View style={styles.alertBody}>
          <View style={styles.alertTop}>
            <Text style={styles.alertName} numberOfLines={1}>{item.building_name || item.building_id}</Text>
            {item.is_high_hazard && <Text style={styles.hazardBadge}>⚠ HAZARD</Text>}
          </View>
          <View style={styles.alertMeta}>
            <Text style={styles.alertCategory}>{item.incident_category}</Text>
            {item.ward && <><Text style={styles.dot}>·</Text><Text style={styles.alertWard}>{item.ward}</Text></>}
            {item.floor && <><Text style={styles.dot}>·</Text><Text style={styles.alertFloor}>{item.floor}</Text></>}
          </View>
          <View style={styles.alertBottom}>
            <Text style={styles.alertTime}>{timeAgo(item.created_at)}</Text>
            {item.reporter_name && <Text style={styles.alertReporter}>by {item.reporter_name}</Text>}
          </View>
        </View>
        <View style={[styles.statusDot, isActive ? styles.statusActive : styles.statusResolved]} />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bgSecondary} />

      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Alert Inbox</Text>
          <Text style={styles.headerSub}>{user.name} · {user.rank || 'Responder'}</Text>
        </View>
        <TouchableOpacity onPress={onLogout}>
          <Text style={styles.logoutTxt}>Logout</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingView}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : alerts.length === 0 ? (
        <View style={styles.emptyView}>
          <Text style={styles.emptyIcon}>📡</Text>
          <Text style={styles.emptyTitle}>No alerts</Text>
          <Text style={styles.emptySub}>Listening for incoming incidents...</Text>
          <View style={styles.pulseIndicator}><Text style={styles.pulseText}>● LIVE</Text></View>
        </View>
      ) : (
        <FlatList
          data={[...activeAlerts, ...otherAlerts]}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderAlert}
          contentContainerStyle={styles.list}
          refreshing={loading}
          onRefresh={loadAlerts}
          ListHeaderComponent={
            activeAlerts.length > 0 ? (
              <View style={styles.sectionHeader}>
                <View style={styles.liveDot} />
                <Text style={styles.sectionTitle}>ACTIVE ALERTS ({activeAlerts.length})</Text>
              </View>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgSecondary },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SPACING.xl, paddingVertical: SPACING.lg,
    backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight,
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: COLORS.textPrimary },
  headerSub: { fontSize: 12, color: COLORS.textTertiary, marginTop: 2 },
  logoutTxt: { fontSize: 13, color: COLORS.textTertiary },
  loadingView: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyView: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.xxl },
  emptyIcon: { fontSize: 48, marginBottom: SPACING.lg },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: COLORS.textPrimary },
  emptySub: { fontSize: 13, color: COLORS.textTertiary, marginTop: 4, textAlign: 'center' },
  pulseIndicator: { marginTop: SPACING.xl, padding: SPACING.md, backgroundColor: COLORS.successBg, borderRadius: RADIUS.full },
  pulseText: { fontSize: 12, fontWeight: '700', color: COLORS.success },
  list: { padding: SPACING.lg },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    marginBottom: SPACING.md, paddingHorizontal: SPACING.sm,
  },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.hazard },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: COLORS.hazard, letterSpacing: 0.5 },
  alertCard: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    padding: SPACING.lg, backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border,
    marginBottom: SPACING.sm,
  },
  alertCardActive: { borderLeftWidth: 4, borderLeftColor: COLORS.hazard, backgroundColor: COLORS.hazardBg },
  alertLeft: {
    width: 44, height: 44, borderRadius: RADIUS.md,
    backgroundColor: COLORS.bgTertiary, alignItems: 'center', justifyContent: 'center',
  },
  alertIcon: { fontSize: 20 },
  alertBody: { flex: 1 },
  alertTop: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  alertName: { flex: 1, fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
  hazardBadge: { fontSize: 9, fontWeight: '700', color: COLORS.hazard },
  alertMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  alertCategory: { fontSize: 11, color: COLORS.textSecondary, textTransform: 'capitalize', fontWeight: '500' },
  dot: { fontSize: 8, color: COLORS.textTertiary },
  alertWard: { fontSize: 11, color: COLORS.textSecondary },
  alertFloor: { fontSize: 11, color: COLORS.hazard, fontWeight: '600' },
  alertBottom: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginTop: 4 },
  alertTime: { fontSize: 10, color: COLORS.textTertiary },
  alertReporter: { fontSize: 10, color: COLORS.textTertiary, fontStyle: 'italic' },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusActive: { backgroundColor: COLORS.hazard },
  statusResolved: { backgroundColor: COLORS.success },
});