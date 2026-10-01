import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CountdownEvent } from '../constants/types';
import { syncAllWidgets } from '../utils/widgetBridge';
import { deleteOrphanedImageFiles, findOrphanedImageUris, getSettingsImageReferences } from '../utils/imageStorage';
import * as FileSystem from 'expo-file-system/legacy';

const STORAGE_KEY = '@countdown_events';

async function cleanupUnusedImages(candidates: string[], events: CountdownEvent[]) {
  try {
    const orphaned = findOrphanedImageUris(
      candidates,
      events,
      await getSettingsImageReferences(),
      FileSystem.documentDirectory
    );
    await deleteOrphanedImageFiles(orphaned);
  } catch (error) {
    console.error('Failed to clean up unused event images:', error);
  }
}

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
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newEvents));
  }, []);

  const addEvent = useCallback(async (event: CountdownEvent) => {
    const newEvents = [event, ...events];
    setEvents(newEvents);
    await save(newEvents);
  }, [events, save]);

  const updateEvent = useCallback(async (id: string, updates: Partial<CountdownEvent>) => {
    const previousEvents = events;
    const newEvents = events.map((e) =>
      e.id === id ? { ...e, ...updates } : e
    );
    setEvents(newEvents);
    await save(newEvents);
    await syncAllWidgets(newEvents);
    const previousEvent = previousEvents.find((e) => e.id === id);
    if (previousEvent) {
      const replacedImages = [previousEvent.imageUri, previousEvent.bgImageUri, previousEvent.widgetImageUri]
        .filter((uri): uri is string => !!uri)
        .filter((uri) => ![updates.imageUri, updates.bgImageUri, updates.widgetImageUri].includes(uri));
      await cleanupUnusedImages(replacedImages, newEvents);
    }
  }, [events, save]);

  const deleteEvent = useCallback(async (id: string) => {
    const deletedEvent = events.find((e) => e.id === id);
    const newEvents = events.filter((e) => e.id !== id);
    setEvents(newEvents);
    await save(newEvents);
    await syncAllWidgets(newEvents);
    if (deletedEvent) {
      const candidates = [deletedEvent.imageUri, deletedEvent.bgImageUri, deletedEvent.widgetImageUri]
        .filter((uri): uri is string => !!uri);
      await cleanupUnusedImages(candidates, newEvents);
    }
  }, [events, save]);

  const togglePin = useCallback(async (id: string) => {
    const newEvents = events.map((e) =>
      e.id === id ? { ...e, isPinned: !e.isPinned } : e
    );
    setEvents(newEvents);
    await save(newEvents);
    await syncAllWidgets(newEvents);
  }, [events, save]);

  const reorderEvents = useCallback(async (newOrder: CountdownEvent[]) => {
    setEvents(newOrder);
    await save(newOrder);
  }, [save]);

  const exportEvents = useCallback(async (): Promise<string> => {
    const data = {
      version: 1,
      exportedAt: new Date().toISOString(),
      events: events.map(({ id, title, targetDate, imageUri, bgImageUri, widgetImageUri, widgetImageCrop, isPinned, createdAt }) => ({
        id, title, targetDate, imageUri, bgImageUri, widgetImageUri, widgetImageCrop, isPinned, createdAt,
      })),
    };
    return JSON.stringify(data, null, 2);
  }, [events]);

  const importEvents = useCallback(async (json: string): Promise<number> => {
    const previousEvents = events;
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
      widgetImageUri: typeof e.widgetImageUri === 'string' ? e.widgetImageUri : undefined,
      widgetImageCrop: e.widgetImageCrop && typeof e.widgetImageCrop === 'object'
        ? {
            focusX: Math.max(0, Math.min(1, Number(e.widgetImageCrop.focusX) || 0.5)),
            focusY: Math.max(0, Math.min(1, Number(e.widgetImageCrop.focusY) || 0.5)),
            zoom: Math.max(1, Math.min(3, Number(e.widgetImageCrop.zoom) || 1)),
          }
        : undefined,
      isPinned: !!e.isPinned,
      createdAt: e.createdAt || new Date().toISOString(),
    }));
    setEvents(imported);
    await save(imported);
    await syncAllWidgets(imported);
    const oldImageUris = previousEvents.flatMap((event) =>
      [event.imageUri, event.bgImageUri, event.widgetImageUri].filter((uri): uri is string => !!uri)
    );
    await cleanupUnusedImages(oldImageUris, imported);
    return imported.length;
  }, [events, save]);

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
