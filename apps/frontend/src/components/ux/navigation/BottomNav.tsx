import { useEffect, useState } from 'react'
import { Home, Settings, Map, Download, Menu } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useLocation, Link } from 'react-router'
import ThemeSelector from '#/ux/ThemeSelector'
import LanguageSelector from '#/ux/LanguageSelector'
import { useApiTerritory } from '&/useApiTerritory'

const BottomNav = () => {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const { cache } = useApiTerritory()

  const hasTerritoriesInCache = cache?.territories && cache.territories.length > 0
  const links = [
    { label: t('c.ux.nav.home'), icon: Home, href: '/' },
    ...(hasTerritoriesInCache ? [{ label: t('c.ux.nav.allTerritories', 'Mes territoires'), icon: Map, href: '/territories' }] : []),
    ...(hasTerritoriesInCache ? [{ label: t('c.ux.nav.exportation', 'Exportation'), icon: Download, href: '/exportation' }] : []),
    { label: t('c.ux.nav.configuration', 'Configuration'), icon: Settings, href: '/configuration' }
  ]

  useEffect(() => {
    if (!open) return

    const handleClick = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('#bottom-nav') && !target.closest('#bottom-subnav')) {
        setOpen(false)
      }
    }

    window.addEventListener('touchstart', handleClick, { passive: true })
    window.addEventListener('mousedown', handleClick)
    return () => {
      window.removeEventListener('mousedown', handleClick)
      window.removeEventListener('touchstart', handleClick)
    }
  }, [open])


  return (
    <>
      {/* Sous-barre extensible */}
      <div id="bottom-subnav" className={`fixed bottom-16 left-0 w-full bg-lightnd dark:bg-darknd transition-all z-40 overflow-hidden border-t border-muted/20 ${open ? 'h-12' : 'h-0'}`}>
        <div className="flex justify-around items-center h-full p-1">
          <LanguageSelector/>
          <ThemeSelector/>
        </div>
      </div>

      {/* Bottom nav principale */}
      <nav id="bottom-nav" className="fixed bottom-0 left-0 w-full bg-lightnd dark:bg-darknd flex justify-around items-center h-16 z-50 border-t border-muted/20">
        {links.map(({ label, icon: Icon, href }, i) => {
          const isActive = location.pathname === href
          return (
            <Link
              key={i}
              to={href}
              className="flex flex-1 flex-col items-center justify-center text-xs text-dark dark:text-light hover:text-positive transition-colors"
            >
              <Icon size={20} />
              {isActive && <span className="mt-1">{label}</span>}
            </Link>
          )
        })}
        <button
          onClick={() => setOpen(!open)}
          className="flex flex-1 flex-col items-center cursor-pointer justify-center text-xs text-dark dark:text-light hover:text-positive transition-colors"
        >
          <Menu size={20} />
        </button>
      </nav>
    </>
  )
}

export default BottomNav
