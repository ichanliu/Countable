import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CountdownEvent } from '../constants/types';
import { syncAllWidgets } from '../utils/widgetBridge';

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
  exportEvents: () => Promise<string>;
  importEvents: (json: string) => Promise<number>;
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
    syncAllWidgets(newEvents);
  }, [events, save]);

  const deleteEvent = useCallback(async (id: string) => {
    const newEvents = events.filter((e) => e.id !== id);
    setEvents(newEvents);
    await save(newEvents);
    syncAllWidgets(newEvents);
  }, [events, save]);

  const togglePin = useCallback(async (id: string) => {
    const newEvents = events.map((e) =>
      e.id === id ? { ...e, isPinned: !e.isPinned } : e
    );
    setEvents(newEvents);
    await save(newEvents);
    syncAllWidgets(newEvents);
  }, [events, save]);

  const reorderEvents = useCallback(async (newOrder: CountdownEvent[]) => {
    setEvents(newOrder);
    await save(newOrder);
  }, [save]);

  const exportEvents = useCallback(async (): Promise<string> => {
    const data = {
      version: 1,
      exportedAt: new Date().toISOString(),
      events: events.map(({ id, title, targetDate, imageUri, bgImageUri, widgetImageUri, isPinned, createdAt }) => ({
        id, title, targetDate, imageUri, bgImageUri, widgetImageUri, isPinned, createdAt,
      })),
    };
    return JSON.stringify(data, null, 2);
  }, [events]);

  const importEvents = useCallback(async (json: string): Promise<number> => {
    const data = JSON.parse(json);
    if (!data || !Array.isArray(data.events)) {
      throw new Error('Invalid backup file format');
    }
    const imported: CountdownEvent[] = data.events.map((e: any) => ({
      id: e.id,
      title: e.title || 'Untitled',
      targetDate: e.targetDate || new Date().toISOString(),
      imageUri: e.imageUri || undefined,
      bgImageUri: e.bgImageUri || undefined,
      widgetImageUri: e.widgetImageUri || undefined,
      isPinned: !!e.isPinned,
      createdAt: e.createdAt || new Date().toISOString(),
    }));
    setEvents(imported);
    await save(imported);
    syncAllWidgets(imported);
    return imported.length;
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
        exportEvents,
        importEvents,
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
