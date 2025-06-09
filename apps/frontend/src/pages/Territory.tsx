import { useParams, useNavigate } from "react-router"
import { useTranslation } from "react-i18next"
import { useCallback } from "react"
import Wrapper from "#/ui/Wrapper"
import { useApiTerritory } from "@/hooks/useApiTerritory"
import { useApiGenerate } from "@/hooks/useApiGenerate"
import Paint from "@/components/modules/paint/index"
import { useEffect, useState } from "react"
import Loader from "#/ui/Loader"
import Input from "#/ui/Input"
import Modal from "#/ui/Modal"
import type { PaintLayer } from "%/types"
import { toast } from "sonner"
import { ApiTerritoryService } from "@/services/apiTerritoryService"

const Territory = () => {  const { num } = useParams<{ num: string }>()
  const { t } = useTranslation()
  const { cache, updateTerritories, updateTerritory } = useApiTerritory()
  const { generateThumbnailFromImage, generateLargeImage, generateLargeImageWithCrop, generateStandardImage } = useApiGenerate()
  const navigate = useNavigate()
  const territory = cache?.territories?.find((t: any) => t.num === num)
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
    const updatedTerritorys = cache?.territories.map((t: any) => t.num === num ? { ...t, name: inputName } : t)
    if (updatedTerritorys) updateTerritories(updatedTerritorys)
  };

  const handleToggleLarge = async () => {
    if (!territory) return;

    if (!isLarge && !territory.originalLarge) {
      setIsGeneratingLarge(true);
      try {
        const success = await generateLargeImage(territory);

        if (success) {
          // Récupérer l'URL de l'image
          const apiService = new ApiTerritoryService();
          const response = await apiService.getTerritoryImages(territory.num, 'large');

          if (response.images && response.images.length > 0) {
            const imageUrl = `/p${response.images[0].imageUrl}`;

            // Vérifier si l'image est verticale (hauteur > largeur)
            const img = new Image();
            img.onload = () => {
              setIsVertical(img.height > img.width);
            };
            img.src = imageUrl;

            updateTerritory(num!, {
              originalLarge: imageUrl,
              large: imageUrl
            });
          }
        }
      } catch (error) {
        toast.error(t("p.territory.generate_large_error"));
        setIsGeneratingLarge(false);
        return;
      }
      setIsGeneratingLarge(false);
    }

    if (territory.originalLarge) {
      const img = new Image();
      img.onload = () => {
        setIsVertical(img.height > img.width);
      };
      img.src = territory.originalLarge;
      setIsLarge(!isLarge);
    }
  };
  const handleSave = async (layers: PaintLayer[], compositeImage?: string) => {
    if (!territory) return;

    console.log(`🎨 Territory.handleSave - Début de la sauvegarde du territoire ${territory.num}`)
    console.log(`📊 Nombre de layers reçus:`, layers.length)
    console.log(`🖼️ Image composite présente:`, !!compositeImage)
    console.log(`📏 Type de vue:`, isLarge ? 'large' : 'standard')

    try {
      if (!compositeImage) {
        console.log(`❌ Pas d'image composite, arrêt de la sauvegarde`)
        return;
      }

      let updates: any = {};

      if (isLarge) {
        // Pour le plan large, nous pouvons conserver l'image composite côté client
        // car elle contient les annotations dessinées par l'utilisateur
        updates = {
          paintLayersLarge: layers,
          large: compositeImage, // Nous gardons l'image composite avec les annotations
          paintLayersImage: territory.paintLayersImage || [],
          image: territory.image,
          miniature: territory.miniature

        };
        console.log(`🎨 Sauvegarde en mode LARGE - ${layers.length} layers`);
      } else {
        const miniature = await generateThumbnailFromImage(compositeImage);
        updates = {
          paintLayersImage: layers,
          image: compositeImage, // Image avec annotations
          miniature: miniature,  // Miniature générée localement
          paintLayersLarge: territory.paintLayersLarge || [],
          large: territory.large,
          originalLarge: territory.originalLarge
        };
        console.log(`🎨 Sauvegarde en mode STANDARD - ${layers.length} layers`);
      }

      console.log(`📤 Appel de updateTerritory avec:`, {
        territoryNum: num,
        layersCount: isLarge ? updates.paintLayersLarge?.length : updates.paintLayersImage?.length
      });

      updateTerritory(num!, updates);
      toast.success(t("p.territory.save_success"))
    } catch (error) {
      // En cas d'erreur, nous sauvegardons au moins les couches de peinture
      if (isLarge) {
        updateTerritory(num!, { paintLayersLarge: layers })
      } else {
        updateTerritory(num!, { paintLayersImage: layers })
      }
      toast.error("Erreur lors de la sauvegarde de l'image")
    }
  }
  const handleRegenerate = async () => {
    if (!territory) return

    setIsRegenerating(true);
    try {
      const apiService = new ApiTerritoryService();

      if (isLarge) {
        const success = await generateLargeImage(territory);

        if (success) {
          // Récupérer l'URL de l'image
          const response = await apiService.getTerritoryImages(territory.num, 'large');

          if (response.images && response.images.length > 0) {
            const imageUrl = `/p${response.images[0].imageUrl}`;

            // Vérifier si l'image est verticale (hauteur > largeur)
            const img = new Image();
            img.onload = () => {
              setIsVertical(img.height > img.width);
            };
            img.src = imageUrl;

            updateTerritory(num!, {
              originalLarge: imageUrl,
              large: imageUrl,
              paintLayersLarge: [],
              paintLayersImage: territory.paintLayersImage || [],
              image: territory.image,
              miniature: territory.miniature
            });
          }
        }

        toast.success(t("p.territory.regenerate_large_success"))
      } else {
        const success = await generateStandardImage(territory);

        if (success) {
          // Récupérer l'URL de l'image
          const response = await apiService.getTerritoryImages(territory.num, 'standard');

          if (response.images && response.images.length > 0) {
            const imageUrl = `/p${response.images[0].imageUrl}`;

            // Récupérer aussi la miniature
            const thumbnailResponse = await apiService.getTerritoryImages(territory.num, 'thumbnail');
            let thumbnailUrl = territory.miniature;

            if (thumbnailResponse.images && thumbnailResponse.images.length > 0) {
              thumbnailUrl = `/p${thumbnailResponse.images[0].imageUrl}`;
            }

            updateTerritory(num!, {
              original: imageUrl,
              image: imageUrl,
              miniature: thumbnailUrl,
              paintLayersImage: [],
              paintLayersLarge: territory.paintLayersLarge || [],
              large: territory.large,
              originalLarge: territory.originalLarge
            });
          }
        }

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
    try {
      // Calculer un bbox valide basé sur le polygone du territoire
      const lats = territory.polygon.map(p => p.lat);
      const lons = territory.polygon.map(p => p.lon);

      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);
      const minLon = Math.min(...lons);
      const maxLon = Math.max(...lons);

      // Ajouter une marge de 20% autour du territoire
      const centerLat = (minLat + maxLat) / 2;
      const centerLon = (minLon + maxLon) / 2;
      const height = (maxLat - minLat) * 1.2; // 20% de marge
      const width = (maxLon - minLon) * 1.2;  // 20% de marge

      const validBbox: [number, number, number, number] = [
        centerLon - width/2,
        centerLat - height/2,
        centerLon + width/2,
        centerLat + height/2
      ];

      console.log("Génération d'image avec bbox calculé:", validBbox);
      const success = await generateLargeImageWithCrop(territory, validBbox, cropData)

      if (success) {
        const apiService = new ApiTerritoryService();

        if (isLarge) {
          // Récupérer l'URL de l'image
          const response = await apiService.getTerritoryImages(territory.num, 'large');

          if (response.images && response.images.length > 0) {
            const imageUrl = `/p${response.images[0].imageUrl}`;

            updateTerritory(num!, {
              originalLarge: imageUrl,
              large: imageUrl,
              paintLayersLarge: [],
              paintLayersImage: territory.paintLayersImage || [],
              image: territory.image,
              miniature: territory.miniature
            });
          }

          toast.success("Plan large mis à jour avec le crop - contour du territoire redessiné")
        } else {
          // Récupérer l'URL de l'image standard
          const response = await apiService.getTerritoryImages(territory.num, 'standard');

          if (response.images && response.images.length > 0) {
            const imageUrl = `/p${response.images[0].imageUrl}`;

            // Récupérer aussi la miniature
            const thumbnailResponse = await apiService.getTerritoryImages(territory.num, 'thumbnail');
            let thumbnailUrl = territory.miniature;

            if (thumbnailResponse.images && thumbnailResponse.images.length > 0) {
              thumbnailUrl = `/p${thumbnailResponse.images[0].imageUrl}`;
            }

            updateTerritory(num!, {
              original: imageUrl,
              image: imageUrl,
              miniature: thumbnailUrl,
              paintLayersImage: [],
              paintLayersLarge: territory.paintLayersLarge || [],
              large: territory.large,
              originalLarge: territory.originalLarge
            });
          }

          toast.success("Image mise à jour avec le crop - contour du territoire redessiné")
        }
      }

      setPaintKey(prev => prev + 1)
    } catch (error) {
      toast.error("Erreur lors de l'application du crop")
    } finally {
      setIsGeneratingCrop(false)
    }
  }, [territory, isLarge, generateLargeImageWithCrop, generateThumbnailFromImage, updateTerritory, num])

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
