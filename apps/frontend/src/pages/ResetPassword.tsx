import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { sendApi, getError } from '@/utils'
import Wrapper from '@/components/ui/Wrapper'
import Input from '@/components/ui/Input'
import { Lock } from 'lucide-react'

const ResetPassword = () => {
  const { t } = useTranslation()
  const [status, setStatus] = useState<'pending' | 'success' | 'error'>('pending')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const handleSubmit = async () => {
    try {
      setStatus('pending')
      await sendApi('/auth/reset/confirm', 'POST', {
        data: { token, password }
      })
      setStatus('success')
    } catch (err) {
      setError(getError(err))
      setStatus('error')
    }
  }

  useEffect(() => {
    if (!token) setStatus('error')
  }, [token])

  return (
    <Wrapper className="h-[calc(100vh-64px)] flex flex-col items-center justify-center text-center px-4">
      {status === 'pending' && token && (
        <div className="space-y-4 max-w-sm w-full">
          <h1 className="text-2xl font-bold">{t('p.resetPassword.title')}</h1>
          <Input
            type="password"
            Icon={Lock}
            placeholder={t('p.resetPassword.placeholder')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            onClick={handleSubmit}
            className="btn-positive w-full"
          >
            {t('p.resetPassword.confirm')}
          </button>
        </div>
      )}

      {status === 'success' && (
        <h1 className="text-2xl font-bold text-success mb-4">
          {t('p.resetPassword.success')}
        </h1>
      )}

      {status === 'error' && (
        <>
          <h1 className="text-2xl font-bold text-error mb-4">
            {error || t('p.resetPassword.error')}
          </h1>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-4 py-2 bg-neutral text-white text-sm font-medium rounded-lg shadow hover:bg-neutral/90 transition"
          >
            {t('p.resetPassword.back')}
          </Link>
        </>
      )}
    </Wrapper>
  )
}

export default ResetPassword
