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
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Erreur HTTP ${response.status}: ${response.statusText}`)
      }
      return response
    } catch (error) {
      if (i === retries - 1) {
        throw new Error(`Échec de la requête après ${retries} tentatives: ${error instanceof Error ? error.message : 'Erreur inconnue'}`)
      }
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw new Error('Erreur inattendue dans fetchWithRetry')
}

/**
 * Charge une image directement (sans queue - gestion du délai au niveau supérieur)
 */
export const loadImageBitmap = async (
  url: string, 
  retries = 3, 
  delay = 1000
): Promise<ImageBitmap> => {
  const response = await fetchWithRetry(url, retries, delay)
  const blob = await response.blob()
  return createImageBitmap(blob)
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

  const params = new URLSearchParams({
    SERVICE: 'WMS',
    VERSION: '1.3.0',
    REQUEST: 'GetMap',
    LAYERS: layer,
    STYLES: '',
    CRS: crs,
    BBOX: `${minLat},${minLon},${maxLat},${maxLon}`,
    WIDTH: size.toString(),
    HEIGHT: size.toString(),
    FORMAT: format
  })

  return `${baseUrl}?${params.toString()}`
}
