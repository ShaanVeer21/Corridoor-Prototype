import { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, Alert, KeyboardAvoidingView,
  Platform, ActivityIndicator, Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { sendUpdate, sendUpdateWithPhoto, getPhotoUrl } from '../utils/api';
import { COLORS, SPACING, RADIUS, FONTS } from '../utils/theme';

export default function UpdateScreen({ alert, user, onBack }) {
  const [message, setMessage] = useState('');
  const [pendingPhoto, setPendingPhoto] = useState(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState([]);

  const handlePickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera roll permission is required to send photos');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets?.[0]) {
      setPendingPhoto(result.assets[0]);
    }
  };

  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera permission is required to take photos');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.7,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets?.[0]) {
      setPendingPhoto(result.assets[0]);
    }
  };

  const handleSend = async () => {
    if (!message.trim() && !pendingPhoto) {
      return Alert.alert('Required', 'Enter a message or attach a photo');
    }

    setSending(true);
    try {
      let update;

      if (pendingPhoto) {
        // Send with photo
        const formData = new FormData();
        formData.append('alert_id', alert.id);
        formData.append('sent_by', user.id);
        if (message.trim()) formData.append('message', message.trim());

        const uri = pendingPhoto.uri;
        const filename = uri.split('/').pop() || 'photo.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';

        formData.append('photo', { uri, name: filename, type });

        update = await sendUpdateWithPhoto(formData);
      } else {
        // Text only
        update = await sendUpdate({
          alert_id: alert.id,
          sent_by: user.id,
          message: message.trim(),
        });
      }

      setSent((prev) => [...prev, {
        ...update,
        _localPhoto: pendingPhoto?.uri,
      }]);
      setMessage('');
      setPendingPhoto(null);
    } catch (err) {
      Alert.alert('Failed', err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack}><Text style={styles.backTxt}>← Back</Text></TouchableOpacity>
          <View style={styles.alertBadge}>
            <Text style={styles.alertBadgeDot}>●</Text>
            <Text style={styles.alertBadgeTxt}>ALERT SENT</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Success banner */}
          <View style={styles.successBanner}>
            <Text style={styles.successIcon}>✅</Text>
            <View>
              <Text style={styles.successTitle}>Alert Sent</Text>
              <Text style={styles.successSub}>Emergency services notified for {alert.building_name || alert.building_id}</Text>
            </View>
          </View>

          {/* Live updates section label */}
          <Text style={styles.sectionLabel}>SEND LIVE UPDATES</Text>
          <Text style={styles.sectionSub}>Keep responders informed about the situation</Text>

          {/* Sent items */}
          {sent.map((item, i) => (
            <View key={item.id || i} style={styles.sentItem}>
              <Text style={styles.sentBy}>Sent by you</Text>
              {item.message && <Text style={styles.sentMsg}>{item.message}</Text>}
              {(item.photo_url || item._localPhoto) && (
                <Image
                  source={{ uri: item._localPhoto || getPhotoUrl(item.photo_url) }}
                  style={styles.sentPhoto}
                />
              )}
            </View>
          ))}

          {/* Photo preview */}
          {pendingPhoto && (
            <View style={styles.photoPreview}>
              <Image source={{ uri: pendingPhoto.uri }} style={styles.photoPreviewImg} />
              <TouchableOpacity style={styles.photoRemove} onPress={() => setPendingPhoto(null)}>
                <Text style={styles.photoRemoveTxt}>✕</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>

        {/* Bottom input bar */}
        <View style={styles.inputBar}>
          <TouchableOpacity style={styles.cameraBtn} onPress={handleTakePhoto}>
            <Text style={styles.cameraBtnTxt}>📷</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cameraBtn} onPress={handlePickPhoto}>
            <Text style={styles.cameraBtnTxt}>🖼️</Text>
          </TouchableOpacity>
          <TextInput
            style={styles.messageInput}
            placeholder="Type an update..."
            placeholderTextColor={COLORS.textTertiary}
            value={message}
            onChangeText={setMessage}
            multiline
          />
          <TouchableOpacity
            style={[styles.sendBtn, sending && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={sending}
          >
            {sending ? (
              <ActivityIndicator color={COLORS.white} size="small" />
            ) : (
              <Text style={styles.sendBtnTxt}>➤</Text>
            )}
          </TouchableOpacity>
        </View>
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
  backTxt: { fontSize: 14, color: COLORS.primary, fontWeight: '500' },
  alertBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.success, paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs, borderRadius: RADIUS.full,
  },
  alertBadgeDot: { fontSize: 8, color: COLORS.white },
  alertBadgeTxt: { fontSize: 10, fontWeight: '700', color: COLORS.white },

  scroll: { padding: SPACING.xl, paddingBottom: 100 },

  successBanner: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    padding: SPACING.lg, backgroundColor: COLORS.successBg,
    borderRadius: RADIUS.lg, marginBottom: SPACING.xl,
  },
  successIcon: { fontSize: 24 },
  successTitle: { fontSize: 20, fontWeight: '700', color: COLORS.textPrimary },
  successSub: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },

  sectionLabel: {
    fontSize: 12, fontWeight: '700', color: COLORS.primary,
    letterSpacing: 0.8, marginBottom: 2,
  },
  sectionSub: { fontSize: 12, color: COLORS.textTertiary, marginBottom: SPACING.lg },

  sentItem: {
    backgroundColor: COLORS.successBg, borderWidth: 1, borderColor: 'rgba(5,150,105,0.3)',
    borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm,
  },
  sentBy: { fontSize: 11, fontWeight: '700', color: COLORS.success, marginBottom: 4 },
  sentMsg: { fontSize: 14, color: COLORS.textPrimary },
  sentPhoto: { width: '100%', height: 180, borderRadius: RADIUS.md, marginTop: SPACING.sm },

  photoPreview: { position: 'relative', marginBottom: SPACING.md },
  photoPreviewImg: { width: '100%', height: 200, borderRadius: RADIUS.lg, borderWidth: 2, borderColor: COLORS.primary },
  photoRemove: {
    position: 'absolute', top: 8, right: 8, width: 28, height: 28,
    borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center', justifyContent: 'center',
  },
  photoRemoveTxt: { color: COLORS.white, fontSize: 14, fontWeight: '700' },

  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: SPACING.sm,
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    backgroundColor: COLORS.white, borderTopWidth: 1, borderTopColor: COLORS.borderLight,
  },
  cameraBtn: {
    width: 40, height: 40, borderRadius: RADIUS.md,
    backgroundColor: COLORS.bgTertiary, alignItems: 'center', justifyContent: 'center',
  },
  cameraBtnTxt: { fontSize: 18 },
  messageInput: {
    flex: 1, minHeight: 40, maxHeight: 100, borderWidth: 1,
    borderColor: COLORS.border, borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    fontSize: 14, color: COLORS.textPrimary, backgroundColor: COLORS.bgSecondary,
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.5 },
  sendBtnTxt: { color: COLORS.white, fontSize: 18 },
});