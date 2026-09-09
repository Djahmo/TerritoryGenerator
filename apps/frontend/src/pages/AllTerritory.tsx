import React, { useEffect, useState, useRef } from 'react'
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet'
import { Link } from 'react-router'
import { useApiTerritory } from '&/useApiTerritory'
import type { Territory } from '../utils/types'
import 'leaflet/dist/leaflet.css'
import { useApiConfig } from '@/hooks/useApiConfig'
import { useFileReader, parse, makeGpx } from '&/useFile'
import { useApiGenerate } from '&/useApiGenerate'
import FileUpload from '../components/ui/FileUpload'
import { useTranslation } from 'react-i18next'
import { ApiTerritoryService } from '../services/apiTerritoryService'

import { geometryChanged } from '../utils/territoryFiles'
import { useDrawingDrafts } from '../services/drawingDrafts'

interface TerritoryGeoJSON {
  territory: any // Utilisation du type du cache
  geoJson: any
}

// Composant personnalisé pour l'overlay du territoire
const TerritoryOverlay: React.FC<{
  territory: Territory;
  position: { x: number; y: number };
  onClose: () => void
}> = ({ territory, position, onClose }) => {
  return (
    <div
      className="fixed z-[9999] bg-lightnd dark:bg-darknd border border-muted/20 rounded-lg shadow-xl p-4 min-w-64 max-w-sm"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-lg font-semibold text-dark dark:text-light">
          {territory.num} | {territory.name}
        </h3>
        <button
          onClick={onClose}
          className="text-muted hover:text-dark dark:hover:text-light transition-colors text-xl leading-none"
        >
          ✕
        </button>
      </div>
      <Link
        to={`/territory/${encodeURIComponent(territory.num)}`}
        className="btn-accent text-white no-underline inline-flex items-center gap-2 w-full justify-center"
        onClick={onClose}
      >
        📍 Voir le territoire
      </Link>
    </div>
  )
}

const AllTerritory: React.FC = () => {
  const { cache, loading, loadFromBackend } = useApiTerritory()
  const processedContent = useRef<string | null>(null)
  const { content, type, error: fileError, readFile } = useFileReader()
  const { loading: imgLoading, error: imgError, progress, generateImages } = useApiGenerate()
  const { t } = useTranslation()
  const [territoriesGeoJSON, setTerritoriesGeoJSON] = useState<TerritoryGeoJSON[]>([])
  const [error, setError] = useState<string | null>(null)
  const [mapCenter, setMapCenter] = useState<[number, number]>([45.5017, -73.5673]) // Défaut Montréal
  const [selectedTerritory, setSelectedTerritory] = useState<Territory | null>(null)
  const [overlayPosition, setOverlayPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [mapKey, setMapKey] = useState<number>(0) // Clé pour forcer le re-render de la carte
  const [showUpload, setShowUpload] = useState<boolean>(false) // Pour afficher le téléversement
  const [isProcessingNewFile, setIsProcessingNewFile] = useState<boolean>(false) // Pour indiquer qu'on traite un nouveau fichier
  const { config, loading: configLoading } = useApiConfig()

  const calculateCenter = (geoJsonData: any[]): [number, number] => {
    if (geoJsonData.length === 0) return [45.5017, -73.5673]

    let totalLat = 0
    let totalLng = 0
    let pointCount = 0

    geoJsonData.forEach(({ geoJson }) => {
      if (geoJson.features) {
        geoJson.features.forEach((feature: any) => {
          if (feature.geometry && feature.geometry.coordinates) {
            const coords = feature.geometry.coordinates

            // Gérer différents types de géométries
            if (feature.geometry.type === 'Polygon') {
              coords[0].forEach((coord: number[]) => {
                totalLng += coord[0]
                totalLat += coord[1]
                pointCount++
              })
            } else if (feature.geometry.type === 'LineString') {
              coords.forEach((coord: number[]) => {
                totalLng += coord[0]
                totalLat += coord[1]
                pointCount++
              })
            } else if (feature.geometry.type === 'Point') {
              totalLng += coords[0]
              totalLat += coords[1]
              pointCount++
            }
          }
        })
      }
    })

    if (pointCount === 0) return [45.5017, -73.5673]

    return [totalLat / pointCount, totalLng / pointCount]
  }

  useEffect(() => {
    const convertGpxToGeoJSON = () => {
      try {

        const territoriesWithGeoJSON: TerritoryGeoJSON[] = []

        for (const territory of cache?.territories ?? []) {
          territoriesWithGeoJSON.push({ territory, geoJson: {
            type: 'FeatureCollection', features: [{ type: 'Feature', properties: {}, geometry: {
              type: 'LineString', coordinates: territory.polygon.map(p => [p.lon, p.lat]),
            } }],
          } })
        }
        setTerritoriesGeoJSON(territoriesWithGeoJSON)

        if (territoriesWithGeoJSON.length > 0) {
          const center = calculateCenter(territoriesWithGeoJSON)
          setMapCenter(center)
        }
      } catch (err) {
        setError('Erreur lors du traitement des territoires')
        console.error('Erreur lors du traitement des territoires:', err)
      }
    }
    if (!loading) {
      convertGpxToGeoJSON()
    }
  }, [cache, loading])
  useEffect(() => {
    if (!content) processedContent.current = null
    if (!content || !type || loading || processedContent.current === content) return
    processedContent.current = content
    const apiService = new ApiTerritoryService()
    void (async () => {
      setError(null)
      setIsProcessingNewFile(true)
      try {
        const imported = parse(content, type)
        const previous = cache?.territories ?? []
        const changed = previous.filter(old => {
          const next = imported.find(t => t.num === old.num)
          return !next || geometryChanged(old, next)
        })
        if (changed.length && !window.confirm(`Les contours de ${changed.map(t => t.num).join(', ')} sont modifiés ou supprimés. Leurs anciennes cartes et annotations seront retirées. Continuer l’import ?`)) return
        const finalTerritories = imported.map(next => {
          const old = previous.find(t => t.num === next.num)
          return { ...next, name: old?.name || next.name }
        })
        await apiService.saveTerritoryData(makeGpx(finalTerritories))
        changed.forEach(t => useDrawingDrafts.getState().clearTerritory(t.num))
        await loadFromBackend()
        await generateImages(finalTerritories, () => {})
        await loadFromBackend()
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Import impossible')
      } finally {
        setIsProcessingNewFile(false)
      }
    })()
  }, [content, type, loading, cache, generateImages, loadFromBackend])

  useEffect(() => {
    const handleResize = () => {
      setSelectedTerritory(null)
      setMapKey(prev => prev + 1)
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const onEachFeature = (_feature: any, layer: any, territory: Territory) => {
    layer.on('click', (e: any) => {
      const map = e.target._map
      const containerPoint = map.latLngToContainerPoint(e.latlng)

      setOverlayPosition({
        x: containerPoint.x + 10,
        y: containerPoint.y - 10
      })
      setSelectedTerritory(territory)
    })
  }
  if (loading || imgLoading || configLoading || isProcessingNewFile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-positive mx-auto mb-4"></div>
          <p className="text-muted">
            {imgLoading ? (
              progress.total > 0 ?
                `Génération des territoires... ${progress.current}/${progress.total}` :
                "Génération des territoires..."
            ) : configLoading ?
              "Chargement de la configuration..." :
              "Chargement des territoires..."}
          </p>
          {imgLoading && progress.total > 0 && (
            <div className="mt-4 w-64 mx-auto">
              <div className="bg-muted/20 rounded-full h-2">
                <div
                  className="bg-positive h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (error || imgError || fileError) return <div className="p-8 flex flex-col items-center gap-4">
    <p role="alert">{error || imgError || fileError}</p>
    <FileUpload onFile={readFile} />
    <Link to="/territories">Voir les territoires enregistrés</Link>
  </div>
  if (territoriesGeoJSON.length === 0) {
    return (
      <div className="h-screen w-full relative">
        <div className="bg-lightnd dark:bg-darknd border-b border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-light">
              {t("home.upload_title", "Charger un fichier territoire")}
            </h1>
          </div>
        </div>

        <div className="flex items-center justify-center h-[calc(100vh-73px)]">
          <div className="text-center max-w-md">
            <h2 className="text-xl font-semibold mb-4 text-dark dark:text-light">
              Aucun territoire trouvé
            </h2>
            <p className="text-muted mb-6">
              Il n'y a pas encore de territoires avec des données GPX. Téléversez un fichier CSV ou GPX pour commencer.
            </p>
            <FileUpload
              onFile={file => readFile(file)}
              loading={imgLoading}
            />
          </div>
        </div>
      </div>
    )
  }
  return (
    <div className="h-screen w-full relative">      <div className="bg-lightnd dark:bg-darknd border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-light">
          Mon territoire ({territoriesGeoJSON.length} territoires)
        </h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowUpload(true)}
            className="btn-accent text-white inline-flex items-center gap-2"
          >
            📤 Re téléverser mes territoires
          </button>
        </div>
      </div>
    </div><div className="h-[calc(100vh-73px)] relative">
        <MapContainer
          key={mapKey}
          center={mapCenter}
          zoom={11}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="/tiles/{z}/{x}/{y}.png"
          />

          {territoriesGeoJSON.map((item) => (
            <GeoJSON
              key={`${item.territory.num}-${JSON.stringify(item.territory.polygon)}`}              data={item.geoJson}
              style={{
                color: config?.contourColor || '#3388ff', // Couleur par défaut si config n'est pas chargé
                weight: 3,
                opacity: 0.8,
                fillOpacity: 0.2
              }}
              onEachFeature={(_feature, layer) => onEachFeature(_feature, layer, item.territory)}
            />))}
        </MapContainer>
      </div>
      {/* Overlay personnalisé pour le territoire sélectionné */}
      {selectedTerritory && (
        <TerritoryOverlay
          territory={selectedTerritory}
          position={overlayPosition}
          onClose={() => setSelectedTerritory(null)}
        />
      )}

      {/* Modal de re-téléversement */}
      {showUpload && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]">
          <div className="bg-lightnd dark:bg-darknd rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold text-dark dark:text-light">
                Re téléverser mes territoires
              </h3>
              <button
                onClick={() => setShowUpload(false)}
                className="text-muted hover:text-dark dark:hover:text-light transition-colors text-xl leading-none"
              >
                ✕
              </button>
            </div>
            <p className="text-gray-600 mb-6">
              Téléversez un nouveau fichier CSV ou GPX pour remplacer vos territoires actuels.
            </p>            <FileUpload
              onFile={async (file) => {
                readFile(file)
                setShowUpload(false)


              }}
              loading={imgLoading}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default AllTerritory
