import { useParams, useNavigate } from "react-router"
import { useTranslation } from "react-i18next"
import Wrapper from "#/ui/Wrapper"
import { useTerritoryCache } from "@/hooks/useTerritoryCache"
import { useGenerate } from "@/hooks/useGenerate"
import Paint from "@/components/modules/paint/index"
import { useEffect, useState } from "react"
import Loader from "#/ui/Loader"
import Input from "#/ui/Input"
import type { PaintLayer } from "%/types"
import { toast } from "sonner"

const Territory = () => {
  const { num } = useParams<{ num: string }>()
  const { t } = useTranslation()
  const { cache, updateTerritories, updateTerritory } = useTerritoryCache()
  const { generateThumbnailFromImage, generateLargeImage } = useGenerate()
  const navigate = useNavigate()
  const territory = cache?.territories?.find(t => t.num === num)
  const [inputName, setInputName] = useState<string>("")
  const [isLarge, setIsLarge] = useState<boolean>(false)
  const [isGeneratingLarge, setIsGeneratingLarge] = useState<boolean>(false)
  useEffect(() => {
    if (territory) setInputName(territory.name)
  }, [territory])

  const handleRename = () => {
    const updatedTerritorys = cache?.territories.map(t => t.num === num ? { ...t, name: inputName } : t)
    if(updatedTerritorys) updateTerritories(updatedTerritorys)
  }
  const handleToggleLarge = async () => {
    if (!territory) return

    // Si on passe en mode large et qu'il n'y a pas encore d'image large, on la génère
    if (!isLarge && !territory.originalLarge) {
      setIsGeneratingLarge(true)
      try {
        const largeImage = await generateLargeImage(territory)
        updateTerritory(num!, {
          originalLarge: largeImage,
          large: largeImage
        })
      } catch (error) {
        console.error('Erreur lors de la génération du plan large:', error)
        toast.error(t("territory.generate_large_error", "Erreur lors de la génération du plan large"))
        setIsGeneratingLarge(false)
        return
      }
      setIsGeneratingLarge(false)
    }

    setIsLarge(!isLarge)
  }
  const handleSave = async (layers: PaintLayer[], compositeImage?: string) => {
    if (!territory) return

    try {
      if (!compositeImage) {
        console.error('[Territory] Pas d\'image composite fournie')
        return;
      }

      const miniature = await generateThumbnailFromImage(compositeImage)

      const updates = {
        ...(isLarge
          ? {
              paintLayersLarge: layers,
              large: compositeImage
            }
          : {
              paintLayersImage: layers,
              image: compositeImage
            }
        ),
        miniature: miniature
      }

      updateTerritory(num!, updates)
      toast.success(t("territory.save_success", "Territoire sauvegardé avec succès !"))
    } catch (error) {
      console.error('[Territory] Erreur lors de la sauvegarde:', error)
      // En cas d'erreur, sauvegarder au moins les layers
      if (isLarge) {
        updateTerritory(num!, { paintLayersLarge: layers })
      } else {
        updateTerritory(num!, { paintLayersImage: layers })
      }
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
    <Wrapper className="mt-4 px-4 pb-8 flex flex-col items-center gap-6 overflow-y-auto h-full">      <h1 className="text-3xl font-bold flex">
        <span className="border-r pr-2 mr-2 mt-2">{territory.num}</span>
        <Input value={inputName} onChange={(e) => setInputName(e.target.value)} onBlur={handleRename} type="text" placeholder="Nom du térritoire" className="mb-0" />
      </h1>

      {/* Bouton pour basculer entre vue normale et plan large */}
      <div className="flex gap-2 items-center">
        <button
          onClick={handleToggleLarge}
          disabled={isGeneratingLarge}
          className={`px-4 py-2 rounded-lg transition-colors ${
            isLarge
              ? 'bg-blue-500 text-white hover:bg-blue-600'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
          } ${isGeneratingLarge ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {isGeneratingLarge ? (
            <>
              <Loader enabled />
              {t("territory.generating_large", "Génération...")}
            </>
          ) : (
            isLarge
              ? t("territory.view_normal", "Vue normale")
              : t("territory.view_large", "Plan large")
          )}
        </button>
        {isLarge && (
          <span className="text-sm text-gray-500">
            {t("territory.large_mode", "Mode plan large")}
          </span>
        )}
      </div>

      <div className="w-full flex justify-center">
        <div className=" rounded-lg overflow-hidden border border-muted/50 shadow-xl max-w-[90vw] md:max-w-[60vw] w-full flex justify-center items-center dark:bg-darknd bg-lightnd" style={{ minHeight: 100 }} >
          <Paint
            src={isLarge ? (territory.originalLarge || territory.original || "") : (territory.original || "")}
            layers={isLarge ? (territory.paintLayersLarge || []) : (territory.paintLayersImage || [])}
            onSave={handleSave}
            isLarge={isLarge}
          />
        </div>
      </div>
    </Wrapper>
  )
}

export default Territory
