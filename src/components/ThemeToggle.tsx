'use client';

import { useTheme } from '@/context/ThemeContext';

export default function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button className="theme-btn" onClick={toggle} aria-label="Toggle theme">
      {theme === 'light' ? '🌙' : '☀'}
    </button>
  );
}
