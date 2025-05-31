import { useParams, useNavigate } from "react-router"
import { useTranslation } from "react-i18next"
import Wrapper from "#/ui/Wrapper"
import { useTerritoryCache } from "@/hooks/useTerritoryCache"
import { useGenerate } from "@/hooks/useGenerate"
import Paint from "@/components/modules/paint/index"
import { useEffect, useState } from "react"
import Loader from "#/ui/Loader"
import Input from "#/ui/Input"
import Modal from "#/ui/Modal"
import type { PaintLayer } from "%/types"
import { toast } from "sonner"

const Territory = () => {
  const { num } = useParams<{ num: string }>()
  const { t } = useTranslation()
  const { cache, updateTerritories, updateTerritory } = useTerritoryCache()
  const { generateThumbnailFromImage, generateLargeImage, generateStandardImage } = useGenerate()
  const navigate = useNavigate()
  const territory = cache?.territories?.find(t => t.num === num)
  const [inputName, setInputName] = useState<string>("")
  const [isLarge, setIsLarge] = useState<boolean>(false)
  const [isGeneratingLarge, setIsGeneratingLarge] = useState<boolean>(false)
  const [isRegenerating, setIsRegenerating] = useState<boolean>(false)
  const [showConfirmation, setShowConfirmation] = useState<boolean>(false)
  const [paintKey, setPaintKey] = useState<number>(0)

  useEffect(() => {
    if (territory) {
      console.log('[Territory] État actuel du territoire:', {
        num: territory.num,
        hasMiniature: !!territory.miniature,
        hasOriginal: !!territory.original,
        hasOriginalLarge: !!territory.originalLarge,
        hasImage: !!territory.image,
        hasLarge: !!territory.large,
        paintLayersImageCount: territory.paintLayersImage?.length || 0,
        paintLayersLargeCount: territory.paintLayersLarge?.length || 0,
        isDefault: territory.isDefault
      });
      setInputName(territory.name);
    }
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
        toast.error(t("p.territory.generate_large_error"))
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

      console.log('[handleSave] Début de la sauvegarde', {
        isLarge,
        layersCount: layers.length,
        compositeImageExists: !!compositeImage
      });      let updates: any = {};

      if (isLarge) {
        // Pour les plans larges, on ne touche pas à la miniature
        updates = {
          paintLayersLarge: layers,
          large: compositeImage,
          // Préserver les layers et l'image du plan standard
          paintLayersImage: territory.paintLayersImage || [],
          image: territory.image,
          miniature: territory.miniature
        };
        console.log('[handleSave] Mise à jour plan large', updates);
      } else {
        // Pour les plans serrés, on génère et met à jour la miniature
        console.log('[handleSave] Génération de miniature en cours...');
        const miniature = await generateThumbnailFromImage(compositeImage);
        updates = {
          paintLayersImage: layers,
          image: compositeImage,
          miniature: miniature,
          // Préserver les layers et l'image du plan large
          paintLayersLarge: territory.paintLayersLarge || [],
          large: territory.large,
          originalLarge: territory.originalLarge
        };
        console.log('[handleSave] Mise à jour plan standard avec miniature', updates);
      }

      console.log('[handleSave] Mise à jour du territoire:', num, updates);
      updateTerritory(num!, updates);
      toast.success(t("p.territory.save_success"))
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
  const handleRegenerate = async () => {
    if (!territory) return

    setIsRegenerating(true)
    try {      if (isLarge) {
        // Régénération du plan large
        const largeImage = await generateLargeImage(territory)
        console.log('[handleRegenerate] Régénération plan large, données à mettre à jour:', {
          originalLarge: largeImage.length > 50 ? 'Image OK' : 'Image problématique',
          paintLayersLarge: []
        });
        updateTerritory(num!, {
          originalLarge: largeImage,
          large: largeImage,
          paintLayersLarge: [],
          // Préserver les données du plan standard
          paintLayersImage: territory.paintLayersImage || [],
          image: territory.image,
          miniature: territory.miniature
        })
        toast.success(t("p.territory.regenerate_large_success"))
      } else {
        // Régénération de l'image standard
        const standardImage = await generateStandardImage(territory)
        const miniature = await generateThumbnailFromImage(standardImage)
        console.log('[handleRegenerate] Régénération plan standard, données à mettre à jour:', {
          original: standardImage.length > 50 ? 'Image OK' : 'Image problématique',
          miniature: miniature.length > 50 ? 'Miniature OK' : 'Miniature problématique',
          paintLayersImage: []
        });
        updateTerritory(num!, {
          original: standardImage,
          image: standardImage,
          miniature: miniature,
          paintLayersImage: [],
          // Préserver les données du plan large
          paintLayersLarge: territory.paintLayersLarge || [],
          large: territory.large,
          originalLarge: territory.originalLarge
        })
        toast.success(t("p.territory.regenerate_success"))
      }

      // Forcer la réinitialisation du composant Paint
      setPaintKey(prev => prev + 1)
    } catch (error) {
      console.error(`Erreur lors de la régénération de l'image:`, error)
      toast.error(t("p.territory.regenerate_error"))
    } finally {
      setIsRegenerating(false)
      // Fermer la modale de confirmation
      setShowConfirmation(false)
    }
  }

  // Fonction pour demander confirmation avant de régénérer
  const confirmRegeneration = () => {
    setShowConfirmation(true)
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
      <Input value={inputName} onChange={(e) => setInputName(e.target.value)} onBlur={handleRename} type="text" placeholder="Nom du térritoire" className="mb-0" />    </h1>
      {/* Boutons pour contrôler l'affichage et régénérer l'image */}
      <div className="flex gap-3 items-center">
        <button
          onClick={handleToggleLarge}
          disabled={isGeneratingLarge}
          className={`${isLarge
            ? 'btn-positive'
            : 'btn-neutral'
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
                ? <path d="M9 9h6v6H9z" /> /* Icône carré (vue standard) */
                : <path d="M21 21H3V3h18v18z" /> /* Icône cadre (vue élargie) */
              }
            </svg>
            <span>{isLarge ? "Vue standard" : "Vue plan large"}</span>
          </div>
        )}
        </button>
        {/* Bouton de régénération d'image */}
        <button
          onClick={confirmRegeneration}
          disabled={isRegenerating}
          className={`btn-accent
            ${isRegenerating ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {isRegenerating ? (
            <>
              <div className="animate-spin mr-2">⟳</div>
              <span>Régénération...</span>
            </>
          ) : (
            <div className="flex items-center gap-2 cursor-pointer">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16" />
              </svg>
              <span>Régénérer {isLarge ? "le plan large" : "l'image"}</span>
            </div>
          )}
        </button>
      </div>

      <div className="w-full flex justify-center">
        <div className=" rounded-lg overflow-hidden border border-muted/50 shadow-xl max-w-[90vw] md:max-w-[60vw] w-full flex justify-center items-center dark:bg-darknd bg-lightnd" style={{ minHeight: 100 }} >
          <Paint
            key={paintKey}
            src={isLarge ? (territory.originalLarge || territory.original || "") : (territory.original || "")}
            layers={isLarge ? (territory.paintLayersLarge || []) : (territory.paintLayersImage || [])}
            onSave={handleSave}
            isLarge={isLarge} />
        </div>
      </div>

      {/* Modale de confirmation de régénération */}
      <Modal isOpen={showConfirmation} onClose={() => setShowConfirmation(false)} className="p-6 w-[400px]">
        <div className="flex flex-col gap-4">
          <h3 className="text-xl font-bold">{t("territory.confirm_regenerate_title", "Confirmer la régénération")}</h3>
          <p className="text-muted">
            {isLarge
              ? t("p.territory.confirm_regenerate_large.")
              : t("p.territory.confirm_regenerate_standard")}
          </p>
          <div className="flex justify-end gap-3 mt-2">
            <button
              onClick={() => setShowConfirmation(false)}
              className="btn-neutral">
              {t("common.cancel", "Annuler")}
            </button>
            <button
              onClick={handleRegenerate}
              className="btn-positive">
              {t("common.confirm", "Confirmer")}
            </button>
          </div>
        </div>
      </Modal>
    </Wrapper>
  )
}

export default Territory
