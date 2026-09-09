# Mise à jour de sécurité

Les routes d’images conservent leurs URLs `/api/p/:userId/:fileName`, mais exigent
désormais une session active appartenant au propriétaire. Les réponses utilisent
`Cache-Control: private, no-store`. Le reverse proxy doit transmettre ces requêtes
à l’API, sans servir directement le dossier d’images ni mettre ses réponses en cache.

`STATIC_PATH` garde sa convention existante : suffixe du répertoire de travail du
backend (par exemple `/public`). La génération, la sauvegarde, la suppression et
la lecture utilisent désormais ce même emplacement. Les fichiers existants n’ont
pas besoin d’être déplacés lorsque `STATIC_PATH=/public` et que l’API démarre depuis
`apps/backend`, comme dans les scripts npm et le service systemd du projet.

Les jetons émis avant cette mise à jour sont refusés, car ils ne précisent pas leur
usage. Les utilisateurs doivent se reconnecter. Les anciens liens de réinitialisation
doivent être redemandés ; un bouton de renvoi de confirmation est disponible après
connexion pour les comptes dont l’adresse n’est pas confirmée. Les nouveaux liens
de confirmation expirent après 24 heures, ceux de réinitialisation après une heure.
Une réinitialisation réussie révoque toutes les sessions et tous les liens de
réinitialisation du compte dans la même transaction. Aucune migration SQL n’est requise.

Seul `https://data.geopf.fr/wms-r` est accepté pour la génération IGN. Les redirections
HTTP sont refusées. Si une ancienne configuration contient une autre URL, le bouton
« Utiliser l’URL IGN officielle » dans Configuration la remplace sans effacer les
autres préférences.

## Vérification locale

Depuis la racine :

```sh
npm install
npm test
npm --workspace=backend run build
npm --workspace=frontend run build
npm --workspace=frontend run lint
```

Les tests couvrent les jetons, les sessions révoquées ou expirées, les routes
d’authentification, l’accès aux images avec Fastify et des fichiers temporaires,
les chemins malveillants, les destinations réseau et les changements de compte.
La base MySQL, l’envoi d’emails et les appels IGN sont remplacés par des doublures
dans ces tests ; un essai avec ces services reste nécessaire avant déploiement.
