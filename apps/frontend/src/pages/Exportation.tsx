import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router'
import { useTranslation } from 'react-i18next'
import { useApiTerritory } from '&/useApiTerritory'
import type { Territory } from '%/types'
import JSZip from 'jszip'
import { Download, FileArchive, Printer, Eye, Search } from 'lucide-react'
import Wrapper from '@/components/ui/Wrapper'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'

// Template de base pour le territoire (HTML sans container)
const createTerritoryHTML = (territory: Territory): string => {
  return /*html*/`
    <div class="print-header">
      <div class="print-field date-field">
        <div class="print-field-label">A rendre le :</div>
        <div class="print-field-value"></div>
      </div>
      <div class="print-field name-field">
        <div class="print-field-value name-value">${territory.name}</div>
      </div>
      <div class="print-field number-field">
        <div class="print-field-value">N°${territory.num}</div>
      </div>
    </div>
    <div class="territory-image">
      <img src="${territory.image}" alt="Territoire ${territory.num}" />
    </div>
  `
}

// Fonction réutilisable pour créer le HTML d'impression complet
const createPrintHTML = (content: string, title: string = "Territoire", isMultiPage: boolean = false, orientations?: boolean[]): string => {
  // Déterminer l'orientation générale : paysage si au moins une image est en paysage
  const hasLandscapeImage = orientations?.some(Boolean) || false
  const pageOrientation = hasLandscapeImage ? 'landscape' : 'portrait'

  return /*html*/`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>${title}</title>
        <style>
          @page {
            size: A4 ${pageOrientation};
            margin: 5mm;
          }

          @media print {
            html, body {
              width: 100% !important;
              height: 100% !important;
              overflow: visible !important;
              -webkit-print-color-adjust: exact !important;
              color-adjust: exact !important;
              margin: 0 !important;
              padding: 0 !important;
            }

            .no-print { display: none !important; }

            * {
              -webkit-print-color-adjust: exact !important;
              color-adjust: exact !important;
            }

            .print-container {
              transform: scale(0.98);
              transform-origin: center center;
            }
            ${isMultiPage ? /*css*/`
              .territory-page {
                page-break-after: always;
                page-break-inside: avoid;
                position: relative;
                width: 100% !important;
                height: 100% !important;
                display: block !important;
                margin: 0 !important;
                padding: 0 !important;
                box-sizing: border-box !important;
              }
              .territory-page .print-container {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                width: 100% !important;
                height: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
                box-sizing: border-box !important;
              }

              .territory-page:first-child {
                page-break-before: auto;
              }

              .territory-page:last-child {
                page-break-after: avoid;
              }
            ` : ''}
          }
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
            ${isMultiPage ? 'overflow: visible;' : 'display: flex; flex-direction: column;'}
            box-sizing: border-box;
          }
          .print-container {
            border: 2px solid #000;
            display: flex;
            flex-direction: column;
            height: 100%;
            max-width: 100%;
            margin: 0 auto;
          }
          .print-header {
            display: flex;
            gap: 0;
            border-bottom: 2px solid #000;
            flex-shrink: 0;
            width: 100%;
            height: 80px;
          }

          .print-field {
            border: 2px solid #000;
            text-align: center;
            border-bottom: none;
          }

          .print-field.date-field {
            border-right: 2px solid #000;
            flex: 1;
            display: flex;
            flex-direction: column;
          }

          .print-field.name-field {
            border-right: 2px solid #000;
            flex: 2;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .print-field.number-field {
            flex: 0 0 100px;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .print-field-label {
            font-size: 20px;
            color: #000;
            padding: 4px;
            text-transform: uppercase;
            font-weight: bold;
            border-bottom: 2px solid #000;
          }
          .print-field-value {
            font-weight: bold;
            font-size: 28px;
            color: #000;
            padding: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100%;
          }
          .print-field-value.name-value {
            padding: 12px 8px;
            font-size: 36px;
            text-align: center;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .territory-image {
            width: 100%;
            height: 100%;
            overflow: hidden;
          }
          .territory-image img {
            width: 100%;
            height: 100%;
            object-fit: fill;
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
          }
        </style>
      </head>
      <body>
        ${content}
      </body>
    </html>
  `
}

// Modal de prévisualisation d'impression
const PrintPreviewModal: React.FC<{ territory: Territory; onClose: () => void; }> = ({ territory, onClose }) => {
  const [isLandscape, setIsLandscape] = useState(false)
  const [activeTab, setActiveTab] = useState<'normal' | 'large'>('normal')
  const [isLandscapeLarge, setIsLandscapeLarge] = useState(false)

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget
    setIsLandscape(img.naturalWidth > img.naturalHeight)
  }

  const handleImageLoadLarge = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget
    setIsLandscapeLarge(img.naturalWidth > img.naturalHeight)
  }
  const handlePrint = (isLarge: boolean = false) => {
    const currentTerritory = isLarge ? { ...territory, image: territory.large } : territory
    const territoryHTML = createTerritoryHTML(currentTerritory)
    const printContent = createPrintHTML(`<div class="print-container">${territoryHTML}</div>`, `Territoire ${territory.num}${isLarge ? ' (Large)' : ''}`)

    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(printContent)
      printWindow.document.close()

      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print()
          printWindow.close()
        }, 500)
      }
    }
  }
  return (
    <Modal isOpen={true} className=" rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-auto">
      <div className="flex justify-between items-center p-4 border-b">
        <h3 className="text-lg font-semibold">
          Aperçu d'impression - Territoire {territory.num}
        </h3>
        <button
          onClick={onClose}
          className="text-muted text-xl leading-none"
        >
          ✕
        </button>
      </div>
      <div className="p-6">        {/* Onglets si image large disponible */}
        {territory.large && (
          <div className="flex mb-4 border-b">
            <button
              onClick={() => setActiveTab('normal')}
              className={`px-4 py-2 font-medium ${activeTab === 'normal'
                ? 'border-b-2 border-accent text-accent'
                : 'text-muted hover:text-foreground'
                }`}
            >
              Normal
            </button>
            <button
              onClick={() => setActiveTab('large')}
              className={`px-4 py-2 font-medium ${activeTab === 'large'
                ? 'border-b-2 border-accent text-accent'
                : 'text-muted hover:text-foreground'
                }`}
            >
              Large
            </button>
          </div>
        )}

        {/* Simulation exacte du format d'impression avec bordures épaisses */}
        <div
          className={`bg-white mx-auto shadow-lg flex flex-col border-[3px] border-black ${(activeTab === 'normal' ? isLandscape : isLandscapeLarge)
            ? 'w-full max-w-5xl aspect-[297/210] h-[500px]'
            : 'w-full max-w-3xl aspect-[210/297] h-[707px]'
            }`}
        >
          {/* En-tête avec disposition identique à l'impression */}
          <div className="flex-shrink-0 h-16 border-b-[3px] border-black flex">
            <div className="text-center border-r-[3px] border-black flex-1 flex flex-col">
              <div className="text-sm font-bold text-black p-2 uppercase border-b-[3px] border-black h-8">
                A rendre le :
              </div>
              <div className="p-2 min-h-[30px]"></div>
            </div>
            <div className="text-center flex border-r-[3px] border-black flex-[2] items-center justify-center">
              <div className="font-bold text-2xl text-black p-2">{territory.name}</div>
            </div>
            <div className="text-center flex flex-[0_0_100px] items-center justify-center">
              <div className="font-bold text-2xl text-black p-2">N°{territory.num}</div>
            </div>
          </div>          {/* Image du territoire - mode fill pour correspondre au print */}
          <div className="flex-1 overflow-hidden">
            <img
              src={activeTab === 'normal' ? territory.image : (territory.large || territory.image)}
              alt={`Territoire ${territory.num}`}
              className="w-full h-full object-fill"
              onLoad={activeTab === 'normal' ? handleImageLoad : handleImageLoadLarge}
            />
          </div>
        </div>
        <div className="mt-6 flex gap-3 justify-center">
          <button
            onClick={() => handlePrint(activeTab === 'large')}
            className="btn-accent inline-flex items-center gap-2"
          >
            <Printer size={20} />
            Imprimer {activeTab === 'large' ? '(Large)' : 'maintenant'}
          </button>
          <button
            onClick={onClose}
            className="btn-neutral"
          >
            Fermer
          </button>
        </div>
      </div>
    </Modal>
  )
}

const Exportation: React.FC = () => {
  const { t } = useTranslation()
  const { cache } = useApiTerritory()
  const navigate = useNavigate()
  const [isDownloading, setIsDownloading] = useState(false)
  const [previewTerritory, setPreviewTerritory] = useState<any>(null)
  const [isPrintingAll, setIsPrintingAll] = useState(false)
  const [isGeneratingPrintFiles, setIsGeneratingPrintFiles] = useState(false)
  const [search, setSearch] = useState<string>("")
  const territories = cache?.territories || []

  // Redirection automatique vers la page d'accueil si aucun territoire en cache
  useEffect(() => {
    if (!territories.length) {
      navigate('/')
    }
  }, [territories.length, navigate])
  // Filtrer les territoires selon la recherche
  const filteredTerritories = territories.filter((territory: Territory) =>
    !search || `${territory.num} - ${territory.name}`.toLowerCase().includes(search.toLowerCase())
  )// Fonction pour créer un document HTML d'impression pour un territoire
  const createPrintDocument = (territory: Territory, isLandscape?: boolean): string => {
    const territoryHTML = createTerritoryHTML(territory)
    const orientations = isLandscape !== undefined ? [isLandscape] : undefined
    return createPrintHTML(`<div class="print-container">${territoryHTML}</div>`, `Territoire ${territory.num}`, false, orientations)
  }  // Fonction pour imprimer un territoire individuel
  const printTerritory = (territory: Territory) => {
    // D'abord analyser l'orientation de l'image
    const tempImg = new Image()
    tempImg.onload = () => {
      const isLandscape = tempImg.naturalWidth > tempImg.naturalHeight

      const printWindow = window.open('', '_blank')
      if (printWindow) {
        printWindow.document.write(createPrintDocument(territory, isLandscape))
        printWindow.document.close()

        // Configuration pour une impression optimale
        printWindow.addEventListener('beforeprint', () => {
          // Ajouter des styles supplémentaires pour forcer l'affichage des images
          const style = printWindow.document.createElement('style')
          style.textContent = /*css*/`
            @media print {
              html, body {
                -webkit-print-color-adjust: exact !important;
                color-adjust: exact !important;
              }
              /* Forcer l'affichage des images en impression */
              img {
                display: block !important;
                visibility: visible !important;
                opacity: 1 !important;
                -webkit-print-color-adjust: exact !important;
                color-adjust: exact !important;
              }
            }
          `
          printWindow.document.head.appendChild(style)
        })

        // Attendre que l'image soit chargée avant d'imprimer
        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.print()
            printWindow.close()
          }, 500)
        }
      }
    }

    tempImg.onerror = () => {
      // En cas d'erreur, utiliser portrait par défaut
      const printWindow = window.open('', '_blank')
      if (printWindow) {
        printWindow.document.write(createPrintDocument(territory, false))
        printWindow.document.close()
        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.print()
            printWindow.close()
          }, 500)
        }
      }
    }

    tempImg.src = territory.image!
  }// Fonction pour imprimer la version large d'un territoire
  const printTerritoryLarge = (territory: Territory) => {
    if (!territory.large) {
      alert("Aucune version large disponible pour ce territoire")
      return
    }

    // D'abord analyser l'orientation de l'image large
    const tempImg = new Image()
    tempImg.onload = () => {
      const isLandscape = tempImg.naturalWidth > tempImg.naturalHeight
      const territoryLarge = { ...territory, image: territory.large }

      const printWindow = window.open('', '_blank')
      if (printWindow) {
        printWindow.document.write(createPrintDocument(territoryLarge, isLandscape))
        printWindow.document.close()

        // Configuration pour une impression optimale
        printWindow.addEventListener('beforeprint', () => {
          // Ajouter des styles supplémentaires pour forcer l'affichage des images
          const style = printWindow.document.createElement('style')
          style.textContent = /*css*/`
            @media print {
              html, body {
                -webkit-print-color-adjust: exact !important;
                color-adjust: exact !important;
              }
              /* Forcer l'affichage des images en impression */
              img {
                display: block !important;
                visibility: visible !important;
                opacity: 1 !important;
                -webkit-print-color-adjust: exact !important;
                color-adjust: exact !important;
              }
            }
          `
          printWindow.document.head.appendChild(style)
        })

        // Attendre que l'image soit chargée avant d'imprimer
        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.print()
            printWindow.close()
          }, 500)
        }
      }
    }

    tempImg.onerror = () => {
      // En cas d'erreur, utiliser portrait par défaut
      const territoryLarge = { ...territory, image: territory.large }
      const printWindow = window.open('', '_blank')
      if (printWindow) {
        printWindow.document.write(createPrintDocument(territoryLarge, false))
        printWindow.document.close()
        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.print()
            printWindow.close()
          }, 500)
        }
      }
    }
    tempImg.src = territory.large!
  }

  // Fonction pour imprimer tous les territoires en un seul document
  const printAllTerritories = async () => {
    setIsPrintingAll(true)

    try {      // Étape 1: Analyser l'orientation de chaque territoire
      const territoriesWithOrientation = await Promise.all(
        territories.map(async (territory: Territory) => {
          return new Promise<{ territory: Territory, isLandscape: boolean }>((resolve) => {
            const tempImg = new Image()
            tempImg.onload = () => {
              const isLandscape = tempImg.naturalWidth > tempImg.naturalHeight
              resolve({ territory, isLandscape })
            }
            tempImg.onerror = () => {
              // En cas d'erreur, utiliser portrait par défaut
              resolve({ territory, isLandscape: false })
            }
            tempImg.src = territory.image!
          })
        })
      )      // Étape 2: Créer le contenu des territoires (le CSS gère automatiquement les sauts de page)
      const territoriesContent = territoriesWithOrientation.map(({ territory }: { territory: Territory, isLandscape: boolean }) => {
        return /*html*/`<div class="territory-page">
          <div class="print-container">${createTerritoryHTML(territory)}</div>
        </div>`
      }).join('')

      const orientations = territoriesWithOrientation.map(({ isLandscape }: { territory: Territory, isLandscape: boolean }) => isLandscape)
      const allTerritoriesHtml = createPrintHTML(territoriesContent, 'Tous les territoires', true, orientations)
      // Étape 3: Ouvrir le document dans une nouvelle fenêtre
      const printWindow = window.open('', '_blank')
      if (printWindow) {
        printWindow.document.write(allTerritoriesHtml)
        printWindow.document.close()

        // Ajouter un script pour forcer le rechargement des images
        const script = printWindow.document.createElement('script')
        script.textContent = /*js*/`
          document.addEventListener('DOMContentLoaded', function() {
            const images = document.querySelectorAll('img');
            images.forEach(function(img) {
              if (!img.complete || img.naturalHeight === 0) {
                const src = img.src;
                img.src = '';
                img.src = src;
              }
            });
          });
        `
        printWindow.document.head.appendChild(script)// Configuration pour l'impression
        printWindow.addEventListener('beforeprint', () => {
          const style = printWindow.document.createElement('style')
          style.textContent = /*css*/`
            @media print {
              html, body {
                margin: 0 !important;
                padding: 0 !important;
                -webkit-print-color-adjust: exact !important;
                color-adjust: exact !important;
              }
              /* Forcer l'affichage des images en impression */
              img {
                display: block !important;
                visibility: visible !important;
                opacity: 1 !important;
                -webkit-print-color-adjust: exact !important;
                color-adjust: exact !important;
              }
            }
          `
          printWindow.document.head.appendChild(style)
        })// Attendre le chargement des images puis imprimer
        printWindow.onload = () => {
          // Forcer le rechargement de toutes les images dans la nouvelle fenêtre
          const images = printWindow.document.querySelectorAll('img')

          // Précharger toutes les images avant d'imprimer
          const preloadImages = Array.from(images).map((img) => {
            return new Promise<void>((resolve) => {
              if (img.complete && img.naturalHeight !== 0) {
                resolve()
              } else {
                const newImg = new Image()
                newImg.onload = () => {
                  // Remplacer l'attribut src pour s'assurer que l'image est bien dans le DOM
                  img.src = newImg.src
                  resolve()
                }
                newImg.onerror = () => {
                  console.warn('Erreur de chargement image:', img.src)
                  resolve() // Continuer même en cas d'erreur
                }
                newImg.src = img.src
              }
            })
          })

          Promise.all(preloadImages).then(() => {
            // Attendre un peu plus pour s'assurer que tout est rendu
            setTimeout(() => {
              printWindow.print()
              // Ne pas fermer automatiquement pour permettre à l'utilisateur de voir le résultat
            }, 1000) // Augmenter le délai
          })
        }
      }
    } catch (error) {
      console.error('Erreur lors de l\'impression:', error)
      alert('Erreur lors de l\'impression des territoires')
    } finally {
      setIsPrintingAll(false)
    }
  }
  // Fonction pour générer des fichiers d'impression téléchargeables
  const generatePrintFiles = async () => {
    setIsGeneratingPrintFiles(true)

    try {
      const zip = new JSZip()
      const printFolder = zip.folder('fichiers_impression')      // Créer un fichier HTML pour chaque territoire avec l'orientation adaptée
      for (const territory of territories) {
        // Analyser l'orientation de l'image
        const tempImg = new Image()
        const isLandscape = await new Promise<boolean>((resolve) => {
          tempImg.onload = () => {
            resolve(tempImg.naturalWidth > tempImg.naturalHeight)
          }
          tempImg.onerror = () => {
            resolve(false) // Portrait par défaut en cas d'erreur
          }
          tempImg.src = territory.image!
        })

        const territoryHTML = createTerritoryHTML(territory)
        const orientations = [isLandscape]
        const htmlContent = createPrintHTML(`<div class="print-container">${territoryHTML}</div>`, `Territoire ${territory.num}`, false, orientations)
        printFolder?.file(`territoire_${territory.num}.html`, htmlContent)
      }// Créer un fichier HTML avec tous les territoires en utilisant le nouveau système de templates      // Analyser les orientations pour le fichier multi-territoires
      const territoriesWithOrientation = await Promise.all(
        territories.map(async (territory: Territory) => {
          return new Promise<{ territory: Territory, isLandscape: boolean }>((resolve) => {
            const tempImg = new Image()
            tempImg.onload = () => {
              const isLandscape = tempImg.naturalWidth > tempImg.naturalHeight
              resolve({ territory, isLandscape })
            }
            tempImg.onerror = () => {
              // En cas d'erreur, utiliser portrait par défaut
              resolve({ territory, isLandscape: false })
            }
            tempImg.src = territory.image!
          })        })
      )

      const territoriesContent = territoriesWithOrientation.map(({ territory }: { territory: Territory, isLandscape: boolean }) => {
        return `<div class="territory-page">
          <div class="print-container">${createTerritoryHTML(territory)}</div>
        </div>`
      }).join('')

      const orientations = territoriesWithOrientation.map(({ isLandscape }: { territory: Territory, isLandscape: boolean }) => isLandscape)
      const allTerritoriesHtml = createPrintHTML(territoriesContent, 'Tous les territoires', true, orientations)

      printFolder?.file('tous_les_territoires.html', allTerritoriesHtml)// Ajouter un fichier README avec les instructions
      const readmeContent = `
# Fichiers d'impression des territoires

Ce dossier contient les fichiers HTML prêts pour l'impression de vos territoires.

## Fichiers inclus:
- territoire_[numéro].html : Fichiers individuels pour chaque territoire
- tous_les_territoires.html : Fichier unique contenant tous les territoires

## Instructions d'utilisation:
1. Ouvrez le fichier HTML souhaité dans votre navigateur web
2. Utilisez Ctrl+P (ou Cmd+P sur Mac) pour ouvrir le dialogue d'impression
3. IMPORTANT: Configurez l'impression pour supprimer les en-têtes/pieds de page :

### Configuration par navigateur:

**Google Chrome / Microsoft Edge:**
- Dans l'aperçu d'impression → Cliquez sur "Plus de paramètres"
- Décochez "En-têtes et pieds de page"
- Assurez-vous que les marges sont sur "Minimum" ou "Aucune"

**Mozilla Firefox:**
- Dans l'aperçu d'impression → Cliquez sur "Paramètres de page"
- Onglet "Marges et en-tête/pied de page"
- Sélectionnez "--vide--" pour tous les champs d'en-tête et pied de page
- Définissez les marges sur 0

**Safari (Mac):**
- Menu "Fichier" → "Mise en page"
- Décochez "En-têtes et pieds de page"
- Définissez les marges sur 0

### Conseils pour une impression optimale:
- Utilisez le format A4
- Vérifiez l'aperçu avant impression
- Les fichiers individuels permettent un contrôle plus précis
- Le fichier "tous_les_territoires.html" est pratique pour imprimer en lot
- Assurez-vous que l'option "Couleurs d'arrière-plan" est activée

### Problèmes courants:
- Si les bordures n'apparaissent pas : Activez "Couleurs et images d'arrière-plan"
- Si la mise en page est décalée : Vérifiez que les marges sont sur "Minimum"
- Si les en-têtes/pieds de page apparaissent : Suivez les instructions ci-dessus pour les désactiver

Généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}
      `

      printFolder?.file('README.txt', readmeContent)

      // Générer et télécharger le ZIP
      const zipBlob = await zip.generateAsync({ type: 'blob' })
      const url = URL.createObjectURL(zipBlob)

      const link = document.createElement('a')
      link.href = url
      link.download = `fichiers_impression_territoires_${new Date().toISOString().split('T')[0]}.zip`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Erreur lors de la génération des fichiers d\'impression:', error)
      alert('Erreur lors de la génération des fichiers d\'impression')
    } finally {
      setIsGeneratingPrintFiles(false)
    }
  }
  // Fonction pour télécharger toutes les images en ZIP
  const downloadAllImagesAsZip = async () => {
    const territoriesToDownload = search ? filteredTerritories : territories
    if (!territoriesToDownload.length) return

    setIsDownloading(true)
    try {
      const zip = new JSZip()

      // Créer un dossier pour les images normales et un pour les larges
      const normalFolder = zip.folder('images')
      const largeFolder = zip.folder('images_large')

      // Fonction pour convertir une image en blob
      const imageToBlob = async (imageUrl: string): Promise<Blob> => {
        const response = await fetch(imageUrl)
        return await response.blob()
      }

      // Ajouter toutes les images au ZIP
      for (const territory of territoriesToDownload) {
        if (territory.image) {
          try {
            // Image normale
            const normalBlob = await imageToBlob(territory.image)
            normalFolder?.file(`${territory.num}.png`, normalBlob)            // Image large (si elle existe)
            if (territory.large) {
              const largeBlob = await imageToBlob(territory.large)
              largeFolder?.file(`${territory.num}_large.png`, largeBlob)
            }
          } catch (error) {
            console.warn(`Erreur lors de l'ajout de l'image du territoire ${territory.num}:`, error)
          }
        }
      }

      // Générer et télécharger le ZIP
      const zipBlob = await zip.generateAsync({ type: 'blob' })
      const url = URL.createObjectURL(zipBlob)

      const link = document.createElement('a')
      link.href = url
      link.download = `territoires_${new Date().toISOString().split('T')[0]}.zip`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Erreur lors de la création du ZIP:', error)
      alert('Erreur lors de la création du fichier ZIP')
    } finally {
      setIsDownloading(false)
    }
  }

  if (!territories.length) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-4">Aucun territoire trouvé</h2>
          <p className="text-muted mb-4">
            Il n'y a pas encore de territoires à exporter.
          </p>
          <Link
            to="/all"
            className="btn-accent inline-flex items-center gap-2"
          >
            📤 Téléverser des territoires
          </Link>
        </div>
      </div>
    )
  }
  return (
    <Wrapper className="h-screen bg-light dark:bg-dark flex flex-col">
      {/* En-tête */}
      <div className="bg-lightnd dark:bg-darknd border-b border-muted px-4 py-3 flex-shrink-0">        <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-light">
          {t("exportation.title", "Exportation")} ({territories.length} territoires{search ? ` • ${filteredTerritories.length} affichés` : ''})
        </h1>
      </div>
      </div>      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto p-6">
          {/* Section de téléchargement ZIP */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4 text-dark dark:text-light">
              Télécharger toutes les images
            </h2>
            <div className="bg-lightnd dark:bg-darknd rounded-lg p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-light mb-2">
                    Archive ZIP complète
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Télécharge toutes les images des territoires en format PNG dans un fichier ZIP.
                    Inclut les versions normales et larges.
                  </p>
                </div>
                <button
                  onClick={downloadAllImagesAsZip}
                  disabled={isDownloading}
                  className="btn-accent inline-flex items-center gap-2 ml-4"
                >
                  {isDownloading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Téléchargement...
                    </>
                  ) : (
                    <>
                      <FileArchive size={20} />
                      Télécharger ZIP
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
          {/* Section d'impression */}
          <div className="">
            <h2 className="text-xl font-semibold mb-4 text-dark dark:text-light">
              Impression des territoires
            </h2>
            {/* Actions globales */}
            <div className="bg-lightnd dark:bg-darknd rounded-lg p-6 shadow-sm mb-8">
              <h3 className="font-medium text-gray-900 dark:text-light mb-4">
                Actions globales
              </h3>
              <div className="flex gap-4">
                <button
                  onClick={printAllTerritories}
                  disabled={isPrintingAll}
                  className="btn-accent inline-flex items-center gap-2"
                >
                  {isPrintingAll ? <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Impression en cours...
                  </> : <>
                    <Printer size={20} />
                    Imprimer tous les territoires (document unique)
                  </>}
                </button>
                <button
                  onClick={generatePrintFiles}
                  disabled={isGeneratingPrintFiles}
                  className="btn-neutral inline-flex items-center gap-2"
                >
                  {isGeneratingPrintFiles ? <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-600"></div>
                    Génération...
                  </> : <>
                    <Download size={20} />
                    Télécharger fichiers d'impression
                  </>}
                </button>
              </div>
            </div>
            {filteredTerritories.length === 0 && search ? (
              <div className="text-center py-8">
                <p className="text-gray-600 dark:text-gray-400">
                  Aucun territoire trouvé pour "{search}"
                </p>
              </div>
            ) : (
              <div className="grid gap-4">
                {/* Barre de recherche */}
                {territories.length > 0 && (
                  <div className="mb-6">
                    <Input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      type='text'
                      Icon={Search}
                      placeholder='Rechercher par nom ou numéro du territoire'
                      className='w-full'
                    />
                  </div>
                )}                {filteredTerritories.map((territory: Territory) => (
                  <div key={territory.num} className="bg-lightnd dark:bg-darknd rounded-lg p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Link to={`/territory/${territory.num}`} className="flex items-center gap-4">
                          <img
                            src={territory.miniature}
                            alt={`Territoire ${territory.num}`}
                            className="w-16 h-16 object-cover rounded border"
                          />
                        </Link>
                        <div>
                          <h3 className="font-medium text-gray-900 dark:text-light">
                            Territoire {territory.num}
                          </h3>
                          <p className="text-gray-600 dark:text-gray-400">
                            {territory.name}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {territory.large && (
                          <button
                            onClick={() => printTerritoryLarge(territory)}
                            className="btn-positive inline-flex items-center gap-2"
                          >
                            <Printer size={16} />
                            Imprimer Large
                          </button>
                        )}
                        <button
                          onClick={() => setPreviewTerritory(territory)}
                          className="btn-neutral inline-flex items-center gap-2"
                        >
                          <Eye size={16} />
                          Aperçu
                        </button>
                        <button
                          onClick={() => printTerritory(territory)}
                          className="btn-accent inline-flex items-center gap-2"
                        >
                          <Printer size={16} />
                          Imprimer
                        </button>

                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de prévisualisation */}
      {previewTerritory && (
        <PrintPreviewModal
          territory={previewTerritory}
          onClose={() => setPreviewTerritory(null)}
        />
      )}
    </Wrapper>
  )
}

export default Exportation
