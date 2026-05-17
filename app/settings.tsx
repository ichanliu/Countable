import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  StyleSheet,
  Alert,
  Image,
  Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { StatusBar } from 'expo-status-bar';
import { Colors, Radius, InterWeights } from '../constants/theme';
import { useSettings } from '../context/SettingsContext';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { settings, updateSettings, addImage, removeImage } = useSettings();
  const [reminderText, setReminderText] = useState(settings.reminderMessage);

  const handleBack = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  }, []);

  const handlePickImage = useCallback(async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission required', 'Allow access to your photo library.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
    });
    if (!result.canceled && result.assets[0]) {
      await addImage(result.assets[0].uri);
    }
  }, [addImage]);

  const handleSaveReminder = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    updateSettings({ reminderMessage: reminderText });
  }, [reminderText, updateSettings]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={handleBack} hitSlop={8} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.foreground} />
        </Pressable>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Theme Section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>THEME</Text>
          <View style={styles.themeRow}>
            <Pressable
              style={[styles.colorSwatch, { backgroundColor: '#5B9EFF' }]}
              onPress={() => updateSettings({ accentColor: '#5B9EFF' })}
            />
            <Pressable
              style={[styles.colorSwatch, { backgroundColor: '#2ECC71' }]}
              onPress={() => updateSettings({ accentColor: '#2ECC71' })}
            />
            <Pressable
              style={[styles.colorSwatch, { backgroundColor: '#FF6B35' }]}
              onPress={() => updateSettings({ accentColor: '#FF6B35' })}
            />
            <Pressable
              style={[styles.colorSwatch, { backgroundColor: '#E74C3C' }]}
              onPress={() => updateSettings({ accentColor: '#E74C3C' })}
            />
            <Pressable
              style={[styles.colorSwatch, { backgroundColor: '#9B59B6' }]}
              onPress={() => updateSettings({ accentColor: '#9B59B6' })}
            />
          </View>
        </View>

        {/* Custom Images Section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>CUSTOM IMAGES</Text>
          {settings.customImages.length > 0 && (
            <View style={styles.imageGrid}>
              {settings.customImages.map((uri, i) => (
                <View key={i} style={styles.imageItem}>
                  <Image source={{ uri }} style={styles.thumbImage} />
                  <Pressable
                    style={styles.removeImageBtn}
                    onPress={() => removeImage(uri)}
                  >
                    <Ionicons name="close-circle" size={22} color={Colors.destructive} />
                  </Pressable>
                </View>
              ))}
            </View>
          )}
          <Pressable style={styles.addImageBtn} onPress={handlePickImage}>
            <Ionicons name="image-outline" size={20} color={Colors.primary} />
            <Text style={styles.addImageText}>Add Image</Text>
          </Pressable>
        </View>

        {/* Notification Section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>REMINDER</Text>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Daily at 00:00</Text>
            <Switch
              value={settings.reminderEnabled}
              onValueChange={(v) => updateSettings({ reminderEnabled: v })}
              trackColor={{ false: Colors.border, true: Colors.primary }}
              thumbColor="#fff"
            />
          </View>
          {settings.reminderEnabled && (
            <>
              <Text style={styles.reminderHint}>
                Available variables:{'\n'}{'{title}'} - event name{'\n'}{'{days}'} - number of days{'\n'}{'{type}'} - "LEFT" or "PASSED"
              </Text>
              <TextInput
                style={styles.reminderInput}
                value={reminderText}
                onChangeText={setReminderText}
                placeholder="Today is {title} - {days} days {type}!"
                placeholderTextColor={Colors.mutedForeground}
                multiline
              />
              <Pressable style={styles.saveReminderBtn} onPress={handleSaveReminder}>
                <Text style={styles.saveReminderText}>Save Reminder Text</Text>
              </Pressable>
            </>
          )}
        </View>

        {/* Info */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>INFO</Text>
          <Text style={styles.infoText}>Countable v1.0.0</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: InterWeights.semiBold,
    color: Colors.foreground,
  },
  headerSpacer: {
    width: 26,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    backgroundColor: Colors.card,
    borderRadius: Radius.section,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    gap: 12,
    marginBottom: 14,
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: InterWeights.semiBold,
    color: Colors.mutedForeground,
    letterSpacing: 1,
  },
  themeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  colorSwatch: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  imageItem: {
    position: 'relative',
  },
  thumbImage: {
    width: 80,
    height: 80,
    borderRadius: Radius.badge,
  },
  removeImageBtn: {
    position: 'absolute',
    top: -4,
    right: -4,
  },
  addImageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  addImageText: {
    fontSize: 14,
    fontFamily: InterWeights.medium,
    color: Colors.primary,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchLabel: {
    fontSize: 15,
    fontFamily: InterWeights.medium,
    color: Colors.foreground,
  },
  reminderHint: {
    fontSize: 12,
    fontFamily: InterWeights.regular,
    color: Colors.mutedForeground,
    lineHeight: 18,
  },
  reminderInput: {
    fontSize: 14,
    fontFamily: InterWeights.regular,
    color: Colors.foreground,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.badge,
    padding: 12,
    minHeight: 60,
  },
  saveReminderBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.pill,
    paddingVertical: 10,
    alignItems: 'center',
  },
  saveReminderText: {
    fontSize: 14,
    fontFamily: InterWeights.semiBold,
    color: '#fff',
  },
  infoText: {
    fontSize: 14,
    fontFamily: InterWeights.regular,
    color: Colors.mutedForeground,
  },
});
