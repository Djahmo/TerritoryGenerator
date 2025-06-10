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
  const { cache, updateTerritories, updateTerritory, saveTerritoryStandard, saveTerritoryLarge } = useApiTerritory()
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
  const [imageRefreshTimestamp, setImageRefreshTimestamp] = useState<number>(Date.now())
  // Fonction pour obtenir l'URL d'une image avec un timestamp de cache
  const getImageUrlWithTimestamp = (imageUrl: string): string => {
    if (!imageUrl) return imageUrl;
    const separator = imageUrl.includes('?') ? '&' : '?';
    return `${imageUrl}${separator}t=${imageRefreshTimestamp}`;
  };

  const [isVertical, setIsVertical] = useState<boolean>(false)
  useEffect(() => {
    if (territory) {
      setInputName(territory.name);
    }
  }, [territory])

  const handleRename = () => {
    const updatedTerritorys = cache?.territories.map((t: any) => t.num === num ? { ...t, name: inputName } : t)
    if (updatedTerritorys) updateTerritories(updatedTerritorys)
  };  const handleToggleLarge = async () => {
    if (!territory) return;

    console.log(`🔄 handleToggleLarge appelé - État actuel: isLarge=${isLarge}, territoire=${territory.num}`);

    // Toujours permettre le basculement, même si l'image n'existe pas
    const newIsLarge = !isLarge;
    setIsLarge(newIsLarge);
      if (newIsLarge && territory.originalLarge) {
      // Si on bascule vers large et que l'image existe, charger l'orientation
      const img = new Image();
      img.onload = () => {
        setIsVertical(img.height > img.width);
        // Forcer la mise à jour du canvas
        setPaintKey(prev => prev + 1);
      };
      img.src = getImageUrlWithTimestamp(territory.originalLarge);
    } else {
      // Forcer la mise à jour du canvas dans tous les autres cas
      setPaintKey(prev => prev + 1);
    }
  };

  const handleGenerateLarge = async () => {
    if (!territory) return;

    console.log(`🚀 Génération d'un nouveau plan large pour territoire ${territory.num}`);
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
          const img = new Image();          img.onload = () => {
            setIsVertical(img.height > img.width);
            console.log(`🖼️ Image large chargée pour territoire ${territory.num}`);
            // Forcer la mise à jour du canvas
            setImageRefreshTimestamp(Date.now());
            setPaintKey(prev => prev + 1);
            // Arrêter l'état de génération APRÈS le chargement
            setIsGeneratingLarge(false);
          };
          img.onerror = () => {
            console.error("Erreur lors du chargement de l'image large");
            setIsGeneratingLarge(false);
          };
          img.src = getImageUrlWithTimestamp(imageUrl);

          updateTerritory(num!, {
            originalLarge: imageUrl,
            large: imageUrl
          });
        } else {
          // Aucune image trouvée dans la réponse
          console.error("Aucune image large trouvée dans la réponse API");
          setIsGeneratingLarge(false);
        }
      } else {
        // Échec de la génération
        console.error("Échec de la génération de l'image large");
        setIsGeneratingLarge(false);
      }
    } catch (error) {
      toast.error(t("p.territory.generate_large_error"));
      setIsGeneratingLarge(false);
    }
  };  const handleSave = async (layers: PaintLayer[], compositeImage?: string) => {
    if (!territory) return;

    console.log(`🎨 Territory.handleSave - Début de la sauvegarde EXPLICITE du territoire ${territory.num}`)
    console.log(`📊 Nombre de layers reçus:`, layers.length)
    console.log(`🖼️ Image composite présente:`, !!compositeImage)
    console.log(`📏 Type de vue:`, isLarge ? 'large' : 'standard')

    try {
      if (!compositeImage) {
        console.log(`❌ Pas d'image composite, arrêt de la sauvegarde`)
        return;
      }

      if (isLarge) {
        // Mise à jour locale + sauvegarde explicite LARGE
        console.log(`💾 Sauvegarde EXPLICITE en mode LARGE - ${layers.length} layers`);
        
        updateTerritory(num!, {
          paintLayersLarge: layers,
          large: compositeImage, // Image composite avec annotations
        });

        // Sauvegarde explicite côté serveur (QUE les données large)
        await saveTerritoryLarge(num!);
      } else {
        // Mise à jour locale + sauvegarde explicite STANDARD
        console.log(`💾 Sauvegarde EXPLICITE en mode STANDARD - ${layers.length} layers`);
        
        const miniature = await generateThumbnailFromImage(compositeImage);
        
        updateTerritory(num!, {
          paintLayersImage: layers,
          image: compositeImage, // Image avec annotations
          miniature: miniature,  // Miniature générée localement
        });

        // Sauvegarde explicite côté serveur (QUE les données standard)
        await saveTerritoryStandard(num!);
      }

      toast.success(t("p.territory.save_success"))
    } catch (error) {
      console.error('❌ Erreur lors de la sauvegarde explicite:', error);
      toast.error("Erreur lors de la sauvegarde de l'image")
    }
  }
  const handleRegenerate = async () => {
    if (!territory) return    setIsRegenerating(true);
    try {
      if (isLarge) {
        const success = await generateLargeImage(territory);        if (success) {
          // La génération a mis à jour la base de données
          // Forcer la mise à jour du canvas après régénération
          setImageRefreshTimestamp(Date.now());
          setPaintKey(prev => prev + 1);
        }

        toast.success(t("p.territory.regenerate_large_success"))
      } else {
        const success = await generateStandardImage(territory);        if (success) {
          // La génération a mis à jour la base de données
          // Forcer la mise à jour du canvas après régénération
          setImageRefreshTimestamp(Date.now());
          setPaintKey(prev => prev + 1);
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
      // ⚠️ IMPORTANT: Le crop ne fonctionne QUE pour le plan large !
      // Si l'utilisateur n'est pas en mode large, on force le passage en mode large
      if (!isLarge) {
        console.log("🔄 Crop détecté en mode standard - Forçage du mode large");
        setIsLarge(true);
      }

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

      console.log("Génération d'image LARGE avec bbox calculé:", validBbox);
      const success = await generateLargeImageWithCrop(territory, validBbox, cropData)

      if (success) {
        const apiService = new ApiTerritoryService();

        // Le crop génère TOUJOURS une image large, peu importe le mode initial
        const response = await apiService.getTerritoryImages(territory.num, 'large');        if (response.images && response.images.length > 0) {
          const imageUrl = `/p${response.images[0].imageUrl}`;

          updateTerritory(num!, {
            originalLarge: imageUrl,
            large: imageUrl,
            // ⚠️ NE PAS TOUCHER aux layers existants lors d'un crop !
            // paintLayersLarge: [], // ← SUPPRIMÉ : ça déclenchait /complete !
            paintLayersImage: territory.paintLayersImage || [],
            image: territory.image,
            miniature: territory.miniature
          });          // Forcer le refresh du canvas APRÈS la mise à jour des données
          setTimeout(() => {
            setImageRefreshTimestamp(Date.now());
            setPaintKey(prev => prev + 1);
          }, 100);
        }        toast.success("Plan large mis à jour avec le crop - contour du territoire redessiné")
      }

      // Le setPaintKey est maintenant dans le if ci-dessus pour être synchronisé
    } catch (error) {
      toast.error("Erreur lors de l'application du crop")
    } finally {
      setIsGeneratingCrop(false)
    }
  }, [territory, generateLargeImageWithCrop, updateTerritory, num])

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
      </h1>      {/* Boutons pour contrôler l'affichage et régénérer l'image */}
      <div className="flex gap-3 items-center">
        <button
          onClick={handleToggleLarge}
          className={`${isLarge
            ? 'btn-positive'
            : 'btn-neutral'
            }`}
        >
          <div className="flex items-center gap-2 cursor-pointer">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {isLarge ? <path d="M9 9h6v6H9z" /> : <path d="M21 21H3V3h18v18z" />}
            </svg>
            <span>{isLarge ? "Plan serré" : "Plan large"}</span>
          </div>
        </button>        {/* Bouton de génération/régénération intelligent */}
        <button
          onClick={isLarge && !territory.originalLarge ? handleGenerateLarge : () => setShowConfirmation(true)}
          disabled={isRegenerating || isGeneratingLarge}
          className={`btn-neutral ${(isRegenerating || isGeneratingLarge) ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {(isRegenerating || isGeneratingLarge) ? (
            <>
              <div className="animate-spin mr-2">⟳</div>
              <span>{isLarge && !territory.originalLarge ? 'Génération...' : 'Régénération...'}</span>
            </>
          ) : (
            <div className="flex items-center gap-2 cursor-pointer">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {isLarge && !territory.originalLarge ? (
                  <path d="M12 2l3 3-3 3M5 12h14" />
                ) : (
                  <path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16" />
                )}
              </svg>
              <span>
                {isLarge && !territory.originalLarge 
                  ? 'Générer plan large' 
                  : `Régénérer ${isLarge ? "le plan large" : "l'image"}`
                }
              </span>
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
          )}          <Paint
            key={paintKey}
            src={getImageUrlWithTimestamp(isLarge ? (territory.originalLarge || territory.original || "") : (territory.original || ""))}
            layers={isLarge ? (territory.paintLayersLarge || []) : (territory.paintLayersImage || [])}
            onSave={handleSave}
            onCrop={handleApplyCrop}
            isLarge={isVertical}
            territoryPolygon={territory?.polygon}
            territory={territory}
            />
          
          {/* Message informatif quand l'image large n'existe pas */}
          {isLarge && !territory.originalLarge && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm rounded-lg">
              <div className="bg-lightnd dark:bg-darknd p-6 rounded-lg shadow-lg text-center max-w-md">
                <div className="mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto text-muted">
                    <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
                    <circle cx="9" cy="9" r="2"/>
                    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2">Plan large non disponible</h3>
                <p className="text-muted text-sm mb-4">
                  Ce territoire n'a pas encore de plan large généré. Cliquez sur "Générer plan large" pour en créer un.
                </p>
                <p className="text-xs text-muted">
                  Vous pouvez revenir au plan serré à tout moment.
                </p>
              </div>
            </div>
          )}
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
