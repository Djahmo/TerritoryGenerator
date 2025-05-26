import { useEffect, useState } from "react"
import { useTheme } from '&/useTheme'
import { Sun, Moon } from 'lucide-react'

const ThemeSelector = () => {

  const [darkMode, setDarkMode] = useState(false)

  useEffect(() => {
    const current = document.documentElement.classList.contains('dark')
    setDarkMode(current)
  }, [])


  const toggleTheme = () => {
    const html = document.documentElement
    const isDark = html.classList.toggle('dark')
    const newTheme = isDark ? 'dark' : 'light'
    useTheme.getState().setTheme(newTheme)
  }

  return (
    <button
      onClick={toggleTheme}
      className="btn p-2 rounded hover:text-positive transition"
    >
      {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
    </button>
  )
}

export default ThemeSelector
