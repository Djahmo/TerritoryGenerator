import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import Wrapper from '#/ui/Wrapper'
import Input from '#/ui/Input'
import { Slider, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '#/ui/shadcn'
import SeparatorX from '#/ui/SeparatorX'
import { useConfig } from '@/hooks/useConfig'
import { Download, Upload, RotateCcw } from 'lucide-react'
import Picker from '#/modules/paint/components/Picker'

const Configuration = () => {
  const { t } = useTranslation()
  const {
    config,
    setConfig,
    exportConfig,
    importConfig,
    finalWidth,
    finalHeight,
    largeFinalWidth,
    largeFinalHeight
  } = useConfig()
  const [importText, setImportText] = useState('')
  const [selectedPaletteColor, setSelectedPaletteColor] = useState('rgba(255,255,255,1)')

  // Ratios prédéfinis avec noms
  const predefinedRatios = [
    { name: 'Papier A4 paysage', value: '1.41:1', ratioX: 1.41, ratioY: 1 },
    { name: 'Papier A4 portrait', value: '1:1.41', ratioX: 1, ratioY: 1.41 },
    { name: 'Écran 16:9', value: '16:9', ratioX: 1.78, ratioY: 1 },
    { name: 'Écran 4:3', value: '4:3', ratioX: 1.33, ratioY: 1 },
    { name: 'Cinéma 21:9', value: '21:9', ratioX: 2.33, ratioY: 1 },
    { name: 'Carré', value: '1:1', ratioX: 1, ratioY: 1 },
    { name: 'Ratio d\'or', value: 'φ:1', ratioX: 1.618, ratioY: 1 },
    { name: 'Photo 3:2', value: '3:2', ratioX: 1.5, ratioY: 1 },
    { name: 'Instagram story', value: '9:16', ratioX: 9 / 16, ratioY: 1 }
  ]
  const getCurrentRatioValue = () => {
    const current = predefinedRatios.find(r =>
      Math.abs(r.ratioX - config.ratioX) < 0.01 && Math.abs(r.ratioY - config.ratioY) < 0.01
    )
    return current?.value || 'custom'
  }

  const getCurrentLargeRatioValue = () => {
    const current = predefinedRatios.find(r =>
      Math.abs(r.ratioX - config.largeRatioX) < 0.01 && Math.abs(r.ratioY - config.largeRatioY) < 0.01
    )
    return current?.value || 'custom'
  }
  const handleRatioChange = (value: string) => {
    const selectedRatio = predefinedRatios.find(r => r.value === value)
    if (selectedRatio) {
      // Mise à jour atomique des deux valeurs de ratio en une seule opération
      setConfig(c => ({
        ...c,
        ratioX: selectedRatio.ratioX,
        ratioY: selectedRatio.ratioY
      }))

      // Afficher une notification pour confirmer le changement
      toast.success(`Ratio modifié : ${selectedRatio.name}`)
    }
  }

  const handleLargeRatioChange = (value: string) => {
    const selectedRatio = predefinedRatios.find(r => r.value === value)
    if (selectedRatio) {
      // Mise à jour atomique des deux valeurs de ratio en une seule opération
      setConfig(c => ({
        ...c,
        largeRatioX: selectedRatio.ratioX,
        largeRatioY: selectedRatio.ratioY
      }))

      // Afficher une notification pour confirmer le changement
      toast.success(`Ratio des plans larges modifié : ${selectedRatio.name}`)
    }
  }

  const handleExport = () => {
    const configString = exportConfig()
    navigator.clipboard.writeText(configString)
    toast.success('Configuration copiée dans le presse-papiers')
  }

  const handleImport = () => {
    if (!importText.trim()) {
      toast.error('Veuillez entrer une configuration à importer')
      return
    }

    const success = importConfig(importText.trim())
    if (success) {
      toast.success('Configuration importée avec succès')
      setImportText('')
    } else {
      toast.error('Format de configuration invalide')
    }
  }
  const handleReset = () => {
    if (confirm('Êtes-vous sûr de vouloir réinitialiser la configuration ?')) {
      // Reset to default by removing from localStorage and reloading
      localStorage.removeItem('paint-config-v1')
      window.location.reload()
    }
  }

  return (
    <Wrapper className='overflow-y-auto h-full'>
      <div className="max-w-4xl mx-auto p-6 space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {t('config.title', 'Configuration')}
          </h1>
          <p className="text-muted">
            {t('config.subtitle', 'Paramètres avancés de l\'application')}
          </p>
        </div>

        {/* Actions globales */}
        <div className="bg-lightnd dark:bg-darknd rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Actions</h2>
          <div className="flex flex-wrap gap-4">
            <button
              onClick={handleExport}
              className="btn-positive flex items-center gap-2"
            >
              <Download size={16} />
              Exporter la configuration
            </button>
            <button
              onClick={handleReset}
              className="btn-negative flex items-center gap-2"
            >
              <RotateCcw size={16} />
              Réinitialiser
            </button>
          </div>

          <SeparatorX />

          <div className="space-y-4">
            <h3 className="font-medium">Importer une configuration</h3>            <Input
              type="text"
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder="Collez votre configuration ici..."
              className="font-mono text-sm"
            />
            <button
              onClick={handleImport}
              className="btn-accent flex items-center gap-2"
            >
              <Upload size={16} />
              Importer
            </button>
          </div>
        </div>
        {/* Configuration du canvas/papier */}
        <div className="bg-lightnd dark:bg-darknd rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Canvas & Papier</h2>

          {/* PPP - Pleine largeur */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">
              Points par pouce (PPP)
            </label>
            <div className="max-w-md">
              <Slider
                value={[config.ppp]}
                onValueChange={([value]) => {
                  setConfig(c => ({ ...c, ppp: value }))
                }}
                min={100}
                max={250}
                step={1}
                className="w-full"
              />
              <div className="text-sm text-muted mt-1">{config.ppp} PPP</div>
            </div>
          </div>

          <SeparatorX className="my-4" />

          {/* Deux colonnes : Plans serrés | Plans larges */}
          <div className="grid md:grid-cols-2 gap-8">
            {/* Colonne Plans serrés */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Plans serrés</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Ratio d'aspect
                  </label>
                  <Select value={getCurrentRatioValue()} onValueChange={handleRatioChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un ratio" />
                    </SelectTrigger>
                    <SelectContent>
                      {predefinedRatios.map((ratio) => (
                        <SelectItem key={ratio.value} value={ratio.value}>
                          {ratio.name} ({ratio.value})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="text-sm text-muted">
                  <span className="font-medium">Configuration:</span>
                  <br />
                  {finalWidth} × {finalHeight} px
                </div>
              </div>
            </div>

            {/* Colonne Plans larges */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Plans larges</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Ratio d'aspect
                  </label>
                  <Select value={getCurrentLargeRatioValue()} onValueChange={handleLargeRatioChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un ratio" />
                    </SelectTrigger>
                    <SelectContent>
                      {predefinedRatios.map((ratio) => (
                        <SelectItem key={ratio.value} value={ratio.value}>
                          {ratio.name} ({ratio.value})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Facteur de zoom
                  </label>
                  <Slider
                    value={[config.largeFactor]}
                    onValueChange={([value]) => {
                      setConfig(c => ({ ...c, largeFactor: value }))
                    }}
                    min={0.05}
                    max={0.8}
                    step={0.01}
                    className="w-full"
                  />
                  <div className="text-sm text-muted mt-1">
                    {config.largeFactor.toFixed(2)} (petit = plus large, grand = plus serré)
                  </div>
                </div>

                <div className="text-sm text-muted">
                  <span className="font-medium">Configuration:</span>
                  <br />
                  {largeFinalWidth} × {largeFinalHeight} px
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Configuration des images */}
        <div className="bg-lightnd dark:bg-darknd rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Génération d'images</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">
                Couleur du contour
              </label>              <div className="flex gap-2">                <Picker
                value={config.contourColor}
                onChange={(color) => setConfig(c => ({ ...c, contourColor: color }))}
                label="Couleur du contour"
              />
                <Input
                  type="text"
                  value={config.contourColor}
                  onChange={(e) => setConfig(c => ({ ...c, contourColor: e.target.value }))}
                  placeholder="#ff0000"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Épaisseur du contour
              </label>              <Slider
                value={[config.contourWidth]}
                onValueChange={([value]) => setConfig(c => ({ ...c, contourWidth: value }))}
                min={1}
                max={20}
                step={1}
                className="w-full"
              />
              <div className="text-sm text-muted mt-1">{config.contourWidth} px</div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Largeur des miniatures
              </label>              <Input type="number"
                value={config.thumbnailWidth.toString()}
                onChange={(e) => setConfig(c => ({ ...c, thumbnailWidth: parseInt(e.target.value) || 500 }))}
                placeholder="Largeur des miniatures"
                min={100}
                max={1000}
                step={50}
              />
            </div>
          </div>
        </div>        {/* Palette de couleurs */}
        <div className="bg-lightnd dark:bg-darknd rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Palette de couleurs</h2>
          <div className="flex gap-6">
            {/* Grille des couleurs */}
            <div className="flex-1">
              <div className="grid grid-cols-5 gap-3">
                {config.palette.map((color, index) => (
                  <div
                    key={`palette-${index}-${color}`}
                    className="w-16 h-16 rounded border border-muted/50"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            {/* Picker à droite */}
            <div className="flex items-center">
              <Picker
                value={selectedPaletteColor}
                onChange={setSelectedPaletteColor}
                className="w-20 h-full cursor-pointer"
              />
            </div>
          </div>
          <p className="text-sm text-muted mt-4">
            Utilisez le sélecteur de couleurs à droite pour choisir une couleur, puis faites un clic droit sur une case de la grille pour la remplacer.
          </p>
        </div>

        {/* Configuration réseau */}
        <div className="bg-lightnd dark:bg-darknd rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Configuration réseau</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">
                Nombre de tentatives
              </label>              <Input type="number"
                value={config.networkRetries.toString()}
                onChange={(e) => setConfig(c => ({ ...c, networkRetries: parseInt(e.target.value) || 3 }))}
                placeholder="Nombre de tentatives"
                min={1}
                max={10}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Délai entre tentatives (ms)
              </label>              <Input type="number"
                value={config.networkDelay.toString()}
                onChange={(e) => setConfig(c => ({ ...c, networkDelay: parseInt(e.target.value) || 1000 }))}
                placeholder="Délai entre tentatives"
                min={100}
                max={10000}
                step={100}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Limite API IGN (ms)
              </label>              <Input type="number"
                value={config.ignApiRateLimit.toString()}
                onChange={(e) => setConfig(c => ({ ...c, ignApiRateLimit: parseInt(e.target.value) || 40 }))}
                placeholder="Limite API IGN"
                min={10}
                max={1000}
                step={10}
              />
            </div>
          </div>
        </div>

        {/* Configuration API IGN */}
        <div className="bg-lightnd dark:bg-darknd rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">API IGN</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                URL de base
              </label>              <Input type="text"
                value={config.ignApiBaseUrl}
                onChange={(e) => setConfig(c => ({ ...c, ignApiBaseUrl: e.target.value }))}
                placeholder="https://data.geopf.fr/wms-r"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Couche
                </label>                <Input type="text"
                  value={config.ignApiLayer}
                  onChange={(e) => setConfig(c => ({ ...c, ignApiLayer: e.target.value }))}
                  placeholder="GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Format
                </label>                <Select value={config.ignApiFormat} onValueChange={(value) => setConfig(c => ({ ...c, ignApiFormat: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="image/png">PNG</SelectItem>
                    <SelectItem value="image/jpeg">JPEG</SelectItem>
                    <SelectItem value="image/webp">WebP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Wrapper>
  )
}

export default Configuration
