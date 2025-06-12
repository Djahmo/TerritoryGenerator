import { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router'
import { useUser } from '&/useUser'

interface ProtectedRouteProps {
  children: React.ReactNode
  redirectTo?: string
  allowAnonymous?: boolean // Nouvelle prop pour permettre l'accès anonyme
}

const ProtectedRoute = ({ children, redirectTo = '/configuration', allowAnonymous = false }: ProtectedRouteProps) => {
  const { user, loading, initialized } = useUser()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    // Attendre que l'initialisation soit terminée
    if (!initialized || loading) return

    // Si l'accès anonyme est autorisé, ne pas rediriger
    if (allowAnonymous) return

    // Si pas d'utilisateur connecté et pas déjà sur la page de configuration, rediriger
    if (!user && location.pathname !== redirectTo) {
      console.log('🔒 Utilisateur non connecté, redirection vers:', redirectTo)
      navigate(redirectTo, { replace: true })
    }
  }, [user, loading, initialized, navigate, redirectTo, allowAnonymous, location.pathname])

  // Afficher un loader pendant l'initialisation (sauf si accès anonyme autorisé)
  if (!allowAnonymous && (!initialized || loading)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-positive mx-auto mb-4"></div>
          <p className="text-muted">Vérification de l'authentification...</p>
        </div>
      </div>
    )
  }

  // Si pas d'utilisateur et pas d'accès anonyme, ne rien afficher (la redirection est en cours)
  if (!allowAnonymous && !user && initialized && !loading) {
    return null
  }

  // Afficher le contenu dans tous les autres cas
  return <>{children}</>
}

export default ProtectedRoute
