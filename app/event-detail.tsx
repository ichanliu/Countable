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
import { getDayType, getDayDiff } from '../constants/types';
import CalendarPicker from '../components/CalendarPicker';

export default function EventDetailScreen() {
  const insets = useSafeAreaInsets();
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const { events, updateEvent } = useEvents();
  const event = events.find((e) => e.id === eventId);
  const { height: screenHeight } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const pageHeight = screenHeight;

  

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
          <View style={{ flex: 1, paddingTop: (pageHeight - 120) * 50 / 100, alignItems: 'center' }}>
            <View style={styles.heroContent}>
              <Text style={[styles.heroNumber, { fontSize: 96, color: dayColor }]}>
                {dayType === 'today' ? '🎉' : absDiff}
              </Text>
              {dayLabel ? (
                <Text style={[styles.heroLabel, { color: dayColor }]}>{dayLabel}</Text>
              ) : null}
              <Text style={[styles.heroTitle, { color: dayColor }]}>{event.title}</Text>
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
