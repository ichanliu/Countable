import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  Image,
  Alert,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { StatusBar } from 'expo-status-bar';
import { Colors, Radius, InterWeights } from '../constants/theme';
import { useEvents } from '../context/EventsContext';
import { CountdownEvent, getDayDiff, generateId, formatLocalDate, parseEventDate, WidgetImageCrop } from '../constants/types';
import CalendarPicker from '../components/CalendarPicker';
import { deleteOrphanedImageFiles, findOrphanedImageUris, persistEventImage } from '../utils/imageStorage';
import * as FileSystem from 'expo-file-system/legacy';
import WidgetCropEditor from '../components/WidgetCropEditor';

export default function AddEventScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ eventId?: string }>();
  const { events, addEvent, updateEvent, deleteEvent } = useEvents();
  const currentEventsRef = useRef(events);
  const stagedImageUrisRef = useRef(new Set<string>());

  const isEdit = !!params.eventId;
  const existingEvent = isEdit
    ? events.find((e) => e.id === params.eventId)
    : null;

  const [title, setTitle] = useState(existingEvent?.title || '');
  const [targetDate, setTargetDate] = useState(
    existingEvent ? parseEventDate(existingEvent.targetDate) : new Date()
  );
  const [imageUri, setImageUri] = useState<string | undefined>(
    existingEvent?.imageUri
  );
  const [bgImageUri, setBgImageUri] = useState<string | undefined>(
    existingEvent?.bgImageUri
  );
  const [widgetImageUri, setWidgetImageUri] = useState<string | undefined>(
    existingEvent?.widgetImageUri ?? existingEvent?.imageUri
  );
  const [widgetImageCrop, setWidgetImageCrop] = useState<WidgetImageCrop>(
    existingEvent?.widgetImageCrop ?? { focusX: 0.5, focusY: 0.5, zoom: 1 }
  );
  const [showWidgetCrop, setShowWidgetCrop] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [titleError, setTitleError] = useState(false);
  const [deleteState, setDeleteState] = useState<'idle' | 'confirm'>('idle');
  const deleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset delete state after 3 seconds
  useEffect(() => {
    currentEventsRef.current = events;
  }, [events]);

  useEffect(() => {
    return () => {
      const orphaned = findOrphanedImageUris(
        [...stagedImageUrisRef.current],
        currentEventsRef.current,
        [],
        FileSystem.documentDirectory
      );
      void deleteOrphanedImageFiles(orphaned).catch((error) => {
        console.error('Failed to remove unused selected images:', error);
      });
    };
  }, []);

  useEffect(() => {
    return () => {
      if (deleteTimerRef.current) {
        clearTimeout(deleteTimerRef.current);
      }
    };
  }, []);

  const diff = getDayDiff(targetDate);

  const diffChip =
    diff === 0
      ? { text: 'Today', color: Colors.today }
      : diff > 0
      ? { text: `${diff} days from now`, color: Colors.countdown }
      : { text: `${Math.abs(diff)} days ago`, color: Colors.countup };

  const handlePickImage = useCallback(async (
    setImage: React.Dispatch<React.SetStateAction<string | undefined>>,
    prefix: string
  ) => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission required', 'Allow access to your photo library to select a background image.');
      return;
    }

    const aspect = prefix === 'event-card'
      ? [16, 9] as [number, number]
      : prefix === 'event-detail'
        ? [9, 16] as [number, number]
        : undefined;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: prefix !== 'event-widget',
      ...(aspect ? { aspect } : {}),
    });

    if (!result.canceled && result.assets[0]) {
      try {
        const storedUri = await persistEventImage(result.assets[0].uri, prefix);
        stagedImageUrisRef.current.add(storedUri);
        setImage(storedUri);
        if (prefix === 'event-widget') {
          setWidgetImageCrop({ focusX: 0.5, focusY: 0.5, zoom: 1 });
          setShowWidgetCrop(true);
        }
      } catch (error) {
        Alert.alert(
          'Image could not be saved',
          error instanceof Error ? error.message : 'Please try selecting the image again.'
        );
      }
    }
  }, []);

  const handleRemoveImage = useCallback((
    setImage: React.Dispatch<React.SetStateAction<string | undefined>>
  ) => setImage(undefined), []);

  const handleSave = useCallback(async () => {
    const trimmed = title.trim();
    if (!trimmed) {
      setTitleError(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setIsSaving(true);
    try {
      if (isEdit && existingEvent) {
        const updatedEvent = {
          ...existingEvent,
          title: trimmed,
          targetDate: formatLocalDate(targetDate),
          imageUri,
          bgImageUri,
          widgetImageUri: widgetImageUri ?? '',
          widgetImageCrop,
        };
        await updateEvent(existingEvent.id, {
          ...updatedEvent,
        });
        currentEventsRef.current = events.map((event) =>
          event.id === existingEvent.id ? updatedEvent : event
        );
      } else {
        const newEvent: CountdownEvent = {
          id: generateId(),
          title: trimmed,
          targetDate: formatLocalDate(targetDate),
          imageUri,
          bgImageUri,
          widgetImageUri: widgetImageUri ?? '',
          widgetImageCrop,
          isPinned: false,
          createdAt: new Date().toISOString(),
        };
        await addEvent(newEvent);
        currentEventsRef.current = [newEvent, ...events];
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (e) {
      console.error('Save failed:', e);
    } finally {
      setIsSaving(false);
    }
  }, [title, targetDate, imageUri, bgImageUri, widgetImageUri, widgetImageCrop, isEdit, existingEvent, addEvent, updateEvent]);

  const handleDeletePress = useCallback(() => {
    if (deleteState === 'idle') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setDeleteState('confirm');
      deleteTimerRef.current = setTimeout(() => {
        setDeleteState('idle');
      }, 3000);
    } else {
      // Confirm delete
      if (deleteTimerRef.current) {
        clearTimeout(deleteTimerRef.current);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      if (existingEvent) {
        deleteEvent(existingEvent.id);
      }
      router.back();
    }
  }, [deleteState, existingEvent, deleteEvent]);

  const handleGoBack = () => {
    router.back();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={handleGoBack} hitSlop={8} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.foreground} />
        </Pressable>
        <Text style={styles.headerTitle}>
          {isEdit ? 'Edit Event' : 'New Event'}
        </Text>
        <Pressable
          style={[styles.saveBtn, isSaving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={isSaving}
        >
          <Text style={styles.saveBtnText}>
            {isSaving ? 'Saving…' : 'Save'}
          </Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Section 1: Title */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>TITLE</Text>
          <TextInput
            style={[
              styles.input,
              titleError && styles.inputError,
            ]}
            value={title}
            onChangeText={(t) => {
              setTitle(t);
              if (titleError) setTitleError(false);
            }}
            placeholder="Event title"
            placeholderTextColor={Colors.mutedForeground}
            maxLength={60}
            returnKeyType="done"
          />
          {titleError && (
            <Text style={styles.errorText}>
              Please enter a title for this event.
            </Text>
          )}
        </View>

        {/* Section 2: Target Date */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>TARGET DATE</Text>
            <View style={[styles.diffChip, { borderColor: diffChip.color }]}>
              <Text style={[styles.diffChipText, { color: diffChip.color }]}>
                {diffChip.text}
              </Text>
            </View>
          </View>
          <CalendarPicker
            selectedDate={targetDate}
            onDateChange={setTargetDate}
          />
        </View>

        {/* Section 3: Independent images */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>EVENT IMAGES</Text>
          <EventImageField
            title="Home card"
            hint="Horizontal image shown in the event list"
            uri={imageUri}
            onPick={() => handlePickImage(setImageUri, 'event-card')}
            onRemove={() => handleRemoveImage(setImageUri)}
          />
          <EventImageField
            title="Full-screen detail"
            hint="Background shown when you open this event"
            uri={bgImageUri}
            onPick={() => handlePickImage(setBgImageUri, 'event-detail')}
            onRemove={() => handleRemoveImage(setBgImageUri)}
          />
          <EventImageField
            title="Home-screen widget"
            hint="Background shown on widgets linked to this event"
            uri={widgetImageUri}
            squarePreview
            onPick={() => handlePickImage(setWidgetImageUri, 'event-widget')}
            onRemove={() => handleRemoveImage(setWidgetImageUri)}
          />
          {widgetImageUri && (
            <Pressable style={styles.cropButton} onPress={() => setShowWidgetCrop(true)}>
              <Ionicons name="crop-outline" size={16} color={Colors.primary} />
              <Text style={styles.cropButtonText}>Preview and adjust framing</Text>
            </Pressable>
          )}
        </View>

        {/* Delete button (Edit mode only) */}
        {isEdit && (
          <Pressable
            style={[
              styles.deleteBtn,
              deleteState === 'confirm' && styles.deleteBtnActive,
            ]}
            onPress={handleDeletePress}
          >
            <Ionicons
              name={
                deleteState === 'confirm'
                  ? 'warning-outline'
                  : 'trash-outline'
              }
              size={18}
              color={deleteState === 'confirm' ? Colors.destructive : Colors.mutedForeground}
            />
            <Text
              style={[
                styles.deleteBtnText,
                deleteState === 'confirm' && styles.deleteBtnTextActive,
              ]}
            >
              {deleteState === 'confirm'
                ? 'Tap again to confirm delete'
                : 'Delete Event'}
            </Text>
          </Pressable>
        )}
      </ScrollView>

      <Modal visible={showWidgetCrop} transparent animationType="fade">
        <View style={styles.cropOverlay}>
          {widgetImageUri && (
            <WidgetCropEditor
              key={widgetImageUri}
              uri={widgetImageUri}
              initialCrop={widgetImageCrop}
              onCancel={() => setShowWidgetCrop(false)}
              onSave={(crop) => {
                setWidgetImageCrop(crop);
                setShowWidgetCrop(false);
              }}
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

function EventImageField({
  title,
  hint,
  uri,
  squarePreview = false,
  onPick,
  onRemove,
}: {
  title: string;
  hint: string;
  uri?: string;
  squarePreview?: boolean;
  onPick: () => void;
  onRemove: () => void;
}) {
  return (
    <View style={styles.eventImageField}>
      <View style={styles.imageFieldHeading}>
        <Text style={styles.imagePickerTitle}>{title}</Text>
        <Text style={styles.imagePickerHint}>{hint}</Text>
      </View>
      {uri ? (
        <View style={[styles.imagePreviewContainer, squarePreview && styles.squareImagePreviewContainer]}>
          <Image
            source={{ uri }}
            style={[styles.imagePreview, squarePreview && styles.squareImagePreview]}
            resizeMode="cover"
          />
          <Pressable style={styles.removeImageBtn} onPress={onRemove}>
            <Ionicons name="close-circle" size={26} color="#fff" />
          </Pressable>
          <Pressable style={styles.changeImageBtn} onPress={onPick}>
            <Ionicons name="swap-horizontal" size={16} color="#fff" />
            <Text style={styles.changeImageText}>Change</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable style={styles.imagePickerBox} onPress={onPick}>
          <Ionicons name="image-outline" size={24} color={Colors.mutedForeground} />
          <Text style={styles.imagePickerHint}>Choose from Gallery</Text>
        </Pressable>
      )}
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
  saveBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: Radius.pill,
  },
  saveBtnDisabled: {
    opacity: 0.5,
  },
  saveBtnText: {
    fontSize: 14,
    fontFamily: InterWeights.semiBold,
    color: '#fff',
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
    gap: 10,
    marginBottom: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: InterWeights.semiBold,
    color: Colors.mutedForeground,
    letterSpacing: 1,
  },
  diffChip: {
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  diffChipText: {
    fontSize: 11,
    fontFamily: InterWeights.semiBold,
  },
  input: {
    fontSize: 17,
    fontFamily: InterWeights.medium,
    color: Colors.foreground,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingVertical: 8,
  },
  inputError: {
    borderBottomColor: Colors.destructive,
  },
  errorText: {
    fontSize: 12,
    fontFamily: InterWeights.regular,
    color: Colors.destructive,
  },
  imagePickerBox: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    borderRadius: Radius.badge,
    paddingVertical: 28,
    alignItems: 'center',
    gap: 8,
  },
  eventImageField: {
    gap: 8,
  },
  imageFieldHeading: {
    gap: 3,
  },
  imagePickerTitle: {
    fontSize: 15,
    fontFamily: InterWeights.medium,
    color: Colors.foreground,
  },
  imagePickerHint: {
    fontSize: 12,
    fontFamily: InterWeights.regular,
    color: Colors.mutedForeground,
  },
  imagePreviewContainer: {
    position: 'relative',
    height: 160,
    borderRadius: Radius.badge,
    overflow: 'hidden',
  },
  squareImagePreviewContainer: {
    width: 160,
    height: 160,
  },
  imagePreview: {
    width: '100%',
    height: 160,
    borderRadius: Radius.badge,
  },
  squareImagePreview: {
    width: 160,
    height: 160,
  },
  removeImageBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  changeImageBtn: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderWidth: 1,
    borderColor: '#fff',
    borderRadius: Radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  changeImageText: {
    fontSize: 12,
    fontFamily: InterWeights.semiBold,
    color: '#fff',
  },
  cropButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  cropButtonText: {
    color: Colors.primary,
    fontSize: 13,
    fontFamily: InterWeights.medium,
  },
  cropOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.68)',
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: 4,
  },
  deleteBtnActive: {
    borderColor: Colors.destructive,
    backgroundColor: 'rgba(239,68,68,0.13)',
  },
  deleteBtnText: {
    fontSize: 14,
    fontFamily: InterWeights.semiBold,
    color: Colors.mutedForeground,
  },
  deleteBtnTextActive: {
    color: Colors.destructive,
  },
});
