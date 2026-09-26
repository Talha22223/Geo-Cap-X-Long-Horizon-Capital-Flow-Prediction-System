import { create } from 'zustand';

export type ThemeMode = 'dark' | 'light';
export type AccentColor = 'indigo' | 'violet' | 'cyan' | 'emerald' | 'rose';
export type LayoutDensity = 'comfortable' | 'compact';

interface ThemeState {
  theme: ThemeMode;
  accent: AccentColor;
  density: LayoutDensity;
  toggleTheme: () => void;
  setTheme: (theme: ThemeMode) => void;
  setAccent: (accent: AccentColor) => void;
  setDensity: (density: LayoutDensity) => void;
  initTheme: () => void;
}

const getInitialTheme = (): ThemeMode => {
  if (typeof window === 'undefined') return 'dark';
  const saved = localStorage.getItem('geocapx_theme') as ThemeMode;
  if (saved === 'dark' || saved === 'light') return saved;
  return 'dark';
};

const getInitialAccent = (): AccentColor => {
  if (typeof window === 'undefined') return 'indigo';
  return (localStorage.getItem('geocapx_accent') as AccentColor) || 'indigo';
};

const getInitialDensity = (): LayoutDensity => {
  if (typeof window === 'undefined') return 'comfortable';
  return (localStorage.getItem('geocapx_density') as LayoutDensity) || 'comfortable';
};

const applyToDOM = (theme: ThemeMode, accent: AccentColor, density: LayoutDensity) => {
  if (typeof window === 'undefined') return;
  const root = window.document.documentElement;
  root.classList.remove('light', 'dark');
  root.classList.add(theme);
  root.setAttribute('data-theme', theme);
  root.setAttribute('data-accent', accent);
  root.setAttribute('data-density', density);
  localStorage.setItem('geocapx_theme', theme);
  localStorage.setItem('geocapx_accent', accent);
  localStorage.setItem('geocapx_density', density);
};

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: 'dark',
  accent: 'indigo',
  density: 'comfortable',
  initTheme: () => {
    const theme = getInitialTheme();
    const accent = getInitialAccent();
    const density = getInitialDensity();
    applyToDOM(theme, accent, density);
    set({ theme, accent, density });
  },
  toggleTheme: () => {
    const nextTheme: ThemeMode = get().theme === 'dark' ? 'light' : 'dark';
    applyToDOM(nextTheme, get().accent, get().density);
    set({ theme: nextTheme });
  },
  setTheme: (theme: ThemeMode) => {
    applyToDOM(theme, get().accent, get().density);
    set({ theme });
  },
  setAccent: (accent: AccentColor) => {
    applyToDOM(get().theme, accent, get().density);
    set({ accent });
  },
  setDensity: (density: LayoutDensity) => {
    applyToDOM(get().theme, get().accent, density);
    set({ density });
  },
}));
