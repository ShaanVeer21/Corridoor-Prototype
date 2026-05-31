import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, StatusBar } from 'react-native';
import { COLORS, SPACING, RADIUS } from '../utils/theme';

export default function RoleSelectScreen({ onSelectStaff, onSelectResponder }) {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bgSecondary} />
      <View style={styles.content}>
        <View style={styles.logoArea}>
          <View style={styles.logoBox}><Text style={styles.logoIcon}>🚒</Text></View>
          <Text style={styles.brand}>CORRIDOOR</Text>
          <Text style={styles.tagline}>Fire Incident Response System</Text>
        </View>

        <Text style={styles.question}>I am a...</Text>

        <TouchableOpacity style={styles.roleCard} onPress={onSelectStaff}>
          <Text style={styles.roleIcon}>🏢</Text>
          <View style={styles.roleInfo}>
            <Text style={styles.roleTitle}>Building Staff / Security</Text>
            <Text style={styles.roleDesc}>Report emergencies from your building</Text>
          </View>
          <Text style={styles.arrow}>→</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.roleCard, styles.roleCardResponder]} onPress={onSelectResponder}>
          <Text style={styles.roleIcon}>👨‍🚒</Text>
          <View style={styles.roleInfo}>
            <Text style={styles.roleTitle}>Fire Responder</Text>
            <Text style={styles.roleDesc}>Receive alerts and respond to incidents</Text>
          </View>
          <Text style={styles.arrow}>→</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>🔒 End-to-end encrypted</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgSecondary },
  content: { flex: 1, padding: SPACING.xxl, justifyContent: 'center' },
  logoArea: { alignItems: 'center', marginBottom: 48 },
  logoBox: {
    width: 72, height: 72, borderRadius: RADIUS.xl,
    backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  logoIcon: { fontSize: 36 },
  brand: { fontSize: 28, fontWeight: '800', color: COLORS.primary, letterSpacing: 3 },
  tagline: { fontSize: 13, color: COLORS.textTertiary, marginTop: 4 },
  question: { fontSize: 20, fontWeight: '700', color: COLORS.textPrimary, marginBottom: SPACING.xl },
  roleCard: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.lg,
    padding: SPACING.xl, backgroundColor: COLORS.white,
    borderRadius: RADIUS.xl, borderWidth: 2, borderColor: COLORS.border,
    marginBottom: SPACING.md,
  },
  roleCardResponder: { borderColor: COLORS.primary, backgroundColor: COLORS.cream },
  roleIcon: { fontSize: 32 },
  roleInfo: { flex: 1 },
  roleTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  roleDesc: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  arrow: { fontSize: 20, color: COLORS.textTertiary },
  footer: { alignItems: 'center', marginTop: 48 },
  footerText: { fontSize: 11, color: COLORS.success },
});