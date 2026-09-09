import type { Territory } from '../utils/types'
import { accountFetch, getAccountScope, isAccountScopeCurrent } from './accountScope'
import { imageToDataUrl, loadImage } from './imageService'

export type PrintPage = { num: string; name: string; image: string; landscape: boolean; large: boolean }
export const escapeHtml = (value: string) => value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
export const safeFileName = (num: string) => encodeURIComponent(num).replace(/\./g, '%2E')

export async function preparePrintPages(territories: Territory[], large = false): Promise<PrintPage[]> {
  const scope = getAccountScope()
  const pages: PrintPage[] = []
  for (const territory of territories) {
    const src = large ? territory.large : territory.image
    if (!src) throw new Error(`Image manquante pour le territoire ${territory.num}`)
    const response = await accountFetch(scope, src)
    if (!response.ok) throw new Error(`Image ${territory.num} inaccessible (${response.status})`)
    const blob = await response.blob()
    if (!/^image\/(png|jpeg|webp)$/i.test(blob.type)) throw new Error(`Format d’image invalide pour ${territory.num}`)
    const url = URL.createObjectURL(blob)
    try {
      const img = await loadImage(url)
      if (!isAccountScopeCurrent(scope)) throw new Error('Compte modifié')
      pages.push({ num: territory.num, name: territory.name, large, landscape: img.naturalWidth > img.naturalHeight, image: imageToDataUrl(img) })
    } finally { URL.revokeObjectURL(url) }
  }
  return pages
}

export function createPrintHTML(pages: PrintPage[], title = 'Territoires') {
  if (!pages.length) throw new Error('Aucun territoire à imprimer')
  const content = pages.map(page => {
    if (!/^data:image\/png;base64,[A-Za-z0-9+/]+=*$/.test(page.image)) throw new Error('Image d’impression non intégrée')
    return `<section class="sheet ${page.landscape ? 'landscape' : 'portrait'}"><div class="card"><header><div class="date">À rendre le :<br><br></div><div class="name">${escapeHtml(page.name)}</div><div class="number">N°${escapeHtml(page.num)}</div></header><div class="map"><img src="${page.image}" alt="Territoire ${escapeHtml(page.num)}"></div></div></section>`
  }).join('')
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'; base-uri 'none'"><title>${escapeHtml(title)}</title><style>
    @page portrait { size:A4 portrait; margin:0; }
    @page landscape { size:A4 landscape; margin:0; }
    * { box-sizing:border-box; } body { margin:0; font-family:Arial,sans-serif; color:#000; background:#ddd; }
    .sheet { padding:5mm; margin:8mm auto; background:white; break-after:page; break-inside:avoid; }
    .sheet:last-child { break-after:auto; }
    .portrait { page:portrait; width:210mm; height:297mm; }
    .landscape { page:landscape; width:297mm; height:210mm; }
    .card { border:0.5mm solid #000; height:100%; display:flex; flex-direction:column; }
    header { display:flex; flex:0 0 22mm; border-bottom:0.5mm solid #000; font-weight:bold; }
    header > div { padding:2mm; display:flex; align-items:center; justify-content:center; text-align:center; overflow-wrap:anywhere; }
    .date { width:25%; font-size:4mm; border-right:0.5mm solid #000; }
    .name { flex:1; font-size:6mm; } .number { width:20%; font-size:6mm; border-left:0.5mm solid #000; }
    .map { flex:1; min-height:0; overflow:hidden; } img { display:block; width:100%; height:100%; object-fit:contain; }
    @media print { body { background:white; } .sheet { margin:0; } }
  </style></head><body>${content}</body></html>`
}

export async function printDocument(target: Window, html: string) {
  if (target.closed) throw new Error('Fenêtre d’impression fermée')
  target.document.open()
  target.document.write(html)
  target.document.close()
  await Promise.all(Array.from(target.document.images).map(img => img.decode()))
  await target.document.fonts.ready
  if (!target.closed) { target.focus(); target.print() }
}

export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url; link.download = name
  document.body.appendChild(link); link.click(); link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 30_000)
}
