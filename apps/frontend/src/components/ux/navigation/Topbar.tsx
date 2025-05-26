import type { FC } from 'react'
import { useLocation, Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import ThemeSelector from '../ThemeSelector'
import LanguageSelector from '../LanguageSelector'

const dynamicRoutes = ['']
const dynamicNoRoutes = ['']

const Topbar: FC = () => {
  const { pathname } = useLocation()
  const { t } = useTranslation()
  const segments = pathname.split('/').filter(Boolean)

  return (
    <header className="bg-light dark:bg-dark border-b border-lightnd text-dark dark:(text-light border-darknd) flex items-center justify-between px-4 py-2 shadow-md">
      <nav className="text-sm flex items-center gap-1 truncate max-w-[60%]">
        {segments.map((segment, i) => {
          const fullPath = '/' + segments.slice(0, i + 1).join('/')
          const isDynamic = dynamicRoutes.includes(segments[i - 1])
          const isDynamicNo = dynamicNoRoutes.includes(segments[i - 1])
          return (
            <span key={i} className="flex items-center gap-1">
              <Link to={fullPath} className="hover:text-positive">
                {isDynamic ? segment : (isDynamicNo ? "" : t(`c.ux.nav.${segment}`))}
              </Link>
              {i < segments.length - 1 && '>'}
            </span>
          )
        })}
      </nav>

      <div className="flex items-center justify-end gap-4 w-40%">
        <ThemeSelector />
        <LanguageSelector />
      </div>
    </header>
  )
}

export default Topbar
