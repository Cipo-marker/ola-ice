# Base de données Ola Ice

## Choix technique

SQLite est intégré au runtime Node.js utilisé par le serveur. Le fichier par défaut est `data/olaice.sqlite`; `OLAICE_DATA_DIR` permet de le placer sur un disque persistant différent. Le serveur active les clés étrangères, le journal WAL et un délai d’attente pour les verrous.

Le catalogue fourni dans `src/data/initialData.ts` est converti en `server/seed-data.json`. Au premier lancement seulement, ces données remplissent la base; les commandes de démonstration sont exclues.

## Tables créées

| Table | Rôle |
|---|---|
| `categories` | Catégories du catalogue |
| `products` | Informations produit, catégorie et statut |
| `product_variants` | SKU, prix, vente en gros et stock |
| `delivery_zones` | Zones, frais et délais |
| `customers` | Profil client créé ou actualisé lors d’une commande; téléphone normalisé unique |
| `orders` | Coordonnées utiles à la livraison, montants calculés, paiement et statut |
| `order_items` | Copie des noms, SKU, prix et quantités au moment de la commande |
| `order_status_histories` | Journal des transitions et de leurs auteurs |
| `inventory_movements` | Débits de vente et retours sur annulation |
| `staff` | Comptes équipe; seul le hash scrypt du code secret est stocké |

Les entités de catalogue conservent leur document complet dans une colonne JSON `data`, tout en exposant séparément les clés utilisées pour les relations, les recherches et les index. Les commandes et leurs lignes sont écrites dans une transaction SQLite.

## Contraintes et index

- Identifiants primaires sur les entités; SKU, téléphone client et numéro de commande uniques.
- Clés étrangères des produits vers les catégories, variantes vers les produits, lignes et historique vers les commandes, et mouvements vers variantes/commandes.
- Index sur téléphone client et statut/date de commande; index de jointure sur les lignes par commande.
- Le montant est recalculé côté serveur à partir des variantes stockées. Une quantité non disponible ou une zone invalide rejette la commande.
- Une ligne de commande garde une copie de son nom, variante, SKU, prix unitaire et total, même après modification du catalogue.
- Les transitions de statut suivent la machine à états documentée dans `BUSINESS_RULES.md`; chaque transition est ajoutée au journal.

## Sauvegarde et restauration

Arrêter le serveur avant de copier `data/olaice.sqlite`. Conserver plusieurs copies séparées du poste de travail. Pour restaurer, arrêter le serveur, replacer le fichier dans le dossier configuré, puis redémarrer l’application.

## Limites actuelles

SQLite est adapté à un serveur applicatif unique et à une petite activité. En cas de plusieurs instances applicatives concurrentes, de sauvegardes sans interruption ou de volume plus important, passer à PostgreSQL et prévoir une vraie gestion de migrations. La connexion client actuelle repose sur le téléphone sans validation SMS; elle sert au confort de commande et n’est pas une authentification forte.
