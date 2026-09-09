export const IGN_BASE_URL = 'https://data.geopf.fr/wms-r'

export const isAllowedIgnUrl = (value: string): boolean => {
  try {
    const url = new URL(value)
    return url.origin === 'https://data.geopf.fr' && url.pathname === '/wms-r'
      && !url.username && !url.password && !url.hash
  } catch {
    return false
  }
}

export const assertIgnUrl = (value: string): void => {
  if (!isAllowedIgnUrl(value)) throw new Error('Only the official IGN WMS endpoint is allowed')
}
