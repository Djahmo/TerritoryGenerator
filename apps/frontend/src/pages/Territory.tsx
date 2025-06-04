import { useParams, useNavigate } from "react-router"
import { useTranslation } from "react-i18next"
import { useCallback } from "react"
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
import { cropToBbox, calculateBoundingBox } from "@/utils/geometry"
import { useConfig } from "@/hooks/useConfig"

const Territory = () => {
  const { num } = useParams<{ num: string }>()
  const { t } = useTranslation()
  const { cache, updateTerritories, updateTerritory } = useTerritoryCache()
  const { generateThumbnailFromImage, generateLargeImage, generateLargeImageWithCrop } = useGenerate()
  const { config, PHI } = useConfig()
  const navigate = useNavigate()
  const territory = cache?.territories?.find(t => t.num === num)
  const [inputName, setInputName] = useState<string>("")
  const [isLarge, setIsLarge] = useState<boolean>(false)
  const [isGeneratingLarge, setIsGeneratingLarge] = useState<boolean>(false)
  const [isRegenerating, setIsRegenerating] = useState<boolean>(false)
  const [showConfirmation, setShowConfirmation] = useState<boolean>(false)
  const [paintKey, setPaintKey] = useState<number>(0)
  const [isGeneratingCrop, setIsGeneratingCrop] = useState<boolean>(false)

  const [isVertical, setIsVertical] = useState<boolean>(false)
  useEffect(() => {
    if (territory) {
      setInputName(territory.name);
    }
  }, [territory])
  const handleRename = () => {
    const updatedTerritorys = cache?.territories.map(t => t.num === num ? { ...t, name: inputName } : t)
    if (updatedTerritorys) updateTerritories(updatedTerritorys)
  };

  const handleToggleLarge = async () => {
    if (!territory) return;

    if (!isLarge && !territory.originalLarge) {
      setIsGeneratingLarge(true);
      try {
        const largeImage = await generateLargeImage(territory);
        const initialBboxLarge = calculateBoundingBox(territory.polygon, true, config, PHI);

        // Vérifier si l'image est verticale (hauteur > largeur)
        const img = new Image();
        img.onload = () => {
          setIsVertical(img.height > img.width);
        };
        img.src = largeImage;

        updateTerritory(num!, {
          originalLarge: largeImage,
          large: largeImage,
          currentBboxLarge: initialBboxLarge
        });
      } catch (error) {
        toast.error(t("p.territory.generate_large_error"));
        setIsGeneratingLarge(false);
        return;
      }
      setIsGeneratingLarge(false);
    }
    const img = new Image();
    img.onload = () => {
      setIsVertical(img.height > img.width);
      console.log(img.height, img.width)
    };
    img.src = territory.originalLarge!;
    setIsLarge(!isLarge);
  };

  const handleSave = async (layers: PaintLayer[], compositeImage?: string) => {
    if (!territory) return;

    try {
      if (!compositeImage) {
        return;
      }

      let updates: any = {};

      if (isLarge) {
        updates = {
          paintLayersLarge: layers,
          large: compositeImage,
          paintLayersImage: territory.paintLayersImage || [],
          image: territory.image,
          miniature: territory.miniature
        };
      } else {
        const miniature = await generateThumbnailFromImage(compositeImage);
        updates = {
          paintLayersImage: layers,
          image: compositeImage,
          miniature: miniature,
          paintLayersLarge: territory.paintLayersLarge || [],
          large: territory.large,
          originalLarge: territory.originalLarge
        };
      }

      updateTerritory(num!, updates);
      toast.success(t("p.territory.save_success"))
    } catch (error) {
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
    try {
      if (isLarge) {
        const largeImage = await generateLargeImage(territory)
        const initialBboxLarge = calculateBoundingBox(territory.polygon, true, config, PHI)

        const img = new Image();
        img.onload = () => {
          setIsVertical(img.height > img.width);
        };
        img.src = largeImage;

        updateTerritory(num!, {
          originalLarge: largeImage,
          large: largeImage,
          currentBboxLarge: initialBboxLarge,
          paintLayersLarge: [],
          paintLayersImage: territory.paintLayersImage || [],
          image: territory.image,
          miniature: territory.miniature
        })
        toast.success(t("p.territory.regenerate_large_success"))
      } else {
        updateTerritory(num!, {
          original: territory.original,
          image: territory.original || "",
          paintLayersImage: [],
          paintLayersLarge: territory.paintLayersLarge || [],
          large: territory.large,
          originalLarge: territory.originalLarge
        })
        toast.success(t("p.territory.regenerate_success"))
      }

      setPaintKey(prev => prev + 1)
    } catch (error) {
      toast.error(t("p.territory.regenerate_error"))
    } finally {
      setIsRegenerating(false)
      setShowConfirmation(false)
    }
  }

  const handleApplyCrop = useCallback(async (cropData: {
    x: number;
    y: number;
    width: number;
    height: number;
    imageWidth: number;
    imageHeight: number;
  }) => {
    if (!territory) {
      return;
    }    setIsGeneratingCrop(true)

    console.log('🔍 Crop data received:', cropData);

    try {
      let originalBbox: [number, number, number, number];

      if (isLarge && territory.currentBboxLarge) {
        originalBbox = territory.currentBboxLarge;
      } else {
        originalBbox = calculateBoundingBox(territory.polygon, isLarge, config, PHI);
      }      const newBbox = cropToBbox(originalBbox, cropData)
      const croppedImage = await generateLargeImageWithCrop(territory, newBbox, cropData)

      if (isLarge) {
        updateTerritory(num!, {
          originalLarge: croppedImage,
          large: croppedImage,
          currentBboxLarge: newBbox,
          paintLayersLarge: [],
          paintLayersImage: territory.paintLayersImage || [],
          image: territory.image,
          miniature: territory.miniature
        })
        toast.success("Plan large mis à jour avec le crop - contour du territoire redessiné")
      } else {
        const miniature = await generateThumbnailFromImage(croppedImage)
        updateTerritory(num!, {
          original: croppedImage,
          image: croppedImage,
          miniature: miniature,
          paintLayersImage: [],
          paintLayersLarge: territory.paintLayersLarge || [],
          large: territory.large,
          originalLarge: territory.originalLarge
        })
        toast.success("Image mise à jour avec le crop - contour du territoire redessiné")
      }

      setPaintKey(prev => prev + 1)
    } catch (error) {
      toast.error("Erreur lors de l'application du crop")
    } finally {
      setIsGeneratingCrop(false)
    }
  }, [territory, isLarge, config, PHI, generateLargeImageWithCrop, generateThumbnailFromImage, updateTerritory, num])

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
        <Input value={inputName} onChange={(e) => setInputName(e.target.value)} onBlur={handleRename} type="text" placeholder="Nom du territoire" className="mb-0" />
      </h1>

      {/* Boutons pour contrôler l'affichage et régénérer l'image */}
      <div className="flex gap-3 items-center">
        <button
          onClick={handleToggleLarge}
          disabled={isGeneratingLarge}
          className={`${isLarge
            ? 'btn-positive'
            : 'btn-neutral'
            } ${isGeneratingLarge ? 'opacity-50 cursor-not-allowed' : ''}`}
        >         {isGeneratingLarge ? (
          <>
            <div className="animate-spin mr-2">⟳</div>
            <span>Génération...</span>
          </>
        ) : (<div className="flex items-center gap-2 cursor-pointer">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {isLarge ? <path d="M9 9h6v6H9z" /> : <path d="M21 21H3V3h18v18z" />}
          </svg>
          <span>{isLarge ? "Plan serré" : "Plan large"}</span>
        </div>
        )}
        </button>

        <button
          onClick={() => setShowConfirmation(true)}
          disabled={isRegenerating}
          className={`btn-warning ${isRegenerating ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {isRegenerating ? (
            <>
              <div className="animate-spin mr-2">⟳</div>
              <span>Régénération...</span>
            </>
          ) : (
            <div className="flex items-center gap-2 cursor-pointer btn-neutral">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16" />
              </svg>
              <span>Régénérer {isLarge ? "le plan large" : "l'image"}</span>
            </div>
          )}
        </button>
      </div>
      <div className="w-full flex justify-center">
        <div className="relative rounded-lg overflow-hidden border border-muted/50 shadow-xl max-w-[90vw] md:max-w-[60vw] w-full flex justify-center items-center dark:bg-darknd bg-lightnd" style={{ minHeight: 100 }} >
          {/* Overlay de chargement pour le crop */}
          {isGeneratingCrop && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50 rounded-lg">
              <div className="bg-lightnd dark:bg-darknd p-6 rounded-lg shadow-lg flex flex-col items-center gap-3">
                <div className="animate-spin w-8 h-8 border-4 border-positive border-t-transparent rounded-full"></div>
                <p className="text-sm font-medium text-muted">
                  Application du crop et redessin du contour...
                </p>
              </div>
            </div>
          )}
          <Paint
            key={paintKey}
            src={isLarge ? (territory.originalLarge || territory.original || "") : (territory.original || "")}
            layers={isLarge ? (territory.paintLayersLarge || []) : (territory.paintLayersImage || [])}
            onSave={handleSave}
            onCrop={handleApplyCrop}
            isLarge={isVertical}
            territoryPolygon={territory?.polygon}
            territory={territory}
            />
        </div>
      </div>

      {/* Modale de confirmation de régénération */}
      <Modal isOpen={showConfirmation} onClose={() => setShowConfirmation(false)} className="p-6 w-[400px]">
        <div className="flex flex-col gap-4">
          <h3 className="text-xl font-bold">{t("territory.confirm_regenerate_title", "Confirmer la régénération")}</h3>
          <p className="text-muted">
            {isLarge
              ? t("p.territory.confirm_regenerate_large")
              : t("p.territory.confirm_regenerate_standard")}
          </p>
          <div className="flex justify-end gap-3 mt-2">
            <button
              onClick={() => setShowConfirmation(false)}
              className="btn-neutral"
            >
              Annuler
            </button>
            <button
              onClick={handleRegenerate}
              className="btn-positive"
            >
              Régénérer
            </button>
          </div>
        </div>
      </Modal>
    </Wrapper>
  )
}

export default Territory
