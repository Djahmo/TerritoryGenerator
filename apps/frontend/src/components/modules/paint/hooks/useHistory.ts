import { useState, useRef, useCallback } from 'react'
import type { DrawObject } from '../utils/types'

export const useHistory = (objects: DrawObject[]) => {
  const state = useRef({ history: [objects], historyIndex: 0 })
  const [snapshot, setSnapshot] = useState(state.current)
  const addToHistory = useCallback((next: DrawObject[]) => {
    const { history, historyIndex } = state.current
    const updated = [...history.slice(0, historyIndex + 1), next].slice(-100)
    state.current = { history: updated, historyIndex: updated.length - 1 }
    setSnapshot(state.current)
  }, [])
  const move = useCallback((direction: number) => {
    const { history, historyIndex } = state.current
    const index = Math.max(0, Math.min(history.length - 1, historyIndex + direction))
    state.current = { history, historyIndex: index }
    setSnapshot(state.current)
    return history[index]
  }, [])
  const undo = useCallback(() => move(-1), [move])
  const redo = useCallback(() => move(1), [move])
  return { ...snapshot, addToHistory, undo, redo, canUndo: snapshot.historyIndex > 0, canRedo: snapshot.historyIndex < snapshot.history.length - 1 }
}
