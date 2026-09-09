import { useMediaQuery } from 'usehooks-ts'
import type { FC } from 'react'
import SideNav from '@/components/ux/navigation/SideNav'
import BottomNav from '@/components/ux/navigation/BottomNav'
import ThemeSelector from '@/components/ux/ThemeSelector'
import LanguageSelector from '@/components/ux/LanguageSelector'
import { Link, Outlet } from 'react-router'

const MainLayout: FC = () => {
  const isMobile = useMediaQuery('(max-width: 767px)')
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Aller au contenu</a>
      {!isMobile && <SideNav />}
      <div className="app-body">
        {isMobile && <header className="mobile-header">
          <Link to="/" className="mobile-brand"><img src="/images/logo.positive.png" alt="Territory Generator" /></Link>
          <div className="page-actions"><LanguageSelector /><ThemeSelector /></div>
        </header>}
        <main id="main-content" tabIndex={-1} className="app-main"><Outlet /></main>
      </div>
      {isMobile && <BottomNav />}
    </div>
  )
}


export default MainLayout
