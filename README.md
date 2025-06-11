# Territory Generator

### 📁 Import et gestion de données
- **Support CSV/GPX** : Import de fichiers de territoires
- **Cache local** : Sauvegarde hors ligne
- **Export GPX** : Génération de fichiers GPX
- **Vue cartographique** : Aperçu des territoires sur OpenStreetMapn des utilisateurs
- **Connexion/inscription** : Authentification avec JWT
- **Données personnelles** : Chaque utilisateur a ses propres territoires
- **Sauvegarde** : Synchronisation entre appareilsnerator

Une application web moderne et complète pour la génération, l'annotation et la gestion de cartes de territoires à partir de données GPS. L'application permet de charger des territoires depuis des fichiers CSV/GPX, de générer automatiquement des images de cartes haute qualité via l'API IGN, et d'annoter ces cartes avec un éditeur de dessin intégré.

🌐 **[Accéder à l'application en ligne](https://territory.djahmo.fr)**

![Territory Generator](apps/frontend/public/images/logo.clear.png)

## ✨ Fonctionnalités principales

### � Gestion des utilisateurs
- **Authentification sécurisée** : Système de connexion/inscription avec JWT
- **Données personnelles** : Chaque utilisateur a ses propres territoires et configurations
- **Sauvegarde cloud** : Synchronisation automatique entre appareils

### �📁 Import et gestion de données
- **Support CSV/GPX** : Import de fichiers de territoires avec parsing automatique
- **Cache local** : Sauvegarde hors ligne
- **Export GPX** : Génération de fichiers GPX à partir des données importées
- **Visualisation cartographique** : Aperçu interactif des territoires sur carte OpenStreetMap

### 🗺️ Génération de cartes
- **API IGN** : Images haute résolution via l'API française IGN
- **Deux formats** :
  - **Plan serré** : Vue proche du territoire
  - **Plan large** : Vue étendue avec plus de contexte
- **Optimisation** : Orientation automatique portrait/paysage
- **Recadrage** : Outil pour ajuster la zone d'affichage
- **Miniatures** : Vignettes pour aperçu rapide

### 🎨 Éditeur de dessin
- **Outils de base** : Pinceau, ligne, flèche, rectangle, cercle
- **Outils de texte** : Ajout d'annotations textuelles
- **Symboles** : Parking (P) et rose des vents
- **Gestion par couches** : Visibilité et verrouillage des éléments
- **Palette de couleurs** : Choix et sauvegarde des couleurs
- **Historique** : Annuler/Refaire
- **Sauvegarde automatique** : Toutes les modifications sont sauvegardées

### 📄 Exportation et impression
- **Aperçu avant impression** : Prévisualisation des documents
- **Impression par lot** : Plusieurs territoires en une fois
- **Export ZIP** : Téléchargement de toutes les images
- **Recherche** : Filtrage des territoires

### ⚙️ Configuration
- **DPI ajustable** : 150-300 DPI (250 par défaut)
- **Ratios prédéfinis** : Papier, écran 16:9, carré, personnalisé
- **Couleurs** : Contour et épaisseur personnalisables
- **Import/Export** : Sauvegarde des configurations

### 🌍 Internationalisation
- **Français et Anglais** : Interface multilingue
- **Détection automatique** : Selon les préférences du navigateur

## 🏗️ Architecture technique

### Stack technologique
- **Frontend** : React 19 + TypeScript + Vite
- **Styling** : UnoCSS avec thèmes sombre/clair
- **State Management** : Zustand + hooks personnalisés
- **Routing** : React Router v7
- **Backend** : Fastify + Drizzle ORM + MySQL
- **Authentification** : JWT avec sécurisation des routes
- **Build** : Turbo (monorepo)
- **Cartographie** : Leaflet + OpenStreetMap

### Structure du projet
```
TerritoryGenerator/
├── apps/
│   ├── frontend/          # Application React
│   │   ├── src/
│   │   │   ├── components/    # Composants réutilisables
│   │   │   ├── hooks/         # Hooks personnalisés
│   │   │   ├── pages/         # Pages de l'application
│   │   │   ├── services/      # Services API
│   │   │   └── utils/         # Utilitaires
│   │   └── public/           # Assets publics
│   └── backend/           # API Fastify
│       ├── src/
│       │   ├── db/           # Gestion base de données
│       │   ├── routes/       # Routes API
│       │   ├── services/     # Services métier
│       │   ├── schema/       # Schémas base de données
│       │   └── utils/        # Utilitaires backend
│       └── public/          # Images générées
├── package.json           # Configuration workspace
└── turbo.json            # Configuration Turbo
```

### Base de données
- **ORM** : Drizzle avec migrations automatiques
- **Tables principales** :
  - `users` : Gestion des utilisateurs
  - `territories_data` : Données GPX des territoires
  - `territory_images` : Images générées avec métadonnées
  - `territory_layers` : Couches d'annotations
  - `user_config` : Configurations personnalisées

### Fonctionnalités avancées
- **Canvas haute performance** : Rendu optimisé avec HTMLCanvas et ImageBitmap
- **Queue de requêtes** : Gestion intelligente des appels API avec retry et rate limiting
- **Cache multi-niveaux** : Mémoire + serveur
- **Architecture modulaire** : Services découplés et testables
- **Sécurité renforcée** : Validation des données, CORS, CSP
- **PWA Ready** : Fonctionnement hors ligne partiel

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

# Configuration de la base de données
npm run drizzle:push

# Lancement en mode développement
npm run dev          # Frontend (port 5173)
npm run devapi       # Backend (port 3002)
```

Le frontend sera accessible sur `http://localhost:5173` et l'API sur `http://localhost:3002`

### Configuration
L'application nécessite quelques variables d'environnement pour le backend :
- Configuration de la base de données (MySQL)
- Clés JWT pour l'authentification
- URL de l'API IGN (configurée par défaut)

Les paramètres de configuration sont disponibles dans :
- `apps/frontend/src/utils/constants.ts` - Configuration générale frontend
- `apps/backend/src/env.ts` - Configuration backend
- Interface utilisateur dans l'application pour la configuration personnalisée

## 📖 Guide d'utilisation

### 1. Créer un compte
1. Accédez à [l'application](https://territory.djahmo.fr)
2. Créez un compte ou connectez-vous
3. Votre espace personnel est maintenant accessible

### 2. Import de territoires
1. Préparez un fichier CSV ou GPX contenant les données de territoires
2. Utilisez le bouton de téléchargement sur la page d'accueil
3. Les territoires sont automatiquement parsés et affichés sur la carte
4. Vos données sont sauvegardées sur votre compte

### 3. Génération de cartes
1. Après l'import, les images sont générées automatiquement
2. Chaque territoire dispose de :
   - Une **miniature** pour l'aperçu
   - Un **plan serré** optimisé pour le territoire
   - Un **plan large** (généré à la demande) avec plus de contexte
3. Utilisez l'outil de recadrage pour ajuster la zone d'affichage
4. Les cartes sont optimisées pour impression A4

### 4. Annotation des cartes
1. Cliquez sur une carte pour accéder à l'éditeur
2. Utilisez la barre d'outils pour sélectionner un outil de dessin
3. Ajoutez vos annotations (texte, formes, symboles)
4. Gérez vos annotations par couches (visibilité, verrouillage)
5. Les modifications sont sauvegardées automatiquement

### 5. Exportation et impression
1. Accédez à la page "Exportation"
2. Prévisualisez vos territoires avant impression
3. Imprimez individuellement ou par lot
4. Exportez toutes les images en archive ZIP

## 🔧 Configuration

### Paramètres d'impression
- **DPI** : 150-300 DPI (250 par défaut)
- **Format** : A4 (29.7cm de large)
- **Ratios** : Papier paysage/portrait, écran 16:9, carré, personnalisé

### API IGN
- **Source** : Géoportail français (`data.geopf.fr`)
- **Couche** : Plan IGN v2
- **Format** : PNG avec transparence
- **Projection** : WGS84

### Personnalisation
- **Couleurs** : Contour et épaisseur des territoires
- **Palette** : Couleurs de dessin personnalisables
- **Export/Import** : Sauvegarde des configurations

## 🛠️ Scripts disponibles

### Frontend
```bash
npm run dev      # Serveur de développement (port 5173)
npm run build    # Build de production
npm run preview  # Aperçu du build
npm run lint     # Vérification du code
```

### Backend
```bash
npm run devapi           # Serveur API de développement (port 3000)
npm run drizzle:push     # Synchronisation du schéma DB
npm run drizzle:generate # Génération des migrations
npm run drizzle:migrate  # Application des migrations
```

### Global (depuis le workspace racine)
```bash
npm run dev              # Lance le frontend uniquement
npm run devapi           # Lance le backend uniquement
npm run build            # Build du frontend
```

## 🏗️ Architecture des composants

### Services backend
- **TerritoryImageService** : Génération d'images via API IGN
- **AuthService** : Authentification JWT
- **DatabaseService** : Opérations avec Drizzle ORM

### Services frontend
- **ApiTerritoryService** : Communication avec l'API
- **NetworkService** : Gestion des requêtes HTTP
- **ThumbnailService** : Création de miniatures

### Hooks
- **useApiTerritory** : Gestion des territoires
- **useApiConfig** : Configuration utilisateur
- **useApiGenerate** : Génération d'images
- **useApiAuth** : Authentification

### Pages
- **AllTerritory** : Vue cartographique
- **Territories** : Galerie des territoires
- **Territory** : Éditeur de territoire
- **Exportation** : Impression et export
- **Configuration** : Paramètres

### Éditeur de dessin
- **Paint** : Composant principal
- **ToolBar** : Barre d'outils
- **ColorPicker** : Sélecteur de couleurs
- **ActionButtons** : Annuler, refaire, etc.
- **LayerManager** : Gestion des couches

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

### Sécurité
- **Authentification JWT** : Tokens avec expiration
- **Validation des données** : Contrôle des entrées
- **Isolation utilisateur** : Données séparées par utilisateur
- **CORS** : Headers sécurisés

### Performance
- **Cache intelligent** : Réutilisation des images
- **Canvas optimisé** : Rendu avec HTMLCanvas
- **Rate Limiting** : Respect des limites API IGN (40 req/s)
- **Compression** : WebP pour miniatures, PNG pour qualité

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

### API Endpoints principaux
```
POST /api/auth/login          # Connexion utilisateur
POST /api/auth/register       # Inscription
GET  /api/territories         # Liste des territoires
POST /api/generate-image      # Génération d'image
POST /api/territory-complete  # Sauvegarde complète
GET  /api/user-config         # Configuration utilisateur
```

---

**Territory Generator** - Plateforme complète de génération et annotation de cartes de territoires 🗺️✨

🌐 **[Essayez l'application maintenant](https://territory.djahmo.fr)**
