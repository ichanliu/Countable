import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { Colors, Radius, InterWeights } from '../constants/theme';
import { useEvents } from '../context/EventsContext';
import { CountdownEvent } from '../constants/types';
import EventCard from '../components/EventCard';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { events, loading, togglePin, reorderEvents } = useEvents();
  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => Number(b.isPinned) - Number(a.isPinned));
  }, [events]);
  const [isArrangeMode, setIsArrangeMode] = useState(false);
  const safeTop = Platform.OS === 'web' ? 67 : insets.top;
  const safeBottom = Platform.OS === 'web' ? 34 : insets.bottom;

  const handleToggleArrangeMode = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsArrangeMode(!isArrangeMode);
  };

  const handleAddEvent = () => {
    router.push('/add-event');
  };

  const handleEditEvent = useCallback((eventId: string) => {
    router.push(`/add-event?eventId=${eventId}`);
  }, []);

  const handlePinEvent = useCallback(
    (eventId: string) => {
      togglePin(eventId);
    },
    [togglePin]
  );

  const handleMoveUp = useCallback(
    (index: number) => {
      if (index <= 0) return;
      const sorted = [...sortedEvents];
      const temp = sorted[index];
      sorted[index] = sorted[index - 1];
      sorted[index - 1] = temp;
      reorderEvents(sorted);
    },
    [sortedEvents, reorderEvents]
  );

  const handleMoveDown = useCallback(
    (index: number) => {
      if (index >= sortedEvents.length - 1) return;
      const sorted = [...sortedEvents];
      const temp = sorted[index];
      sorted[index] = sorted[index + 1];
      sorted[index + 1] = temp;
      reorderEvents(sorted);
    },
    [sortedEvents, reorderEvents]
  );

  const renderItem = useCallback(
    ({ item, index }: { item: CountdownEvent; index: number }) => (
      <EventCard
        event={item}
        isArrangeMode={isArrangeMode}
        isFirst={index === 0}
        isLast={index === events.length - 1}
        onEdit={() => handleEditEvent(item.id)}
        onPin={() => handlePinEvent(item.id)}
        onMoveUp={() => handleMoveUp(index)}
        onMoveDown={() => handleMoveDown(index)}
      />
    ),
    [isArrangeMode, events.length, handleEditEvent, handlePinEvent, handleMoveUp, handleMoveDown]
  );

  const keyExtractor = useCallback((item: CountdownEvent) => item.id, []);

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: safeTop }]}>
        <StatusBar style="light" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: safeTop }]}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Countable</Text>
          <Text style={styles.headerSubtitle}>
            {events.length} event{events.length !== 1 ? 's' : ''}
          </Text>
        </View>
        <View style={styles.headerRight}>
          {events.length >= 2 && (
            <Pressable
              style={[
                styles.arrangeBtn,
                isArrangeMode && styles.arrangeBtnActive,
              ]}
              onPress={handleToggleArrangeMode}
            >
              {isArrangeMode ? (
                <>
                  <Ionicons name="checkmark" size={14} color="#fff" />
                  <Text style={[styles.arrangeBtnText, styles.arrangeBtnTextActive]}>Done</Text>
                </>
              ) : (
                <>
                  <Ionicons name="reorder-two-outline" size={14} color={Colors.foreground} />
                  <Text style={styles.arrangeBtnText}>Arrange</Text>
                </>
              )}
            </Pressable>
          )}
        </View>
      </View>

      {/* Event list */}
      {events.length === 0 ? (
        <View style={[styles.emptyState, { paddingBottom: safeBottom + 80 }]}>
          <View style={styles.emptyCircle}>
            <Ionicons name="timer-outline" size={40} color={Colors.mutedForeground} />
          </View>
          <Text style={styles.emptyTitle}>No events yet</Text>
          <Text style={styles.emptySubtitle}>
            Tap + to add a countdown{'\n'}or count-up event
          </Text>
        </View>
      ) : (
        <FlatList
          data={sortedEvents}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={{
            paddingBottom: isArrangeMode ? safeBottom + 30 : safeBottom + 90,
          }}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* FAB */}
      {!isArrangeMode && (
        <Pressable
          style={[
            styles.fab,
            { bottom: safeBottom + 24, right: 22 },
          ]}
          onPress={handleAddEvent}
        >
          <Ionicons name="add" size={30} color="#fff" />
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
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    paddingBottom: 18,
  },
  headerLeft: {
    gap: 2,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: InterWeights.bold,
    color: Colors.foreground,
  },
  headerSubtitle: {
    fontSize: 13,
    fontFamily: InterWeights.regular,
    color: Colors.mutedForeground,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  arrangeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  arrangeBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  arrangeBtnText: {
    fontSize: 13,
    fontFamily: InterWeights.semiBold,
    color: Colors.foreground,
  },
  arrangeBtnTextActive: {
    color: '#fff',
  },
  fab: {
    position: 'absolute',
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1.5,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: InterWeights.semiBold,
    color: Colors.foreground,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: InterWeights.regular,
    color: Colors.mutedForeground,
    textAlign: 'center',
    lineHeight: 21,
  },
});
