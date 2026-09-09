import { DOMParser } from '@xmldom/xmldom'
import type { Territory } from './types'

export const escapeXml = (value: string) => value.replace(/[<>&"']/g, char => ({
  '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;',
}[char]!))

const validate = (territories: Territory[]): Territory[] => {
  if (!territories.length) throw new Error('Aucun territoire valide dans le fichier.')
  const numbers = new Set<string>()
  for (const territory of territories) {
    if (!territory.num || territory.num.length > 50 || (/[\\/]/.test(territory.num) || [...territory.num].some(c => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127)) || ['.', '..'].includes(territory.num)) {
      throw new Error(`Numéro de territoire invalide : ${territory.num}`)
    }
    if (numbers.has(territory.num)) throw new Error(`Numéro de territoire en double : ${territory.num}`)
    numbers.add(territory.num)
    if (new Set(territory.polygon.map(p => `${p.lat},${p.lon}`)).size < 3 || territory.polygon.some(({ lat, lon }) =>
      !Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180)) {
      throw new Error(`Contour invalide pour le territoire ${territory.num}`)
    }
  }
  return territories
}

// RFC-style quoted fields, including escaped quotes and multiline values.
export const csvRows = (input: string): string[][] => {
  const rows: string[][] = []
  let row: string[] = [], field = '', quoted = false
  for (let i = 0; i < input.length; i++) {
    const c = input[i]
    if (c === '"') {
      if (quoted && input[i + 1] === '"') { field += '"'; i++ }
      else if (quoted || !field) quoted = !quoted
      else field += c
    } else if (!quoted && (c === ',' || c === '\n' || c === '\r')) {
      row.push(field); field = ''
      if (c !== ',') {
        if (row.some(Boolean)) rows.push(row)
        row = []
        if (c === '\r' && input[i + 1] === '\n') i++
      }
    } else field += c
  }
  if (quoted) throw new Error('Champ CSV entre guillemets non terminé.')
  row.push(field)
  if (row.some(Boolean)) rows.push(row)
  return rows
}

export const parseCsv = (input: string): Territory[] => {
  const rows = csvRows(input.replace(/^\uFEFF/, ''))
  const header = rows[0]?.map(value => value.trim().toLowerCase()) ?? []
  const hasHeader = header.includes('boundary')
  const index = (name: string, fallback: number) => hasHeader ? header.indexOf(name) : fallback
  const records = hasHeader ? rows.slice(1) : rows
  return validate(records.map(row => {
    const boundaryIndex = index('boundary', 11)
    // Older exports sometimes leave the boundary unquoted.
    const boundary = row.slice(boundaryIndex).join(',')
    const polygon = [...boundary.matchAll(/\[\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\]/g)]
      .map(match => ({ lon: Number(match[1]), lat: Number(match[2]) }))
    return {
      num: `${row[index('suffix', 4)] ?? ''}${row[index('number', 3)] ?? ''}`.trim(),
      name: (row[index('category', 2)] ?? '').trim(), polygon,
    }
  }))
}

export const parseGpx = (input: string): Territory[] => {
  const doc = new DOMParser({ onError: level => { throw new Error(`GPX invalide (${level}).`) } })
    .parseFromString(input, 'application/xml')
  if (doc.documentElement?.localName !== 'gpx') throw new Error('Le fichier ne contient pas de GPX.')
  return validate(Array.from(doc.getElementsByTagNameNS('*', 'trk')).map(track => {
    const title = track.getElementsByTagNameNS('*', 'name')[0]?.textContent?.trim() ?? ''
    const parts = title.match(/^(.*?) -(?: |$)(.*)$/s)
    return {
      num: (parts ? parts[1] : title).trim(),
      name: parts ? parts[2].trim() : '',
      polygon: Array.from(track.getElementsByTagNameNS('*', 'trkpt')).map(point => ({
        lat: Number(point.getAttribute('lat') ?? NaN), lon: Number(point.getAttribute('lon') ?? NaN),
      })),
    }
  }))
}

export const parse = (input: string, type: string): Territory[] =>
  /gpx|xml/i.test(type) || input.trimStart().startsWith('<') ? parseGpx(input) : parseCsv(input)

export const makeGpx = (territories: Territory[]): string => {
  validate(territories)
  return `<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="TerritoryGenerator" xmlns="http://www.topografix.com/GPX/1/1">\n${territories.map(t => `  <trk><name>${escapeXml(t.num)} - ${escapeXml(t.name)}</name><trkseg>\n${t.polygon.map(p => `    <trkpt lat="${p.lat}" lon="${p.lon}"/>`).join('\n')}\n  </trkseg></trk>`).join('\n')}\n</gpx>`
}

export const geometryChanged = (a: Territory, b: Territory) =>
  JSON.stringify(a.polygon) !== JSON.stringify(b.polygon)
