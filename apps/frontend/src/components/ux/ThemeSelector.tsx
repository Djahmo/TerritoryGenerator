import { useTheme } from '&/useTheme'
import { Sun, Moon } from 'lucide-react'
export default function ThemeSelector() {
  const { theme, setTheme } = useTheme()
  const label = theme === 'dark' ? 'Activer le thème clair' : 'Activer le thème sombre'
  return <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="icon-button" aria-label={label} title={label}>
    {theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}
  </button>
}
