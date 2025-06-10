import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { sendApiC } from '../utils'
import { User } from '%/types'

interface UserState {
  user: User | null
  loading: boolean
  initialized: boolean
  fetchMe: () => Promise<void>
  setUser: (user: User | null) => void
  logout: () => void
  clearUserCache: () => void
  getUsername: () => string
}

export const useUser = create<UserState>()(
  persist(
    (set, get) => ({
      user: null,
      loading: true,
      initialized: false,      fetchMe: async () => {
        set({ loading: true })

        try {
          const response = await sendApiC('/me') as User
          if (!response) {
            set({ user: null })
            return
          }
          const user: User = {
            id: response.id,
            username: response.username,
            email: response.email,
            emailVerified: response.emailVerified || null,
            createdAt: response.createdAt
          }
          set({ user })
        } catch (error: any) {
          // Si l'utilisateur n'est pas trouvé côté serveur (401/404), on vide le cache local
          if (error?.response?.status === 401 || error?.response?.status === 404) {
            console.log('Utilisateur non trouvé côté serveur, nettoyage du cache local')
            set({ user: null })
          } else {
            set({ user: null })
          }
        } finally {
          set({ loading: false, initialized: true })
        }
      },

      setUser: (user) => set({ user }),
      logout: () => set({ user: null }),
      clearUserCache: () => {
        set({ user: null })
        // Vider aussi le localStorage manuellement
        localStorage.removeItem('user')
      },
      getUsername: () => get().user?.username ?? '',
    }),    {
      name: 'user',
      partialize: (state) => ({ user: state.user }),
      // Force la vérification utilisateur au démarrage
      onRehydrateStorage: () => (state) => {
        if (state?.user) {
          // Si on a un utilisateur en cache, vérifier qu'il existe encore côté serveur
          setTimeout(() => {
            state.fetchMe()
          }, 100)
        }
      }
    }
  )
)
