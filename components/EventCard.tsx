import React from 'react';
import {
  View,
  Text,
  ImageBackground,
  Pressable,
  StyleSheet,
  Platform,
  Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Gradients, InterWeights } from '../constants/theme';
import { CountdownEvent, getDayType, getDayDiff, formatDate } from '../constants/types';
import * as Haptics from 'expo-haptics';

const CARD_HEIGHT = 210;
const SCREEN_WIDTH = Dimensions.get('window').width;

interface EventCardProps {
  event: CountdownEvent;
  isArrangeMode: boolean;
  isFirst: boolean;
  isLast: boolean;
  onEdit: () => void;
  onPin: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function EventCard({
  event,
  isArrangeMode,
  isFirst,
  isLast,
  onEdit,
  onPin,
  onMoveUp,
  onMoveDown,
}: EventCardProps) {
  const scale = useSharedValue(1);
  const dayType = getDayType(event.targetDate);
  const diff = getDayDiff(event.targetDate);
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

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (!isArrangeMode) {
      scale.value = withSpring(0.97, { damping: 15 });
    }
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15 });
  };

  const handleEdit = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onEdit();
  };

  const handlePin = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPin();
  };

  const handleMoveUp = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onMoveUp();
  };

  const handleMoveDown = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onMoveDown();
  };

  const renderCardContent = () => (
    <>
      {/* Overlay gradient */}
      <LinearGradient
        colors={Gradients.overlay as unknown as string[]}
        locations={[0, 0.4, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* Top row */}
      <View style={styles.topRow}>
        {event.isPinned && (
          <View style={styles.pinnedBadge}>
            <Ionicons name="star" size={11} color={Colors.pinnedGold} />
            <Text style={styles.pinnedText}>PINNED</Text>
          </View>
        )}
        {!isArrangeMode && (
          <View style={styles.topRight}>
            <Pressable onPress={handleEdit} hitSlop={8} style={styles.iconBtn}>
              <Ionicons name="pencil" size={18} color="rgba(255,255,255,0.7)" />
            </Pressable>
            <Pressable onPress={handlePin} hitSlop={8} style={styles.iconBtn}>
              <Ionicons
                name={event.isPinned ? 'star' : 'star-outline'}
                size={18}
                color={event.isPinned ? Colors.pinnedGold : 'rgba(255,255,255,0.7)'}
              />
            </Pressable>
          </View>
        )}
      </View>

      {/* Bottom row */}
      <View style={styles.bottomRow}>
        <View style={styles.bottomLeft}>
          <Text style={styles.title} numberOfLines={2}>
            {event.title}
          </Text>
          <Text style={styles.date}>{formatDate(event.targetDate)}</Text>
        </View>
        <View style={styles.glassBadge}>
          {Platform.OS === 'ios' ? (
            <View style={styles.glassInner}>
              <Text style={[styles.dayNumber, { color: dayColor }]}>
                {dayType === 'today' ? '🎉' : Math.abs(diff)}
              </Text>
              <Text style={[styles.dayLabel, { color: dayColor }]}>{dayType === 'today' ? '' : dayText.split(' ').slice(1).join(' ')}</Text>
            </View>
          ) : (
            <View style={styles.glassInner}>
              <Text style={[styles.dayNumber, { color: dayColor }]}>
                {dayType === 'today' ? '🎉' : Math.abs(diff)}
              </Text>
              <Text style={[styles.dayLabel, { color: dayColor }]}>{dayType === 'today' ? '' : dayText.split(' ').slice(1).join(' ')}</Text>
            </View>
          )}
        </View>
      </View>
    </>
  );

  if (isArrangeMode) {
    return (
      <View style={[styles.cardContainer, { height: CARD_HEIGHT }]}>
        {/* Left side: card visual */}
        <View style={styles.arrangeLeft}>
          {event.imageUri ? (
            <ImageBackground
              source={{ uri: event.imageUri }}
              style={styles.arrangeCardVisual}
              imageStyle={{ borderRadius: Radius.card - 2 }}
              resizeMode="cover"
            >
              {renderCardContent()}
            </ImageBackground>
          ) : (
            <LinearGradient
              colors={bgGradient as unknown as string[]}
              style={[styles.arrangeCardVisual, { borderRadius: Radius.card - 2 }]}
            >
              {renderCardContent()}
            </LinearGradient>
          )}
        </View>

        {/* Right side: up/down buttons */}
        <View style={styles.arrangeRight}>
          <Pressable
            style={[styles.arrangeBtn, isFirst && styles.arrangeBtnDisabled]}
            onPress={handleMoveUp}
            disabled={isFirst}
          >
            <Ionicons
              name="chevron-up"
              size={22}
              color={isFirst ? 'rgba(255,255,255,0.25)' : '#fff'}
            />
          </Pressable>
          <View style={styles.arrangeDivider} />
          <Pressable
            style={[styles.arrangeBtn, isLast && styles.arrangeBtnDisabled]}
            onPress={handleMoveDown}
            disabled={isLast}
          >
            <Ionicons
              name="chevron-down"
              size={22}
              color={isLast ? 'rgba(255,255,255,0.25)' : '#fff'}
            />
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <AnimatedPressable
      style={[styles.cardContainer, animatedStyle, { height: CARD_HEIGHT }]}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      {event.imageUri ? (
        <ImageBackground
          source={{ uri: event.imageUri }}
          style={styles.cardVisual}
          imageStyle={{ borderRadius: Radius.card }}
          resizeMode="cover"
        >
          {renderCardContent()}
        </ImageBackground>
      ) : (
        <LinearGradient
          colors={bgGradient as unknown as string[]}
          style={[styles.cardVisual, { borderRadius: Radius.card }]}
        >
          {renderCardContent()}
        </LinearGradient>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    marginHorizontal: 16,
    marginBottom: 14,
    borderRadius: Radius.card,
    overflow: 'hidden',
    flexDirection: 'row',
    backgroundColor: Colors.card,
  },
  cardVisual: {
    flex: 1,
    justifyContent: 'space-between',
    borderRadius: Radius.card,
  },
  arrangeCardVisual: {
    flex: 1,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  arrangeLeft: {
    flex: 1,
    borderTopLeftRadius: Radius.card,
    borderBottomLeftRadius: Radius.card,
    overflow: 'hidden',
  },
  arrangeRight: {
    width: 44,
    backgroundColor: Colors.card,
    justifyContent: 'center',
    borderTopRightRadius: Radius.card,
    borderBottomRightRadius: Radius.card,
  },
  arrangeBtn: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrangeBtnDisabled: {
    opacity: 1,
  },
  arrangeDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  topRight: {
    flexDirection: 'row',
    gap: 8,
    marginLeft: 'auto',
  },
  iconBtn: {
    padding: 4,
  },
  pinnedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.pinnedBg,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  pinnedText: {
    fontSize: 10,
    fontFamily: InterWeights.semiBold,
    color: Colors.pinnedGold,
    letterSpacing: 0.5,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  bottomLeft: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    fontSize: 19,
    fontFamily: InterWeights.bold,
    color: '#fff',
    lineHeight: 24,
  },
  date: {
    fontSize: 12,
    fontFamily: InterWeights.regular,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },
  glassBadge: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: Radius.badge,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    minWidth: 90,
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  glassInner: {
    alignItems: 'center',
  },
  dayNumber: {
    fontSize: 36,
    fontFamily: InterWeights.bold,
    lineHeight: 42,
  },
  dayLabel: {
    fontSize: 10,
    fontFamily: InterWeights.semiBold,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});
