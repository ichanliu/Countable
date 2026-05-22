import React, { useCallback, useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Alert,
  Image,
  Modal,
  Share,
  FlatList,
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
  const [widgetIds, setWidgetIds] = useState<number[]>([]);
  const [widgetBindings, setWidgetBindings] = useState<Record<number, string>>({});
  const [showWidgetPicker, setShowWidgetPicker] = useState(false);
  const [pickingWidgetId, setPickingWidgetId] = useState<number | null>(null);

  const handleBindWidget = useCallback((widgetId: number, eventId: string) => {
    const { bindWidget } = require('../utils/widgetBridge');
    bindWidget(widgetId, eventId);
    setWidgetBindings((prev) => ({ ...prev, [widgetId]: eventId }));
    setShowWidgetPicker(false);
    setPickingWidgetId(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  // Fetch widget info on mount
  useEffect(() => {
    (async () => {
      const { getWidgetIds, getWidgetEventId } = require('../utils/widgetBridge');
      const ids = await getWidgetIds();
      setWidgetIds(ids);
      const bindings: Record<number, string> = {};
      for (const id of ids) {
        bindings[id] = await getWidgetEventId(id);
      }
      setWidgetBindings(bindings);
    })();
  }, []);

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

        {/* Widgets section */}
        {widgetIds.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>WIDGETS</Text>
            <Text style={styles.infoText}>{widgetIds.length} widget(s) on homescreen</Text>
            {widgetIds.map((id) => {
              const boundEventId = widgetBindings[id] || '';
              const boundEvent = events.find((e) => e.id === boundEventId);
              return (
                <View key={id} style={styles.widgetRow}>
                  <View>
                    <Text style={styles.widgetIdText}>Widget #{id}</Text>
                    <Text style={styles.widgetEventText}>
                      {boundEvent ? boundEvent.title : 'No event bound'}
                    </Text>
                  </View>
                  <Pressable
                    style={styles.widgetBindBtn}
                    onPress={() => {
                      setPickingWidgetId(id);
                      setShowWidgetPicker(true);
                    }}
                  >
                    <Ionicons name="link-outline" size={14} color={Colors.primary} />
                    <Text style={styles.widgetBindText}>Bind</Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        )}

        {/* Info */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>INFO</Text>
          <Text style={styles.infoText}>Countable v1.0.0</Text>
        </View>
      </ScrollView>

      {/* Widget event picker modal */}
      <Modal visible={showWidgetPicker} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setShowWidgetPicker(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Bind to event</Text>
            {events.length === 0 ? (
              <Text style={styles.modalEmpty}>No events yet</Text>
            ) : (
              <ScrollView style={styles.modalList}>
                {events.map((ev) => (
                  <Pressable
                    key={ev.id}
                    style={styles.modalItem}
                    onPress={() => pickingWidgetId !== null && handleBindWidget(pickingWidgetId, ev.id)}
                  >
                    <View>
                      <Text style={styles.modalItemTitle}>{ev.title}</Text>
                      <Text style={styles.modalItemDate}>{new Date(ev.targetDate).toLocaleDateString()}</Text>
                    </View>
                    {widgetBindings[pickingWidgetId || 0] === ev.id && (
                      <Ionicons name="checkmark" size={18} color={Colors.primary} />
                    )}
                  </Pressable>
                ))}
              </ScrollView>
            )}
            <Pressable style={styles.modalCloseBtn} onPress={() => setShowWidgetPicker(false)}>
              <Text style={styles.modalCloseText}>Close</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
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
  widgetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  widgetIdText: {
    fontSize: 12,
    fontFamily: InterWeights.semiBold,
    color: Colors.mutedForeground,
  },
  widgetEventText: {
    fontSize: 14,
    fontFamily: InterWeights.medium,
    color: Colors.foreground,
    marginTop: 2,
  },
  widgetBindBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  widgetBindText: {
    fontSize: 12,
    fontFamily: InterWeights.medium,
    color: Colors.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    maxWidth: 360,
    maxHeight: '70%',
    backgroundColor: Colors.card,
    borderRadius: Radius.section,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontFamily: InterWeights.semiBold,
    color: Colors.foreground,
    marginBottom: 12,
  },
  modalEmpty: {
    fontSize: 14,
    fontFamily: InterWeights.regular,
    color: Colors.mutedForeground,
    textAlign: 'center',
    paddingVertical: 20,
  },
  modalList: {
    maxHeight: 300,
  },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  modalItemTitle: {
    fontSize: 14,
    fontFamily: InterWeights.medium,
    color: Colors.foreground,
  },
  modalItemDate: {
    fontSize: 12,
    fontFamily: InterWeights.regular,
    color: Colors.mutedForeground,
    marginTop: 2,
  },
  modalCloseBtn: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 8,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalCloseText: {
    fontSize: 14,
    fontFamily: InterWeights.medium,
    color: Colors.foreground,
  },
});
