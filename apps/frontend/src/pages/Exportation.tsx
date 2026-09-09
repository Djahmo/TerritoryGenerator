import { Printer, Download, Image, Search } from 'lucide-react'
import PageHeader from '@/components/ui/PageHeader'
import { useState } from 'react'
import { Link } from 'react-router'
import JSZip from 'jszip'
import { toast } from 'sonner'
import { useApiTerritory } from '&/useApiTerritory'
import type { Territory } from '%/types'
import Wrapper from '@/components/ui/Wrapper'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Loader from '@/components/ui/Loader'
import { createPrintHTML, preparePrintPages, printDocument, downloadBlob, safeFileName } from '@/services/printService'
import { getAccountScope, isAccountScopeCurrent } from '@/services/accountScope'

export default function Exportation() {
  const { cache, loading } = useApiTerritory()
  const [search, setSearch] = useState('')
  const [busy, setBusy] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const territories = cache?.territories ?? []
  const filtered = territories.filter(t => `${t.num} ${t.name}`.toLocaleLowerCase().includes(search.toLocaleLowerCase()))
  const run = async (work: () => Promise<void>) => {
    setBusy(true)
    try { await work() }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Export impossible') }
    finally { setBusy(false) }
  }
  const print = (selection: Territory[], large = false) => {
    // Reserve the window during the user's click, before downloading images.
    const target = window.open('', '_blank')
    if (!target) { toast.error('Autorisez la fenêtre d’impression dans votre navigateur.'); return }
    target.document.body.textContent = 'Préparation des cartes…'
    void run(async () => {
      try { await printDocument(target, createPrintHTML(await preparePrintPages(selection, large))) }
      catch (error) { target.close(); throw error }
    })
  }
  const showPreview = (territory: Territory, large = false) => void run(async () => {
    setPreview(createPrintHTML(await preparePrintPages([territory], large)))
  })
  const download = (imagesOnly: boolean) => void run(async () => {
    const scope = getAccountScope()
    const pages = await preparePrintPages(filtered)
    const largePages = await preparePrintPages(filtered.filter(t => t.large), true)
    const zip = new JSZip()
    for (const page of [...pages, ...largePages]) {
      const name = `territoire_${safeFileName(page.num)}${page.large ? '_large' : ''}`
      if (imagesOnly) zip.file(`${page.large ? 'images_large' : 'images'}/${name}.png`, page.image.split(',')[1], { base64: true })
      else zip.file(`${name}.html`, createPrintHTML([page], `Territoire ${page.num}`))
    }
    if (!imagesOnly) {
      zip.file('tous_les_territoires.html', createPrintHTML(pages))
      if (largePages.length) zip.file('tous_les_plans_larges.html', createPrintHTML(largePages))
      zip.file('README.txt', 'Les images sont intégrées : ces fichiers fonctionnent hors connexion.\nOuvrez un fichier HTML puis utilisez Ctrl+P ou Cmd+P. Choisissez A4, échelle 100 %, sans en-têtes ni pieds de page.\nVérifiez les orientations dans le dialogue du navigateur. Les fichiers individuels permettent de choisir une orientation par carte.\n')
    }
    const blob = await zip.generateAsync({ type: 'blob' })
    if (!isAccountScopeCurrent(scope)) throw new Error('Compte modifié')
    downloadBlob(blob, `${imagesOnly ? 'images' : 'impression'}_territoires.zip`)
  })
  return <Wrapper className="page">
    <PageHeader eyebrow="Du terrain au papier" title="Impression & export" description="Préparez vos cartes pour le terrain ou emportez vos fichiers hors connexion." />
    <Loader enabled={loading} />
    {!loading && !territories.length ? <div className="empty-state"><Printer size={32} /><h2>Aucun territoire à exporter</h2><p>Importez vos territoires pour préparer vos premiers plans.</p><Link className="btn-positive" to="/">Importer des territoires</Link></div> : <>
      <div className="collection-toolbar"><Input className="collection-search" value={search} onChange={e => setSearch(e.target.value)} type="search" Icon={Search} placeholder="Rechercher par nom ou numéro" /><span className="result-count">{filtered.length} territoire{filtered.length > 1 ? 's' : ''} affiché{filtered.length > 1 ? 's' : ''}</span></div>
      <div className="export-banner"><Printer size={30} /><div><h2>Prêts pour l’impression</h2><p>Les actions groupées concernent les {filtered.length} territoires affichés.</p></div>
        <button className="btn-accent" disabled={busy || !filtered.length} onClick={() => print(filtered)}><Printer size={16} />Imprimer les territoires affichés</button>
      </div>
      <div className="export-downloads">
        <button className="btn-neutral" disabled={busy || !filtered.length} onClick={() => download(false)}><Download size={16} />Télécharger fichiers d’impression</button>
        <button className="btn-neutral" disabled={busy || !filtered.length} onClick={() => download(true)}><Image size={16} />Télécharger les images ZIP</button>
      </div>
      {busy && <p role="status">Préparation des cartes…</p>}
      {!filtered.length && <p>Aucun territoire ne correspond à cette recherche.</p>}
      <div className="grid gap-4">{filtered.map(territory => <div key={territory.num} className="export-row">
        <Link to={`/territory/${encodeURIComponent(territory.num)}`} className="export-territory">
          {territory.miniature && <img src={territory.miniature} alt="" className="w-16 h-16 object-contain" />}
          <span><small>Territoire {territory.num}</small><strong>{territory.name || "Sans nom"}</strong></span>
        </Link>
        <div className="export-formats">
          <button className="btn-neutral" disabled={busy} onClick={() => showPreview(territory)}>Aperçu</button>
          <button className="btn-accent" disabled={busy} onClick={() => print([territory])}>Imprimer</button>
          {territory.large && <><button className="btn-neutral" disabled={busy} onClick={() => showPreview(territory, true)}>Aperçu large</button><button className="btn-positive" disabled={busy} onClick={() => print([territory], true)}>Imprimer large</button></>}
        </div>
      </div>)}</div>
    </>}
    <Modal title="Aperçu d’impression" isOpen={!!preview} onClose={() => setPreview(null)} className="w-[85vw] p-4 gap-3">
      <div className="flex justify-between"><h2>Aperçu d’impression</h2><button className="btn-neutral" onClick={() => setPreview(null)}>Fermer</button></div>
      {preview && <><button className="btn-accent" onClick={() => {
        const target = window.open('', '_blank')
        if (target) void run(() => printDocument(target, preview))
        else toast.error('Autorisez la fenêtre d’impression dans votre navigateur.')
      }}>Imprimer cet aperçu</button><iframe title="Aperçu d’impression" sandbox="" srcDoc={preview} className="w-full h-[65vh] bg-white" /></>}
    </Modal>
  </Wrapper>
}
