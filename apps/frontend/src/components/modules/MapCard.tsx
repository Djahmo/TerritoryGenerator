import type { Territory } from '%/types/'
import { useState } from 'react'
import { Check, Pencil, ArrowUpRight, Map, X } from 'lucide-react'
import { Link } from 'react-router'

type MapCardProps = { territory: Territory; onRename?: (num: string, name: string) => Promise<void>; visible?: boolean }
export default function MapCard({ territory, onRename, visible = true }: MapCardProps) {
  const { num, miniature, name } = territory
  const [editing, setEditing] = useState(false)
  const [inputName, setInputName] = useState(name || '')
  const [saving, setSaving] = useState(false)
  const validate = async () => {
    if (saving) return
    setSaving(true)
    try { await onRename?.(num, inputName); setEditing(false) }
    catch { /* Keep the edited value available for retry. */ }
    finally { setSaving(false) }
  }
  if (!visible) return null
  const href = `/territory/${encodeURIComponent(num)}`
  const annotations = (territory.paintLayersImage?.length ?? 0) + (territory.paintLayersLarge?.length ?? 0)
  return <article className="territory-card">
    <Link to={href} className="card-preview" aria-label={`Ouvrir le territoire ${num}`}>
      {miniature ? <img src={miniature} alt={`Plan du territoire ${num}`} loading="lazy" /> : <Map size={40} />}
      <span className="card-number">N° {num}</span>
    </Link>
    <div className="card-body">
      <div className="card-title-row">{editing ? <>
        <input aria-label={`Nom du territoire ${num}`} value={inputName} disabled={saving} onChange={e => setInputName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') void validate(); if (e.key === 'Escape') setEditing(false) }} autoFocus />
        <button className="icon-button" disabled={saving} onClick={validate} aria-label="Enregistrer le nom"><Check size={16} /></button>
        <button className="icon-button" disabled={saving} onClick={() => setEditing(false)} aria-label="Annuler le renommage"><X size={16} /></button>
      </> : <><h2 title={name || `Territoire ${num}`}><Link to={href}>{name || `Territoire ${num}`}</Link></h2>
        {onRename && <button className="icon-button" onClick={() => { setInputName(name || ''); setEditing(true) }} aria-label={`Renommer le territoire ${num}`} title="Renommer"><Pencil size={14} /></button>}</>}
      </div>
      <p className="card-meta">{miniature ? territory.large ? 'Plan serré et plan large' : 'Plan serré' : 'Carte à générer'}</p>
      <div className="card-footer"><span className="status-chip">{annotations ? `${annotations} annotation${annotations > 1 ? 's' : ''}` : 'Sans annotation'}</span><Link to={href} className="card-open">Ouvrir le plan<ArrowUpRight size={15} /></Link></div>
    </div>
  </article>
}
