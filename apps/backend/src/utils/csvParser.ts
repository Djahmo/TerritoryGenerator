import { Territory, Coord } from '../types/territory.js'

export interface ParsedTerritory extends Territory {
  isDefault: boolean
}

export const parseCsv = (csvContent: string): ParsedTerritory[] => {

  const lines = csvContent.split('\n')
    .filter(l => l.includes('['))
    .filter(line => !line.trim().startsWith('"['))


  const territories = lines.map((line, index) => {
    try {      // Extraire les coordonnées du format [lon,lat]
      const polygon: Coord[] = [...line.matchAll(/\[([0-9.\-]+),([0-9.\-]+)\]/g)]
        .map(match => ({
          lat: parseFloat(match[2]),
          lon: parseFloat(match[1]),
        }))

      if (!polygon.length) {
        console.warn(`⚠️ Ligne ${index + 1}: Aucune coordonnée trouvée`)
        return null
      }

      // Parser les autres champs du CSV
      const parts = line.split(',')
      let num = (parts[4] || '') + (parts[3] || '') || 'Territoire'
      let name = parts[2] || ''

      // Nettoyer le nom (remplacer les caractères d'encodage mal interprétés)
      name = name.replace(/ï¿½/g, 'è').trim()

      return {
        num,
        polygon,
        name,
        isDefault: true
      } as ParsedTerritory
    } catch (error) {
      console.error(`❌ Erreur parsing ligne ${index + 1}:`, error)
      return null
    }
  }).filter(Boolean) as ParsedTerritory[]

  return territories
}

export const makeGpx = (territories: ParsedTerritory[]): string => {

  const gpxContent = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="territory.djahmo.fr" xmlns="http://www.topografix.com/GPX/1/1">
${territories.map(t => `  <trk>
    <name>${t.num} - ${t.name}</name>
    <trkseg>
${t.polygon.map((p: Coord) => `      <trkpt lat="${p.lat}" lon="${p.lon}" />`).join('\n')}
    </trkseg>
  </trk>`).join('\n')}
</gpx>`

  return gpxContent
}
