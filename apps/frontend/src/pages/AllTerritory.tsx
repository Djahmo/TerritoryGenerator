import React, { useEffect, useState } from 'react'
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet'
import { DOMParser } from '@xmldom/xmldom'
import * as toGeoJSON from '@tmcw/togeojson'
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

// Créer une instance du service API
const apiService = new ApiTerritoryService()

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
        to={`/territory/${territory.num}`}
        className="btn-accent text-white no-underline inline-flex items-center gap-2 w-full justify-center"
        onClick={onClose}
      >
        📍 Voir le territoire
      </Link>
    </div>
  )
}

const AllTerritory: React.FC = () => {  const { cache, loading, updateGpx, updateTerritories } = useApiTerritory()
  const { content, type, error: fileError, readFile } = useFileReader()
  const { loading: imgLoading, error: imgError, progress, generateImages } = useApiGenerate()
  const { t } = useTranslation()
  const [territoriesGeoJSON, setTerritoriesGeoJSON] = useState<TerritoryGeoJSON[]>([])
  const [error, setError] = useState<string | null>(null)
  const [mapCenter, setMapCenter] = useState<[number, number]>([45.5017, -73.5673]) // Défaut Montréal
  const [selectedTerritory, setSelectedTerritory] = useState<Territory | null>(null)
  const [overlayPosition, setOverlayPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [mapKey, setMapKey] = useState<number>(0) // Clé pour forcer le re-render de la carte
  const [territories, setTerritories] = useState<any[]>([])
  const [showUpload, setShowUpload] = useState<boolean>(false) // Pour afficher le téléversement
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

        if (cache?.gpx && cache?.territories) {

          try {
            // Convertir GPX vers GeoJSON
            const parser = new DOMParser()
            const gpxDoc = parser.parseFromString(cache.gpx, 'application/xml')
            const geoJson = toGeoJSON.gpx(gpxDoc)

            if (geoJson && geoJson.features && geoJson.features.length > 0) {
              // Associer chaque feature à un territoire
              geoJson.features.forEach((feature: any, index: number) => {
                const territory = cache.territories[index]
                if (territory) {
                  territoriesWithGeoJSON.push({
                    territory,
                    geoJson: {
                      type: 'FeatureCollection',
                      features: [feature]
                    }
                  })
                }
              })
            }
          } catch (err) {
            console.warn('Erreur lors de la conversion GPX:', err)
          }
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
    (async () => {
      if (content && type) {
        try {
          setError(null)
          const parsed = parse(content, type)
          setTerritories(parsed.sort((a, b) => a.num.localeCompare(b.num)))
          if (parsed.length) {
            const gpxData = makeGpx(parsed)

            // Sauvegarde des données au backend
            await apiService.saveTerritoryData(gpxData)

            // Mise à jour des données locales immédiatement
            updateGpx(gpxData)

            // Génération des images
            await generateImages(parsed, (territorys: Territory[]) => {
              setTerritories(territorys)
              if (territorys.every((t: Territory) => !t.isDefault && t.image)) {
                // On a déjà mis à jour le GPX, il suffit de mettre à jour les territoires
                updateTerritories(territorys)
              }
            })
          }
        } catch (error) {
          console.error('❌ Erreur lors du traitement du fichier:', error)
          setError(`Erreur lors du traitement du fichier: ${error}`)
        }

      }
    })()
  }, [content, type, generateImages, updateGpx, updateTerritories])

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
  if (loading || imgLoading || configLoading) {
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

  if (error || imgError) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || imgError}</p>
          <Link
            to="/"
            className="inline-block px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retour à l'accueil
          </Link>
        </div>
      </div>
    )
  }

  if (fileError) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 mb-4">{fileError}</p>
          <Link
            to="/"
            className="inline-block px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retour à l'accueil
          </Link>
        </div>
      </div>
    )
  }
  if (territoriesGeoJSON.length === 0 && !territories.length) {
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
              onFile={file => readFile(file, file.name.endsWith('.csv') ? 'latin1' : 'utf-8')}
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

          {territoriesGeoJSON.map((item, index) => (
            <GeoJSON
              key={`${item.territory.num}-${index}`}              data={item.geoJson}
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
            </p>
            <FileUpload
              onFile={file => {
                readFile(file, file.name.endsWith('.csv') ? 'latin1' : 'utf-8')
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
