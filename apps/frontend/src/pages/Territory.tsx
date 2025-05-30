import { useParams, useNavigate } from "react-router"
import { useTranslation } from "react-i18next"
import Wrapper from "#/ui/Wrapper"
import { useTerritoryCache } from "@/hooks/useTerritoryCache"
import { useGenerate } from "@/hooks/useGenerate"
import Paint from "@/components/modules/paint/index"
import { useEffect, useState } from "react"
import Loader from "#/ui/Loader"
import Input from "#/ui/Input"

const Territory = () => {
  const { num } = useParams<{ num: string }>()
  const { t } = useTranslation()
  const { cache, updateTerritories } = useTerritoryCache()
  const { generateThumbnailFromImage } = useGenerate()
  const navigate = useNavigate()
  const territory = cache?.territories?.find(t => t.num === num)
  const [inputName, setInputName] = useState<string>("")

  useEffect(() => {
    if (territory) setInputName(territory.name)
  }, [territory])
  const handleRename = () => {
    const updatedTerritorys = cache?.territories.map(t => t.num === num ? { ...t, name: inputName } : t)
    if(updatedTerritorys) updateTerritories(updatedTerritorys)
  }

  const handleSave = async (imageData: string) => {
    try {
      const miniature = await generateThumbnailFromImage(imageData)

      const updatedTerritorys = cache?.territories.map(t =>
        t.num === num ? { ...t, image: imageData, miniature: miniature } : t
      )
      if(updatedTerritorys) updateTerritories(updatedTerritorys)
    } catch (error) {
      console.error('Erreur lors de la génération de la miniature:', error)
      const updatedTerritorys = cache?.territories.map(t =>
        t.num === num ? { ...t, image: imageData } : t
      )
      if(updatedTerritorys) updateTerritories(updatedTerritorys)
    }
  }

  if (!territory)
    return (
      <Wrapper className="mt-4 px-4 flex flex-col items-center gap-6 overflow-y-auto h-full">
        <Loader enabled />
        <button onClick={() => navigate(-1)} className="btn-neutral px-4 py-2 rounded mt-2">
          {t("common.back")}
        </button>
      </Wrapper>
    )

  return (
    <Wrapper className="mt-4 px-4 pb-8 flex flex-col items-center gap-6 overflow-y-auto h-full">
      <h1 className="text-3xl font-bold flex">
        <span className="border-r pr-2 mr-2 mt-2">{territory.num}</span>
        <Input value={inputName} onChange={(e) => setInputName(e.target.value)} onBlur={handleRename} type="text" placeholder="Nom du térritoire" className="mb-0" />
      </h1>      <div className="w-full flex justify-center">
        <div className=" rounded-lg overflow-hidden border border-muted/50 shadow-xl max-w-[90vw] md:max-w-[60vw] w-full flex justify-center items-center dark:bg-darknd bg-lightnd" style={{ minHeight: 100 }} >
          <Paint src={territory.image || ""} onSave={handleSave} />
        </div>
      </div>
    </Wrapper>
  )
}

export default Territory
