import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import Wrapper from '@/components/ui/Wrapper'

const NotFound = () => {
  const { t } = useTranslation()
  return (
    <Wrapper className="h-[calc(100vh-64px)] flex flex-col items-center justify-center text-center px-4">
      <h1 className="text-6xl font-bold text-destructive mb-4">404</h1>
      <p className="text-lg text-muted-foreground mb-6">
        {t('p.notfound.title')}
      </p>
      <Link
        to="/"
        className="inline-flex items-center gap-2 px-4 py-2 bg-neutral text-white text-sm font-medium rounded-lg shadow hover:bg-neutral/90 transition"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4" />
        </svg>
        {t('p.notfound.back')}
      </Link>
    </Wrapper>
  )
}

export default NotFound
