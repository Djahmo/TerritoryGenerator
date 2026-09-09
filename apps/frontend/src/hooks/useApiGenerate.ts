import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import type { Territory } from '%/types'
import { ApiTerritoryService } from '../services/apiTerritoryService'
import { imageToDataUrl, loadImage } from '../services/imageService'

export const useApiGenerate = () => {
  const api = useMemo(() => new ApiTerritoryService(), [])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const run = useRef(0)
  useEffect(() => () => { run.current++ }, [])

  const generateImages = useCallback(async (territories: Territory[], callback: (territories: Territory[]) => void) => {
    const currentRun = ++run.current
    setLoading(true)
    setError(null)
    try {
      const existing = await api.getTerritories()
      const complete = new Set(existing.filter(t => t.image && t.miniature).map(t => t.num))
      const pending = territories.filter(t => !complete.has(t.num))
      setProgress({ current: 0, total: pending.length })
      const failed: string[] = []
      // The server already serializes IGN requests. Avoid filling its queue with retries.
      for (const [index, territory] of pending.entries()) {
        if (currentRun !== run.current) return
        try { await api.generateStandardImage(territory) }
        catch { failed.push(territory.num) }
        if (currentRun !== run.current) return
        setProgress({ current: index + 1, total: pending.length })
      }
      if (currentRun !== run.current) return
      callback(await api.getTerritories())
      if (failed.length) setError(`Génération échouée pour : ${failed.join(', ')}. Réimportez le fichier pour réessayer les cartes manquantes.`)
    } catch (err) {
      if (currentRun === run.current) setError(err instanceof Error ? err.message : 'Génération impossible')
    } finally {
      if (currentRun === run.current) { setLoading(false); setProgress({ current: 0, total: 0 }) }
    }
  }, [api])
  const generateLargeImage = useCallback(async (territory: Territory) => (await api.generateLargeImage(territory)).success, [api])
  const generateStandardImage = useCallback(async (territory: Territory) => (await api.generateStandardImage(territory)).success, [api])
  const generateLargeImageWithCrop = useCallback(async (
    territory: Territory, bbox: [number, number, number, number],
    crop?: { x: number; y: number; width: number; height: number; imageWidth: number; imageHeight: number },
  ) => (await api.generateLargeImageWithCustomBbox(territory, bbox, {}, crop)).success, [api])
  const generateThumbnailFromImage = useCallback(async (src: string) => {
    const img = await loadImage(src)
    return imageToDataUrl(img, 300, Math.round(img.naturalHeight * 300 / img.naturalWidth))
  }, [])
  return { loading, error, progress, generateImages, generateLargeImage, generateStandardImage, generateLargeImageWithCrop, generateThumbnailFromImage }
}
