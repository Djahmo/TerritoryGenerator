import { useState, useCallback } from "react"
import { Territory } from "%/types"

export const useFileReader = () => {
  const [content, setContent] = useState<string>("")
  const [type, setType] = useState<string>("")
  const [error, setError] = useState<string | null>(null)

  const readFile = useCallback((file: File, encoding: string = "utf-8") => {
    if (!file) return
    setError(null)
    setContent("")
    setType("")
    const reader = new FileReader()
    reader.onload = e => {
      setContent((e.target?.result as string) || "")
      setType(file.type || file.name.split('.').pop() || "")
    }
    reader.onerror = () => {
      setError("Erreur de lecture du fichier")
    }
    reader.readAsText(file, encoding)
  }, [])

  return { content, type, error, readFile }
}

export const parse = (input: string, type: string): Territory[] =>
  type.toLowerCase().includes("gpx") || input.trim().startsWith("<gpx")
    ? parseGpx(input)
    : parseCsv(input)

export const parseCsv = (csv: string): Territory[] => {
  const lines = csv.split('\n')
    .filter(l => l.includes('['))
    .filter(line => !line.trim().startsWith('"['));

  return lines.map(line => {
    const polygon = [...line.matchAll(/\[([0-9.\-]+),([0-9.\-]+)\]/g)]
      .map(match => ({
        lat: parseFloat(match[2]),
        lon: parseFloat(match[1]),
      }));
    if (!polygon.length) return null;    const parts = line.split(',')
    let num = (parts[4] || '') + (parts[3] || '') || 'Territoire'
    let name = parts[2] || ''
    name = name.replace(/ï¿½/g, 'è').trim()

    return { num, polygon, name }
  }).filter(Boolean) as Territory[]
}

export const parseGpx = (xml: string): Territory[] => {
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
    return { num, polygon, name }
  }).filter(t => t.polygon.length > 0)
}

export const makeGpx = (territorys: Territory[]) => {
  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="territory.djahmo.fr" xmlns="http://www.topografix.com/GPX/1/1">
${territorys.map(t => `  <trk>
    <name>${t.num} - ${t.name}</name>
    <trkseg>
${t.polygon.map((p: any) => `      <trkpt lat="${p.lat}" lon="${p.lon}" />`).join('\n')}
    </trkseg>
  </trk>`).join('\n')}
</gpx>`
}

export const handleGpxDownload = (territorys: Territory[]) => {
  const gpx = makeGpx(territorys)
  const blob = new Blob([gpx], { type: 'application/gpx+xml' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'territoires.gpx'
  a.click()
  URL.revokeObjectURL(url)
}
