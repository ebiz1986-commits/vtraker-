import React, { createContext, useContext, useState, useEffect } from 'react';

interface ThemeContextType {
  isLight: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isLight, setIsLight] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('sko-vbooking-theme');
      return saved === 'light';
    } catch (e) {
      console.warn("Storage is blocked or disabled inside this sandbox/iframe:", e);
      return false;
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    try {
      if (isLight) {
        root.classList.add('light-theme');
        body.classList.add('light-theme');
        localStorage.setItem('sko-vbooking-theme', 'light');
      } else {
        root.classList.remove('light-theme');
        body.classList.remove('light-theme');
        localStorage.setItem('sko-vbooking-theme', 'dark');
      }
    } catch (e) {
      console.warn("Unable to persist theme state:", e);
    }
  }, [isLight]);

  const toggleTheme = () => setIsLight(prev => !prev);

  return (
    <ThemeContext.Provider value={{ isLight, toggleTheme }}>
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
