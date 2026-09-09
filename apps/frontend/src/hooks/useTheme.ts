import { create } from 'zustand'
type Theme = 'light' | 'dark'
const saved = localStorage.getItem('theme')
export const useTheme = create<{ theme: Theme; setTheme: (theme: Theme) => void }>(set => ({
  theme: saved === 'light' || saved === 'dark' ? saved : window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
  setTheme: theme => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    localStorage.setItem('theme', theme)
    set({ theme })
  }
}))
