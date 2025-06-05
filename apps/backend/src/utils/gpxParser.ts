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
    const parser = new DOMParser()
    const doc = parser.parseFromString(xml, "application/xml")
    const trks = Array.from(doc.getElementsByTagName("trk"))

    return trks.map(trk => {
      const nameEl = trk.getElementsByTagName("name")[0]
      const numName = nameEl?.textContent?.trim() || "A00 - Territoire"
      const num = numName.split(' - ')[0].trim()
      const name = numName.split(' - ')[1]?.trim()
      const trkpts = Array.from(trk.getElementsByTagName("trkpt"))
      const polygon = trkpts.map(pt => ({
        lat: parseFloat(pt.getAttribute("lat") || "0"),
        lon: parseFloat(pt.getAttribute("lon") || "0"),
      }))
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
