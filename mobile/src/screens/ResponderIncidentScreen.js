import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  ScrollView, StatusBar, Image, Modal, Linking, ActivityIndicator,
} from 'react-native';
import { getBuilding, getUpdates, getFloorplanUrl, getPhotoUrl, connectAlertWS } from '../utils/api';
import { COLORS, SPACING, RADIUS } from '../utils/theme';
import { WebView } from 'react-native-webview';

const CAT_CONFIG = {
  fire:     { icon: '🔥', label: 'Fire',           bg: '#FFF7ED', color: '#C2410C', border: '#FED7AA' },
  rescue:   { icon: '🚑', label: 'Rescue',         bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' },
  collapse: { icon: '🏚️', label: 'House Collapse', bg: '#FFFBEB', color: '#A16207', border: '#FDE68A' },
  other:    { icon: '⚠️', label: 'Other',          bg: '#F5F3FF', color: '#7C3AED', border: '#DDD6FE' },
};

function formatElapsed(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function ResponderIncidentScreen({ alert, user, onBack }) {
  const [building, setBuilding] = useState(null);
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const [showFloorPlan, setShowFloorPlan] = useState(false);
  const [selectedFpIndex, setSelectedFpIndex] = useState(0);
  const [showUpdates, setShowUpdates] = useState(false);

  const cat = CAT_CONFIG[alert.incident_category] || CAT_CONFIG.fire;

  useEffect(() => {
    if (!alert?.building_id) return;
    Promise.all([
      getBuilding(alert.building_id),
      getUpdates(alert.id),
    ]).then(([b, u]) => {
      setBuilding(b);
      setUpdates(u);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, [alert]);

  // Elapsed timer
  useEffect(() => {
    const interval = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  // WebSocket for live updates
  useEffect(() => {
    const ws = connectAlertWS(alert.id, (msg) => {
      if (msg.type === 'REAL_TIME_UPDATE') {
        setUpdates(prev => [...prev, msg.data]);
      }
    });
    return () => ws?.close();
  }, [alert.id]);

  if (loading || !building) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingView}><ActivityIndicator size="large" color={COLORS.primary} /></View>
      </SafeAreaView>
    );
  }

  const a = building.section_a;
  const totalFloors = a.floors_above_ground + a.floors_below_ground;
  const avgOcc = Math.round((a.daytime_occupancy + a.nighttime_occupancy) / 2);
  const floorPlans = building.floor_plans || [];

  // Find the right floor plan page
  let activeFloorPlan = null;
  if (alert.floor_number != null && floorPlans.length > 0) {
    activeFloorPlan = floorPlans.find(fp => {
      const nums = typeof fp.floor_numbers === 'string' ? JSON.parse(fp.floor_numbers) : fp.floor_numbers;
      return nums.includes(alert.floor_number);
    });
  }
  if (!activeFloorPlan && floorPlans.length > 0) activeFloorPlan = floorPlans[0];

  const mapUrl = building.latitude && building.longitude && building.latitude !== 0
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${building.longitude-0.005},${building.latitude-0.003},${building.longitude+0.005},${building.latitude+0.003}&layer=mapnik&marker=${building.latitude},${building.longitude}`
    : null;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bgSecondary} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}><Text style={styles.backTxt}>← Back</Text></TouchableOpacity>
        <View style={styles.headerRight}>
          <Text style={styles.elapsedTxt}>{formatElapsed(elapsed)}</Text>
          <View style={[styles.statusDot, alert.status === 'active' ? styles.dotActive : styles.dotResolved]} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Building name + chips */}
        <Text style={styles.buildingName}>{building.name}</Text>
        <View style={styles.chipRow}>
          <View style={[styles.chip, { backgroundColor: cat.bg, borderColor: cat.border }]}>
            <Text style={[styles.chipText, { color: cat.color }]}>{cat.icon} {cat.label}</Text>
          </View>
          {alert.floor && (
            <View style={styles.chipFloor}>
              <Text style={styles.chipFloorText}>📍 {alert.floor}</Text>
            </View>
          )}
          {building.is_high_hazard && (
            <View style={styles.chipHazard}>
              <Text style={styles.chipHazardText}>⚠ HAZARD</Text>
            </View>
          )}
        </View>
        <Text style={styles.metaLine}>
          {building.building_id}{alert.ward ? ` · ${alert.ward}` : ''}{alert.area_name ? ` · ${alert.area_name}` : ''}
        </Text>

        {/* Location + Floor Plan row */}
        <View style={styles.twoCol}>
          
            
            {mapUrl ? (
              <View style={styles.mapCard}>
                <Text style={styles.sectionLabel}>📍 LOCATION</Text>
                {building.latitude && building.longitude && building.latitude !== 0 ? (
                    <View style={styles.mapFrame}>
                        <WebView
                            source={{ uri: `https://www.openstreetmap.org/export/embed.html?bbox=${building.longitude-0.005},${building.latitude-0.003},${building.longitude+0.005},${building.latitude+0.003}&layer=mapnik&marker=${building.latitude},${building.longitude}` }}
                            style={{ height: 140, borderRadius: 8 }}
                            scrollEnabled={false}
                        />
                    </View>
                ) : (
                    <Text style={styles.addressText}>{a.address}</Text>
                )}
            </View>
            ) : (
              <Text style={styles.addressText}>{a.address}</Text>
            )}
          
          <TouchableOpacity style={styles.fpCard} onPress={() => setShowFloorPlan(true)}>
            <Text style={styles.fpIcon}>📐</Text>
            <Text style={styles.fpLabel}>FLOOR PLAN</Text>
          </TouchableOpacity>
        </View>

        {/* Live Updates */}
        <View style={styles.updatesCard}>
          <View style={styles.updatesHeader}>
            <View style={styles.updatesHeaderLeft}>
              <Text style={styles.updatesTitle}>💬 Live Updates</Text>
              {updates.length > 0 && (
                <View style={styles.updatesBadge}>
                  <Text style={styles.updatesBadgeText}>{updates.length}</Text>
                </View>
              )}
            </View>
            {alert.reporter_phone && (
              <TouchableOpacity style={styles.callBtn} onPress={() => Linking.openURL(`tel:${alert.reporter_phone}`)}>
                <Text style={styles.callBtnText}>📞 Call</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Reporter */}
          {alert.reporter_name && (
            <View style={styles.reporterRow}>
              <View style={styles.reporterAvatar}>
                <Text style={styles.reporterInitial}>{alert.reporter_name.charAt(0)}</Text>
              </View>
              <View>
                <Text style={styles.reporterName}>{alert.reporter_name}</Text>
                <Text style={styles.reporterRole}>{alert.reporter_role || 'Reporter'}</Text>
              </View>
            </View>
          )}

          {updates.length === 0 ? (
            <Text style={styles.noUpdates}>No updates yet</Text>
          ) : (
            updates.slice(0, 3).map((u, i) => (
              <View key={u.id || i} style={styles.updateItem}>
                <View style={styles.updateDot} />
                <View style={styles.updateContent}>
                  {u.message && <Text style={styles.updateMsg}>{u.message}</Text>}
                  {u.photo_url && (
                    <Image source={{ uri: getPhotoUrl(u.photo_url) }} style={styles.updatePhoto} />
                  )}
                  <Text style={styles.updateTime}>{u.sender_name || 'Staff'}</Text>
                </View>
              </View>
            ))
          )}

          {updates.length > 3 && (
            <TouchableOpacity onPress={() => setShowUpdates(true)}>
              <Text style={styles.viewAllUpdates}>View all {updates.length} updates →</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Building Type */}
        <View style={styles.infoCard}>
          <Text style={styles.sectionLabel}>🏢 TYPE OF BUILDING</Text>
          <Text style={styles.infoValue}>{building.building_type}</Text>
        </View>

        {/* Floors + Occupancy */}
        <View style={styles.twoCol}>
          <View style={styles.statCard}>
            <Text style={styles.sectionLabel}>📊 FLOORS</Text>
            <Text style={styles.statNum}>{totalFloors}</Text>
            <Text style={styles.statDetail}>{a.floors_above_ground} above + {a.floors_below_ground} basement</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.sectionLabel}>👥 AVG OCCUPANCY</Text>
            <Text style={styles.statNum}>{avgOcc}</Text>
            <Text style={styles.statDetail}>people</Text>
          </View>
        </View>

        {/* Fire Systems */}
        <View style={styles.infoCard}>
          <Text style={styles.sectionLabel}>🔥 FIRE SYSTEMS</Text>
          <View style={styles.sysGrid}>
            <View style={styles.sysItem}><Text style={styles.sysLabel}>Sprinkler</Text><Text style={styles.sysVal}>{a.sprinkler_system}</Text></View>
            <View style={styles.sysItem}><Text style={styles.sysLabel}>Wet Riser</Text><Text style={styles.sysVal}>{a.wet_riser || '—'}</Text></View>
            <View style={styles.sysItem}><Text style={styles.sysLabel}>Hydrants</Text><Text style={styles.sysVal}>{a.internal_hydrants}int · {a.external_hydrants}ext</Text></View>
            <View style={styles.sysItem}><Text style={styles.sysLabel}>Pump</Text><Text style={styles.sysVal}>{building.section_b?.fire_pump_capacity || '—'}</Text></View>
          </View>
        </View>
      </ScrollView>

      {/* Floor Plan Modal */}
      <Modal visible={showFloorPlan} animationType="slide">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Floor Plan</Text>
            <TouchableOpacity onPress={() => setShowFloorPlan(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>
          {floorPlans.length > 0 ? (
            <>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.floorBtns} contentContainerStyle={{ paddingHorizontal: 12 }}>
                {floorPlans.map((fp, idx) => {
                    const isActive = idx === selectedFpIndex;
                    // Generate compact label
                    const nums = typeof fp.floor_numbers === 'string' ? JSON.parse(fp.floor_numbers || '[]') : (fp.floor_numbers || []);
                    let label = `Sheet ${idx + 1}`;
                    if (nums.length > 0) {
                        const parts = [];
                        if (nums.includes(-1)) parts.push('B');
                        if (nums.includes(0)) parts.push('G');
                        const floors = nums.filter(n => n > 0 && n !== 999).sort((a, b) => a - b);
                        if (floors.length === 1) {
                            parts.push(`${floors[0]}`);
                        } else if (floors.length > 1) {
                            let ranges = [], start = floors[0], end = floors[0];
                            for (let i = 1; i < floors.length; i++) {
                                if (floors[i] === end + 1) { end = floors[i]; }
                                else { ranges.push(start === end ? `${start}` : `${start}-${end}`); start = end = floors[i]; }
                            }
                            ranges.push(start === end ? `${start}` : `${start}-${end}`);
                            parts.push(ranges.join(','));
                        }
                        if (nums.includes(999)) parts.push('T');
                        label = parts.join(',');
                    }
                    return (
                        <TouchableOpacity key={fp.id || idx} style={[styles.floorBtn, isActive && styles.floorBtnActive]}
                            onPress={() => setSelectedFpIndex(idx)}>
                            <Text style={[styles.floorBtnText, isActive && styles.floorBtnTextActive]}>{label}</Text>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>
              <View style={{ flex: 1 }}>
                <WebView
                  source={{ html: `
                    <html><head><meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes">
                    <style>body{margin:0;padding:0;display:flex;align-items:center;justify-content:center;background:#000;min-height:100vh}
                    img{max-width:100%;height:auto}</style></head>
                    <body><img src="${getFloorplanUrl(floorPlans[selectedFpIndex]?.image_path)}" /></body></html>
                  `}}
                  style={{ flex: 1, backgroundColor: '#000' }}
                  scalesPageToFit={true}
                  scrollEnabled={true}
                  javaScriptEnabled={true}
                />
              </View>
            </>
          ) : (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <Text style={styles.noFloorPlan}>No floor plans available</Text>
            </View>
          )}
        </SafeAreaView>
      </Modal>

      {/* All Updates Modal */}
      <Modal visible={showUpdates} animationType="slide">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>All Live Updates ({updates.length})</Text>
            <TouchableOpacity onPress={() => setShowUpdates(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalScroll}>
            {updates.map((u, i) => (
              <View key={u.id || i} style={styles.updateItemFull}>
                {u.message && <Text style={styles.updateMsg}>{u.message}</Text>}
                {u.photo_url && <Image source={{ uri: getPhotoUrl(u.photo_url) }} style={styles.updatePhotoFull} />}
                <Text style={styles.updateTime}>{u.sender_name || 'Staff'}</Text>
              </View>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgSecondary },
  loadingView: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md,
    backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight,
  },
  backTxt: { fontSize: 14, color: COLORS.primary, fontWeight: '500' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  elapsedTxt: { fontFamily: 'monospace', fontWeight: '700', fontSize: 14, color: COLORS.hazard },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  dotActive: { backgroundColor: COLORS.hazard },
  dotResolved: { backgroundColor: COLORS.success },
  scroll: { padding: SPACING.lg, paddingBottom: 40 },
  buildingName: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary, marginBottom: SPACING.sm },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: SPACING.sm },
  chip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 11, fontWeight: '600' },
  chipFloor: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.white },
  chipFloorText: { fontSize: 11, fontWeight: '500', color: COLORS.textSecondary },
  chipHazard: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, backgroundColor: COLORS.hazardBg, borderWidth: 1, borderColor: COLORS.hazard },
  chipHazardText: { fontSize: 10, fontWeight: '700', color: COLORS.hazard },
  metaLine: { fontSize: 12, color: COLORS.textTertiary, fontFamily: 'monospace', marginBottom: SPACING.lg },
  twoCol: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md },
  mapCard: { flex: 1, backgroundColor: COLORS.white, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md, overflow: 'hidden' },
  mapFrame: { borderRadius: RADIUS.md, overflow: 'hidden', marginTop: SPACING.sm },
  mapImg: { width: '100%', height: 100 },
  addressText: { fontSize: 11, color: COLORS.textSecondary, marginTop: SPACING.sm },
  fpCard: {
    width: 120, backgroundColor: COLORS.white, borderRadius: RADIUS.lg,
    borderWidth: 2, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  fpIcon: { fontSize: 28 },
  fpLabel: { fontSize: 10, fontWeight: '700', color: COLORS.primary, letterSpacing: 0.5 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: COLORS.primary, letterSpacing: 0.5, marginBottom: SPACING.sm },
  updatesCard: { backgroundColor: COLORS.white, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.lg, marginBottom: SPACING.md },
  updatesHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  updatesHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  updatesTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  updatesBadge: { width: 22, height: 22, borderRadius: 11, backgroundColor: COLORS.hazard, alignItems: 'center', justifyContent: 'center' },
  updatesBadgeText: { fontSize: 11, fontWeight: '700', color: COLORS.white },
  callBtn: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, backgroundColor: COLORS.success, borderRadius: RADIUS.md },
  callBtnText: { fontSize: 12, fontWeight: '700', color: COLORS.white },
  reporterRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, marginBottom: SPACING.md, paddingBottom: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  reporterAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,70,26,0.1)', alignItems: 'center', justifyContent: 'center' },
  reporterInitial: { fontSize: 18, fontWeight: '700', color: COLORS.primary },
  reporterName: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
  reporterRole: { fontSize: 11, color: COLORS.textTertiary },
  noUpdates: { fontSize: 13, color: COLORS.textTertiary, textAlign: 'center', paddingVertical: SPACING.lg },
  updateItem: { flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.md },
  updateDot: { width: 2, backgroundColor: COLORS.primary, borderRadius: 1, marginTop: 4 },
  updateContent: { flex: 1 },
  updateMsg: { fontSize: 13, color: COLORS.textPrimary, marginBottom: 4 },
  updatePhoto: { width: '100%', height: 120, borderRadius: RADIUS.md, marginBottom: 4 },
  updateTime: { fontSize: 10, color: COLORS.textTertiary },
  viewAllUpdates: { fontSize: 12, fontWeight: '600', color: COLORS.primary, marginTop: SPACING.sm },
  infoCard: { backgroundColor: COLORS.white, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.lg, marginBottom: SPACING.md },
  infoValue: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  statCard: { flex: 1, backgroundColor: COLORS.white, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.lg },
  statNum: { fontSize: 36, fontWeight: '800', color: COLORS.textPrimary },
  statDetail: { fontSize: 11, color: COLORS.textTertiary, marginTop: 2 },
  sysGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.md },
  sysItem: { width: '46%' },
  sysLabel: { fontSize: 10, color: COLORS.textTertiary, textTransform: 'uppercase', marginBottom: 2 },
  sysVal: { fontSize: 12, fontWeight: '500', color: COLORS.textPrimary },
  modalContainer: { flex: 1, backgroundColor: COLORS.bgSecondary },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: SPACING.xl, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  modalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  modalClose: { fontSize: 22, color: COLORS.textTertiary, padding: SPACING.sm },
  modalScroll: { padding: SPACING.lg },
  floorBtns: { maxHeight: 44, marginBottom: SPACING.sm, flexGrow: 0 },
  floorBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.white, marginRight: 6, height: 32, justifyContent: 'center' },
  floorBtnActive: { borderColor: COLORS.primary, backgroundColor: COLORS.cream },
  floorBtnText: { fontSize: 10, fontWeight: '600', color: COLORS.textSecondary, maxWidth: 120 },
  floorBtnTextActive: { color: COLORS.primary },
  floorPlanImg: { width: '100%', height: 500 },
  noFloorPlan: { fontSize: 14, color: COLORS.textTertiary, textAlign: 'center', paddingVertical: 40 },
  updateItemFull: { backgroundColor: COLORS.white, borderRadius: RADIUS.md, padding: SPACING.lg, marginBottom: SPACING.sm, borderWidth: 1, borderColor: COLORS.borderLight },
  updatePhotoFull: { width: '100%', height: 200, borderRadius: RADIUS.md, marginBottom: 4 },
});