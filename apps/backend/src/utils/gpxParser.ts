import { DOMParser } from '@xmldom/xmldom'

export interface Coord {
  lat: number
  lon: number
}

export interface Territory {
  num: string
  polygon: Coord[]
  name?: string
  isDefault?: boolean
  original?: string
  originalLarge?: string
  image?: string
  large?: string
  miniature?: string
}

/**
 * Parse un contenu GPX et retourne un tableau de territoires
 */
export const parseGpx = (xml: string): Territory[] => {
  try {
    const parser = new DOMParser({ onError: level => { throw new Error(`GPX invalide (${level})`) } })
    const doc = parser.parseFromString(xml, "application/xml")
    if (doc.documentElement?.localName !== 'gpx') throw new Error('GPX invalide')
    const numbers = new Set<string>()
    const trks = Array.from(doc.getElementsByTagNameNS("*", "trk"))

    return trks.map(trk => {
      const nameEl = trk.getElementsByTagNameNS("*", "name")[0]
      const numName = nameEl?.textContent?.trim() || ""
      const parts = numName.match(/^(.*?) -(?: |$)(.*)$/s)
      const num = (parts ? parts[1] : numName).trim()
      const name = parts ? parts[2].trim() : ''
      const trkpts = Array.from(trk.getElementsByTagNameNS("*", "trkpt"))
      const polygon = trkpts.map(pt => ({
        lat: Number(pt.getAttribute("lat") || NaN),
        lon: Number(pt.getAttribute("lon") || NaN),
      }))
      if (!num || num.length > 50 || /[\\/\x00-\x1f\x7f]/.test(num) || ['.', '..'].includes(num) || numbers.has(num)) throw new Error('Numéro de territoire invalide ou dupliqué')
      numbers.add(num)
      if (new Set(polygon.map(p => `${p.lat},${p.lon}`)).size < 3 || polygon.some(p => !Number.isFinite(p.lat) || !Number.isFinite(p.lon) || Math.abs(p.lat) > 90 || Math.abs(p.lon) > 180)) throw new Error('Contour invalide')
      return { num, polygon, name, isDefault: true }
    }).filter(t => t.polygon.length > 0)
  } catch (error) {
    console.error('Erreur lors du parsing GPX:', error)
    return []
  }
}

/**
 * Reconstruit les objets Territory à partir des données GPX
 */
export const reconstructTerritoriesFromGpx = (gpxData: string): Territory[] => {
  if (!gpxData || gpxData.trim() === '') {
    return []
  }

  return parseGpx(gpxData)
}
