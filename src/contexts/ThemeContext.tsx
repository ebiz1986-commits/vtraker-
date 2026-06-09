import React, { createContext, useContext, useState, useEffect } from 'react';

export type ThemeType = 'dark' | 'light';

interface ThemeContextType {
  isLight: boolean;
  theme: ThemeType;
  setTheme: (theme: ThemeType) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeType>(() => {
    try {
      const saved = localStorage.getItem('sko-vbooking-theme') as ThemeType;
      if (['dark', 'light'].includes(saved)) {
        return saved;
      }
      return 'dark';
    } catch (e) {
      console.warn("Storage is blocked or disabled inside this sandbox/iframe:", e);
      return 'dark';
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    try {
      // Remove all theme classes first
      root.classList.remove('light-theme');
      body.classList.remove('light-theme');
      
      if (theme === 'light') {
        root.classList.add('light-theme');
        body.classList.add('light-theme');
      }
      
      localStorage.setItem('sko-vbooking-theme', theme);
    } catch (e) {
      console.warn("Unable to persist theme state:", e);
    }
  }, [theme]);

  const toggleTheme = () => {
    setThemeState(prev => prev === 'light' ? 'dark' : 'light');
  };

  const isLight = theme === 'light';

  return (
    <ThemeContext.Provider value={{ isLight, theme, setTheme: setThemeState, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
