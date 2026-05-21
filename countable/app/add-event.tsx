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
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { StatusBar } from 'expo-status-bar';
import { Colors, Radius, InterWeights } from '../constants/theme';
import { useEvents } from '../context/EventsContext';
import { CountdownEvent, getDayType, getDayDiff, generateId, formatDate } from '../constants/types';
import CalendarPicker from '../components/CalendarPicker';

export default function AddEventScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ eventId?: string }>();
  const { events, addEvent, updateEvent, deleteEvent } = useEvents();

  const isEdit = !!params.eventId;
  const existingEvent = isEdit
    ? events.find((e) => e.id === params.eventId)
    : null;

  const [title, setTitle] = useState(existingEvent?.title || '');
  const [targetDate, setTargetDate] = useState(
    existingEvent ? new Date(existingEvent.targetDate) : new Date()
  );
  const [imageUri, setImageUri] = useState<string | undefined>(
    existingEvent?.imageUri
  );
  const [isSaving, setIsSaving] = useState(false);
  const [titleError, setTitleError] = useState(false);
  const [deleteState, setDeleteState] = useState<'idle' | 'confirm'>('idle');
  const deleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset delete state after 3 seconds
  useEffect(() => {
    return () => {
      if (deleteTimerRef.current) {
        clearTimeout(deleteTimerRef.current);
      }
    };
  }, []);

  const dayType = getDayType(targetDate.toISOString());
  const diff = getDayDiff(targetDate.toISOString());

  const diffChip =
    diff === 0
      ? { text: 'Today', color: Colors.today }
      : diff > 0
      ? { text: `${diff} days from now`, color: Colors.countdown }
      : { text: `${Math.abs(diff)} days ago`, color: Colors.countup };

  const handlePickImage = useCallback(async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission required', 'Allow access to your photo library to select a background image.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      aspect: [16, 9],
      quality: 0.8,
      allowsEditing: true,
    });

    if (!result.canceled && result.assets[0]) {
      const pickedUri = result.assets[0].uri;

      if (Platform.OS !== 'web') {
        // Copy to persistent storage
        const filename = `event_img_${Date.now()}.jpg`;
        const dest = FileSystem.documentDirectory + filename;

        // Delete old image if replacing
        if (imageUri && imageUri !== existingEvent?.imageUri) {
          try {
            await FileSystem.deleteAsync(imageUri, { idempotent: true });
          } catch {}
        }

        try {
          await FileSystem.copyAsync({ from: pickedUri, to: dest });
          setImageUri(dest);
        } catch {
          // Fall back to original URI
          setImageUri(pickedUri);
        }
      } else {
        setImageUri(pickedUri);
      }
    }
  }, [imageUri, existingEvent]);

  const handleRemoveImage = useCallback(async () => {
    if (imageUri && Platform.OS !== 'web') {
      try {
        await FileSystem.deleteAsync(imageUri, { idempotent: true });
      } catch {}
    }
    setImageUri(undefined);
  }, [imageUri]);

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
        // Handle image deletion if changed
        if (existingEvent.imageUri && existingEvent.imageUri !== imageUri) {
          try {
            await FileSystem.deleteAsync(existingEvent.imageUri, { idempotent: true });
          } catch {}
        }
        await updateEvent(existingEvent.id, {
          title: trimmed,
          targetDate: targetDate.toISOString(),
          imageUri,
        });
      } else {
        const newEvent: CountdownEvent = {
          id: generateId(),
          title: trimmed,
          targetDate: targetDate.toISOString(),
          imageUri,
          isPinned: false,
          createdAt: new Date().toISOString(),
        };
        await addEvent(newEvent);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (e) {
      console.error('Save failed:', e);
    } finally {
      setIsSaving(false);
    }
  }, [title, targetDate, imageUri, isEdit, existingEvent, addEvent, updateEvent]);

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
        if (existingEvent.imageUri) {
          FileSystem.deleteAsync(existingEvent.imageUri, { idempotent: true }).catch(() => {});
        }
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

        {/* Section 3: Background Image */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>BACKGROUND IMAGE</Text>
          {imageUri ? (
            <View style={styles.imagePreviewContainer}>
              <Image
                source={{ uri: imageUri }}
                style={styles.imagePreview}
                resizeMode="cover"
              />
              <Pressable
                style={styles.removeImageBtn}
                onPress={handleRemoveImage}
              >
                <Ionicons name="close-circle" size={26} color="#fff" />
              </Pressable>
              <Pressable style={styles.changeImageBtn} onPress={handlePickImage}>
                <Ionicons name="swap-horizontal" size={16} color="#fff" />
                <Text style={styles.changeImageText}>Change</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable style={styles.imagePickerBox} onPress={handlePickImage}>
              <Ionicons name="image-outline" size={30} color={Colors.mutedForeground} />
              <Text style={styles.imagePickerTitle}>Choose from Gallery</Text>
              <Text style={styles.imagePickerHint}>
                Optional — adds a custom card background
              </Text>
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
  imagePreview: {
    width: '100%',
    height: 160,
    borderRadius: Radius.badge,
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
