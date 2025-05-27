export const PHI = (1 + Math.sqrt(5)) / 2
export const ppp = 250
export const paperWidth = 29.7
export const ratioX = 1.41
export const ratioY = 1

const getResolution = (pW: number, rX: number, rY: number, p: number) => {
  const heightCm = pW * (rY / rX)
  const widthPx = Math.round((pW / 2.54) * p)
  const heightPx = Math.round((heightCm / 2.54) * p)
  return { widthPx, heightPx }
}

export const { widthPx: finalWidth, heightPx: finalHeight } = getResolution(paperWidth, ratioX, ratioY, ppp)
export const rawSize = Math.round(finalWidth * PHI)
