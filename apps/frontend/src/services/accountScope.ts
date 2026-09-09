import { useUser } from '../hooks/useUser'

let version = 0
const pending = new Set<AbortController>()

useUser.subscribe((state, previous) => {
  if (state.user?.id === previous.user?.id) return
  version++
  for (const controller of pending) controller.abort()
  pending.clear()
})

export const getAccountScope = () => version
export const isAccountScopeCurrent = (scope: number) => scope === version

export const accountFetch = async (scope: number, url: string, options: RequestInit = {}) => {
  if (!isAccountScopeCurrent(scope)) throw new Error('Account changed')
  const controller = new AbortController()
  pending.add(controller)
  try {
    const response = await fetch(url, { ...options, signal: controller.signal, credentials: 'include' })
    // Read the body before releasing the controller so a switch also cancels downloads.
    const body = await response.arrayBuffer()
    if (!isAccountScopeCurrent(scope)) throw new Error('Account changed')
    return new Response(response.status === 204 ? null : body, {
      status: response.status, statusText: response.statusText, headers: response.headers,
    })
  } finally {
    pending.delete(controller)
  }
}
