import { useRouteError } from 'react-router'
import { useTranslation } from 'react-i18next'
const ErrorBoundary = () => {
  const error = useRouteError()
  const { t } = useTranslation()
  const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches

  const message = error instanceof Error ? error.message : t('c.ux.errorBoundary.defaultMessage')
  const stack = error instanceof Error ? error.stack : null

  return (
    <div className='flex flex-col items-center bg-dark h-screen'>
      <div
        className={`p-6 my-8 mx-auto max-w-3xl rounded-lg border-2 ${isDark
          ? 'bg-neutral-900 text-red-300 border-red-700'
          : 'bg-red-100 text-red-800 border-red-500'
          }`}
      >
        <h1 className="text-2xl font-bold mb-4">{t('c.ux.errorBoundary.title')}</h1>
        <p className="font-mono text-sm break-words whitespace-pre-wrap mb-4">
          {message}
        </p>
        {stack && (
          <pre className="text-xs overflow-x-auto whitespace-pre-wrap opacity-70">
            {stack}
          </pre>
        )}
        <button
          onClick={() => location.reload()}
          className={`btn mt-4 ${isDark ? 'bg-red-800 hover:bg-red-700' : 'bg-red-600 hover:bg-red-500'
            } text-white`}
        >
          {t('c.ux.errorBoundary.retry')}
        </button>
      </div>
    </div>
  )
}

export default ErrorBoundary
