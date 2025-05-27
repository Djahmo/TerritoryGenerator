import { useState } from 'react'
import type { FC } from 'react'
import { Home, ArrowLeft, ArrowRight } from 'lucide-react'
import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { motion } from "framer-motion"
import LanguageSelector from '../LanguageSelector'
import ThemeSelector from '../ThemeSelector'

const SideNav: FC = () => {
  const { t } = useTranslation()

  const links = [
    { label: t('c.ux.nav.home'), icon: Home, href: '/' }
  ]

  const [open, setOpen] = useState(true)

  return (
    <div className="relative h-full">
      <aside className={`bg-lightnd dark:bg-darknd h-full px-2 py-4 flex flex-col justify-between transition-all duration-300 ${open ? 'w-60' : 'w-16'} `}>
        <div className='flex flex-col'>
          {/* Logo */}
          <Link to="/" className={`text-xl font-bold text-positive mb-4 -pl-2 transition-opacity duration-200 whitespace-nowrap overflow-hidden text-center`}>
            <motion.img
              key={open ? "positive" : "clear"}
              src={`/images/logo.${open ? "positive" : "clear"}.png`}
              alt="Logo"
              className="mx-auto w-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
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
              <span className={`ml-3 transition-all duration-300 overflow-hidden whitespace-nowrap
              ${open ? 'opacity-100 max-w-xs' : 'opacity-0 max-w-0'}
            `}>
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

      {/* Bouton demi-lune à l’extérieur */}
      <button
        onClick={() => setOpen(!open)}
        className="hidden md:flex items-center justify-center absolute top-32 -right-4 w-5 h-12 bg-lightnd dark:bg-darknd dark:border-dark/20 rounded-r-full z-10 hover:text-positive cursor-pointer transition-colors"
      >
        {open ? <ArrowLeft size={16} /> : <ArrowRight size={16} />}
      </button>
    </div>
  )
}

export default SideNav
