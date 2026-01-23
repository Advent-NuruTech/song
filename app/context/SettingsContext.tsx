import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";

type SettingsContextType = {
  darkMode: boolean;
  fontSize: number;
  setDarkMode: (v: boolean) => void;
  setFontSize: (v: number) => void;
};

const SettingsContext = createContext<SettingsContextType | null>(null);

const STORAGE_KEYS = {
  THEME: "@settings/theme",
  FONT_SIZE: "@settings/fontSize",
};

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [darkMode, setDarkModeState] = useState(false);
  const [fontSize, setFontSizeState] = useState(16);
  const [ready, setReady] = useState(false);

  /* Load once */
  useEffect(() => {
    (async () => {
      const theme = await AsyncStorage.getItem(STORAGE_KEYS.THEME);
      const font = await AsyncStorage.getItem(STORAGE_KEYS.FONT_SIZE);

      if (theme) setDarkModeState(theme === "dark");
      if (font) setFontSizeState(Number(font));

      setReady(true);
    })();
  }, []);

  const setDarkMode = async (v: boolean) => {
    setDarkModeState(v);
    await AsyncStorage.setItem(STORAGE_KEYS.THEME, v ? "dark" : "light");
  };

  const setFontSize = async (v: number) => {
    setFontSizeState(v);
    await AsyncStorage.setItem(STORAGE_KEYS.FONT_SIZE, v.toString());
  };

  if (!ready) return null;

  return (
    <SettingsContext.Provider
      value={{ darkMode, fontSize, setDarkMode, setFontSize }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

/* Hook */
export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used inside SettingsProvider");
  return ctx;
}
