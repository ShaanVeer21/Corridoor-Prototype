import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  SafeAreaView, TextInput, Modal, FlatList, StatusBar,
} from 'react-native';
import { getBuildings } from '../utils/api';
import { COLORS, SPACING, RADIUS } from '../utils/theme';

const INCIDENT_TYPES = [
  { id: 'fire', label: 'Fire', icon: '🔥', color: '#F97316', bgColor: '#FFF7ED' },
  { id: 'rescue', label: 'Rescue', icon: '🚑', color: '#3B82F6', bgColor: '#EFF6FF' },
  { id: 'collapse', label: 'House Collapse', icon: '🏚️', color: '#CA8A04', bgColor: '#FFFBEB' },
  { id: 'other', label: 'Other', icon: '⚠️', color: '#7C3AED', bgColor: '#F5F3FF' },
];

function buildFloorOptions(floorsAbove, floorsBelow) {
  const floors = [];
  for (let b = floorsBelow; b >= 1; b--) floors.push({ label: `Basement ${b}`, number: -b });
  floors.push({ label: 'Ground Floor', number: 0 });
  for (let f = 1; f <= floorsAbove; f++) floors.push({ label: `Floor ${f}`, number: f });
  return floors;
}

export default function IncidentTypeScreen({ user, onConfirm }) {
  const [selected, setSelected] = useState(null);
  const [otherText, setOtherText] = useState('');
  const [buildings, setBuildings] = useState([]);
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [selectedFloor, setSelectedFloor] = useState(null);
  const [showBuildingPicker, setShowBuildingPicker] = useState(false);
  const [showFloorPicker, setShowFloorPicker] = useState(false);
  const [buildingSearch, setBuildingSearch] = useState('');

  useEffect(() => {
    getBuildings().then(setBuildings).catch(console.error);
  }, []);

  // Pre-select user's building if available
  useEffect(() => {
    if (user.building_id && buildings.length > 0 && !selectedBuilding) {
      const match = buildings.find(b => b.building_id === user.building_id);
      if (match) setSelectedBuilding(match);
    }
  }, [buildings, user.building_id]);

  const floorOptions = selectedBuilding
    ? buildFloorOptions(selectedBuilding.floors_above_ground || 0, selectedBuilding.floors_below_ground || 0)
    : [];

  const filteredBuildings = buildings.filter(b =>
    b.label.toLowerCase().includes(buildingSearch.toLowerCase())
  );

  const canProceed =
    selected !== null &&
    (selected !== 'other' || otherText.trim().length > 0) &&
    selectedBuilding !== null &&
    selectedFloor !== null;

  const handleConfirm = () => {
    if (!canProceed) return;
    onConfirm({
      incident_category: selected,
      alert_type: selected === 'other' ? otherText.trim() : selected,
      building_id: selectedBuilding.building_id,
      floor: selectedFloor.label,
      floor_number: selectedFloor.number,
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bgSecondary} />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>What is the incident?</Text>
        <Text style={styles.subtitle}>Select the type and location of the emergency</Text>

        {/* Incident type grid */}
        <View style={styles.typeGrid}>
          {INCIDENT_TYPES.map((type) => {
            const isSelected = selected === type.id;
            return (
              <TouchableOpacity
                key={type.id}
                style={[
                  styles.typeCard,
                  isSelected && { borderColor: type.color, backgroundColor: type.bgColor },
                ]}
                onPress={() => setSelected(type.id)}
              >
                <View style={[styles.typeIconBox, isSelected && { borderColor: type.color }]}>
                  <Text style={styles.typeIcon}>{type.icon}</Text>
                </View>
                <Text style={[styles.typeLabel, isSelected && { color: type.color, fontWeight: '700' }]}>
                  {type.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Other text input */}
        {selected === 'other' && (
          <TextInput
            style={styles.otherInput}
            placeholder="Describe the incident..."
            placeholderTextColor={COLORS.textTertiary}
            value={otherText}
            onChangeText={setOtherText}
          />
        )}

        {/* Building selector */}
        <Text style={styles.sectionLabel}>BUILDING</Text>
        <TouchableOpacity style={styles.selector} onPress={() => setShowBuildingPicker(true)}>
          {selectedBuilding ? (
            <View>
              <Text style={styles.selectorValue}>{selectedBuilding.name}</Text>
              <Text style={styles.selectorSub}>{selectedBuilding.building_id} · {selectedBuilding.area_name}</Text>
            </View>
          ) : (
            <Text style={styles.selectorPlaceholder}>Select building</Text>
          )}
          <Text style={styles.chevron}>▼</Text>
        </TouchableOpacity>

        {/* Floor selector */}
        {selectedBuilding && (
          <>
            <Text style={styles.sectionLabel}>FLOOR</Text>
            <TouchableOpacity style={styles.selector} onPress={() => setShowFloorPicker(true)}>
              {selectedFloor ? (
                <Text style={styles.selectorValue}>{selectedFloor.label}</Text>
              ) : (
                <Text style={styles.selectorPlaceholder}>Select floor</Text>
              )}
              <Text style={styles.chevron}>▼</Text>
            </TouchableOpacity>
          </>
        )}

        {/* Ward info */}
        {selectedBuilding?.ward && (
          <View style={styles.wardBadge}>
            <Text style={styles.wardLabel}>Ward: {selectedBuilding.ward}</Text>
          </View>
        )}
      </ScrollView>

      {/* Confirm button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.confirmBtn, !canProceed && styles.confirmBtnDisabled]}
          onPress={handleConfirm}
          disabled={!canProceed}
        >
          <Text style={styles.confirmBtnText}>Confirm & Call Fire Station</Text>
        </TouchableOpacity>
      </View>

      {/* Building picker modal */}
      <Modal visible={showBuildingPicker} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Building</Text>
              <TouchableOpacity onPress={() => setShowBuildingPicker(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.searchInput}
              placeholder="Search buildings..."
              placeholderTextColor={COLORS.textTertiary}
              value={buildingSearch}
              onChangeText={setBuildingSearch}
              autoFocus
            />
            <FlatList
              data={filteredBuildings}
              keyExtractor={(item) => item.building_id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.listItem, item.is_high_hazard && styles.listItemHazard]}
                  onPress={() => { setSelectedBuilding(item); setSelectedFloor(null); setShowBuildingPicker(false); setBuildingSearch(''); }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.listItemName}>{item.name}</Text>
                    <Text style={styles.listItemSub}>{item.building_id} · {item.area_name || ''}</Text>
                  </View>
                  {item.is_high_hazard && <Text style={styles.hazardBadge}>⚠ HAZARD</Text>}
                </TouchableOpacity>
              )}
              style={styles.list}
            />
          </View>
        </View>
      </Modal>

      {/* Floor picker modal */}
      <Modal visible={showFloorPicker} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Floor</Text>
              <TouchableOpacity onPress={() => setShowFloorPicker(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={floorOptions}
              keyExtractor={(item) => item.label}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.listItem, selectedFloor?.label === item.label && styles.listItemSelected]}
                  onPress={() => { setSelectedFloor(item); setShowFloorPicker(false); }}
                >
                  <Text style={styles.listItemName}>{item.label}</Text>
                </TouchableOpacity>
              )}
              style={styles.list}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgSecondary },
  scroll: { padding: SPACING.xl, paddingBottom: 120 },
  title: { fontSize: 22, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 4 },
  subtitle: { fontSize: 14, color: COLORS.textSecondary, marginBottom: SPACING.xxl },

  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.xl },
  typeCard: {
    width: '48%', padding: SPACING.lg, borderRadius: RADIUS.lg,
    borderWidth: 2, borderColor: COLORS.border, backgroundColor: COLORS.white,
    alignItems: 'center', gap: SPACING.sm,
  },
  typeIconBox: {
    width: 44, height: 44, borderRadius: RADIUS.lg, borderWidth: 1,
    borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center',
  },
  typeIcon: { fontSize: 22 },
  typeLabel: { fontSize: 14, fontWeight: '500', color: COLORS.textPrimary },

  otherInput: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.sm,
    padding: SPACING.lg, fontSize: 15, color: COLORS.textPrimary,
    backgroundColor: COLORS.white, marginBottom: SPACING.xl,
  },

  sectionLabel: {
    fontSize: 11, fontWeight: '600', color: COLORS.textTertiary,
    letterSpacing: 0.5, marginBottom: SPACING.sm, marginTop: SPACING.lg,
  },

  selector: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.sm,
    padding: SPACING.lg, backgroundColor: COLORS.white,
  },
  selectorValue: { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary },
  selectorSub: { fontSize: 12, color: COLORS.textTertiary, marginTop: 2 },
  selectorPlaceholder: { fontSize: 14, color: COLORS.textTertiary },
  chevron: { fontSize: 12, color: COLORS.textTertiary },

  wardBadge: {
    marginTop: SPACING.md, padding: SPACING.md, backgroundColor: COLORS.cream,
    borderRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.creamDark,
  },
  wardLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },

  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: SPACING.xl, backgroundColor: COLORS.bgSecondary,
    borderTopWidth: 1, borderTopColor: COLORS.borderLight,
  },
  confirmBtn: {
    backgroundColor: COLORS.hazard, borderRadius: RADIUS.md,
    padding: SPACING.lg, alignItems: 'center',
  },
  confirmBtnDisabled: { opacity: 0.4 },
  confirmBtnText: { fontSize: 16, fontWeight: '700', color: COLORS.white },

  modalOverlay: { flex: 1, backgroundColor: COLORS.overlay, justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: COLORS.white, borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl, maxHeight: '80%', paddingBottom: SPACING.xxxl,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: SPACING.xl, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  modalClose: { fontSize: 20, color: COLORS.textTertiary, padding: SPACING.sm },
  searchInput: {
    margin: SPACING.lg, padding: SPACING.lg, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: RADIUS.full, fontSize: 15, color: COLORS.textPrimary, backgroundColor: COLORS.bgSecondary,
  },
  list: { paddingHorizontal: SPACING.lg },
  listItem: {
    padding: SPACING.lg, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight,
    flexDirection: 'row', alignItems: 'center',
  },
  listItemHazard: { backgroundColor: COLORS.hazardBg },
  listItemSelected: { backgroundColor: COLORS.cream },
  listItemName: { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary },
  listItemSub: { fontSize: 12, color: COLORS.textTertiary, marginTop: 2 },
  hazardBadge: { fontSize: 10, fontWeight: '700', color: COLORS.hazard },
});