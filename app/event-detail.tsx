import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ImageBackground,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { StatusBar } from 'expo-status-bar';
import { Colors, Radius, Gradients, InterWeights } from '../constants/theme';
import { useEvents } from '../context/EventsContext';
import { getDayType, getDayDiff, formatDate } from '../constants/types';
import CalendarPicker from '../components/CalendarPicker';

export default function EventDetailScreen() {
  const insets = useSafeAreaInsets();
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const { events, updateEvent } = useEvents();
  const event = events.find((e) => e.id === eventId);

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
      if (event.imageUri) {
        try { await FileSystem.deleteAsync(event.imageUri, { idempotent: true }); } catch {}
      }
      let finalUri = pickedUri;
      try {
        await FileSystem.copyAsync({ from: pickedUri, to: dest });
        finalUri = dest;
      } catch {}
      await updateEvent(event.id, { imageUri: finalUri });
    }
  }, [event, updateEvent]);

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
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero section - with background */}
        <View style={[styles.heroWrap, { paddingTop: insets.top + 80 }]}>
          {event.imageUri ? (
            <ImageBackground
              source={{ uri: event.imageUri }}
              style={StyleSheet.absoluteFill}
              resizeMode="cover"
            >
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.8)', 'rgba(0,0,0,0.95)']}
                locations={[0, 0.4, 0.7]}
                style={StyleSheet.absoluteFill}
              />
            </ImageBackground>
          ) : (
            <LinearGradient
              colors={bgGradient as unknown as string[]}
              style={StyleSheet.absoluteFill}
            />
          )}
          <View style={styles.heroContent}>
            <Text style={[styles.heroNumber, { color: dayColor }]}>
              {dayType === 'today' ? '🎉' : absDiff}
            </Text>
            {dayLabel ? (
              <Text style={[styles.heroLabel, { color: dayColor }]}>{dayLabel}</Text>
            ) : null}
            <Text style={styles.heroTitle}>{event.title}</Text>
          </View>
        </View>

        {/* Bottom section - dark background */}
        <View style={styles.bottomSection}>
          {/* Progress ring (future/today only) */}
          {dayType !== 'past' && (
            <View style={styles.ringContainer}>
              <Svg width={160} height={160} viewBox="0 0 160 160">
                {/* Background ring */}
                <Circle
                  cx={80}
                  cy={80}
                  r={68}
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth={10}
                  fill="none"
                />
                {/* Progress arc */}
                <Circle
                  cx={80}
                  cy={80}
                  r={68}
                  stroke={dayColor}
                  strokeWidth={10}
                  fill="none"
                  strokeDasharray={2 * Math.PI * 68}
                  strokeDashoffset={2 * Math.PI * 68 * (1 - ringProgress)}
                  strokeLinecap="round"
                  transform={`rotate(-90, 80, 80)`}
                />
              </Svg>
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

          {/* Target date */}
          <View style={styles.editSection}>
            <View style={styles.editRow}>
              <Ionicons name="calendar-outline" size={18} color={Colors.mutedForeground} />
              <Text style={styles.editLabel}>Target Date</Text>
            </View>
            <Pressable onPress={() => setShowTargetPicker(!showTargetPicker)}>
              <Text style={styles.editValue}>{formatDate(event.targetDate)}</Text>
            </Pressable>
            {showTargetPicker && (
              <View style={styles.editPicker}>
                <CalendarPicker
                  selectedDate={new Date(event.targetDate)}
                  onDateChange={handleTargetDateChange}
                />
              </View>
            )}
          </View>

          {/* Created date */}
          <View style={styles.editSection}>
            <View style={styles.editRow}>
              <Ionicons name="time-outline" size={18} color={Colors.mutedForeground} />
              <Text style={styles.editLabel}>Created</Text>
            </View>
            <Pressable onPress={() => setShowCreatedPicker(!showCreatedPicker)}>
              <Text style={styles.editValue}>{formatDate(event.createdAt)}</Text>
            </Pressable>
            {showCreatedPicker && (
              <View style={styles.editPicker}>
                <CalendarPicker
                  selectedDate={createdDate}
                  onDateChange={handleCreatedDateChange}
                />
              </View>
            )}
          </View>
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
  heroWrap: {
    minHeight: 380,
    justifyContent: 'center',
    paddingBottom: 40,
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
    justifyContent: 'center',
    marginBottom: 8,
  },
  ringCenter: {
    position: 'absolute',
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
  editPicker: {
    marginTop: 4,
  },
});
