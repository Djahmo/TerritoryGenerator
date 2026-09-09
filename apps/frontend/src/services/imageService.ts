export const loadImage = (src: string): Promise<HTMLImageElement> => new Promise((resolve, reject) => {
  const img = new Image()
  const timeout = setTimeout(() => { img.src = ''; reject(new Error('Délai de chargement de la carte dépassé')) }, 30_000)
  img.onload = () => { clearTimeout(timeout); resolve(img) }
  img.onerror = () => { clearTimeout(timeout); reject(new Error('Impossible de charger la carte')) }
  img.src = src
})

export const imageToDataUrl = (image: HTMLImageElement, width = image.naturalWidth, height = image.naturalHeight) => {
  const canvas = document.createElement('canvas')
  canvas.width = width; canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas indisponible')
  ctx.drawImage(image, 0, 0, width, height)
  return canvas.toDataURL('image/png')
}
