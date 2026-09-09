# Mise à jour des dépendances — 9 septembre 2026

L’audit npm initial recensait 14 dépendances vulnérables : 3 critiques, 5 élevées et 6 modérées. Après mise à jour, l’audit complet, dépendances de développement incluses, ne signale plus de vulnérabilité connue.

## Versions et migrations

Toutes les dépendances directes conservées utilisent leur dernière version stable publiée sur le registre npm à la date de vérification, sauf TypeScript : la version 6.0.3 reste volontairement verrouillée avec `~6.0.3`, car `typescript-eslint` 8.70.0 accepte TypeScript `>=4.8.4 <6.1.0`. TypeScript 7.0.2 n’est donc pas installé avec une résolution forcée. Voir [la compatibilité officielle de typescript-eslint](https://typescript-eslint.io/users/dependency-versions/).

Principales mises à jour : React 19.3, React Router 8.3, Vite 8.2, Vitest 5, ESLint 10, Zod 4.5, Fastify 5.12, Drizzle ORM 0.45.2, bcrypt 6, Sharp 0.35.4, Nodemailer 10 et Nano ID 6.

Les adaptations comprennent :

- utilisation de `ZodError.issues` tout en conservant le champ JSON `errors` de l’API, conformément au [guide Zod 4](https://zod.dev/v4/changelog) ;
- résolution NodeNext pour le backend, suppression de `baseUrl` et déclaration explicite des types globaux pour TypeScript 6 ;
- configuration HTTPS et `import.meta.dirname` dans Vite ; mkcert est chargé uniquement en mode `web` ;
- utilisation des types intégrés de Nodemailer et remplacement de l’icône Github retirée de Lucide par GitFork ;
- déplacement de dotenv parmi les dépendances d’exécution et des déclarations de types frontend parmi les outils de développement.

Les dépendances inutilisées `@fastify/jwt`, `@fastify/helmet`, `@tmcw/togeojson`, `turbo` et la déclaration XML redondante à la racine ont été retirées. L’authentification utilise toujours `jsonwebtoken`.

## Correction transitive et installation

Drizzle Kit dépend encore de l’ancien chargeur `@esbuild-kit/esm-loader`, lui-même lié à esbuild 0.18. Un override ciblé de `@esbuild-kit/core-utils` impose esbuild `^0.28.2` et retire cette version vulnérable. La génération d’une migration depuis les schémas du projet a été vérifiée dans un répertoire temporaire, sans connexion ni modification de la base. Cet override pourra être supprimé lorsque Drizzle Kit aura remplacé son chargeur.

Le fichier `package-lock.json` n’est plus ignoré par Git et accompagne les manifestes. Utiliser Node.js 24 LTS et npm 12 ou plus :

```sh
nvm use
npm ci
npm audit
npm run build
npm --workspace=backend run build
npm test
npx playwright install chromium
npm run test:e2e
```

Les scripts d’installation nécessaires sont autorisés explicitement pour bcrypt, canvas, esbuild et sharp. Le script optionnel fsevents reste bloqué ; la surveillance standard des fichiers fonctionne pendant les tests navigateur.

## Vérifications et limites

- Audit complet : aucune vulnérabilité signalée par npm.
- Compilation frontend et backend.
- 63 tests, dont les modules natifs bcrypt/canvas/sharp, la composition d’un email sans envoi, le plugin multipart, les validations Zod et les tests de sécurité existants.
- 6 parcours Chromium, notamment dessin, sauvegarde, imports et impression hors connexion avec orientations mixtes.
- Génération Drizzle isolée et vérification de l’arbre des dépendances.

Le lint global reste en échec sur la dette existante et sur les nouveaux diagnostics React introduits par la version du plugin (notamment `set-state-in-effect`). Les règles ne sont pas désactivées pour masquer ces résultats. La compilation signale encore le poids du bundle principal. Sur macOS, les bibliothèques natives de canvas et Sharp peuvent émettre un avertissement de classe Objective-C dupliquée ; le test de conversion d’image réussit.

Un audit npm ne couvre pas toutes les vulnérabilités possibles du code applicatif, du système ou des bibliothèques natives. Les connexions MySQL et SMTP réelles et l’accès IGN ne sont pas exercés par ces tests.
