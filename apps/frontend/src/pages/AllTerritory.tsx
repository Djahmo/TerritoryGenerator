import React, { useEffect, useState, useRef } from 'react'
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet'
import { Link } from 'react-router'
import { useApiTerritory } from '&/useApiTerritory'
import type { Territory } from '../utils/types'
import 'leaflet/dist/leaflet.css'
import { useApiConfig } from '@/hooks/useApiConfig'
import { useFileReader, parse, makeGpx } from '&/useFile'
import { useApiGenerate } from '&/useApiGenerate'
import FileUpload from '../components/ui/FileUpload'
import PageHeader from '@/components/ui/PageHeader'
import Modal from '@/components/ui/Modal'
import { Map, Upload, MousePointer2, X } from 'lucide-react'
import { ApiTerritoryService } from '../services/apiTerritoryService'

import { geometryChanged } from '../utils/territoryFiles'
import { useDrawingDrafts } from '../services/drawingDrafts'

interface TerritoryGeoJSON {
  territory: any // Utilisation du type du cache
  geoJson: any
}

function MapViewport({ territories }: { territories: TerritoryGeoJSON[] }) {
  const map = useMap()
  useEffect(() => {
    const coordinates = territories.flatMap(({ territory }) => territory.polygon.map((point: { lat: number; lon: number }): [number, number] => [point.lat, point.lon]))
    if (coordinates.length) map.fitBounds(coordinates, { padding: [32, 32], maxZoom: 15 })
  }, [map, territories])
  return null
}

// Composant personnalisé pour l'overlay du territoire
const TerritoryOverlay: React.FC<{
  territory: Territory;
  position: { x: number; y: number };
  onClose: () => void
}> = ({ territory, position, onClose }) => {
  return (
    <div
      className="map-overlay"
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
          aria-label="Fermer le territoire"
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
        Ouvrir le plan
      </Link>
    </div>
  )
}

const AllTerritory: React.FC = () => {
  const { cache, loading, loadFromBackend } = useApiTerritory()
  const processedRead = useRef(0)
  const [regenerateAll, setRegenerateAll] = useState(true)
  const { content, type, error: fileError, readFile, readId } = useFileReader()
  const { loading: imgLoading, error: imgError, progress, generateImages } = useApiGenerate()
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
    if (!content || !type || loading || processedRead.current === readId) return
    processedRead.current = readId
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
        const confirmations: string[] = []
        if (regenerateAll && previous.length) confirmations.push('Tous les plans serrés, miniatures et plans larges existants des territoires importés seront régénérés. Leurs annotations, brouillons et recadrages seront supprimés.')
        if (changed.length) confirmations.push(`Les contours de ${changed.map(t => t.num).join(', ')} sont modifiés ou supprimés. Leurs anciennes cartes et annotations seront retirées.`)
        if (confirmations.length && !window.confirm(`${confirmations.join('\n\n')}\n\nContinuer l’import ?`)) return
        const finalTerritories = imported.map(next => {
          const old = previous.find(t => t.num === next.num)
          return { ...next, name: old?.name || next.name }
        })
        await apiService.saveTerritoryData(makeGpx(finalTerritories))
        changed.forEach(t => useDrawingDrafts.getState().clearTerritory(t.num))
        await loadFromBackend()
        await generateImages(finalTerritories, () => {}, { regenerateAll, previous })
        await loadFromBackend()
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Import impossible')
      } finally {
        setIsProcessingNewFile(false)
      }
    })()
  }, [content, type, readId, loading, cache, generateImages, loadFromBackend, regenerateAll])

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
        x: Math.max(16, Math.min(window.innerWidth - 326, containerPoint.x + map.getContainer().getBoundingClientRect().left + 10)),
        y: Math.max(16, Math.min(window.innerHeight - 220, containerPoint.y + map.getContainer().getBoundingClientRect().top - 10))
      })
      setSelectedTerritory(territory)
    })
  }
  if (loading || imgLoading || configLoading || isProcessingNewFile) {
    return (
      <div className="page flex items-center justify-center" role="status">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-positive mx-auto mb-4"></div>
          <p className="text-muted">
            {imgLoading ? (
              progress.total > 0 ?
                `Génération des cartes… ${progress.current}/${progress.total}` :
                "Génération des cartes…"
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

  if (error || imgError || fileError) return <div className="page flex flex-col items-center gap-4">
    <p role="alert">{error || imgError || fileError}</p>
    <FileUpload onFile={readFile} />
    <Link to="/territories">Voir les territoires enregistrés</Link>
  </div>
  if (territoriesGeoJSON.length === 0) {
    return <div className="page">
      <PageHeader eyebrow="Bienvenue dans votre espace" title="Vos territoires prennent forme." description="Un fichier, quelques repères, et vos cartes sont prêtes à vous accompagner sur le terrain." />
      <div className="empty-state welcome"><Map size={38} /><h2>Ajoutez vos premiers territoires</h2>
        <p>Importez votre fichier CSV ou GPX. Retrouvez ensuite chaque plan dans votre collection pour le personnaliser et l’imprimer.</p>
        <FileUpload onFile={readFile} loading={imgLoading} />
        <div className="workflow-steps"><span><b>01</b>Importez vos territoires</span><span><b>02</b>Ajoutez vos repères</span><span><b>03</b>Imprimez vos plans</span></div>
      </div>
    </div>
  }
  return (
    <div className="page map-page">
      <PageHeader eyebrow="Vue d’ensemble" title="Mon territoire" description={`${territoriesGeoJSON.length} territoires à explorer. Sélectionnez un tracé pour ouvrir son plan.`}
        actions={<><Link className="btn-neutral" to="/territories"><Map size={16} />Mes territoires</Link><button onClick={() => setShowUpload(true)} className="btn-positive"><Upload size={16} />Re téléverser mes territoires</button></>} />
      <div className="map-stage">
        <MapContainer
          key={mapKey}
          center={mapCenter}
          zoom={11}
          style={{ height: '100%', width: '100%' }}
        >
          <MapViewport territories={territoriesGeoJSON} />
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
      <p className="map-caption"><MousePointer2 size={15} />Sélectionnez un territoire sur la carte pour le personnaliser.</p>
      {/* Overlay personnalisé pour le territoire sélectionné */}
      {selectedTerritory && (
        <TerritoryOverlay
          territory={selectedTerritory}
          position={overlayPosition}
          onClose={() => setSelectedTerritory(null)}
        />
      )}

      <Modal isOpen={showUpload} onClose={() => setShowUpload(false)} title="Importer des territoires" className="w-[480px] p-6">
            <div className="flex justify-between items-center gap-4 mb-4">
              <div><p className="eyebrow">Votre collection</p><h2 className="text-xl font-semibold">Importer des territoires</h2></div>
              <button onClick={() => setShowUpload(false)} className="icon-button" aria-label="Fermer l’import"><X size={18} /></button>
            </div>
            <p className="text-muted mb-6">
              Téléversez un nouveau fichier CSV ou GPX pour remplacer vos territoires actuels.
            </p>
            <label className="flex items-start gap-2 mb-3">
              <input type="checkbox" checked={regenerateAll} onChange={e => setRegenerateAll(e.target.checked)} />
              <span>Régénérer toutes les cartes</span>
            </label>
            <p className="text-sm text-muted mb-6">
              Les plans serrés, miniatures et plans larges existants seront recréés, avec suppression de leurs annotations et recadrages après confirmation.
              Décochez pour conserver les cartes inchangées et générer les cartes manquantes.
            </p>
            <FileUpload
              onFile={async (file) => {
                readFile(file)
                setShowUpload(false)


              }}
              loading={imgLoading}
            />
      </Modal>
    </div>
  )
}

export default AllTerritory
