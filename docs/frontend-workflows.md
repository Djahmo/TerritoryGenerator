# Territoires, dessin et impression

## Comportement corrigé

- Les imports CSV acceptent les champs entre guillemets, les virgules et les retours à la ligne. UTF-8 est essayé en premier, puis Windows-1252 pour les anciens CSV. Les GPX XML, les espaces de noms et les noms contenant des caractères XML ou plusieurs tirets sont pris en charge. Les fichiers vides, doublons et contours invalides sont refusés avant enregistrement.
- Un changement de contour ou la suppression d’un numéro demande confirmation avant de retirer les références aux cartes et annotations correspondantes. Les autres territoires gardent leurs cartes. La génération reprend uniquement les cartes manquantes. Les anciens fichiers physiques ne sont pas purgés par cet import.
- Le renommage effectue une seule sauvegarde du GPX ; les renommages successifs sont ordonnés. Le cache est modifié après la réponse du serveur.
- Chaque compte, territoire et format possède son brouillon. Il survit aux changements de page, de format et au rechargement dans le même onglet. Il est effacé après une sauvegarde réussie ou un changement de compte. Fermer l’onglet supprime les brouillons de session : le bouton Sauvegarder reste nécessaire. Un stockage local indisponible est signalé.
- Les annotations conservent identifiant, ordre, visibilité, verrouillage, nom et taille du texte. Le remplacement des annotations est transactionnel, même lorsque le dessin devient vide. L’ordre est enregistré dans les données JSON existantes ; aucune migration SQL n’est nécessaire. Pour les anciennes annotations sans ordre explicite, le chargement utilise la date de création et l’identifiant SQL.
- Régénérer ou recadrer un fond supprime les annotations et le brouillon du seul format concerné, après confirmation. Le recadrage exige les coordonnées du fond enregistré. Les coordonnées des annotations ne sont pas automatiquement transposées sur le nouveau fond.
- Le dessin utilise les événements Pointer pour la souris, le stylet et le tactile, avec capture du pointeur. L’historique démarre au document chargé et conserve jusqu’à 100 états. Les raccourcis de dessin n’interceptent plus la saisie dans les champs.
- Aperçu, impression individuelle, impression groupée et fichiers HTML utilisent le même rendu A4. Chaque page a sa propre orientation ; les images gardent leurs proportions. Les noms sont échappés et les images intégrées en PNG. Les fichiers téléchargés fonctionnent hors connexion. Un téléchargement incomplet ou une erreur HTTP fait échouer l’export avec un message, sans produire une archive prétendument complète.

## Vérifications

Depuis la racine :

```sh
npm test
npm run build
npm --workspace=backend run build
npx playwright install chromium
npm run test:e2e
npm --workspace=frontend run lint
```

Les tests unitaires couvrent import, renommage, isolation des comptes, invalidation des cartes, persistance des annotations, sécurité et préparation des documents. Les tests Chromium couvrent brouillons, changements de format, rechargement, sauvegarde en échec, annulation, saisie, dessin tactile hors canvas, confirmation de régénération, import vide et ouverture des fichiers d’impression hors connexion.

Les appels API des tests navigateur sont simulés. Les tests de persistance utilisent une doublure de transaction, pas un serveur MySQL. La génération IGN réelle, les pannes entre l’écriture des fichiers et la base, les modifications simultanées depuis plusieurs onglets et l’impression physique ne sont pas validées par ces tests. Les paramètres d’impression du navigateur peuvent modifier le résultat : vérifier A4, échelle 100 %, orientation et absence d’en-têtes/pieds de page. Les fichiers individuels restent disponibles si le navigateur gère mal les orientations mixtes.

Le lint global contient encore des erreurs préexistantes, notamment dans les utilitaires de sélection et les types `any`. Le build signale également le poids du bundle principal.
