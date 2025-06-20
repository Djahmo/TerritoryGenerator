import { type FC, useEffect, useState } from 'react'
import Wrapper from '#/ui/Wrapper'
import { useTranslation } from 'react-i18next'
import { handleGpxDownload, makeGpx } from '&/useFile'
import MapCard from '@/components/modules/MapCard'
import Input from '@/components/ui/Input'
import { Search } from 'lucide-react'
import { useApiTerritory } from '@/hooks/useApiTerritory'
import { useNavigate } from 'react-router'

const Territories: FC = () => {
  const { t } = useTranslation()
  const { cache, updateTerritories, updateGpx } = useApiTerritory()
  const navigate = useNavigate()
  const [search, setSearch] = useState<string>("")
  const [territorys, setTerritorys] = useState<any[]>([])

  useEffect(() => {
    if (cache?.territories?.length) {
      setTerritorys(cache.territories)
    } else {
      navigate('/')
    }
  }, [cache, navigate])

  const handleRename = async (num: string, name: string) => {
    // Mise à jour locale immédiate pour la réactivité de l'UI
    const updatedTerritorys = territorys.map(t => t.num === num ? { ...t, name } : t)
    setTerritorys(updatedTerritorys)
    updateTerritories(updatedTerritorys)

    // Régénérer le GPX avec le nouveau nom et le sauvegarder en base
    try {
      const newGpx = makeGpx(updatedTerritorys)
      updateGpx(newGpx) // Ceci déclenche automatiquement la sauvegarde en base
      console.log(`✅ Nom du territoire ${num} sauvegardé en base: "${name}"`)
    } catch (error) {
      console.error(`❌ Erreur lors de la sauvegarde du GPX après renommage du territoire ${num}:`, error)
    }
  }

  return (
    <Wrapper className="mt-4 px-4 flex flex-col items-center gap-6 overflow-y-auto h-full">
      <h1 className="text-3xl font-bold">{t("territories.title", "Mes territoires")}</h1>

      {!!territorys.length && (
        <div className='flex items-center gap-2 w-full'>
          <Input value={search} onChange={(e) => setSearch(e.target.value)} type='text' Icon={Search} placeholder='Nom ou numéro du territoire' className='w-full' />
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

export default Territories
