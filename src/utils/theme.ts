import { useCallback, useEffect, useState } from 'react'

/**
 * Dark theme — mirrors the Super Admin prototype (light + dark).
 * The choice is persisted in localStorage and defaults to the
 * operating system's colour-scheme preference. Applied to
 * document.documentElement as data-theme, so the token overrides in
 * tokens.css take effect. Paper sheets (.pb-paper) re-pin the light
 * tokens for themselves, so print output is unaffected.
 */
export const THEME_STORAGE_KEY = 'paperbuilder.theme'
export type Theme = 'light' | 'dark'

export function initialTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    if (stored === 'light' || stored === 'dark') return stored
  } catch { /* storage unavailable — fall through to the preference */ }
  try {
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark'
  } catch { /* ignore */ }
  return 'light'
}

export function applyTheme(theme: Theme): void {
  if (typeof document === 'undefined') return
  document.documentElement.dataset.theme = theme
  try {
    document.documentElement.style.colorScheme = theme
  } catch { /* ignore */ }
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch { /* storage unavailable — theme still applies for this session */ }
}

/* Apply as soon as this module loads so the first paint already
   carries the persisted (or preferred) theme. */
try {
  applyTheme(initialTheme())
} catch { /* non-browser environment (tests) — TopBar applies it on mount */ }

/** React state for the theme toggle in the shell TopBar. */
export function useTheme(): { theme: Theme; toggleTheme: () => void } {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      return initialTheme()
    } catch {
      return 'light'
    }
  })

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  const toggleTheme = useCallback(() => {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'))
  }, [])

  return { theme, toggleTheme }
}
