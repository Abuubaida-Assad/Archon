'use client';

import React, { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

export const ThemeToggle: React.FC = () => {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem('archon_theme') as 'dark' | 'light' | null;
    if (savedTheme === 'light') {
      setTheme('light');
      document.documentElement.classList.add('light');
    } else {
      setTheme('dark');
      document.documentElement.classList.remove('light');
    }
  }, []);

  const toggleTheme = () => {
    if (theme === 'dark') {
      setTheme('light');
      document.documentElement.classList.add('light');
      localStorage.setItem('archon_theme', 'light');
      window.dispatchEvent(new CustomEvent('themechange', { detail: { theme: 'light' } }));
    } else {
      setTheme('dark');
      document.documentElement.classList.remove('light');
      localStorage.setItem('archon_theme', 'dark');
      window.dispatchEvent(new CustomEvent('themechange', { detail: { theme: 'dark' } }));
    }
  };

  if (!mounted) return null;

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="fixed bottom-4 right-4 z-40 w-8 h-8 rounded-md bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 shadow-md flex items-center justify-center transition-colors focus:outline-none"
      title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
      aria-label="Toggle Dark and Light Mode"
    >
      {theme === 'dark' ? (
        <Sun className="w-4 h-4 text-slate-400" />
      ) : (
        <Moon className="w-4 h-4 text-slate-400" />
      )}
    </button>
  );
};
