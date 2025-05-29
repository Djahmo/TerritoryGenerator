# Territory Generator

Une application web moderne pour la génération et l'annotation de cartes de territoires à partir de données GPS. L'application permet de charger des territoires depuis des fichiers CSV/GPX, de générer automatiquement des images de cartes haute qualité via l'API IGN, et d'annoter ces cartes avec un éditeur de dessin intégré.

![Territory Generator](apps/frontend/public/images/logo.clear.png)

## ✨ Fonctionnalités principales

### 📁 Import de données
- **Support CSV/GPX** : Import de fichiers de territoires avec parsing automatique
- **Cache IndexedDB** : Sauvegarde locale des territoires pour une utilisation hors ligne
- **Export GPX** : Génération de fichiers GPX à partir des données importées

### 🗺️ Génération de cartes
- **API IGN** : Génération d'images haute résolution via l'API WMS IGN
- **Optimisation automatique** : Calcul d'orientation optimale pour maximiser l'utilisation de l'espace
- **Formats multiples** : Images standard et plans larges disponibles
- **Miniatures** : Génération automatique de vignettes pour l'aperçu

### 🎨 Éditeur de dessin intégré
- **Outils de dessin** : Pinceau, formes géométriques (rectangle, cercle, ligne, flèche)
- **Outils de texte** : Ajout d'annotations textuelles
- **Symboles spéciaux** : Icônes de parking et autres symboles utiles
- **Palette de couleurs** : Palette personnalisable avec gestion des couleurs
- **Historique** : Annuler/Refaire avec gestion complète de l'historique
- **Export** : Sauvegarde des annotations directement sur les images

### 🌍 Internationalisation
- **Support multilingue** : Français et Anglais intégrés
- **Détection automatique** : Langue détectée automatiquement selon le navigateur
- **Interface adaptative** : Traductions complètes de l'interface utilisateur

## 🏗️ Architecture technique

### Stack technologique
- **Frontend** : React 19 + TypeScript + Vite
- **Styling** : UnoCSS avec thèmes sombre/clair
- **State Management** : Zustand + hooks personnalisés
- **Routing** : React Router v7
- **Backend** : Fastify (architecture modulaire)
- **Build** : Turbo (monorepo)

### Structure du projet
```
TerritoryGenerator/
├── apps/
│   ├── frontend/          # Application React
│   └── backend/           # API Fastify
├── package.json           # Configuration workspace
└── turbo.json            # Configuration Turbo
```

### Fonctionnalités avancées
- **Canvas haute performance** : Rendu optimisé avec HTMLCanvas et ImageBitmap
- **Queue de requêtes** : Gestion intelligente des appels API avec retry et rate limiting
- **Cache intelligent** : Système de cache multi-niveaux (mémoire + IndexedDB)
- **PWA Ready** : Headers CORS configurés pour fonctionnement hors ligne

## 🚀 Installation et développement

### Prérequis
- Node.js >= 18
- npm >= 9

### Installation
```bash
# Cloner le repository
git clone <repository-url>
cd TerritoryGenerator

# Installation des dépendances
npm install

# Lancement en mode développement
npm run dev
```

L'application sera accessible sur `http://localhost:5173`

### Configuration
L'application utilise l'API IGN publique par défaut. Les paramètres de configuration sont disponibles dans :
- `apps/frontend/src/utils/constants.ts` - Configuration générale
- `apps/frontend/src/hooks/useConfig.ts` - Configuration utilisateur

## 📖 Guide d'utilisation

### 1. Import de territoires
1. Préparez un fichier CSV ou GPX contenant les données de territoires
2. Utilisez le bouton de téléchargement sur la page d'accueil
3. Les territoires sont automatiquement parsés et affichés

### 2. Génération de cartes
1. Après l'import, les images sont générées automatiquement
2. Chaque territoire dispose d'une miniature et d'une image haute résolution
3. Les cartes sont optimisées pour impression A4

### 3. Annotation des cartes
1. Cliquez sur une carte pour accéder à l'éditeur
2. Utilisez la barre d'outils pour sélectionner un outil de dessin
3. Ajoutez vos annotations (texte, formes, symboles)
4. Les modifications sont sauvegardées automatiquement

## 🔧 Configuration avancée

### Paramètres d'impression
- **PPP** : 250 DPI par défaut (modifiable)
- **Format** : A4 (29.7cm de large)
- **Ratio** : 1.41:1 par défaut

### API IGN
- **Endpoint** : `https://data.geopf.fr/wms-r`
- **Layer** : `GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2`
- **Format** : PNG avec transparence
- **Projection** : EPSG:4326 (WGS84)

### Personnalisation
```typescript
// Configuration dans useConfig.ts
const defaultConfig: Config = {
  ppp: 250,           // Points par pouce
  paperWidth: 29.7,   // Largeur papier en cm
  ratioX: 1.41,       // Ratio largeur
  ratioY: 1,          // Ratio hauteur
  palette: [...]      // Palette de couleurs
}
```

## 🛠️ Scripts disponibles

### Frontend
```bash
npm run dev      # Serveur de développement
npm run build    # Build de production
npm run preview  # Aperçu du build
npm run lint     # Vérification du code
```

### Global
```bash
npm run dev      # Lance le frontend en développement
```

## 🏗️ Architecture des composants

### Services principaux
- **TerritoryImageService** : Génération d'images de territoires
- **NetworkService** : Gestion des requêtes HTTP avec retry
- **ThumbnailService** : Création de miniatures
- **ApiQueue** : File d'attente pour les requêtes API

### Hooks personnalisés
- **useConfig** : Gestion de la configuration utilisateur
- **useGenerate** : Génération d'images en batch
- **useFile** : Lecture et parsing de fichiers
- **useTerritoryCache** : Cache des territoires avec IndexedDB

### Composants Paint
- **Paint** : Composant principal de l'éditeur
- **ToolBar** : Barre d'outils avec sélection d'outils
- **ColorPicker** : Sélecteur de couleurs avancé
- **ActionButtons** : Boutons d'action (annuler, refaire, etc.)

## 🎨 Système de thèmes

L'application supporte les thèmes sombre et clair avec une palette de couleurs complète :

- **Couleurs primaires** : Neutral, Primary, Accent, Positive, Success, Negative
- **Modes** : Light / Dark avec détection automatique
- **UnoCSS** : Utilisation d'utility classes pour un styling cohérent

## 📱 Responsive Design

- **Mobile First** : Interface optimisée pour mobile
- **Breakpoints** : Support tablette et desktop
- **Touch** : Gestion complète des événements tactiles pour le dessin

## 🔒 Sécurité et performance

### Optimisations
- **Image Processing** : Utilisation d'ImageBitmap pour les performances
- **Canvas Offscreen** : Rendu en arrière-plan quand possible
- **Rate Limiting** : Respect des limites de l'API IGN (40 req/s max)
- **Memory Management** : Nettoyage automatique des ressources canvas

### Sécurité
- **CORS** : Headers configurés pour le fonctionnement cross-origin
- **CSP** : Content Security Policy adaptée aux canvas
- **Validation** : Validation des données d'entrée (CSV/GPX)

## 🤝 Contribution

Les contributions sont les bienvenues ! Veuillez suivre ces étapes :

1. Fork le projet
2. Créez une branche feature (`git checkout -b feature/nouvelle-fonctionnalite`)
3. Commitez vos changements (`git commit -m 'Ajout d'une nouvelle fonctionnalité'`)
4. Push vers la branche (`git push origin feature/nouvelle-fonctionnalite`)
5. Ouvrez une Pull Request

## 📄 Licence

Ce projet est sous licence ISC. Voir le fichier `package.json` pour plus de détails.

## 🐛 Signalement de bugs

Pour signaler un bug ou demander une fonctionnalité, veuillez ouvrir une issue sur le repository GitHub avec :
- Description détaillée du problème
- Étapes pour reproduire
- Environnement (navigateur, OS)
- Captures d'écran si applicable

## 📚 Documentation technique

### Format de données CSV
```csv
TerritoryID,CategoryCode,Category,Number,Suffix,Area,Type,Link1,Link2,CustomNotes1,CustomNotes2,Boundary
"12345","CAT1","Résidentiel","A01","","Zone Nord","territoire","","","Note personnalisée","","[lat,lon],[lat,lon]..."
```

**Description des colonnes :**
- `TerritoryID` : Identifiant unique du territoire
- `CategoryCode` : Code de catégorie
- `Category` : Nom de la catégorie
- `Number` : Numéro du territoire (ex: A01, B12)
- `Suffix` : Suffixe optionnel
- `Area` : Zone géographique
- `Type` : Type de territoire
- `Link1`, `Link2` : Liens optionnels
- `CustomNotes1`, `CustomNotes2` : Notes personnalisées
- `Boundary` : Coordonnées GPS du contour au format `[lat,lon],[lat,lon]...`

### Format GPX
```xml
<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1">
  <trk>
    <name>A01 - Nom du territoire</name>
    <trkseg>
      <trkpt lat="latitude" lon="longitude"/>
      ...
    </trkseg>
  </trk>
</gpx>
```

---

**Territory Generator** - Génération et annotation de cartes de territoires simplifiée 🗺️✨
