import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";

type SettingsContextType = {
  darkMode: boolean;
  fontSize: number;
  setDarkMode: (v: boolean) => void;
  setFontSize: (v: number) => void;
  resetSettings: () => Promise<void>;
};

const SettingsContext = createContext<SettingsContextType | null>(null);

const STORAGE_KEYS = {
  THEME: "@settings/theme",
  FONT_SIZE: "@settings/fontSize",
};

const DEFAULT_SETTINGS = {
  darkMode: false,
  fontSize: 16,
};

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [darkMode, setDarkModeState] = useState(DEFAULT_SETTINGS.darkMode);
  const [fontSize, setFontSizeState] = useState(DEFAULT_SETTINGS.fontSize);
  const [ready, setReady] = useState(false);

  /** Load persisted settings */
  useEffect(() => {
    (async () => {
      try {
        const theme = await AsyncStorage.getItem(STORAGE_KEYS.THEME);
        const font = await AsyncStorage.getItem(STORAGE_KEYS.FONT_SIZE);

        if (theme) setDarkModeState(theme === "dark");
        if (font) setFontSizeState(Number(font));
      } catch (e) {

        console.warn("Failed to load settings:", e);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  /** Save theme */
  const setDarkMode = async (v: boolean) => {
    setDarkModeState(v);
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.THEME, v ? "dark" : "light");
    } catch (e) {
      console.warn("Failed to save theme:", e);
    }
  };

  /** Save font size */
  const setFontSize = async (v: number) => {
    setFontSizeState(v);
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.FONT_SIZE, v.toString());
    } catch (e) {
      console.warn("Failed to save font size:", e);
    }
  };

  /** Reset settings safely (does NOT touch SQLite DB) */
  const resetSettings = async () => {
    setDarkModeState(DEFAULT_SETTINGS.darkMode);
    setFontSizeState(DEFAULT_SETTINGS.fontSize);

    try {
      await AsyncStorage.multiSet([
        [STORAGE_KEYS.THEME, DEFAULT_SETTINGS.darkMode ? "dark" : "light"],
        [STORAGE_KEYS.FONT_SIZE, DEFAULT_SETTINGS.fontSize.toString()],
      ]);
    } catch (e) {
      console.warn("Failed to reset settings:", e);
    }
  };

  if (!ready) return null; // Prevent UI flicker

  return (
    <SettingsContext.Provider
      value={{ darkMode, fontSize, setDarkMode, setFontSize, resetSettings }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

/** Custom hook */
export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used inside SettingsProvider");
  return ctx;
}
