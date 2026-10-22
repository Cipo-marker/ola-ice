# Ola Ice

Application de commande Ola Ice : catalogue, panier, commande avec paiement à la livraison, suivi, tableau de bord équipe et tournée des livreurs. Les données partagées sont enregistrées dans une base SQLite locale.

## Démarrer sur Windows

1. Installer Node.js 24 ou plus récent.
2. Ouvrir un terminal dans le dossier du projet et lancer `npm install` une première fois.
3. Lancer `npm run dev`.
4. Ouvrir [http://localhost:3000](http://localhost:3000).

Au premier démarrage, le serveur crée `data/olaice.sqlite`, charge le catalogue de départ et génère les codes d’accès de l’équipe. Il affiche ces codes une seule fois dans le terminal. Notez-les et communiquez-les uniquement au personnel concerné. Pour choisir votre propre code administrateur avant le premier démarrage, renseignez `OLAICE_ADMIN_PIN` dans `.env` (copiez `.env.example` en `.env`). Les codes des livreurs sont générés séparément.

## Adresses et lieux au Bénin

Les formulaires de lieu chargent les divisions de façon progressive : département, commune, arrondissement, quartier. Chaque niveau est demandé à partir du code du niveau précédent, via l'API publique GeoBJ (`https://geobj.emunadigitalsolution.com/api/v1`). La liste est donc filtrée selon les choix déjà faits. Une connexion Internet est nécessaire pour charger ces référentiels.

## Google Maps et saisie d'adresse

La saisie assistée Google Places et la carte utilisent `VITE_GOOGLE_MAPS_API_KEY`. Pour activer ces fonctions, créez une clé Google Maps Platform, activez Maps JavaScript API et Places API, configurez la facturation, puis restreignez la clé aux domaines de l'application et aux API utilisées. Copiez `.env.example` vers `.env` et remplacez `YOUR_GOOGLE_MAPS_API_KEY`. Sans clé valide, l'adresse reste saisissable manuellement.

## Données et sauvegardes

- La base complète se trouve dans `data/olaice.sqlite` (ou dans le dossier défini par `OLAICE_DATA_DIR`). Elle n’est pas incluse dans Git.
- Pour une copie cohérente, arrêtez le serveur puis copiez le fichier SQLite sur un autre support. Gardez aussi les codes administrateur et livreurs en lieu sûr.
- La base contient des données personnelles et n’est pas chiffrée par l’application. Protégez l’ordinateur et le support de sauvegarde avec le chiffrement de l’appareil Windows.
- La première initialisation insère le catalogue fourni avec le prototype. Elle n’écrase jamais une base déjà créée.

## Mise en production

Construire l’interface avec `npm run build`, puis définir `OLAICE_SERVE_DIST=true` et `NODE_ENV=production` avant `npm start`. Configurez HTTPS au niveau de l’hébergement ou d’un proxy inverse et conservez `data/` sur un disque persistant. Pour plusieurs serveurs simultanés, choisir PostgreSQL : SQLite convient à un serveur applicatif unique.

## Fonctionnalités raccordées

- Les commandes sont tarifées depuis le catalogue du serveur; les prix envoyés par le navigateur sont ignorés.
- Les références et prix facturés restent enregistrés dans les lignes de commande.
- Les stocks sont débités au passage de commande, rétablis en cas d’annulation et consignés dans l’historique d’inventaire.
- Les transitions de commande sont contrôlées et historisées. La livraison marque le paiement à la livraison comme encaissé.
- Le suivi d’une commande exige son numéro et le téléphone associé. L’équipe se connecte avec un code conservé côté serveur.
- Le panier et les préférences d’affichage restent propres au navigateur; le catalogue, les commandes et les profils associés aux commandes sont partagés via SQLite.

Le mode de paiement disponible est le paiement à la livraison. La connexion client du prototype reste une commodité sans vérification SMS; elle ne doit pas être utilisée comme preuve d’identité ou pour protéger des données sensibles.
