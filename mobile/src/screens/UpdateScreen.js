import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, Alert, KeyboardAvoidingView,
  Platform, ActivityIndicator,
} from 'react-native';
import { sendUpdate } from '../utils/api';
import { COLORS, SPACING, RADIUS, FONTS } from '../utils/theme';

export default function UpdateScreen({ alert, user, onBack }) {
  const [floorNumber, setFloorNumber] = useState('');
  const [affectedArea, setAffectedArea] = useState('');
  const [occupants, setOccupants] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState([]);

  const handleSend = async () => {
    if (!message.trim() && !floorNumber && !affectedArea) {
      return Alert.alert('Required', 'Please enter at least a message or floor number');
    }

    setSending(true);
    try {
      const update = await sendUpdate({
        alert_id: alert.id,
        sent_by: user.id,
        floor_number: floorNumber ? parseInt(floorNumber) : null,
        affected_area: affectedArea || null,
        estimated_occupants: occupants ? parseInt(occupants) : null,
        message: message.trim() || null,
      });

      setSent((prev) => [...prev, update]);
      // Reset form but keep floor number
      setAffectedArea('');
      setOccupants('');
      setMessage('');

      Alert.alert('Sent', 'Update delivered to fire station');
    } catch (err) {
      Alert.alert('Failed', err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <Text style={styles.backTxt}>← Back</Text>
          </TouchableOpacity>
          <View style={styles.alertBadge}>
            <Text style={styles.alertBadgeDot}>●</Text>
            <Text style={styles.alertBadgeTxt}>ACTIVE ALERT</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Alert info */}
          <View style={styles.alertInfo}>
            <Text style={styles.alertTitle}>Alert #{alert.id}</Text>
            <Text style={styles.alertBuilding}>{alert.building_name || alert.building_id}</Text>
            <Text style={styles.alertMeta}>
              Sending live updates to fire station dashboard
            </Text>
          </View>

          {/* Update form */}
          <View style={styles.form}>
            <Text style={styles.formTitle}>Send Update</Text>

            <Text style={styles.label}>FLOOR NUMBER</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 3"
              placeholderTextColor={COLORS.textTertiary}
              value={floorNumber}
              onChangeText={setFloorNumber}
              keyboardType="number-pad"
            />

            <Text style={styles.label}>AFFECTED AREA</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. West wing, Kitchen, Lobby"
              placeholderTextColor={COLORS.textTertiary}
              value={affectedArea}
              onChangeText={setAffectedArea}
            />

            <Text style={styles.label}>ESTIMATED OCCUPANTS</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 50"
              placeholderTextColor={COLORS.textTertiary}
              value={occupants}
              onChangeText={setOccupants}
              keyboardType="number-pad"
            />

            <Text style={styles.label}>MESSAGE</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              placeholder="Describe the situation — fire spreading, smoke visible, people trapped, exits blocked..."
              placeholderTextColor={COLORS.textTertiary}
              value={message}
              onChangeText={setMessage}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <TouchableOpacity
              style={[styles.sendBtn, sending && styles.sendBtnDisabled]}
              onPress={handleSend}
              disabled={sending}
            >
              {sending ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.sendBtnTxt}>Send Update to Fire Station</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Sent updates log */}
          {sent.length > 0 && (
            <View style={styles.sentLog}>
              <Text style={styles.sentTitle}>Updates Sent ({sent.length})</Text>
              {sent.map((u, i) => (
                <View key={u.id || i} style={styles.sentItem}>
                  <Text style={styles.sentDot}>✓</Text>
                  <View style={{ flex: 1 }}>
                    {u.message && <Text style={styles.sentMsg}>{u.message}</Text>}
                    <View style={styles.sentTags}>
                      {u.floor_number != null && (
                        <Text style={styles.sentTag}>Floor {u.floor_number}</Text>
                      )}
                      {u.affected_area && (
                        <Text style={styles.sentTag}>{u.affected_area}</Text>
                      )}
                      {u.estimated_occupants != null && (
                        <Text style={styles.sentTag}>{u.estimated_occupants} occupants</Text>
                      )}
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
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
  backBtn: { paddingVertical: SPACING.sm },
  backTxt: { fontSize: 14, color: COLORS.primary, fontWeight: '500' },
  alertBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.hazard, paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs, borderRadius: RADIUS.full,
  },
  alertBadgeDot: { fontSize: 8, color: COLORS.white },
  alertBadgeTxt: { fontSize: 10, fontWeight: '700', color: COLORS.white, letterSpacing: 0.5 },

  scroll: { padding: SPACING.xl },

  alertInfo: {
    padding: SPACING.xl, backgroundColor: COLORS.hazardBg,
    borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.hazard,
    marginBottom: SPACING.xl,
  },
  alertTitle: { fontSize: 13, fontFamily: 'monospace', color: COLORS.hazard, fontWeight: '700' },
  alertBuilding: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary, marginTop: 4 },
  alertMeta: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4 },

  form: {
    backgroundColor: COLORS.white, borderRadius: RADIUS.lg,
    padding: SPACING.xxl, marginBottom: SPACING.xl,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  formTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary, marginBottom: SPACING.lg },

  label: { ...FONTS.label, fontSize: 11, marginBottom: SPACING.xs, marginTop: SPACING.lg },
  input: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.sm,
    padding: SPACING.md, fontSize: 15, color: COLORS.textPrimary,
    backgroundColor: COLORS.bgSecondary,
  },
  inputMultiline: { minHeight: 100, paddingTop: SPACING.md },

  sendBtn: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.sm,
    padding: SPACING.lg, alignItems: 'center', marginTop: SPACING.xxl,
  },
  sendBtnDisabled: { opacity: 0.6 },
  sendBtnTxt: { fontSize: 15, fontWeight: '700', color: COLORS.white },

  sentLog: { marginBottom: SPACING.xxxl },
  sentTitle: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary, marginBottom: SPACING.md },
  sentItem: {
    flexDirection: 'row', gap: SPACING.md, padding: SPACING.md,
    backgroundColor: COLORS.successBg, borderRadius: RADIUS.sm, marginBottom: SPACING.sm,
  },
  sentDot: { fontSize: 14, color: COLORS.success },
  sentMsg: { fontSize: 13, color: COLORS.textPrimary, marginBottom: 4 },
  sentTags: { flexDirection: 'row', gap: SPACING.sm, flexWrap: 'wrap' },
  sentTag: {
    fontSize: 11, color: COLORS.textSecondary,
    backgroundColor: COLORS.bgTertiary, paddingHorizontal: 8,
    paddingVertical: 2, borderRadius: RADIUS.full,
  },
});