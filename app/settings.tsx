import React, { useCallback, useState } from 'react';
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
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { StatusBar } from 'expo-status-bar';
import { Colors, Radius, InterWeights } from '../constants/theme';
import { useSettings } from '../context/SettingsContext';
import { useEvents } from '../context/EventsContext';
import { formatDate } from '../constants/types';
import {
  bindWidget,
  getWidgetIds,
  getWidgetEventId,
  isWidgetBindingSet,
  syncWidget,
} from '../utils/widgetBridge';
import {
  deleteOrphanedImageFiles,
  findOrphanedImageUris,
  getSettingsImageReferences,
  persistEventImage,
} from '../utils/imageStorage';
import { isDefaultWidgetBinding } from '../utils/widgetAssignments';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { settings, updateSettings, addImage, removeImage } = useSettings();
  const { exportEvents, importEvents, events } = useEvents();
  const [widgetIds, setWidgetIds] = useState<number[]>([]);
  const [widgetBindings, setWidgetBindings] = useState<Record<number, string>>({});
  const [widgetBindingSet, setWidgetBindingSet] = useState<Record<number, boolean>>({});
  const [showWidgetPicker, setShowWidgetPicker] = useState(false);
  const [pickingWidgetId, setPickingWidgetId] = useState<number | null>(null);

  const handleBindWidget = useCallback(async (widgetId: number, eventId: string) => {
    try {
      await bindWidget(widgetId, eventId);
      const event = events.find((e) => e.id === eventId);
      await syncWidget(event || null, widgetId);
      setWidgetBindings((prev) => ({ ...prev, [widgetId]: eventId }));
      setWidgetBindingSet((prev) => ({ ...prev, [widgetId]: true }));
      setShowWidgetPicker(false);
      setPickingWidgetId(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      Alert.alert(
        'Widget could not be updated',
        error instanceof Error ? error.message : 'Please try again.'
      );
    }
  }, [events]);

  // Refresh widget IDs and bindings whenever Settings comes into focus.
  useFocusEffect(useCallback(() => {
    let active = true;
    (async () => {
      try {
        const ids = await getWidgetIds();
        if (!active) return;
        setWidgetIds(ids);
        const bindings: Record<number, string> = {};
        const bindingStates: Record<number, boolean> = {};
        for (const id of ids) {
          bindings[id] = await getWidgetEventId(id);
          bindingStates[id] = await isWidgetBindingSet(id);
        }
        if (active) {
          setWidgetBindings(bindings);
          setWidgetBindingSet(bindingStates);
        }
      } catch (error) {
        console.error('Failed to load widget bindings:', error);
      }
    })();
    return () => {
      active = false;
    };
  }, []));

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
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsEditing: true,
      });
      if (result.canceled || !result.assets[0]) return;
      const uri = await persistEventImage(result.assets[0].uri, 'custom-image');
      await addImage(uri);
    } catch (error) {
      Alert.alert(
        'Image could not be saved',
        error instanceof Error ? error.message : 'Please try selecting the image again.'
      );
    }
  }, [addImage]);

  const handleRemoveImage = useCallback(async (uri: string) => {
    try {
      await removeImage(uri);
      const remainingSettingsUris = await getSettingsImageReferences();
      const orphaned = findOrphanedImageUris(
        [uri],
        events,
        remainingSettingsUris,
        FileSystem.documentDirectory
      );
      await deleteOrphanedImageFiles(orphaned);
    } catch (error) {
      Alert.alert(
        'Image could not be removed',
        error instanceof Error ? error.message : 'Please try again.'
      );
    }
  }, [events, removeImage]);

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
          <View style={styles.backgroundHeader}>
            <View style={styles.backgroundDescription}>
              <Text style={styles.backgroundTitle}>Home background</Text>
              <Text style={styles.infoText}>
                {settings.homeBackgroundUri
                  ? 'Custom background selected'
                  : 'Tap a photo below or add one'}
              </Text>
            </View>
            {settings.homeBackgroundUri && (
              <Pressable
                accessibilityLabel="Clear home background"
                onPress={() => void updateSettings({ homeBackgroundUri: undefined })}
                style={styles.clearBackgroundBtn}
              >
                <Text style={styles.clearBackgroundText}>Clear</Text>
              </Pressable>
            )}
          </View>
          {settings.customImages.length > 0 && (
            <View style={styles.imageGrid}>
              {settings.customImages.map((uri, i) => (
                <View
                  key={`${uri}-${i}`}
                  style={[
                    styles.imageItem,
                    settings.homeBackgroundUri === uri && styles.imageItemSelected,
                  ]}
                >
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Set image ${i + 1} as home background`}
                    onPress={() => void updateSettings({ homeBackgroundUri: uri })}
                  >
                    <Image source={{ uri }} style={styles.thumbImage} />
                    {settings.homeBackgroundUri === uri && (
                      <View style={styles.selectedImageMark}>
                        <Ionicons name="checkmark" size={13} color="#fff" />
                      </View>
                    )}
                  </Pressable>
                  <Pressable
                    style={styles.removeImageBtn}
                    accessibilityLabel={`Remove custom image ${i + 1}`}
                    onPress={() => void handleRemoveImage(uri)}
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
              const defaultBinding = isDefaultWidgetBinding(widgetBindingSet[id] ?? false, boundEventId);
              const displayedEvent = boundEvent ?? (
                defaultBinding ? events.find((event) => event.isPinned) : undefined
              );
              return (
                <View key={id} style={styles.widgetRow}>
                  <View style={styles.widgetInfo}>
                    <Text style={styles.widgetIdText}>Home-screen widget #{id}</Text>
                    <Text style={styles.widgetEventText}>
                      {displayedEvent
                        ? `${displayedEvent.title} · ${formatDate(displayedEvent.targetDate)}${defaultBinding ? ' · default pinned event' : ''}`
                        : widgetBindingSet[id] ? 'Unbound · displays no event' : 'Not linked to an event'}
                    </Text>
                  </View>
                  <View style={styles.widgetActions}>
                    <Pressable
                      style={styles.widgetBindBtn}
                      onPress={() => {
                        setPickingWidgetId(id);
                        setShowWidgetPicker(true);
                      }}
                    >
                      <Ionicons name="link-outline" size={14} color={Colors.primary} />
                      <Text style={styles.widgetBindText}>{boundEvent ? 'Change' : 'Choose'}</Text>
                    </Pressable>
                    {boundEvent && (
                      <Pressable
                        accessibilityLabel={`Unbind widget ${id}`}
                        style={styles.widgetUnbindBtn}
                        onPress={() => void handleBindWidget(id, '')}
                      >
                        <Ionicons name="unlink-outline" size={14} color={Colors.destructive} />
                      </Pressable>
                    )}
                  </View>
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
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowWidgetPicker(false)} />
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Choose an event</Text>
            <Text style={styles.modalHint}>This changes only the selected home-screen widget.</Text>
            {events.length === 0 ? (
              <Text style={styles.modalEmpty}>No events yet</Text>
            ) : (
              <ScrollView style={styles.modalList}>
                {events.map((ev) => (
                  <Pressable
                    key={ev.id}
                    style={styles.modalItem}
                    onPress={() => {
                      if (pickingWidgetId !== null) {
                        void handleBindWidget(pickingWidgetId, ev.id);
                      }
                    }}
                  >
                    <View>
                      <Text style={styles.modalItemTitle}>{ev.title}</Text>
                      <Text style={styles.modalItemDate}>{formatDate(ev.targetDate)}</Text>
                    </View>
                    {widgetBindings[pickingWidgetId || 0] === ev.id && (
                      <Ionicons name="checkmark" size={18} color={Colors.primary} />
                    )}
                  </Pressable>
                ))}
              </ScrollView>
            )}
            {!!widgetBindingSet[pickingWidgetId || 0] && !!widgetBindings[pickingWidgetId || 0] && (
              <Pressable
                style={styles.unbindModalItem}
                onPress={() => {
                  if (pickingWidgetId !== null) void handleBindWidget(pickingWidgetId, '');
                }}
              >
                <Ionicons name="unlink-outline" size={16} color={Colors.destructive} />
                <Text style={styles.unbindModalText}>Unbind this widget (show no event)</Text>
              </Pressable>
            )}
            <Pressable style={styles.modalCloseBtn} onPress={() => setShowWidgetPicker(false)}>
              <Text style={styles.modalCloseText}>Close</Text>
            </Pressable>
          </View>
        </View>
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
    borderRadius: Radius.badge,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  imageItemSelected: {
    borderColor: Colors.primary,
  },
  thumbImage: {
    width: 80,
    height: 80,
    borderRadius: Radius.badge,
  },
  selectedImageMark: {
    position: 'absolute',
    left: 5,
    bottom: 5,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeImageBtn: {
    position: 'absolute',
    top: -4,
    right: -4,
  },
  backgroundHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  backgroundDescription: {
    flex: 1,
    gap: 2,
  },
  backgroundTitle: {
    fontSize: 14,
    fontFamily: InterWeights.medium,
    color: Colors.foreground,
  },
  clearBackgroundBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  clearBackgroundText: {
    fontSize: 12,
    fontFamily: InterWeights.medium,
    color: Colors.primary,
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
  widgetActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
    flexShrink: 1,
  },
  widgetInfo: {
    flex: 1,
    marginRight: 8,
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
  modalHint: {
    fontSize: 12,
    fontFamily: InterWeights.regular,
    color: Colors.mutedForeground,
    marginTop: -6,
    marginBottom: 8,
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
  unbindModalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  unbindModalText: {
    fontSize: 13,
    fontFamily: InterWeights.medium,
    color: Colors.destructive,
  },
  widgetUnbindBtn: {
    padding: 7,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
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
