# BUSINESS RULES — OLA ICE

Ce document définit l'ensemble des règles métier, règles de calcul financier, gestion des stocks et contrôles d'intégrité de la plateforme Ola Ice.

---

## 1. Commande Sans Compte Obligatoire (Guest Checkout)
- Aucun visiteur ne doit être contraint de créer un compte ou un mot de passe pour passer commande.
- Les données minimales requises sont :
  1. Nom complet du destinataire
  2. Numéro de téléphone / WhatsApp (utilisé pour joindre le client à la livraison)
  3. Zone de livraison sélectionnée
  4. Adresse précise (quartier, rue, maison)
  5. Point de repère (obligatoire ou fortement conseillé pour les livreurs en Afrique de l'Ouest)
  6. Type de commande (Particulier, Vente en Gros / Revendeuse, Événement)
- Le numéro unique de commande généré (ex: `OLA-20260923-XXXX`) couplé au numéro de téléphone permet au client de suivre sa commande en temps réel sur la page `/track-order`.

---

## 2. Règle d'Or des Prix et Immutabilité Historique
- **Zéro confiance aux prix transmis par le client** :
  Le frontend transmet uniquement l'identifiant de la variante (`variant_id`) et la quantité désirée (`quantity`).
  Le serveur recalcule le prix unitaire applicable et le total.
- **Tarification en Entiers F CFA** :
  Toutes les valeurs monétaires sont en Francs CFA (XOF) sans virgule flottante.
- **Copie historique scellée dans `order_items`** :
  Lors de la validation d'une commande, le nom du produit, le nom de la variante, le SKU et le prix unitaire effectif sont recopiés de façon immuable dans `order_items`.
  Même si l'administrateur modifie plus tard le prix du Yaourt de 500 F à 600 F, les anciennes commandes conservent 500 F.

---

## 3. Vente en Gros & Revendeuses (Wholesale)
- Conformément aux documents officiels Ola Ice (Flyer Yaourt Groto : *« Possibilité d'achat en GROS pour les revendeuses »* et Glaces : *« disponible en gros et en détails »*) :
  - Chaque variante de produit peut avoir :
    - `wholesale_price` : Prix unitaire remisé
    - `wholesale_min_quantity` : Quantité minimale d'activation (ex: 10 ou 20 unités)
  - Si `quantity >= wholesale_min_quantity`, le prix unitaire appliqué bascule automatiquement sur `wholesale_price`.
  - Un badge clair indique l'économie réalisée au client.

---

## 4. Mode de Paiement Principal (V1)
- **Paiement à la Livraison (Cash on Delivery / Espèces)**.
- Le statut initial du paiement est `pending`.
- Lorsque le livreur remet la commande au client et encaisse la somme, le statut passe à `paid` et l'horodatage `paid_at` est scellé.
- En cas de refus ou d'échec de livraison, le statut passe à `failed`.

---

## 5. Zones et Frais de Livraison
- Les frais de livraison sont déterminés strictement par la zone choisie par le client.
- L'administrateur peut configurer les zones (ex: Cotonou Centre, Akpakpa, Cadjehoun, Calavi, Godomey, etc.) avec leurs frais respectifs (ex: 500 F, 1 000 F, 1 500 F) et délais estimés.
- Les frais de livraison ne sont jamais décidés par le client.

---

## 6. Gestion du Stock & Réservation
- Si `track_stock = true`, chaque validation de commande décrémente la quantité en stock `stock_quantity`.
- Si le stock disponible est inférieur à la quantité demandée, la commande est rejetée avec un message explicite.
- En cas d'annulation de commande (`CANCELLED`), le stock précédemment réservé est automatiquement réincrémenté.
- Un mouvement d'inventaire (`inventory_movements`) est tracé avec le type `sale` ou `cancellation`.

---

## 7. Machine à États des Commandes
1. **PENDING** : Commande enregistrée par le client, en attente de vérification par Ola Ice.
2. **CONFIRMED** : Commande validée par l'équipe Ola Ice (par téléphone/WhatsApp si nécessaire).
3. **PREPARING** : Produits et glaces en cours de préparation / emballage isotherme.
4. **READY** : Colis prêt, emballé, en attente de prise en charge par le livreur.
5. **OUT_FOR_DELIVERY** : En cours d'acheminement par le livreur vers l'adresse client.
6. **DELIVERED** : Remis au client et encaissé. Statut terminal.
7. **CANCELLED** : Commande annulée (par client avant départ ou par admin).
8. **FAILED_DELIVERY** : Adresse introuvable, client injoignable, ou refus.
