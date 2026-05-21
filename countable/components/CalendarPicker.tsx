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

function chunkWeeks(days: (number | null)[]): (number | null)[][] {
  const weeks: (number | null)[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }
  return weeks;
}

export default function CalendarPicker({ selectedDate, onDateChange }: CalendarPickerProps) {
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const [viewYear, setViewYear] = useState(selectedDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(selectedDate.getMonth());
  const [showYearPicker, setShowYearPicker] = useState(false);

  const days = useMemo(() => getMonthDays(viewYear, viewMonth), [viewYear, viewMonth]);

  const monthName = new Date(viewYear, viewMonth).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });

  // Generate years around the current view year
  const yearRange = useMemo(() => {
    const start = viewYear - 8;
    const end = viewYear + 7;
    const years: number[] = [];
    for (let y = start; y <= end; y++) years.push(y);
    return years;
  }, [viewYear]);

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
    setShowYearPicker(false);
    onDateChange(now);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={showYearPicker ? undefined : goToPrev} hitSlop={8} style={styles.arrowBtn}>
          {!showYearPicker && <Ionicons name="chevron-back" size={20} color={Colors.foreground} />}
        </Pressable>
        <Pressable onPress={() => setShowYearPicker(!showYearPicker)} hitSlop={8}>
          <Text style={styles.monthTitle}>{showYearPicker ? 'Select Year' : monthName}</Text>
        </Pressable>
        <Pressable onPress={showYearPicker ? undefined : goToNext} hitSlop={8} style={styles.arrowBtn}>
          {!showYearPicker && <Ionicons name="chevron-forward" size={20} color={Colors.foreground} />}
        </Pressable>
      </View>

      {/* Year picker grid */}
      {showYearPicker ? (
        <View style={styles.yearGrid}>
          {yearRange.map((year) => {
            const isSelected = year === viewYear;
            return (
              <Pressable
                key={year}
                style={[styles.yearCell, isSelected && styles.selectedYearCell]}
                onPress={() => {
                  setViewYear(year);
                  setShowYearPicker(false);
                }}
              >
                <Text style={[styles.yearText, isSelected && styles.selectedYearText]}>
                  {year}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <>
          {/* Day-of-week labels */}
      <View style={styles.weekRow}>
        {DAYS.map((d) => (
          <View key={d} style={styles.weekCell}>
            <Text style={styles.dayLabel}>{d}</Text>
          </View>
        ))}
      </View>

      {/* Date grid - each week is its own row */}
      {chunkWeeks(days).map((week, wi) => (
        <View key={wi} style={styles.weekRow}>
          {week.map((d, ci) => {
            if (d === null) {
              return <View key={`e-${wi}-${ci}`} style={styles.dayCell} />;
            }

            const cellDate = new Date(viewYear, viewMonth, d);
            cellDate.setHours(0, 0, 0, 0);
            const isSelected =
              cellDate.getTime() === selectedDate.getTime();
            const isToday = cellDate.getTime() === today.getTime();

            return (
              <Pressable
                key={`d-${d}`}
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
      ))}

        </>
      )}

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
  weekCell: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
  },
  dayLabel: {
    fontSize: 12,
    fontFamily: InterWeights.semiBold,
    color: Colors.mutedForeground,
    textAlign: 'center',
  },
  dayCell: {
    flex: 1,
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    maxWidth: '14.28%',
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
  yearGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingVertical: 8,
  },
  yearCell: {
    width: '25%',
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  selectedYearCell: {
    backgroundColor: Colors.primary,
  },
  yearText: {
    fontSize: 15,
    fontFamily: InterWeights.medium,
    color: Colors.foreground,
  },
  selectedYearText: {
    color: '#fff',
    fontFamily: InterWeights.bold,
  },
});
