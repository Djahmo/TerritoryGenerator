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
    if (updatedTerritorys) updateTerritories(updatedTerritorys)
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

      let updates: any = {};

      if (isLarge) {
        // Pour les plans larges, on ne touche pas à la miniature
        updates = {
          paintLayersLarge: layers,
          large: compositeImage
        };
      } else {
        // Pour les plans serrés, on génère et met à jour la miniature
        const miniature = await generateThumbnailFromImage(compositeImage);
        updates = {
          paintLayersImage: layers,
          image: compositeImage,
          miniature: miniature
        };
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
    </h1>      {/* Bouton pour basculer entre vue normale et plan large */}
      <div className="flex gap-2 items-center">        <button
          onClick={handleToggleLarge}
          disabled={isGeneratingLarge}
          className={`px-4 py-2 rounded-lg shadow-sm transition-all flex items-center gap-2 font-medium ${isLarge
              ? 'bg-blue-500 text-white hover:bg-blue-600 ring-blue-200 hover:ring-2'
              : 'bg-gray-100 text-gray-800 hover:bg-gray-200 ring-gray-200 hover:ring-2 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600'
            } ${isGeneratingLarge ? 'opacity-50 cursor-not-allowed' : ''}`}
        >{isGeneratingLarge ? (
            <>
              <div className="animate-spin mr-2">⟳</div>
              <span>Génération...</span>
            </>
          ) : (
            <div className="flex items-center gap-2 cursor-pointer">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {isLarge
                  ? <path d="M9 9h6v6H9z"/> /* Icône carré (vue standard) */
                  : <path d="M21 21H3V3h18v18z"/> /* Icône cadre (vue élargie) */
                }
              </svg>
              <span>{isLarge ? "Vue standard" : "Vue plan large"}</span>
            </div>
          )}
        </button>
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
