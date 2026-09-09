import { useRef, useState } from 'react'
import { Upload } from 'lucide-react'
interface FileUploadProps { onFile: (file: File) => void; accept?: string; loading?: boolean }
export default function FileUpload({ onFile, accept = '.csv,.gpx', loading }: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  return <div className={`upload-zone ${dragging ? 'dragging' : ''}`}
    onDragOver={e => { e.preventDefault(); if (!loading) setDragging(true) }}
    onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false) }}
    onDrop={e => { e.preventDefault(); setDragging(false); if (!loading && e.dataTransfer.files[0]) onFile(e.dataTransfer.files[0]) }}>
    <Upload size={28} />
    <button type="button" className="btn-accent" disabled={loading} onClick={() => inputRef.current?.click()}>{loading ? 'Chargement…' : 'Choisir un fichier'}</button>
    <p>ou glissez votre fichier ici</p><span className="status-chip">{accept.split(',').map(format => format.replace('.', '').toUpperCase()).join(' · ')}</span>
    <input ref={inputRef} aria-label="Fichier de territoires" type="file" disabled={loading} accept={accept} onChange={e => {
      const file = e.target.files?.[0]; if (file && !loading) onFile(file); e.target.value = ''
    }} />
  </div>
}
