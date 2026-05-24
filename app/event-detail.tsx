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
  Animated,
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
  const [editTextColor, setEditTextColor] = useState(savedSettings.textColor);

  const [showCreatedPicker, setShowCreatedPicker] = useState(false);
  const [showTargetPicker, setShowTargetPicker] = useState(false);

  // Animated drag + resize for editor
  const dragAnim = useRef(new Animated.ValueXY()).current;
  const dragBase = useRef({ x: 0, y: 0 });
  const sizeBase = useRef(64);
  const [fontSize, setFontSize] = useState(savedSettings.fontSize);

  const boxPan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => {
      dragAnim.setOffset({ x: dragBase.current.x, y: dragBase.current.y });
      dragAnim.setValue({ x: 0, y: 0 });
    },
    onPanResponderMove: (_, g) => {
      dragAnim.setValue({ x: g.dx, y: g.dy });
    },
    onPanResponderRelease: (_, g) => {
      dragBase.current = { x: dragBase.current.x + g.dx, y: dragBase.current.y + g.dy };
      dragAnim.setOffset({ x: dragBase.current.x, y: dragBase.current.y });
      dragAnim.setValue({ x: 0, y: 0 });
    },
  })).current;

  const handlePan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => { sizeBase.current = fontSize; },
    onPanResponderMove: (_, g) => {
      setFontSize(Math.max(28, Math.min(140, sizeBase.current + (g.dx - g.dy) / 4)));
    },
  })).current;

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
    setFontSize(savedSettings.fontSize);
    setEditTextColor(savedSettings.textColor);
    dragBase.current = { x: 0, y: 0 };
    dragAnim.setOffset({ x: 0, y: 0 });
    dragAnim.setValue({ x: 0, y: 0 });
    setShowHeroEditor(true);
  }, [savedSettings]);

  const saveHeroStyle = useCallback(() => {
    if (!event) return;
    const pct = Math.max(0, Math.min(100, 50 + (dragBase.current.y / pageHeight) * 100));
    const settings: HeroSettings = { fontSize, posX: 50, posY: Math.round(pct), textColor: editTextColor };
    updateEvent(event.id, { heroSettings: settings });
    setShowHeroEditor(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [event, fontSize, editTextColor, updateEvent, pageHeight]);

  const cancelHeroEditor = useCallback(() => setShowHeroEditor(false), []);

  const resetHeroStyle = useCallback(() => {
    dragBase.current = { x: 0, y: 0 };
    dragAnim.setOffset({ x: 0, y: 0 });
    dragAnim.setValue({ x: 0, y: 0 });
    setFontSize(DEFAULT_HERO.fontSize);
    setEditTextColor(DEFAULT_HERO.textColor);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
          <View style={{ flex: 1, paddingTop: (pageHeight - 120) * savedSettings.posY / 100, alignItems: 'center' }}>
            <View style={styles.heroContent}>
              <Text style={[styles.heroNumber, { fontSize: savedSettings.fontSize, color: savedSettings.textColor }]}>
                {dayType === 'today' ? '🎉' : absDiff}
              </Text>
              {dayLabel ? (
                <Text style={[styles.heroLabel, { color: savedSettings.textColor }]}>{dayLabel}</Text>
              ) : null}
              <Text style={[styles.heroTitle, { color: savedSettings.textColor }]}>{event.title}</Text>
            </View>
          </View>
        </View>

        {/* Page 2: Bottom section */}
        <View style={[styles.bottomSection, { minHeight: pageHeight, paddingTop: 20 }]}>
          {/* Spacer */}
          <View style={{ height: 20 }} />
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

      {/* Hero editor - drag + corner resize */}
      <Modal visible={showHeroEditor} animationType="fade" statusBarTranslucent>
        <View style={{ flex: 1, backgroundColor: '#000' }}>
          {event?.bgImageUri ? (
            <ImageBackground source={{ uri: event.bgImageUri }} style={StyleSheet.absoluteFill} resizeMode="cover">
              <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.3)' }]} />
            </ImageBackground>
          ) : (
            <LinearGradient colors={(bgGradient || ['#0F2027', '#203A43', '#2C5364']) as unknown as string[]} style={StyleSheet.absoluteFill} />
          )}

          {/* Top: Reset | Cancel | Save */}
          <View style={{ position: 'absolute', top: (insets.top || 40) + 8, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, zIndex: 20 }}>
            <Pressable onPress={resetHeroStyle} style={{ paddingHorizontal: 14, paddingVertical: 6, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.15)' }}>
              <Text style={{ color: '#fff', fontSize: 13, fontFamily: InterWeights.medium }}>Reset</Text>
            </Pressable>
            <View style={{ flex: 1 }} />
            <Pressable onPress={cancelHeroEditor} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="close" size={20} color="#fff" />
            </Pressable>
            <Pressable onPress={saveHeroStyle} style={{ marginLeft: 8, paddingHorizontal: 18, paddingVertical: 7, borderRadius: 18, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#fff', fontSize: 13, fontFamily: InterWeights.semiBold }}>Save</Text>
            </Pressable>
          </View>

          {/* Draggable text box */}
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Animated.View
              {...boxPan.panHandlers}
              style={[{
                borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)',
                borderStyle: 'dashed', borderRadius: 8,
                paddingVertical: 14, paddingHorizontal: 22,
              }, { transform: [{ translateX: dragAnim.x }, { translateY: dragAnim.y }] }]}
            >
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize, fontFamily: InterWeights.bold, color: editTextColor, textShadowColor: 'rgba(0,0,0,0.4)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 8, textAlign: 'center' }}>
                  {absDiff}
                </Text>
                <Text style={{ fontSize: 16, fontFamily: InterWeights.semiBold, color: editTextColor, letterSpacing: 2, marginTop: 4 }}>{dayLabel}</Text>
                <Text style={{ fontSize: 14, fontFamily: InterWeights.medium, color: editTextColor, opacity: 0.7, marginTop: 4 }}>{event?.title}</Text>
              </View>

              {/* Resize handle at bottom-right */}
              <View
                {...handlePan.panHandlers}
                style={{ position: 'absolute', bottom: -15, right: -15, width: 30, height: 30, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 6, borderWidth: 2, borderColor: 'rgba(255,255,255,0.7)', alignItems: 'center', justifyContent: 'center' }}
              >
                <View style={{ width: 12, height: 12, borderRightWidth: 2.5, borderBottomWidth: 2.5, borderColor: 'rgba(255,255,255,0.85)' }} />
              </View>
            </Animated.View>
          </View>

          {/* Bottom color picker */}
          <View style={{ position: 'absolute', bottom: (insets.bottom || 30), left: 0, right: 0, alignItems: 'center', zIndex: 20 }}>
            <View style={{ flexDirection: 'row', gap: 10, backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 24, paddingHorizontal: 14, paddingVertical: 8 }}>
              {['#FFFFFF', '#5B9EFF', '#2ECC71', '#FF6B35', '#FFD700', '#E74C3C', '#9B59B6'].map((c) => (
                <Pressable key={c} onPress={() => setEditTextColor(c)} style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: c, borderWidth: editTextColor === c ? 2 : 0, borderColor: '#fff' }} />
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
    paddingHorizontal: 24,
    paddingBottom: 60,
    gap: 12,
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
