import { useState, useCallback } from "react"
import type { DrawObject } from "../utils/types"

export const useHistory = (objects: DrawObject[]) => {
  const [history, setHistory] = useState<DrawObject[][]>([objects])
  const [historyIndex, setHistoryIndex] = useState(0)

  const addToHistory = useCallback((newObjects: DrawObject[]) => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1)
      newHistory.push(newObjects)
      return newHistory
    })
    setHistoryIndex(prev => prev + 1)
  }, [historyIndex])

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(prev => prev - 1)
      return history[historyIndex - 1]
    }
    return objects
  }, [historyIndex, history, objects])

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(prev => prev + 1)
      return history[historyIndex + 1]
    }
    return objects
  }, [historyIndex, history, objects])

  const canUndo = historyIndex > 0
  const canRedo = historyIndex < history.length - 1

  return {
    history,
    historyIndex,
    addToHistory,
    undo,
    redo,
    canUndo,
    canRedo
  }
}
