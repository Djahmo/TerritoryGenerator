import { useState, useCallback } from "react"

type Coord = { lat: number; lon: number }
type Territoire = { nom: string; polygon: Coord[] }

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

export const parse = (input: string, type: string): Territoire[] =>
  type.toLowerCase().includes("gpx") || input.trim().startsWith("<gpx")
    ? parseGpx(input)
    : parseCsv(input)

export const parseCsv = (csv: string): Territoire[] => {
  const lines = csv.split('\n')
    .filter(l => l.includes('['))
    .filter(line => !line.trim().startsWith('"['));

  return lines.map(line => {
    const coords = [...line.matchAll(/\[([0-9.\-]+),([0-9.\-]+)\]/g)]
      .map(match => ({
        lat: parseFloat(match[2]),
        lon: parseFloat(match[1]),
      }));
    if (!coords.length) return null;
    const parts = line.split(',')
    let nom = (parts[4] || '') + (parts[3] || '') || 'Territoire'
    nom = nom.replace(/ï¿½/g, 'è').trim()

    return { nom, polygon: coords }
  }).filter(Boolean) as Territoire[]
}

export const parseGpx = (xml: string): Territoire[] => {
  const parser = new DOMParser()
  const doc = parser.parseFromString(xml, "application/xml")
  const trks = Array.from(doc.getElementsByTagName("trk"))

  return trks.map(trk => {
    const nameEl = trk.getElementsByTagName("name")[0]
    const nom = nameEl?.textContent?.trim() || "Territoire"
    const trkpts = Array.from(trk.getElementsByTagName("trkpt"))
    const polygon = trkpts.map(pt => ({
      lat: parseFloat(pt.getAttribute("lat") || "0"),
      lon: parseFloat(pt.getAttribute("lon") || "0"),
    }))
    return { nom, polygon }
  }).filter(t => t.polygon.length > 0)
}
