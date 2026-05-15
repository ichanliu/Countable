import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CountdownEvent } from '../constants/types';
import { syncWidget } from '../utils/widgetBridge';

const STORAGE_KEY = '@countdown_events';

interface EventsContextType {
  events: CountdownEvent[];
  loading: boolean;
  pinnedEvent: CountdownEvent | null;
  addEvent: (event: CountdownEvent) => Promise<void>;
  updateEvent: (id: string, updates: Partial<CountdownEvent>) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  togglePin: (id: string) => Promise<void>;
  reorderEvents: (newOrder: CountdownEvent[]) => Promise<void>;
}

const EventsContext = createContext<EventsContextType | null>(null);

export function EventsProvider({ children }: { children: React.ReactNode }) {
  const [events, setEvents] = useState<CountdownEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed: CountdownEvent[] = JSON.parse(raw);
          setEvents(parsed);
        }
      } catch (e) {
        console.error('Failed to load events:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const save = useCallback(async (newEvents: CountdownEvent[]) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newEvents));
      } catch (e) {
        console.error('Failed to save events:', e);
      }
    }, 100);
  }, []);

  const addEvent = useCallback(async (event: CountdownEvent) => {
    const newEvents = [event, ...events];
    setEvents(newEvents);
    await save(newEvents);
  }, [events, save]);

  const updateEvent = useCallback(async (id: string, updates: Partial<CountdownEvent>) => {
    const newEvents = events.map((e) =>
      e.id === id ? { ...e, ...updates } : e
    );
    setEvents(newEvents);
    await save(newEvents);
    const pinned = newEvents.find((e) => e.isPinned);
    syncWidget(pinned || null);
  }, [events, save]);

  const deleteEvent = useCallback(async (id: string) => {
    const wasPinned = events.find((e) => e.id === id)?.isPinned ?? false;
    const newEvents = events.filter((e) => e.id !== id);
    setEvents(newEvents);
    await save(newEvents);
    if (wasPinned) syncWidget(null);
  }, [events, save]);

  const togglePin = useCallback(async (id: string) => {
    const newEvents = events.map((e) => {
      if (e.id === id) {
        return { ...e, isPinned: !e.isPinned };
      }
      return { ...e, isPinned: false };
    });
    setEvents(newEvents);
    await save(newEvents);
    const pinned = newEvents.find((e) => e.isPinned);
    syncWidget(pinned || null);
  }, [events, save]);

  const reorderEvents = useCallback(async (newOrder: CountdownEvent[]) => {
    setEvents(newOrder);
    await save(newOrder);
  }, [save]);

  const pinnedEvent = events.find((e) => e.isPinned) || null;

  return (
    <EventsContext.Provider
      value={{
        events,
        loading,
        pinnedEvent,
        addEvent,
        updateEvent,
        deleteEvent,
        togglePin,
        reorderEvents,
      }}
    >
      {children}
    </EventsContext.Provider>
  );
}

export function useEvents() {
  const ctx = useContext(EventsContext);
  if (!ctx) throw new Error('useEvents must be used within EventsProvider');
  return ctx;
}
