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
      className="fixed bottom-6 right-6 z-40 w-12 h-12 rounded-full bg-slate-900/90 light:bg-white/90 hover:bg-slate-800 text-slate-200 hover:text-sky-400 border border-white/20 shadow-2xl backdrop-blur-xl flex items-center justify-center transition-all hover:scale-105 active:scale-95 group focus:outline-none"
      title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
      aria-label="Toggle Dark and Light Mode"
    >
      {theme === 'dark' ? (
        <Sun className="w-5 h-5 text-amber-400 group-hover:rotate-45 transition-transform" />
      ) : (
        <Moon className="w-5 h-5 text-sky-400 group-hover:-rotate-12 transition-transform" />
      )}
    </button>
  );
};
