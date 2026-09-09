import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { sendApiC } from '../utils'
import { User } from '%/types'

let authRequestVersion = 0

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
      initialized: false,
      fetchMe: async () => {
        const version = ++authRequestVersion
        set({ loading: true })

        try {
          const response = await sendApiC('/me') as User
          if (version !== authRequestVersion) return
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
        } catch {
          if (version !== authRequestVersion) return
          set({ user: null })
        } finally {
          if (version === authRequestVersion) set({ loading: false, initialized: true })
        }
      },

      setUser: (user) => { authRequestVersion++; set({ user, loading: false }) },
      logout: () => { authRequestVersion++; set({ user: null, loading: false }) },
      clearUserCache: () => {
        authRequestVersion++
        set({ user: null, loading: false })
        // Vider aussi le localStorage manuellement
        localStorage.removeItem('user')
      },
      getUsername: () => get().user?.username ?? '',
    }),    {
      name: 'user',
      partialize: (state) => ({ user: state.user }),
    }
  )
)
