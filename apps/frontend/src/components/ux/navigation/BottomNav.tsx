import { Home, Settings, Map, Download } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useLocation, Link } from 'react-router'
import { useApiTerritory } from '&/useApiTerritory'
import { useUser } from '&/useUser'

export default function BottomNav() {
  const { t } = useTranslation()
  const location = useLocation()
  const { cache } = useApiTerritory()
  const { user } = useUser()
  const hasTerritoriesInCache = !!cache?.territories.length
  const isLoggedIn = !!user
  const links = [
    ...(isLoggedIn ? [{ label: t('c.ux.nav.home'), icon: Home, href: '/' }] : []),
    ...(isLoggedIn && hasTerritoriesInCache ? [{ label: t('c.ux.nav.allTerritories', 'Mes territoires'), icon: Map, href: '/territories' }] : []),
    ...(isLoggedIn && hasTerritoriesInCache ? [{ label: t('c.ux.nav.exportation', 'Exportation'), icon: Download, href: '/exportation' }] : []),
    { label: t('c.ux.nav.configuration', 'Configuration'), icon: Settings, href: '/configuration' }
  ]

  return <nav className="bottom-nav" aria-label="Navigation principale">
    {links.map(({ label, icon: Icon, href }) => {
      const active = location.pathname === href || (href === '/territories' && location.pathname.startsWith('/territory/'))
      return <Link key={href} to={href} className={active ? 'is-active' : ''} aria-current={active ? 'page' : undefined}><Icon size={21} /><span>{label}</span></Link>
    })}
  </nav>
}
