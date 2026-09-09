# Frontend TerritoryGenerator

Application React, TypeScript et Vite pour importer les territoires, annoter leurs cartes et préparer l’impression.

Prérequis : Node.js 24 LTS et npm 12 ou plus.

Depuis la racine du dépôt :

```sh
npm ci
npm run dev
```

Le frontend démarre sur le port 5173 et transmet `/api` au backend sur le port 3002. Démarrer le backend avec `npm run devapi` et sa configuration d’environnement.

```sh
npm run build
npm test
npx playwright install chromium
npm run test:e2e
npm --workspace=frontend run lint
```

Les tests navigateur démarrent une instance Vite sur le port 5183 et simulent les réponses API ; ils ne nécessitent ni MySQL ni IGN.

Les comportements d’import, de brouillon, de recadrage et d’export sont décrits dans [le document des parcours](../../docs/frontend-workflows.md). Les contraintes de déploiement et de session sont détaillées dans [la mise à jour de sécurité](../../docs/security-update.md).
