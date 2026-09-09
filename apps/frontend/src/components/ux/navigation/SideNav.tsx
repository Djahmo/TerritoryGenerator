import type { FC } from 'react'
import { Home, Settings, Map, Download } from 'lucide-react'
import { Link, NavLink, useLocation } from 'react-router'
import { useTranslation } from 'react-i18next'
import LanguageSelector from '../LanguageSelector'
import ThemeSelector from '../ThemeSelector'
import { useApiTerritory } from '&/useApiTerritory'
import { useUser } from '&/useUser'
const SideNav: FC = () => {
  const location = useLocation()
  const { t } = useTranslation()
  const { cache } = useApiTerritory()
  const { user } = useUser()

  const hasTerritoriesInCache = cache?.territories && cache.territories.length > 0
  const isLoggedIn = !!user

  const links = [
    ...(isLoggedIn ? [{ label: t('c.ux.nav.home'), icon: Home, href: '/' }] : []),
    ...(isLoggedIn && hasTerritoriesInCache ? [{ label: t('c.ux.nav.allTerritories', 'Mes territoires'), icon: Map, href: '/territories' }] : []),
    ...(isLoggedIn && hasTerritoriesInCache ? [{ label: t('c.ux.nav.exportation', 'Exportation'), icon: Download, href: '/exportation' }] : []),
    { label: t('c.ux.nav.configuration', 'Configuration'), icon: Settings, href: '/configuration' }
  ]

  return (
    <aside className="sidebar">
      <Link to="/" className="sidebar-brand"><img src="/images/logo.positive.png" alt="Territory Generator" /></Link>
      <p className="nav-caption">VOTRE ESPACE</p>
      <nav aria-label="Navigation principale" className="sidebar-nav">
        {links.map(({ label, icon: Icon, href }) => <NavLink key={href} to={href} end={href === '/'}
          className={({ isActive }) => `nav-item ${isActive || (href === '/territories' && location.pathname.startsWith('/territory/')) ? 'is-active' : ''}`}>
          <Icon size={19} /><span>{label}</span>
          {href === '/territories' && <span className="nav-count">{cache?.territories.length}</span>}
        </NavLink>)}
      </nav>
      <div className="sidebar-bottom">
        <div className="workspace-note"><Map size={20} /><p>Du terrain au papier.<span>Vos cartes, à votre façon.</span></p></div>
        {user && <Link to="/configuration" className="account-link"><span className="avatar">{user.username?.slice(0, 1).toUpperCase()}</span><span><strong>{user.username}</strong><small>Mon compte</small></span></Link>}
        <div className="sidebar-preferences"><LanguageSelector /><ThemeSelector /></div>
      </div>
    </aside>
  )
}
export default SideNav
