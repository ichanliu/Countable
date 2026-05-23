import React, { useState, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ImageBackground,
  Alert,
  Modal,
  PanResponder,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { StatusBar } from 'expo-status-bar';
import { Colors, Radius, Gradients, InterWeights } from '../constants/theme';
import { useEvents } from '../context/EventsContext';
import { getDayType, getDayDiff, formatDate, DEFAULT_HERO } from '../constants/types';
import type { HeroSettings } from '../constants/types';
import CalendarPicker from '../components/CalendarPicker';

export default function EventDetailScreen() {
  const insets = useSafeAreaInsets();
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const { events, updateEvent } = useEvents();
  const event = events.find((e) => e.id === eventId);
  const { height: screenHeight } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const pageHeight = screenHeight;

  // Hero customization state
  const savedSettings = event?.heroSettings || DEFAULT_HERO;
  const [showHeroEditor, setShowHeroEditor] = useState(false);
  const [editFontSize, setEditFontSize] = useState(savedSettings.fontSize);
  const [editVPos, setEditVPos] = useState(savedSettings.verticalPosition);
  const [editHPos, setEditHPos] = useState(savedSettings.horizontalPosition);
  const [editTextColor, setEditTextColor] = useState(savedSettings.textColor);

  // Drag state for editor
  const dragStart = useRef({ v: 0, h: 0 });

  const dragPan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderGrant: () => { dragStart.current = { v: editVPos, h: editHPos }; },
    onPanResponderMove: (_, g) => {
      setEditVPos(Math.max(0, Math.min(100, dragStart.current.v + (g.dy / pageHeight) * 100)));
      setEditHPos(Math.max(0, Math.min(100, dragStart.current.h + (g.dx / pageHeight) * 100)));
    },
    onPanResponderRelease: () => {},
  })).current;

  const resizePan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderMove: (_, g) => {
      const delta = (-g.dy + g.dx) / 4;
      setEditFontSize(Math.max(24, Math.min(200, savedSettings.fontSize + delta)));
    },
  })).current;

  const [showCreatedPicker, setShowCreatedPicker] = useState(false);
  const [showTargetPicker, setShowTargetPicker] = useState(false);

  const dayType = event ? getDayType(event.targetDate) : 'future';
  const diff = event ? getDayDiff(event.targetDate) : 0;
  const absDiff = Math.abs(diff);

  const dayColor =
    dayType === 'today' ? Colors.today
      : dayType === 'future' ? Colors.countdown
        : Colors.countup;

  const dayLabel =
    dayType === 'today' ? ''
      : diff > 0 ? 'DAYS LEFT' : 'DAYS PASSED';

  const bgGradient =
    dayType === 'today' ? Gradients.today
      : dayType === 'future' ? Gradients.future
        : Gradients.past;

  // Progress ring calculation (only for future/today events)
  const ringProgress = useMemo(() => {
    if (!event || dayType === 'past') return 0;
    const created = new Date(event.createdAt);
    const target = new Date(event.targetDate);
    const today = new Date();
    created.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    const total = Math.round((target.getTime() - created.getTime()) / 86_400_000);
    if (total <= 0) return 1; // already past or same day

    const elapsed = Math.round((today.getTime() - created.getTime()) / 86_400_000);
    return Math.min(Math.max(elapsed / total, 0), 1);
  }, [event, dayType]);

  const handleBack = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  }, []);

  const handleCreatedDateChange = useCallback(async (date: Date) => {
    if (!event) return;
    await updateEvent(event.id, { createdAt: date.toISOString() });
    setShowCreatedPicker(false);
  }, [event, updateEvent]);

  const handleTargetDateChange = useCallback(async (date: Date) => {
    if (!event) return;
    await updateEvent(event.id, { targetDate: date.toISOString() });
    setShowTargetPicker(false);
  }, [event, updateEvent]);

  const handlePickImage = useCallback(async () => {
    if (!event) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission required', 'Allow access to your photo library.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      aspect: [9, 16],
      quality: 0.8,
      allowsEditing: true,
    });
    if (!result.canceled && result.assets[0]) {
      const pickedUri = result.assets[0].uri;
      // Copy to persistent storage
      const filename = `event_img_${Date.now()}.jpg`;
      const dest = FileSystem.documentDirectory + filename;
      if (event.bgImageUri) {
        try { await FileSystem.deleteAsync(event.bgImageUri, { idempotent: true }); } catch {}
      }
      let finalUri = pickedUri;
      try {
        await FileSystem.copyAsync({ from: pickedUri, to: dest });
        finalUri = dest;
      } catch {}
      await updateEvent(event.id, { bgImageUri: finalUri });
    }
  }, [event, updateEvent]);

  const handlePickWidgetImage = useCallback(async () => {
    if (!event) return;
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
      const pickedUri = result.assets[0].uri;
      const filename = `widget_img_${Date.now()}.jpg`;
      const dest = FileSystem.documentDirectory + filename;
      if (event.widgetImageUri) {
        try { await FileSystem.deleteAsync(event.widgetImageUri, { idempotent: true }); } catch {}
      }
      let finalUri = pickedUri;
      try {
        await FileSystem.copyAsync({ from: pickedUri, to: dest });
        finalUri = dest;
      } catch {}
      await updateEvent(event.id, { widgetImageUri: finalUri });
    }
  }, [event, updateEvent]);

  // Hero style handlers
  const openHeroEditor = useCallback(() => {
    setEditFontSize(savedSettings.fontSize);
    setEditVPos(savedSettings.verticalPosition);
    setEditHPos(savedSettings.horizontalPosition);
    setEditTextColor(savedSettings.textColor);
    setShowHeroEditor(true);
  }, [savedSettings]);

  const saveHeroStyle = useCallback(() => {
    if (!event) return;
    const settings: HeroSettings = { fontSize: Math.round(editFontSize), verticalPosition: editVPos, horizontalPosition: editHPos, textColor: editTextColor };
    updateEvent(event.id, { heroSettings: settings });
    setShowHeroEditor(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [event, editFontSize, editVPos, editHPos, editTextColor, updateEvent]);

  const cancelHeroEditor = useCallback(() => {
    setShowHeroEditor(false);
  }, []);

  if (!event) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar style="light" />
        <Pressable onPress={handleBack} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={28} color={Colors.foreground} />
        </Pressable>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Event not found</Text>
        </View>
      </View>
    );
  }

  const createdDate = new Date(event.createdAt);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Back button */}
      <Pressable onPress={handleBack} style={[styles.backBtn, { top: insets.top + 8 }]}>
        <Ionicons name="chevron-back" size={28} color="#fff" />
      </Pressable>

      <ScrollView
        ref={scrollRef}
        style={styles.scrollView}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToAlignment="start"
        decelerationRate="fast"
      >
        {/* Page 1: Hero section */}
        <View style={{ height: pageHeight }}>
          {event.bgImageUri ? (
            <ImageBackground
              source={{ uri: event.bgImageUri }}
              style={StyleSheet.absoluteFill}
              resizeMode="cover"
            >
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.5)']}
                locations={[0, 0.5, 0.85]}
                style={StyleSheet.absoluteFill}
              />
            </ImageBackground>
          ) : (
            <LinearGradient
              colors={bgGradient as unknown as string[]}
              style={StyleSheet.absoluteFill}
            />
          )}
          <View style={{ flex: 1, flexDirection: 'column' }}>
            <View style={{ flex: savedSettings.verticalPosition }} />
            <View style={{ flexDirection: 'row' }}>
              <View style={{ flex: savedSettings.horizontalPosition }} />
              <View style={styles.heroContent}>
                <Text style={[styles.heroNumber, { fontSize: savedSettings.fontSize, color: savedSettings.textColor }]}>
                  {dayType === 'today' ? '🎉' : absDiff}
                </Text>
                {dayLabel ? (
                  <Text style={[styles.heroLabel, { color: savedSettings.textColor }]}>{dayLabel}</Text>
                ) : null}
                <Text style={[styles.heroTitle, { color: savedSettings.textColor }]}>{event.title}</Text>
              </View>
              <View style={{ flex: 100 - savedSettings.horizontalPosition }} />
            </View>
            <View style={{ flex: 100 - savedSettings.verticalPosition }} />
          </View>
        </View>

        {/* Page 2: Bottom section */}
        <View style={[styles.bottomSection, { minHeight: pageHeight, paddingTop: 60 }]}>
          {/* Spacer */}
          <View style={{ height: 80 }} />
          {dayType !== 'past' && (
            <View style={styles.ringContainer}>
              <View style={styles.progressBarWrap}>
                <View style={[styles.progressBarFill, { width: `${Math.round(ringProgress * 100)}%`, backgroundColor: dayColor }]} />
              </View>
              <View style={styles.ringCenter}>
                <Text style={[styles.ringPercent, { color: dayColor }]}>
                  {Math.round(ringProgress * 100)}%
                </Text>
                <Text style={styles.ringLabel}>elapsed</Text>
              </View>
            </View>
          )}

          {/* Image edit */}
          <View style={styles.editSection}>
            <View style={styles.editRow}>
              <Ionicons name="image-outline" size={18} color={Colors.mutedForeground} />
              <Text style={styles.editLabel}>Background Image</Text>
            </View>
            <Pressable style={styles.editActionBtn} onPress={handlePickImage}>
              <Ionicons name={event.imageUri ? "swap-horizontal" : "add"} size={16} color={Colors.primary} />
              <Text style={styles.editActionText}>{event.imageUri ? 'Change' : 'Add Image'}</Text>
            </Pressable>
          </View>

          {/* Widget image edit */}
          <View style={styles.editSection}>
            <View style={styles.editRow}>
              <Ionicons name="phone-portrait-outline" size={18} color={Colors.mutedForeground} />
              <Text style={styles.editLabel}>Widget Background</Text>
            </View>
            <Pressable style={styles.editActionBtn} onPress={handlePickWidgetImage}>
              <Ionicons name={event.widgetImageUri ? "swap-horizontal" : "add"} size={16} color={Colors.primary} />
              <Text style={styles.editActionText}>{event.widgetImageUri ? 'Change' : 'Add Image'}</Text>
            </Pressable>
          </View>

          {/* Hero Style */}
          <View style={styles.editSection}>
            <View style={styles.editRow}>
              <Ionicons name="text-outline" size={18} color={Colors.mutedForeground} />
              <Text style={styles.editLabel}>Hero Style</Text>
            </View>
            <Pressable style={styles.editActionBtn} onPress={openHeroEditor}>
              <Ionicons name="expand-outline" size={16} color={Colors.primary} />
              <Text style={styles.editActionText}>Customize</Text>
            </Pressable>
          </View>

          {/* Target date */}
          <View style={styles.editSection}>
            <View style={styles.editRow}>
              <Ionicons name="calendar-outline" size={18} color={Colors.mutedForeground} />
              <Text style={styles.editLabel}>Target Date</Text>
            </View>
            <Pressable onPress={() => setShowTargetPicker(true)}>
              <Text style={styles.editValue}>{formatDate(event.targetDate)}</Text>
            </Pressable>
          </View>

          {/* Created date */}
          <View style={styles.editSection}>
            <View style={styles.editRow}>
              <Ionicons name="time-outline" size={18} color={Colors.mutedForeground} />
              <Text style={styles.editLabel}>Created</Text>
            </View>
            <Pressable onPress={() => setShowCreatedPicker(true)}>
              <Text style={styles.editValue}>{formatDate(event.createdAt)}</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      {/* Calendar modal - avoids paging scroll conflict */}
      <Modal visible={showTargetPicker} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowTargetPicker(false)} />
          <Pressable style={styles.modalContent}>
            <CalendarPicker
              selectedDate={new Date(event.targetDate)}
              onDateChange={handleTargetDateChange}
            />
          </Pressable>
        </View>
      </Modal>

      <Modal visible={showCreatedPicker} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowCreatedPicker(false)} />
          <Pressable style={styles.modalContent}>
            <CalendarPicker
              selectedDate={createdDate}
              onDateChange={handleCreatedDateChange}
            />
          </Pressable>
        </View>
      </Modal>

      {/* Full-screen hero editor */}
      <Modal visible={showHeroEditor} animationType="fade" statusBarTranslucent>
        <View style={{ flex: 1, backgroundColor: '#000' }}>
          {/* Background */}
          {event?.bgImageUri ? (
            <ImageBackground source={{ uri: event.bgImageUri }} style={StyleSheet.absoluteFill} resizeMode="cover">
              <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.3)' }]} />
            </ImageBackground>
          ) : (
            <LinearGradient colors={(bgGradient || ['#0F2027', '#203A43', '#2C5364']) as unknown as string[]} style={StyleSheet.absoluteFill} />
          )}

          {/* Top bar */}
          <View style={{ position: 'absolute', top: (insets.top || 40) + 8, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, zIndex: 20 }}>
            <Pressable onPress={cancelHeroEditor} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="close" size={22} color="#fff" />
            </Pressable>
            <Pressable onPress={saveHeroStyle} style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#fff', fontSize: 14, fontFamily: InterWeights.semiBold }}>Save</Text>
            </Pressable>
          </View>

          {/* Draggable text with bounding box */}
          <View style={{ flex: 1, justifyContent: 'center' }}>
            <View style={{ flexDirection: 'column' }}>
              <View style={{ flex: editVPos }} />

              <View style={{ flexDirection: 'row' }}>
                <View style={{ flex: editHPos }} />

                {/* Bounding box - drag to move, corner handle to resize */}
                <View {...dragPan.panHandlers} style={{ borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)', borderRadius: 4, paddingVertical: 8, paddingHorizontal: 12, position: 'relative' }}>
                  <View style={{ alignItems: 'center' }}>
                    <Text style={{ fontSize: Math.round(editFontSize), fontFamily: InterWeights.bold, color: editTextColor, textShadowColor: 'rgba(0,0,0,0.4)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 8 }}>
                      {absDiff}
                    </Text>
                    <Text style={{ fontSize: 16, fontFamily: InterWeights.semiBold, color: editTextColor, letterSpacing: 2, marginTop: 4 }}>{dayLabel}</Text>
                    <Text style={{ fontSize: 14, fontFamily: InterWeights.medium, color: editTextColor, opacity: 0.7, marginTop: 4 }}>{event?.title}</Text>
                  </View>

                  {/* Resize handle at box corner */}
                  <View
                    {...resizePan.panHandlers}
                    style={{ position: 'absolute', bottom: -10, right: -10, width: 20, height: 20, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 2, borderWidth: 1, borderColor: 'rgba(255,255,255,0.6)', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <View style={{ width: 10, height: 10, borderRightWidth: 2, borderBottomWidth: 2, borderColor: 'rgba(255,255,255,0.7)' }} />
                  </View>
                </View>

                <View style={{ flex: 100 - editHPos }} />
              </View>

              <View style={{ flex: 100 - editVPos }} />
            </View>
          </View>

          {/* Bottom bar - color picker */}
          <View style={{ position: 'absolute', bottom: (insets.bottom || 20) + 8, left: 0, right: 0, alignItems: 'center', zIndex: 20 }}>
            <View style={{ flexDirection: 'row', gap: 12, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 24, paddingHorizontal: 16, paddingVertical: 10 }}>
              {['#FFFFFF', '#5B9EFF', '#2ECC71', '#FF6B35', '#FFD700', '#E74C3C', '#9B59B6'].map((c) => (
                <Pressable
                  key={c}
                  onPress={() => setEditTextColor(c)}
                  style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: c, borderWidth: editTextColor === c ? 2 : 0, borderColor: '#fff' }}
                />
              ))}
            </View>
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
  backBtn: {
    position: 'absolute',
    left: 12,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontFamily: InterWeights.regular,
    color: Colors.mutedForeground,
  },
  scrollView: {
    flex: 1,
  },
  heroContent: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  heroNumber: {
    fontSize: 96,
    fontFamily: InterWeights.bold,
    lineHeight: 104,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  heroLabel: {
    fontSize: 16,
    fontFamily: InterWeights.semiBold,
    letterSpacing: 2,
    marginTop: 4,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  heroTitle: {
    fontSize: 18,
    fontFamily: InterWeights.regular,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 12,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  bottomSection: {
    marginTop: 40,
    paddingHorizontal: 24,
    paddingBottom: 60,
    gap: 24,
  },
  ringContainer: {
    alignItems: 'center',
    marginBottom: 8,
    gap: 12,
  },
  progressBarWrap: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 6,
    borderRadius: 3,
  },
  ringCenter: {
    alignItems: 'center',
  },
  ringPercent: {
    fontSize: 28,
    fontFamily: InterWeights.bold,
  },
  ringLabel: {
    fontSize: 11,
    fontFamily: InterWeights.semiBold,
    color: Colors.mutedForeground,
    letterSpacing: 0.8,
    marginTop: 2,
  },
  editSection: {
    backgroundColor: Colors.card,
    borderRadius: Radius.section,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    gap: 10,
  },
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editLabel: {
    fontSize: 13,
    fontFamily: InterWeights.semiBold,
    color: Colors.mutedForeground,
  },
  editValue: {
    fontSize: 16,
    fontFamily: InterWeights.medium,
    color: Colors.foreground,
  },
  editActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  editActionText: {
    fontSize: 14,
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
    backgroundColor: Colors.card,
    borderRadius: Radius.section,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
  },
  editPicker: {
    marginTop: 4,
  },
});
