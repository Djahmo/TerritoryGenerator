// stores/useTheme.ts
import { create } from 'zustand'

type ThemeState = {
  theme: 'light' | 'dark'
  setTheme: (theme: 'light' | 'dark') => void
}

export const useTheme = create<ThemeState>(set => ({
  theme: (localStorage.getItem('theme') as 'light' | 'dark') || 'dark',
  setTheme: theme => {
    localStorage.setItem('theme', theme)
    set({ theme })
  }
}))
