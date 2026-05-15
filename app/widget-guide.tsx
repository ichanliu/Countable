import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ImageBackground,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Colors, Radius, InterWeights, Gradients } from '../constants/theme';
import { useEvents } from '../context/EventsContext';
import { getDayType, getDayDiff } from '../constants/types';

const STEPS = [
  {
    icon: 'bookmark-outline' as const,
    title: 'Pin your event',
    desc: 'Long-press a card and tap the bookmark icon to pin an event to the widget.',
  },
  {
    icon: 'add-circle-outline' as const,
    title: 'Add widget to home screen',
    desc: 'Long-press your home screen, tap "Widgets", find Countdowns, then drag it to your home screen.',
  },
  {
    icon: 'sync-outline' as const,
    title: 'Auto-sync',
    desc: 'Widget data updates automatically whenever you pin, edit, or unpin events in the app.',
  },
  {
    icon: 'trash-outline' as const,
    title: 'Unpin to clear',
    desc: 'Tap the bookmark icon again on the pinned event to unpin it. The widget will automatically clear.',
  },
];

export default function WidgetGuideScreen() {
  const insets = useSafeAreaInsets();
  const { pinnedEvent } = useEvents();

  const handleGoBack = () => {
    router.back();
  };

  const renderWidgetPreview = () => {
    if (!pinnedEvent) {
      return (
        <View style={styles.widgetEmpty}>
          <LinearGradient
            colors={['#182030', '#0F1520']}
            style={[StyleSheet.absoluteFill, { borderRadius: 22 }]}
          />
          <Ionicons name="bookmark-outline" size={32} color={Colors.mutedForeground} />
          <Text style={styles.widgetEmptyText}>
            Pin an event to{'\n'}preview widget
          </Text>
        </View>
      );
    }

    const dayType = getDayType(pinnedEvent.targetDate);
    const diff = getDayDiff(pinnedEvent.targetDate);
    const dayColor =
      dayType === 'today'
        ? Colors.today
        : dayType === 'future'
        ? Colors.countdown
        : Colors.countup;
    const dayText =
      dayType === 'today'
        ? 'TODAY'
        : diff > 0
        ? `${diff} DAYS LEFT`
        : `${Math.abs(diff)} DAYS PASSED`;

    const bgGradient =
      dayType === 'today'
        ? Gradients.today
        : dayType === 'future'
        ? Gradients.future
        : Gradients.past;

    const content = (
      <View style={styles.widgetContent}>
        <View style={styles.widgetPinnedBadge}>
          <Ionicons name="bookmark" size={10} color={Colors.pinnedGold} />
          <Text style={styles.widgetPinnedText}>PINNED</Text>
        </View>
        <View style={styles.widgetBottom}>
          <Text style={[styles.widgetDayNumber, { color: '#fff' }]}>
            {dayType === 'today' ? '🎉' : Math.abs(diff)}
          </Text>
          <Text style={[styles.widgetDayLabel, { color: dayColor }]}>
            {dayText}
          </Text>
          <Text style={styles.widgetTitle} numberOfLines={1}>
            {pinnedEvent.title}
          </Text>
        </View>
      </View>
    );

    if (pinnedEvent.imageUri) {
      return (
        <View style={styles.widgetPreview}>
          <ImageBackground
            source={{ uri: pinnedEvent.imageUri }}
            style={StyleSheet.absoluteFill}
            imageStyle={{ borderRadius: 22 }}
            resizeMode="cover"
          >
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.75)']}
              style={[StyleSheet.absoluteFill, { borderRadius: 22 }]}
            />
            {content}
          </ImageBackground>
        </View>
      );
    }

    return (
      <View style={styles.widgetPreview}>
        <LinearGradient
          colors={bgGradient as unknown as string[]}
          style={[StyleSheet.absoluteFill, { borderRadius: 22 }]}
        />
        {content}
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={handleGoBack} hitSlop={8} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.foreground} />
        </Pressable>
        <Text style={styles.headerTitle}>Home Screen Widget</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Widget Preview */}
        <View style={styles.widgetSection}>
          {renderWidgetPreview()}
        </View>

        {!pinnedEvent && (
          <Text style={styles.hintText}>
            Long-press a card and tap{' '}
            <Ionicons name="bookmark" size={12} color={Colors.pinnedGold} /> to pin an
            event
          </Text>
        )}

        {/* Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoIcon}>
            <Ionicons name="information-circle" size={20} color={Colors.primary} />
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Widget is now available!</Text>
            <Text style={styles.infoDesc}>
              Android home screen widgets are now fully supported. Just install this
              build, then add the Countdowns widget to your home screen.
            </Text>
          </View>
        </View>

        {/* Setup Steps */}
        <Text style={styles.stepsTitle}>How to Use</Text>
        {STEPS.map((step, i) => (
          <View key={i} style={styles.stepCard}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>{i + 1}</Text>
            </View>
            <View style={styles.stepContent}>
              <View style={styles.stepIconRow}>
                <Ionicons
                  name={step.icon}
                  size={16}
                  color={Colors.primary}
                />
                <Text style={styles.stepTitle}>{step.title}</Text>
              </View>
              <Text style={styles.stepDesc}>{step.desc}</Text>
            </View>
          </View>
        ))}
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
  widgetSection: {
    alignItems: 'center',
    marginVertical: 20,
  },
  widgetPreview: {
    width: 160,
    height: 160,
    borderRadius: 22,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  widgetEmpty: {
    width: 160,
    height: 160,
    borderRadius: 22,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  widgetEmptyText: {
    fontSize: 12,
    fontFamily: InterWeights.regular,
    color: Colors.mutedForeground,
    textAlign: 'center',
    lineHeight: 17,
  },
  widgetContent: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 14,
  },
  widgetPinnedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    alignSelf: 'flex-start',
    backgroundColor: Colors.pinnedBg,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  widgetPinnedText: {
    fontSize: 8,
    fontFamily: InterWeights.semiBold,
    color: Colors.pinnedGold,
    letterSpacing: 0.3,
  },
  widgetBottom: {
    gap: 0,
  },
  widgetDayNumber: {
    fontSize: 48,
    fontFamily: InterWeights.bold,
    lineHeight: 52,
  },
  widgetDayLabel: {
    fontSize: 10,
    fontFamily: InterWeights.semiBold,
    letterSpacing: 1.2,
  },
  widgetTitle: {
    fontSize: 13,
    fontFamily: InterWeights.semiBold,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  hintText: {
    fontSize: 13,
    fontFamily: InterWeights.regular,
    color: Colors.mutedForeground,
    textAlign: 'center',
    marginBottom: 16,
    marginTop: -8,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: Radius.section,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    gap: 10,
    marginBottom: 20,
  },
  infoIcon: {
    paddingTop: 2,
  },
  infoContent: {
    flex: 1,
    gap: 4,
  },
  infoTitle: {
    fontSize: 14,
    fontFamily: InterWeights.semiBold,
    color: Colors.foreground,
  },
  infoDesc: {
    fontSize: 13,
    fontFamily: InterWeights.regular,
    color: Colors.mutedForeground,
    lineHeight: 18,
  },
  stepsTitle: {
    fontSize: 16,
    fontFamily: InterWeights.semiBold,
    color: Colors.foreground,
    marginBottom: 12,
  },
  stepCard: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: Radius.section,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    gap: 12,
    marginBottom: 10,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberText: {
    fontSize: 13,
    fontFamily: InterWeights.semiBold,
    color: Colors.foreground,
  },
  stepContent: {
    flex: 1,
    gap: 4,
  },
  stepIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepTitle: {
    fontSize: 14,
    fontFamily: InterWeights.semiBold,
    color: Colors.foreground,
  },
  stepDesc: {
    fontSize: 13,
    fontFamily: InterWeights.regular,
    color: Colors.mutedForeground,
    lineHeight: 18,
  },
});
