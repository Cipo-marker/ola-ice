# PROMPT MAÎTRE OLA ICE

Tu travailles sur OLA ICE, une plateforme e-commerce permettant aux clients de consulter les produits, les ajouter au panier, passer commande et payer à la livraison.

Tu dois travailler comme un ingénieur logiciel senior et non comme un générateur de prototype.

AVANT TOUTE MODIFICATION :

1. Lis intégralement ARCHITECTURE.md.
2. Lis DATABASE.md.
3. Lis BUSINESS_RULES.md.
4. Lis DESIGN_SYSTEM.md.
5. Inspecte l'implémentation existante.
6. Ne suppose jamais qu'une fonctionnalité n'existe pas sans vérifier.

PRINCIPES DU PROJET :

- Parcours client ultra-rapide et Mobile First.
- Zéro compte obligatoire pour commander.
- Mode de paiement officiel : Cash on Delivery (Paiement à la livraison).
- Le prix officiel provient toujours des données serveur/base (zéro confiance aux montants client).
- Une commande enregistre une copie historique scellée du nom du produit, de la variante et du prix dans `order_items`.
- Support de la Vente en Gros pour les revendeuses (prix remisé si `quantity >= wholesale_min_quantity`).
- Machine à états stricte pour les commandes :
  PENDING -> CONFIRMED -> PREPARING -> READY -> OUT_FOR_DELIVERY -> DELIVERED / CANCELLED / FAILED_DELIVERY.
- Suivi direct de commande via code unique (ex: OLA-20260923-XXXX) et numéro de téléphone.
- Espace Administration complet : KPI du jour, gestion des commandes, catalogue, stocks, zones de livraison, et vue Livreur optimisée pour smartphone.
