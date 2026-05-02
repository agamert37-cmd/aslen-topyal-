import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'dark' | 'light' | 'theme-ocean' | 'theme-emerald';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  setTheme: () => null,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    return (localStorage.getItem('erp_theme') as Theme) || 'dark';
  });

  useEffect(() => {
    // Remove all previous theme classes
    const classes = ['dark', 'light', 'theme-ocean', 'theme-emerald'];
    // Default Tailwind requires dark for dark mode unless classStrategy is different, 
    // but here we just toggle these specific classes.
    document.documentElement.classList.remove(...classes);
    document.documentElement.classList.add(theme);
    
    // Fallback/standard Tailwind dark needs 'dark' if using ocean/emerald but keeping dark palette?
    // Let's assume theme-ocean and theme-emerald are standalone.
    
    localStorage.setItem('erp_theme', theme);
  }, [theme]);

  const setTheme = (t: Theme) => {
    setThemeState(t);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
