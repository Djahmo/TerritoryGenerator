import { Fragment, useEffect } from 'react'
import { useUser } from '&/useUser'

interface AuthProviderProps {
  children: React.ReactNode
}

const AuthProvider = ({ children }: AuthProviderProps) => {
  const { fetchMe, initialized, user } = useUser()

  useEffect(() => {
    // Démarrer la vérification d'authentification au montage du composant
    if (!initialized) {
      fetchMe()
    }
  }, [fetchMe, initialized])

  return <Fragment key={user?.id ?? 'anonymous'}>{children}</Fragment>
}

export default AuthProvider
