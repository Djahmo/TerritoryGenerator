import { FC, useRef, useCallback } from 'react'
import { Upload } from 'lucide-react'

interface FileUploadProps {
  onFile: (file: File) => void
  accept?: string
  loading?: boolean
}

const FileUpload: FC<FileUploadProps> = ({ onFile, accept = ".csv,.gpx", loading }) => {
  const inputRef = useRef<HTMLInputElement | null>(null)

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) onFile(file)
  }, [onFile])

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    if (e.dataTransfer.files?.[0]) onFile(e.dataTransfer.files[0])
  }, [onFile])

  return (
    <div
      className="flex flex-col items-center justify-center gap-2 w-full"
      onDragOver={e => e.preventDefault()}
      onDrop={handleDrop}
    >
      <label
        htmlFor="territory-upload"
        className="flex flex-col items-center justify-center cursor-pointer bg-muted/10 hover:bg-muted/20 text-sm text-muted rounded-lg border border-dashed border-muted/50 px-6 py-10 w-full text-center transition"
      >
        <Upload size={36} className="mb-2 text-primary" />
        <span>
          {loading ? "Chargement..." : "📁 Clique ou dépose un CSV ou GPX ici"}
        </span>
      </label>
      <input
        id="territory-upload"
        type="file"
        accept={accept}
        onChange={handleFile}
        className="hidden"
        ref={inputRef}
      />
    </div>
  )
}

export default FileUpload
