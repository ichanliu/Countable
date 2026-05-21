import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../constants/theme';

const SETTINGS_KEY = '@countable_settings';

export interface AppSettings {
  accentColor: string;
  customImages: string[];
  reminderEnabled: boolean;
  reminderMessage: string;
}

const defaultSettings: AppSettings = {
  accentColor: Colors.primary,
  customImages: [],
  reminderEnabled: false,
  reminderMessage: 'Today is {title} - {days} days {type}!',
};

interface SettingsContextType {
  settings: AppSettings;
  loading: boolean;
  updateSettings: (updates: Partial<AppSettings>) => Promise<void>;
  addImage: (uri: string) => Promise<void>;
  removeImage: (uri: string) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(SETTINGS_KEY);
        if (raw) {
          setSettings({ ...defaultSettings, ...JSON.parse(raw) });
        }
      } catch (e) {
        console.error('Failed to load settings:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const save = useCallback(async (newSettings: AppSettings) => {
    try {
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));
    } catch (e) {
      console.error('Failed to save settings:', e);
    }
  }, []);

  const updateSettings = useCallback(async (updates: Partial<AppSettings>) => {
    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);
    await save(newSettings);
  }, [settings, save]);

  const addImage = useCallback(async (uri: string) => {
    const newSettings = {
      ...settings,
      customImages: [...settings.customImages, uri],
    };
    setSettings(newSettings);
    await save(newSettings);
  }, [settings, save]);

  const removeImage = useCallback(async (uri: string) => {
    const newSettings = {
      ...settings,
      customImages: settings.customImages.filter((u) => u !== uri),
    };
    setSettings(newSettings);
    await save(newSettings);
  }, [settings, save]);

  return (
    <SettingsContext.Provider
      value={{ settings, loading, updateSettings, addImage, removeImage }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
