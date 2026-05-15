import React, { useState, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, InterWeights } from '../constants/theme';

interface CalendarPickerProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function getMonthDays(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  return cells;
}

export default function CalendarPicker({ selectedDate, onDateChange }: CalendarPickerProps) {
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const [viewYear, setViewYear] = useState(selectedDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(selectedDate.getMonth());

  const days = useMemo(() => getMonthDays(viewYear, viewMonth), [viewYear, viewMonth]);

  const monthName = new Date(viewYear, viewMonth).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });

  const goToPrev = () => {
    if (viewMonth === 0) {
      setViewYear(viewYear - 1);
      setViewMonth(11);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const goToNext = () => {
    if (viewMonth === 11) {
      setViewYear(viewYear + 1);
      setViewMonth(0);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const jumpToToday = () => {
    const now = new Date();
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
    onDateChange(now);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={goToPrev} hitSlop={8} style={styles.arrowBtn}>
          <Ionicons name="chevron-back" size={20} color={Colors.foreground} />
        </Pressable>
        <Pressable onPress={jumpToToday} hitSlop={8}>
          <Text style={styles.monthTitle}>{monthName}</Text>
        </Pressable>
        <Pressable onPress={goToNext} hitSlop={8} style={styles.arrowBtn}>
          <Ionicons name="chevron-forward" size={20} color={Colors.foreground} />
        </Pressable>
      </View>

      {/* Day-of-week labels */}
      <View style={styles.weekRow}>
        {DAYS.map((d) => (
          <View key={d} style={styles.dayCell}>
            <Text style={styles.dayLabel}>{d}</Text>
          </View>
        ))}
      </View>

      {/* Date grid */}
      <View style={styles.grid}>
        {days.map((d, i) => {
          if (d === null) {
            return <View key={`empty-${i}`} style={styles.dayCell} />;
          }

          const cellDate = new Date(viewYear, viewMonth, d);
          cellDate.setHours(0, 0, 0, 0);
          const isSelected =
            cellDate.getTime() === selectedDate.getTime();
          const isToday = cellDate.getTime() === today.getTime();

          return (
            <Pressable
              key={`day-${d}`}
              style={[
                styles.dayCell,
                isSelected && styles.selectedDay,
                isToday && !isSelected && styles.todayBorder,
              ]}
              onPress={() => onDateChange(cellDate)}
            >
              <Text
                style={[
                  styles.dayNumber,
                  isSelected && styles.selectedDayText,
                  isToday && !isSelected && styles.todayText,
                ]}
              >
                {d}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Jump to Today button */}
      <Pressable style={styles.jumpBtn} onPress={jumpToToday}>
        <Ionicons name="today-outline" size={16} color={Colors.primary} />
        <Text style={styles.jumpText}>Jump to Today</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  arrowBtn: {
    padding: 8,
  },
  monthTitle: {
    fontSize: 15,
    fontFamily: InterWeights.semiBold,
    color: Colors.foreground,
  },
  weekRow: {
    flexDirection: 'row',
  },
  dayLabel: {
    fontSize: 12,
    fontFamily: InterWeights.semiBold,
    color: Colors.mutedForeground,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    flex: 1,
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 0,
  },
  dayNumber: {
    fontSize: 15,
    color: Colors.foreground,
  },
  selectedDay: {
    backgroundColor: Colors.primary,
    borderRadius: 100,
  },
  selectedDayText: {
    color: '#fff',
    fontFamily: InterWeights.bold,
  },
  todayBorder: {
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: 100,
  },
  todayText: {
    color: Colors.primary,
    fontFamily: InterWeights.bold,
  },
  jumpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.pill,
    marginTop: 4,
  },
  jumpText: {
    fontSize: 13,
    fontFamily: InterWeights.semiBold,
    color: Colors.primary,
  },
});
