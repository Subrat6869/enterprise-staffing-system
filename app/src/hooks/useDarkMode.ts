// ============================================
// DARK MODE HOOK
// ============================================

import { useState, useEffect } from 'react';

export const useDarkMode = () => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Check localStorage first
    const saved = localStorage.getItem('darkMode');
    if (saved !== null) {
      return JSON.parse(saved);
    }
    // Check system preference
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(isDarkMode));
    
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    setIsDarkMode((prev: boolean) => !prev);
  };

  const setDarkMode = (value: boolean) => {
    setIsDarkMode(value);
  };

  return {
    isDarkMode,
    toggleDarkMode,
    setDarkMode
  };
};

export default useDarkMode;
