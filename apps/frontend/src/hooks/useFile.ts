import { useState, useCallback, useRef } from 'react'
import { makeGpx } from '../utils/territoryFiles'
import type { Territory } from '%/types'

export const useFileReader = () => {
  const sequence = useRef(0)
  const [content, setContent] = useState('')
  const [type, setType] = useState('')
  const [error, setError] = useState<string | null>(null)
  const readFile = useCallback((file: File) => {
    const current = ++sequence.current
    setError(null); setContent(''); setType('')
    void file.arrayBuffer().then(buffer => {
      if (current !== sequence.current) return
      let text: string
      try { text = new TextDecoder('utf-8', { fatal: true }).decode(buffer) }
      catch {
        if (!/\.csv$/i.test(file.name)) throw new Error('Encodage GPX invalide (UTF-8 attendu)')
        text = new TextDecoder('windows-1252').decode(buffer)
      }
      if (!text.trim()) throw new Error('Le fichier est vide.')
      setContent(text); setType(file.type || file.name.split('.').pop() || '')
    }).catch(error => {
      if (current === sequence.current) setError(error instanceof Error ? error.message : 'Erreur de lecture du fichier')
    })
  }, [])
  return { content, type, error, readFile }
}
export { parse, parseCsv, parseGpx, makeGpx } from '../utils/territoryFiles'
export const handleGpxDownload = (territories: Territory[]) => {
  const url = URL.createObjectURL(new Blob([makeGpx(territories)], { type: 'application/gpx+xml' }))
  const a = document.createElement('a')
  a.href = url; a.download = 'territoires.gpx'; a.click()
  setTimeout(() => URL.revokeObjectURL(url), 30_000)
}
