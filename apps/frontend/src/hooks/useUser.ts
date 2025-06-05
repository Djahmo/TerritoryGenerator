import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { checkOnlineStatus, isOnline, sendApiC } from '../utils'
import { User } from '%/types'

interface UserState {
  user: User | null
  loading: boolean
  initialized: boolean
  fetchMe: () => Promise<void>
  setUser: (user: User | null) => void
  logout: () => void
}

export const useUser = create<UserState>()(
  persist(
    (set, get) => ({
      user: null,
      loading: true,
      initialized: false,

      fetchMe: async () => {
        await checkOnlineStatus()
        if (!isOnline) {
          set({ loading: false, initialized: true })
          return
        }

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
        } catch {
          set({ user: null })
        } finally {
          set({ loading: false, initialized: true })
        }
      },

      setUser: (user) => set({ user }),
      logout: () => set({ user: null }),
      getUsername: () => get().user?.username ?? '',
    }),
    {
      name: 'user',
      partialize: (state) => ({ user: state.user }),
    }
  )
)
