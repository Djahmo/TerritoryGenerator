import { useEffect } from 'react'
import { useUser } from '&/useUser'

interface AuthProviderProps {
  children: React.ReactNode
}

const AuthProvider = ({ children }: AuthProviderProps) => {
  const { fetchMe, initialized } = useUser()

  useEffect(() => {
    // Démarrer la vérification d'authentification au montage du composant
    if (!initialized) {
      fetchMe()
    }
  }, [fetchMe, initialized])

  return <>{children}</>
}

export default AuthProvider
