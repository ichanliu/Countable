import React, { useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Alert,
  Image,
  Share,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { StatusBar } from 'expo-status-bar';
import { Colors, Radius, InterWeights } from '../constants/theme';
import { useSettings } from '../context/SettingsContext';
import { useEvents } from '../context/EventsContext';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { settings, updateSettings, addImage, removeImage } = useSettings();
  const { exportEvents, importEvents, events } = useEvents();

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

  const handleExport = useCallback(async () => {
    try {
      const json = await exportEvents();
      const filename = `countable_backup_${Date.now()}.json`;
      const fileUri = FileSystem.cacheDirectory + filename;
      await FileSystem.writeAsStringAsync(fileUri, json);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/json',
          dialogTitle: 'Save Countable backup',
        });
      } else {
        await Share.share({ message: json });
      }
    } catch (e: any) {
      Alert.alert('Export failed', e.message || 'Unknown error');
    }
  }, [exportEvents]);

  const handleImport = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const file = result.assets[0];
      const content = await FileSystem.readAsStringAsync(file.uri);
      const count = await importEvents(content);
      Alert.alert('Import complete', `${count} events restored.`);
    } catch (e: any) {
      Alert.alert('Import failed', e.message || 'Invalid backup file');
    }
  }, [importEvents]);

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

        {/* Data backup */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>DATA</Text>
          <Text style={styles.infoText}>{events.length} events</Text>
          <View style={styles.dataBtnRow}>
            <Pressable style={styles.dataBtn} onPress={handleExport}>
              <Ionicons name="download-outline" size={16} color={Colors.primary} />
              <Text style={styles.dataBtnText}>Export backup</Text>
            </Pressable>
            <Pressable style={styles.dataBtn} onPress={handleImport}>
              <Ionicons name="cloud-upload-outline" size={16} color={Colors.primary} />
              <Text style={styles.dataBtnText}>Import backup</Text>
            </Pressable>
          </View>
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
  infoText: {
    fontSize: 14,
    fontFamily: InterWeights.regular,
    color: Colors.mutedForeground,
  },
  dataBtnRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  dataBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dataBtnText: {
    fontSize: 13,
    fontFamily: InterWeights.medium,
    color: Colors.primary,
  },
});
