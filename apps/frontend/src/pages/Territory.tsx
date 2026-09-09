import { ArrowLeft, RefreshCw, MousePointer2 } from 'lucide-react'
import { Link, useParams, useNavigate, useSearchParams } from 'react-router'
import { useCallback, useEffect, useMemo, useState } from 'react'
import Wrapper from '#/ui/Wrapper'
import Input from '#/ui/Input'
import Loader from '#/ui/Loader'
import Paint from '@/components/modules/paint/index'
import { useApiTerritory } from '@/hooks/useApiTerritory'
import { useApiGenerate } from '@/hooks/useApiGenerate'
import { ApiTerritoryService } from '@/services/apiTerritoryService'
import { draftKey, useDrawingDrafts } from '@/services/drawingDrafts'
import type { PaintLayer } from '%/types'
import { toast } from 'sonner'

export default function Territory() {
  const { num = '' } = useParams<{ num: string }>()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const isLarge = params.get('mode') === 'large'
  const { cache, loading, renameTerritory, updateTerritory, loadFromBackend } = useApiTerritory()
  const { generateThumbnailFromImage, generateLargeImage, generateLargeImageWithCrop, generateStandardImage } = useApiGenerate()
  const api = useMemo(() => new ApiTerritoryService(), [])
  const territory = cache?.territories.find(t => t.num === num)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [revision, setRevision] = useState(0)
  const key = draftKey(num, isLarge)
  const draft = useDrawingDrafts(state => state.drafts[key])
  const setDraft = useDrawingDrafts(state => state.setDraft)
  const clearDraft = useDrawingDrafts(state => state.clearDraft)
  useEffect(() => { setName(territory?.name ?? '') }, [territory?.name, num])
  const onChange = useCallback((layers: PaintLayer[]) => setDraft(key, layers), [key, setDraft])
  const rename = async () => {
    if (!territory || name === territory.name) return
    try { await renameTerritory(num, name) }
    catch { toast.error('Impossible de sauvegarder le nom') }
  }
  const save = async (layers: PaintLayer[], compositeImage?: string) => {
    if (!territory || !compositeImage) throw new Error('Image indisponible')
    setBusy(true)
    try {
      const updates = isLarge
        ? { paintLayersLarge: layers, large: compositeImage }
        : { paintLayersImage: layers, image: compositeImage, miniature: await generateThumbnailFromImage(compositeImage) }
      const snapshot = { ...territory, ...updates }
      if (isLarge) await api.saveTerritoryLarge(snapshot)
      else await api.saveTerritoryStandard(snapshot)
      updateTerritory(num, updates)
      clearDraft(key, layers)
      toast.success('Dessin sauvegardé')
    } catch (error) {
      toast.error('Échec de la sauvegarde. Votre brouillon est conservé.')
      throw error
    } finally { setBusy(false) }
  }
  const refreshBackground = async (large: boolean) => {
    clearDraft(draftKey(num, large))
    // Clear local annotations even if the subsequent refresh cannot reach the server.
    updateTerritory(num, large ? { paintLayersLarge: [], large: undefined } : { paintLayersImage: [], image: undefined, miniature: undefined })
    await loadFromBackend()
    setRevision(value => value + 1)
    setParams(large ? { mode: 'large' } : {})
  }
  const regenerate = async () => {
    if (!territory || busy) return
    const hasBackground = isLarge ? territory.originalLarge : territory.original
    if (hasBackground && !window.confirm(`Régénérer le plan ${isLarge ? 'large' : 'serré'} supprimera ses annotations enregistrées et son brouillon. Continuer ?`)) return
    setBusy(true)
    try {
      const success = await (isLarge ? generateLargeImage(territory) : generateStandardImage(territory))
      if (!success) throw new Error('Génération impossible')
      await refreshBackground(isLarge)
      toast.success('Fond de carte mis à jour')
    } catch { toast.error('Impossible de régénérer la carte') }
    finally { setBusy(false) }
  }
  const crop = async (data: { x: number; y: number; width: number; height: number; imageWidth: number; imageHeight: number }) => {
    if (!territory || busy || !isLarge) return
    if (!window.confirm('Recadrer le plan large supprimera ses annotations enregistrées et son brouillon. Le plan serré sera conservé. Continuer ?')) return
    setBusy(true)
    try {
      const lats = territory.polygon.map(p => p.lat), lons = territory.polygon.map(p => p.lon)
      const bbox: [number, number, number, number] = [Math.min(...lons), Math.min(...lats), Math.max(...lons), Math.max(...lats)]
      if (!await generateLargeImageWithCrop(territory, bbox, data)) throw new Error('Recadrage impossible')
      await refreshBackground(true)
      toast.success('Plan large recadré')
    } catch { toast.error('Impossible de recadrer la carte') }
    finally { setBusy(false) }
  }
  if (!territory) return <Wrapper className="p-6"><Loader enabled={loading} />{!loading && <p>Territoire introuvable.</p>}<button className="btn-neutral" onClick={() => navigate('/territories')}>Retour aux territoires</button></Wrapper>
  const src = isLarge ? territory.originalLarge : territory.original
  return <Wrapper className="page editor-page">
    <Link className="editor-breadcrumb" to="/territories"><ArrowLeft size={14} />Mes territoires</Link>
    <p className="eyebrow">Atelier de dessin</p>
    <div className="editor-heading">
      <h1 className="editor-number">N° {num}</h1>
      <Input value={name} onChange={e => setName(e.target.value)} onBlur={rename} type="text" placeholder="Nom du territoire" />
      <span className={`status-chip ${draft ? 'has-draft' : ''}`} role="status">{draft ? 'Modifications à sauvegarder' : 'Aucune modification en attente'}</span>
    </div>
    <div className="editor-toolbar">
      <div className="segmented-control" role="group" aria-label="Format du plan">
        <button aria-pressed={!isLarge} disabled={busy} onClick={() => setParams({})}>Plan serré</button>
        <button aria-pressed={isLarge} disabled={busy} onClick={() => setParams({ mode: 'large' })}>Plan large</button>
      </div>
      <button className="btn-neutral" disabled={busy} onClick={regenerate}><RefreshCw size={15} />{src ? 'Régénérer' : 'Générer'} le plan {isLarge ? 'large' : 'serré'}</button>
    </div>
    <div className="editor-frame">
      {src ? <Paint key={`${num}:${isLarge}:${revision}`} src={src} layers={draft?.layers ?? (isLarge ? territory.paintLayersLarge : territory.paintLayersImage) ?? []}
        onChange={onChange} dirty={!!draft} onSave={save} onCrop={crop} isLarge={isLarge} territoryPolygon={territory.polygon} territory={territory} />
        : <p className="p-8">Ce plan n’a pas encore été généré.</p>}
      {busy && <div className="absolute inset-0 z-50 bg-black/60 flex items-center justify-center text-white" role="status">Traitement en cours…</div>}
    </div>
    <p className="editor-hint"><MousePointer2 size={14} />Molette pour zoomer · Ctrl + glisser pour déplacer le plan · Sauvegardez pour retrouver vos annotations à l’impression.</p>
  </Wrapper>
}
