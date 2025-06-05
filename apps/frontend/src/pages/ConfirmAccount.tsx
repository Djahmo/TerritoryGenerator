import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { sendApi, getError } from '@/utils'
import Wrapper from '@/components/ui/Wrapper'

const ConfirmAccount = () => {
  const { t } = useTranslation()
  const [status, setStatus] = useState<'pending' | 'success' | 'error'>('pending')
  const [error, setError] = useState('')
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  useEffect(() => {
    if (!token) { return setStatus('error') }

    (async () => {
      try {
        await sendApi('/auth/confirm', 'POST', {
          data: { token },
        })
        setStatus('success')
      } catch (err) {
        setError(getError(err))
        setStatus('error')
      }
    })()
  }, [token])

  return (
    <Wrapper className="h-[calc(100vh-64px)] flex flex-col items-center justify-center text-center px-4">
      {status === 'pending' && <p className="text-lg text-muted">{t('p.confirmAccount.loading')}</p>}

      {status === 'success' && <h1 className="text-2xl font-bold text-success mb-4"> {t('p.confirmAccount.success')} </h1>}

      {status === 'error' && <>
        <h1 className="text-2xl font-bold text-error mb-4"> {error} </h1>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-4 py-2 bg-neutral text-white text-sm font-medium rounded-lg shadow hover:bg-neutral/90 transition"
        >
          {t('p.confirmAccount.back')}
        </Link>
      </>}
    </Wrapper>
  )
}

export default ConfirmAccount
