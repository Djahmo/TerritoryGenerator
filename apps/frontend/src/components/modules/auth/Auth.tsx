import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Input from '#/ui/Input'
import Modal from '#/ui/Modal'

import { Mail, User, Lock, X, LogOut } from 'lucide-react'
import { error, success, sendApiC } from '@/utils'
import { Switch } from '@/components/ui/shadcn'
import { useUser } from '&/useUser'
import { useNavigate } from 'react-router'

const Auth = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { fetchMe, user, clearUserCache } = useUser()
  const [tab, setTab] = useState<'login' | 'register' | 'reset'>('login')
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ username: '', email: '', password: '', remember: false })
  const [loading, setLoading] = useState(false)
  const [sendingConfirmation, setSendingConfirmation] = useState(false)
  const rememberId = useId()

  const onClose = () => {
    setOpen(false)
    setTab('login')
    setForm({ username: '', email: '', password: '', remember: false })
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleCheckedChange = (checked: boolean) => {
    setForm({ ...form, remember: checked });
  };
  const handleLogout = async () => {
    try {
      await sendApiC('/auth/logout')
      clearUserCache() // Vider le cache local
      await fetchMe()
      navigate('/')
    } catch (error) {
      // En cas d'erreur de déconnexion, vider quand même le cache local
      console.warn('Erreur lors de la déconnexion, nettoyage du cache local')
      clearUserCache()
      navigate('/')
    }
  }

  const handleSubmit = async () => {
    if (loading) return
    try {
      const payload = {
        email: form.email,
        ...((tab === 'register' || tab === 'login') && { password: form.password }),
        ...(tab === 'register' && { username: form.username }),
        ...(tab === 'login' && { remember: form.remember })
      }
      setLoading(true)
      await sendApiC(`/auth/${tab}`, 'POST', {
        headers: { 'Content-Type': 'application/json' },
        data: payload
      })

      if (tab !== 'reset') {
        await fetchMe()
        setOpen(false)
        navigate('/')
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
      {user && !user.emailVerified && (
        <button className="btn-positive w-full mb-2" disabled={sendingConfirmation} onClick={async () => {
          setSendingConfirmation(true)
          try {
            await sendApiC('/auth/confirm/resend', 'POST')
            success(t('c.md.auth.confirmationSent'))
          } catch (err) {
            error(err)
          } finally {
            setSendingConfirmation(false)
          }
        }}>
          {t('c.md.auth.resendConfirmation')}
        </button>
      )}
      {user?.username ? <div className="account-panel"><span className="avatar">{user.username.slice(0, 1).toUpperCase()}</span><div><strong>{user.username}</strong><p>{user.email}</p></div><button className="btn-neutral" onClick={handleLogout}><LogOut size={15} />{t('c.md.auth.logout')}</button></div> :
        <button className="btn-positive" onClick={() => setOpen(true)}>{t('c.md.auth.login.title')}</button>}
      <Modal isOpen={open} onClose={onClose} title={t(`c.md.auth.${tab === 'reset' ? 'common' : tab}.${tab === 'reset' ? 'reset' : 'title'}`)} className="auth-dialog">
        <div className="flex items-center justify-between gap-4 mb-6"><div><p className="eyebrow">Territory Generator</p><h2 className="text-2xl font-semibold">{tab === 'reset' ? t('c.md.auth.common.reset') : t(`c.md.auth.${tab}.title`)}</h2></div><button className="icon-button" onClick={onClose} aria-label="Fermer"><X size={18} /></button></div>
        {tab !== 'reset' && <div className="segmented-control mb-6" role="group" aria-label="Accès au compte">
          {(['login', 'register'] as const).map(value => <button key={value} disabled={loading} aria-pressed={tab === value} onClick={() => setTab(value)}>{t(`c.md.auth.${value}.title`)}</button>)}
        </div>}
        <form className="flex flex-col gap-4" onSubmit={e => { e.preventDefault(); void handleSubmit() }}>
          {tab === 'register' && <Input label={t('c.md.auth.register.username')} type="username" name="username" verified Icon={User} placeholder={t('c.md.auth.register.username')} value={form.username} onChange={handleChange} disabled={loading} autocomplete="username" />}
          <Input label={t('c.md.auth.common.email')} type="email" name="email" Icon={Mail} placeholder={t('c.md.auth.common.email')} value={form.email} onChange={handleChange} disabled={loading} autocomplete="email" verified={tab === 'register'} />
          {tab !== 'reset' && <Input label={t('c.md.auth.common.password')} type="password" name="password" Icon={Lock} placeholder={t('c.md.auth.common.password')} value={form.password} onChange={handleChange} disabled={loading} autocomplete={tab === 'register' ? 'new-password' : 'current-password'} verified={tab === 'register'} />}
          {tab === 'login' && <div className="flex flex-wrap items-center justify-between gap-3 text-xs"><div className="flex items-center gap-2"><Switch id={rememberId} checked={form.remember} disabled={loading} onCheckedChange={handleCheckedChange} /><label htmlFor={rememberId}>{t('c.md.auth.login.remember')}</label></div><button type="button" className="card-open" disabled={loading} onClick={() => setTab('reset')}>{t('c.md.auth.common.forget')}</button></div>}
          <button className="btn-accent w-full" type="submit" disabled={loading}>{loading ? 'Veuillez patienter…' : tab === 'reset' ? t('c.md.auth.common.reset') : t(`c.md.auth.${tab}.title`)}</button>
          {tab === 'reset' && <button type="button" className="btn-neutral" disabled={loading} onClick={() => setTab('login')}>{t('c.md.auth.login.title')}</button>}
        </form>
      </Modal>
    </>
  )
}
export default Auth
