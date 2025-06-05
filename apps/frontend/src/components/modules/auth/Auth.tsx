import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Input from '#/ui/Input'
import Modal from '#/ui/Modal'
import { useMediaQuery } from 'usehooks-ts'

import { Mail, User, Lock, ChevronRight, ChevronLeft } from 'lucide-react'
import { error, success, sendApiC } from '@/utils'
import { Switch } from '@/components/ui/shadcn'
import Loader from '@/components/ui/Loader'
import { useUser } from '&/useUser'
import { redirect } from 'react-router'

const Auth = () => {
  const { t } = useTranslation()
  const { fetchMe, user } = useUser()
  const [tab, setTab] = useState<'login' | 'register' | 'reset'>('login')
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ username: '', email: '', password: '', remember: false })
  const [loading, setLoading] = useState(false)
  const isMobile = useMediaQuery('(max-width: 767px)')
  const loginRef = useRef<HTMLDivElement>(null)
  const registerRef = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState<number>(0)
  const [oppositeHeight, setOppositeHeight] = useState<number>(0)

  const changeSize = () => {
    const ref = tab === 'login' || tab === 'reset' ? registerRef : loginRef
    const oppRef = tab === 'login' || tab === 'reset' ? loginRef : registerRef
    const el = ref.current
    const elOpp = oppRef.current
    if (el) setHeight(el.scrollHeight)
    if (elOpp) setOppositeHeight(elOpp.scrollHeight)
  }

  useEffect(() => {
    if (!isMobile || !open) return
    changeSize()
  }, [open, isMobile])

  useEffect(() => {
    if (!isMobile) return
    changeSize()
  }, [tab, isMobile])


  const onClose = () => {
    setOpen(false)
    setTab('login')
    setForm({ username: '', email: '', password: '', remember: false })
  }

  const handleSwitch = () => {
    setTab(tab === 'login' ? 'register' : 'login')
    setForm({ username: '', email: '', password: '', remember: false })
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleCheckedChange = (checked: boolean) => {
    setForm({ ...form, remember: checked });
  };

  const handleLogout = async () => {
    await sendApiC('/auth/logout')
    await fetchMe()
    redirect('/')
  }

  const handleSubmit = async () => {
    try {
      const payload = {
        email: form.email,
        ...((tab === 'register' || tab === 'login') && { password: form.password }),
        ...(tab === 'register' && { username: form.username })
      }
      setLoading(true)
      await sendApiC(`/auth/${tab}`, 'POST', {
        headers: { 'Content-Type': 'application/json' },
        data: payload
      })

      if (tab !== 'reset') {
        await fetchMe()
        setOpen(false)
        redirect('/')
      }
      else
        setTab('login')

      setLoading(false)
      setForm({ username: '', email: '', password: '', remember: false })
      success(t(`api.success.auth.${tab}`))

    } catch (err: any) {
      setLoading(false)
      error(err)
    }
  }

  return (
    <>
      {user?.username ?
        <button className="btn-negative w-full" onClick={handleLogout}>
          {t('c.md.auth.logout')}
        </button> :
        <button className="btn-positive w-full" onClick={() => setOpen(true)}>
          {t('c.md.auth.login.title')}
        </button>
      }
      <Modal isOpen={open} onClose={onClose} className="w-200 md:h-120 h-80dvh">
        <div className={`absolute inset-0 z-10 grid ${isMobile ? 'grid-rows-2' : 'grid-cols-2'}`}>
          {/* Login */}
          <div ref={loginRef} className="relative">
            <Loader enabled={loading && tab === "login"} />
            <div className='bg-dark absolute w-full h-full z-10 flex items-center justify-center' hidden={tab !== 'reset'}>
              <div className="w-80% ">
                <Input type='email' name="email" Icon={Mail} placeholder={t('c.md.auth.common.email')} className="w-full mb-2" value={form.email} onChange={handleChange} />
                <button onClick={handleSubmit} className="btn w-full bg-positive text-white hover:bg-positive-hover transition mt-2">
                  {t('c.md.auth.common.reset')}
                </button>
              </div>
            </div>
            <button onClick={onClose} className='absolute top-2 right-2 text-muted cursor-pointer z-11'>✕</button>
            <div className="flex flex-col items-center justify-center h-full mx-auto w-80% gap-4 transition duration-400" style={{ opacity: tab === 'login' ? 1 : 0 }}>
              <form className="w-full" onSubmit={(e) => { e.preventDefault(); }}>
                <Input type='email' name="email" Icon={Mail} placeholder={t('c.md.auth.common.email')} className="w-full mb-2" value={tab === 'login' ? form.email : ''} onChange={handleChange} autocomplete={"email"} />
                <Input type="password" name="password" Icon={Lock} placeholder={t('c.md.auth.common.password')} className="w-full mb-2" value={tab === 'login' ? form.password : ''} onChange={handleChange} autocomplete={"current-password"} />
                <div className='mb-1'>
                  <Switch id="remember" name='remember' className='data-[state=checked]:bg-positive data-[state=unchecked]:bg-positive-unactive' onCheckedChange={handleCheckedChange} />
                  <label className={`${form.remember ? '' : 'text-foreground'} transition`}> {t('c.md.auth.login.remember')}</label>
                </div>
                <span className="text-sm text-muted cursor-pointer hover:text-positive transition" onClick={() => setTab('reset')} >{t('c.md.auth.common.forget')}</span>
                <button onClick={handleSubmit} className="btn w-full bg-positive text-white hover:bg-positive-hover transition mt-4">
                  {t('c.md.auth.login.title')}
                </button>
              </form>
            </div>
          </div>

          {/* Register */}
          <div ref={registerRef} className="relative min-h-100">
            <Loader enabled={loading && tab === "register"} />
            <button onClick={onClose} className='absolute top-2 right-2 text-muted cursor-pointer'>✕</button>
            <div className="flex flex-col items-center justify-center h-full mx-auto w-80% gap-4 transition duration-400" style={{ opacity: tab === 'register' ? 1 : 0 }}>
              <div className="w-full">
                <Input type="username" name="username" verified={true} Icon={User} placeholder={t('c.md.auth.register.username')} className="w-full mb-2" value={tab === 'register' ? form.username : ''} onChange={handleChange} />
                <Input name="email" type="email" verified={true} Icon={Mail} placeholder={t('c.md.auth.common.email')} className="w-full mb-2" value={tab === 'register' ? form.email : ''} onChange={handleChange} />
                <Input name="password" type="password" verified={true} Icon={Lock} placeholder={t('c.md.auth.common.password')} className="w-full mb-2" value={tab === 'register' ? form.password : ''} onChange={handleChange} />
                <button onClick={handleSubmit} className="btn-positive w-full">
                  {t('c.md.auth.register.title')}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Barre mobile/desktop qui glisse */}
        <div
          className={`absolute ${isMobile ? 'left-0 top-0 w-full' : 'top-0 left-0 w-1/2'}
          bg-lightnd dark:bg-darknd rounded-md shadow-lg transition-all duration-500 z-20 p-2`}
          style={{
            transform: isMobile
              ? tab === 'login' || tab === 'reset'
                ? `translateY(${oppositeHeight}px)`
                : 'translateY(0%)'
              : tab === 'login' || tab === 'reset'
                ? 'translateX(100%)'
                : 'translateX(0%)',
            height: isMobile ? height : '100%',
          }}
        >
          <div className="flex items-center justify-center h-full">
            <div className="border-b border-positive transition hover:(border-b-2)">
              <AnimatePresence mode="wait">
                <motion.button
                  key={tab}
                  onClick={handleSwitch}
                  className="text-xl font-semibold p-2 cursor-pointer"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  whileHover={{ scale: 1.05 }}
                  transition={{ duration: 0.3 }}
                >
                  {tab === 'login' && <ChevronLeft size={20} className="inline-block -translate-x-2" />}
                  {t(`c.md.auth.${tab === "login" ? "register" : "login"}.title`)}
                  {tab === 'register' && <ChevronRight size={20} className="inline-block translate-x-2" />}
                </motion.button>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </Modal>
    </>
  )
}

export default Auth
