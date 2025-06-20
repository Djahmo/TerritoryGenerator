import type { FC } from 'react'
import { Home, Settings, Map, Download } from 'lucide-react'
import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import LanguageSelector from '../LanguageSelector'
import ThemeSelector from '../ThemeSelector'
import { useApiTerritory } from '&/useApiTerritory'
import { useUser } from '&/useUser'
const SideNav: FC = () => {
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
    <div className="relative h-full">
      <aside className="bg-lightnd dark:bg-darknd h-full px-2 py-4 flex flex-col justify-between w-60">
        <div className='flex flex-col'>
          {/* Logo */}
          <Link to="/" className="text-xl font-bold text-positive mb-4 text-center">
            <img
              src="/images/logo.positive.png"
              alt="Logo"
              className="mx-auto w-40"
            />
          </Link>
          {/* Liens */}
          {links.map(({ label, icon: Icon, href }, i) => (
            <Link
              key={i}
              to={href}
              className="flex items-center text-dark dark:text-light hover:text-positive px-3 py-2 rounded transition-colors"
            >
              <span className="w-6 min-w-[1.5rem] flex justify-center"><Icon size={20} /></span>
              <span className="ml-3">
                {label}
              </span>
            </Link>
          ))}
        </div>
        <div className="flex justify-between">
          <LanguageSelector />
          <ThemeSelector />
        </div>
      </aside>
    </div>
  )
}

export default SideNav
