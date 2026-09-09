import { create } from 'zustand'
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware'
import type { PaintLayer } from '../utils/types'
import { useUser } from '../hooks/useUser'
import { toast } from 'sonner'

let storageWarning = false
const draftStorage: StateStorage = {
  getItem: name => { try { return sessionStorage.getItem(name) } catch { return null } },
  removeItem: name => { try { sessionStorage.removeItem(name) } catch { /* Storage may be disabled. */ } },
  setItem: (name, value) => {
    try { sessionStorage.setItem(name, value); storageWarning = false }
    catch {
      // Retain the live draft in memory and avoid restoring an obsolete copy.
      draftStorage.removeItem(name)
      if (!storageWarning) toast.error('Stockage local indisponible. Sauvegardez vos dessins avant de recharger ou fermer cet onglet.')
      storageWarning = true
    }
  },
}

type Draft = { layers: PaintLayer[]; updatedAt: number }
type State = {
  drafts: Record<string, Draft>
  setDraft: (key: string, layers: PaintLayer[]) => void
  clearDraft: (key: string, savedLayers?: PaintLayer[]) => void
  clearTerritory: (num: string) => void
}
export const draftKey = (num: string, large: boolean) => JSON.stringify([useUser.getState().user?.id, num, large])
export const useDrawingDrafts = create<State>()(persist((set, get) => ({
  drafts: {},
  setDraft: (key, layers) => {
    if (JSON.stringify(get().drafts[key]?.layers) === JSON.stringify(layers)) return
    set({ drafts: { ...get().drafts, [key]: { layers, updatedAt: Date.now() } } })
  },
  clearDraft: (key, savedLayers) => {
    const draft = get().drafts[key]
    if (savedLayers && draft && JSON.stringify(draft.layers) !== JSON.stringify(savedLayers)) return
    const drafts = { ...get().drafts }
    delete drafts[key]
    set({ drafts })
  },
  clearTerritory: num => {
    const drafts = { ...get().drafts }
    delete drafts[draftKey(num, false)]
    delete drafts[draftKey(num, true)]
    set({ drafts })
  },
}), { name: 'territory-drawing-drafts', storage: createJSONStorage(() => draftStorage), partialize: state => ({ drafts: state.drafts }) }))

useUser.subscribe((state, previous) => {
  if (state.user?.id !== previous.user?.id) useDrawingDrafts.setState({ drafts: {} })
})
