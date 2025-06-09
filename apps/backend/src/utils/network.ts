/**
 * Effectue une requête avec retry automatique en cas d'échec
 */
export const fetchWithRetry = async (
  url: string,
  retries = 3,
  delay = 1000
): Promise<Response> => {
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`NETWORK: Tentative ${i+1}/${retries} pour l'URL: ${url.substring(0, 100)}...`)
      const response = await fetch(url)
      if (!response.ok) {
        console.error(`NETWORK ERROR: Erreur HTTP ${response.status}: ${response.statusText}`)
        throw new Error(`Erreur HTTP ${response.status}: ${response.statusText}`)
      }
      return response
    } catch (error) {
      console.warn(`NETWORK RETRY: Tentative ${i+1} échouée: ${error instanceof Error ? error.message : 'Erreur inconnue'}`)
      if (i === retries - 1) {
        throw new Error(`Échec de la requête après ${retries} tentatives: ${error instanceof Error ? error.message : 'Erreur inconnue'}`)
      }
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw new Error('Erreur inattendue dans fetchWithRetry')
}

/**
 * Charge une image comme Buffer
 */
export const loadImageBuffer = async (
  url: string,
  retries = 3,
  delay = 1000
): Promise<Buffer> => {
  const response = await fetchWithRetry(url, retries, delay)
  const arrayBuffer = await response.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

/**
 * Construit l'URL pour l'API IGN
 */
export const buildIgnUrl = (
  bbox: [number, number, number, number],
  size: number,
  options: {
    baseUrl?: string
    layer?: string
    format?: string
    crs?: string
  } = {}
): string => {
  const [minLon, minLat, maxLon, maxLat] = bbox

  const {
    baseUrl = 'https://data.geopf.fr/wms-r',
    layer = 'GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2',
    format = 'image/png',
    crs = 'EPSG:4326'
  } = options

  // Pour WMS 1.3.0 avec EPSG:4326, les coordonnées sont dans l'ordre lat,lon
  // Pour les autres CRS (comme EPSG:3857), les coordonnées sont dans l'ordre lon,lat
  const bboxStr = crs === 'EPSG:4326'
    ? `${minLat},${minLon},${maxLat},${maxLon}`
    : `${minLon},${minLat},${maxLon},${maxLat}`

  const params = new URLSearchParams({
    SERVICE: 'WMS',
    VERSION: '1.3.0',
    REQUEST: 'GetMap',
    LAYERS: layer,
    STYLES: '',
    CRS: crs,
    BBOX: bboxStr,
    WIDTH: size.toString(),
    HEIGHT: size.toString(),
    FORMAT: format
  })

  const url = `${baseUrl}?${params.toString()}`

  // Debug: afficher l'URL complète
  console.log('🌐 URL WMS complète:', url)
  console.log('📍 BBOX:', bboxStr)
  console.log('📏 SIZE:', size)

  return url
}
