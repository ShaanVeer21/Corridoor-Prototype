import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, StatusBar, Image, FlatList, Modal, SafeAreaView,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { getBuildings } from '../utils/api';
import { COLORS, SPACING, RADIUS, FONTS } from '../utils/theme';

const ROLES = ['security', 'manager', 'staff'];

export default function RegisterScreen({ onRegister }) {
  const [name, setName] = useState('');
  const [role, setRole] = useState('security');
  const [buildings, setBuildings] = useState([]);
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getBuildings()
      .then(setBuildings)
      .catch((err) => Alert.alert('Error', 'Could not load buildings. Is the server running?'))
      .finally(() => setLoading(false));
  }, []);

  const filteredBuildings = buildings.filter((b) =>
    b.label.toLowerCase().includes(search.toLowerCase())
  );

  const handleSubmit = async () => {
    if (!name.trim()) return Alert.alert('Required', 'Please enter your name');
    if (!selectedBuilding) return Alert.alert('Required', 'Please select your building');

    setSubmitting(true);
    try {
      await onRegister(name.trim(), role, selectedBuilding.building_id);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Header */}
          <View style={styles.header}>
            <Image
              source={require('../assets/corridoor_logo.png')}
              style={styles.logo}
            />
            <Text style={styles.brand}>CORRIDOOR</Text>
            <Text style={styles.tagline}>Fire Incident Response System</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Staff Registration</Text>
            <Text style={styles.cardDesc}>Register once to enable emergency alerts from your building</Text>

            {/* Name */}
            <Text style={styles.label}>YOUR NAME</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your full name"
              placeholderTextColor={COLORS.textTertiary}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />

            {/* Role */}
            <Text style={styles.label}>YOUR ROLE</Text>
            <View style={styles.roleRow}>
              {ROLES.map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[styles.roleBtn, role === r && styles.roleBtnActive]}
                  onPress={() => setRole(r)}
                >
                  <Text style={[styles.roleTxt, role === r && styles.roleTxtActive]}>
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Building Selector */}
            <Text style={styles.label}>YOUR BUILDING</Text>
            <TouchableOpacity
              style={styles.buildingSelector}
              onPress={() => setShowDropdown(true)}
            >
              {selectedBuilding ? (
                <View>
                  <Text style={styles.buildingName}>{selectedBuilding.name}</Text>
                  <Text style={styles.buildingId}>{selectedBuilding.building_id}</Text>
                </View>
              ) : (
                <Text style={styles.placeholder}>Tap to search and select building</Text>
              )}
              <Text style={styles.chevron}>▼</Text>
            </TouchableOpacity>

            {/* Submit */}
            <TouchableOpacity
              style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.submitTxt}>Register</Text>
              )}
            </TouchableOpacity>

            {/* Encryption note */}
            <View style={styles.encryptionNote}>
              <Text style={styles.encryptionIcon}>🔒</Text>
              <Text style={styles.encryptionText}>
                Your data is end-to-end encrypted. Corridoor has zero access to your information.
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* Building Search Modal */}
        <Modal visible={showDropdown} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Building</Text>
                <TouchableOpacity onPress={() => setShowDropdown(false)}>
                  <Text style={styles.modalClose}>✕</Text>
                </TouchableOpacity>
              </View>

              <TextInput
                style={styles.searchInput}
                placeholder="Search by name, ID, area, road..."
                placeholderTextColor={COLORS.textTertiary}
                value={search}
                onChangeText={setSearch}
                autoFocus
              />

              {loading ? (
                <ActivityIndicator style={{ marginTop: 40 }} color={COLORS.primary} />
              ) : (
                <FlatList
                  data={filteredBuildings}
                  keyExtractor={(item) => item.building_id}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[
                        styles.buildingItem,
                        item.is_high_hazard && styles.buildingItemHazard,
                      ]}
                      onPress={() => {
                        setSelectedBuilding(item);
                        setShowDropdown(false);
                        setSearch('');
                      }}
                    >
                      <Text style={styles.buildingItemId}>{item.building_id}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.buildingItemName}>{item.name}</Text>
                        <Text style={styles.buildingItemAddr} numberOfLines={1}>
                          {item.address}
                        </Text>
                      </View>
                      {item.is_high_hazard && (
                        <View style={styles.hazardBadge}>
                          <Text style={styles.hazardBadgeText}>⚠ HAZARD</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  )}
                  ListEmptyComponent={
                    <Text style={styles.emptyText}>No buildings match your search</Text>
                  }
                  style={styles.buildingList}
                />
              )}
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgSecondary },
  scroll: { flexGrow: 1, padding: SPACING.xl },

  header: { alignItems: 'center', marginTop: SPACING.xxxl, marginBottom: SPACING.xxl },
  logo: { width: 72, height: 72, borderRadius: RADIUS.lg, marginBottom: SPACING.md },
  brand: { fontSize: 22, fontWeight: '800', color: COLORS.primary, letterSpacing: 2 },
  tagline: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },

  card: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.xxl,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
  },
  cardTitle: { fontSize: 20, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 4 },
  cardDesc: { fontSize: 13, color: COLORS.textSecondary, marginBottom: SPACING.xxl },

  label: { ...FONTS.label, marginBottom: SPACING.sm, marginTop: SPACING.lg },
  input: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.sm,
    padding: SPACING.lg, fontSize: 15, color: COLORS.textPrimary,
    backgroundColor: COLORS.bgSecondary,
  },

  roleRow: { flexDirection: 'row', gap: SPACING.sm },
  roleBtn: {
    flex: 1, padding: SPACING.md, borderRadius: RADIUS.sm,
    borderWidth: 1, borderColor: COLORS.border, alignItems: 'center',
    backgroundColor: COLORS.bgSecondary,
  },
  roleBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  roleTxt: { fontSize: 14, fontWeight: '500', color: COLORS.textSecondary },
  roleTxtActive: { color: COLORS.white, fontWeight: '600' },

  buildingSelector: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.sm,
    padding: SPACING.lg, backgroundColor: COLORS.bgSecondary,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  buildingName: { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary },
  buildingId: { fontSize: 12, fontFamily: 'monospace', color: COLORS.primary, marginTop: 2 },
  placeholder: { fontSize: 14, color: COLORS.textTertiary },
  chevron: { fontSize: 12, color: COLORS.textTertiary },

  submitBtn: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.sm,
    padding: SPACING.lg, alignItems: 'center', marginTop: SPACING.xxl,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitTxt: { fontSize: 16, fontWeight: '700', color: COLORS.white },

  encryptionNote: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    marginTop: SPACING.lg, padding: SPACING.md,
    backgroundColor: COLORS.successBg, borderRadius: RADIUS.sm,
  },
  encryptionIcon: { fontSize: 14 },
  encryptionText: { fontSize: 11, color: COLORS.success, flex: 1, lineHeight: 16 },

  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: COLORS.overlay, justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white, borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl, maxHeight: '85%', paddingBottom: SPACING.xxxl,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: SPACING.xl, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  modalClose: { fontSize: 20, color: COLORS.textTertiary, padding: SPACING.sm },

  searchInput: {
    margin: SPACING.lg, padding: SPACING.lg,
    borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.full,
    fontSize: 15, color: COLORS.textPrimary, backgroundColor: COLORS.bgSecondary,
  },

  buildingList: { paddingHorizontal: SPACING.lg },
  buildingItem: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    padding: SPACING.lg, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight,
  },
  buildingItemHazard: { backgroundColor: COLORS.hazardBg },
  buildingItemId: {
    fontSize: 11, fontFamily: 'monospace', fontWeight: '700',
    color: COLORS.primary, width: 55,
  },
  buildingItemName: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
  buildingItemAddr: { fontSize: 11, color: COLORS.textTertiary, marginTop: 1 },
  hazardBadge: {
    backgroundColor: COLORS.hazardBg, paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.hazard,
  },
  hazardBadgeText: { fontSize: 9, fontWeight: '700', color: COLORS.hazard },
  emptyText: { textAlign: 'center', color: COLORS.textTertiary, marginTop: 40, fontSize: 14 },
});