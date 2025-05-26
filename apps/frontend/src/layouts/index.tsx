import { useMediaQuery } from 'usehooks-ts'
import type { FC } from 'react'
import SideNav from '@/components/ux/navigation/SideNav'
import Topbar from '@/components/ux/navigation/Topbar'
import BottomNav from '@/components/ux/navigation/BottomNav'
import { Outlet } from 'react-router'

const MainLayout: FC = () => {
  const isMobile = useMediaQuery('(max-width: 767px)')
  return (
    <div className="fixed inset-0 flex flex-col w-full h-full min-w-375px bg-light text-dark dark:(bg-dark text-light) font-sans overflow-hidden">
      <div className="flex flex-1 w-full min-w-0 h-0">
        {!isMobile && <SideNav />}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          {!isMobile && <Topbar />}
          <main className="flex-1 relative min-w-0 overflow-hidden pb-16 mb-16 md:(pb-0 mb-0)">
            <Outlet />
          </main>
        </div>
      </div>
      {isMobile && <BottomNav />}
    </div>
  )
}


export default MainLayout
