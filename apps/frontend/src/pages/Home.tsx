import { type FC, useEffect, useState } from 'react'
import Wrapper from '#/ui/Wrapper'
import { useTranslation } from 'react-i18next'
import { useFileReader, parse, handleGpxDownload, makeGpx } from '&/useFile'
import { useGenerate } from '&/useGenerate'
import FileUpload from '#/ui/FileUpload'
import MapCard from '@/components/modules/MapCard'
import Input from '@/components/ui/Input'
import { Search } from 'lucide-react'
import { useTerritoryCache } from '@/hooks/useTerritoryCache' // ← à adapter selon l'emplacement

const Home: FC = () => {
  const { t } = useTranslation()
  const { content, type, error: fileError, readFile } = useFileReader()
  const { loading, error: imgError, generateImages } = useGenerate()
  const { cache, updateGpx, updateTerritories } = useTerritoryCache()
  const [search, setSearch] = useState<string>("")
  const [territorys, setTerritorys] = useState<any[]>([])
  useEffect(() => {
    if (cache?.territories?.length) {
      setTerritorys(cache.territories)
    }
  }, [cache])

  useEffect(() => {
    (async () => {
      if (content && type) {
        const parsed = parse(content, type)
        setTerritorys(parsed.sort((a, b) => a.num.localeCompare(b.num)))
        if (parsed.length) {
          await generateImages(parsed, (territorys) => {
            setTerritorys(territorys)
            if (territorys.every(t => !t.isDefault && t.image)) {
              updateGpx(makeGpx(parsed))
              updateTerritories(territorys)
            }
          })
        }
      }
    })()
  }, [content, type, generateImages])

  const handleRename = (num: string, name: string) => {
    const updatedTerritorys = territorys.map(t => t.num === num ? { ...t, name } : t)
    setTerritorys(updatedTerritorys)
    updateTerritories(updatedTerritorys)
  }

  return (
    <Wrapper className="mt-4 px-4 flex flex-col items-center gap-6 overflow-y-auto h-full">
      <h1 className="text-3xl font-bold">{t("home.upload_title", "Charger un fichier territoire")}</h1>

      {!territorys.length && <FileUpload onFile={file => readFile(file, file.name.endsWith('.csv') ? 'latin1' : 'utf-8')} loading={loading} />}

      {fileError && <div className="text-red-500">{fileError}</div>}
      {imgError && <div className="text-red-500">{imgError}</div>}

      {!!territorys.length && (
        <div className='flex items-center gap-2 w-full'>
          <Input value={search} onChange={(e) => setSearch(e.target.value)} type='text' Icon={Search} placeholder='Nom ou numéro du térritoire' className='w-full' />
          <button
            className="btn-positive w-60 mt-2"
            onClick={() => handleGpxDownload(territorys)}
          >
            {t("home.download_gpx", "Télécharger le fichier GPX")}
          </button>
        </div>
      )}

      <div className="flex flex-wrap gap-4 mt-8 pb-8 justify-center">
        {territorys
          .filter(t => !search || `${t.num} - ${t.name}`.toLowerCase().includes(search.toLowerCase()))
          .map((territory, i) => (
            <MapCard
              territory={territory}
              onRename={handleRename}
              key={i}
              visible={!search ? true : `${territory.num} - ${territory.name}`.toLowerCase().includes(search.toLowerCase())}
            />
          ))}
      </div>
    </Wrapper>
  )
}

export default Home
