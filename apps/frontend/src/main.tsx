import ReactDOM from 'react-dom/client'
import AppRouter from './router'
import 'uno.css'
import { StrictMode } from 'react'
import 'µ/i18n'
import '@fontsource-variable/inter/index.css'
import { Toaster } from 'sonner'

const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
const saved = localStorage.getItem('theme');

if (saved === 'dark' || (!saved && prefersDark)) {
  document.documentElement.classList.add('dark');
} else {
  document.documentElement.classList.remove('dark');
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Toaster richColors position="top-center" />
      <AppRouter />
  </StrictMode>
)
