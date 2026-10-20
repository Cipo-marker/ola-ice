# ARCHITECTURE OLA ICE — Monolithe Modulaire & Storefront Client

## 1. Vue d'ensemble du Système

OLA ICE est une plateforme de commande en ligne e-commerce conçue pour offrir un parcours d'achat sans friction avec paiement à la livraison (Cash On Delivery - COD) au Bénin.

```
                            CLIENT WEB & MOBILE
                                    │
                                    ▼
       ┌────────────────────────────────────────────────────────┐
       │                 STOREFRONT OLA ICE                     │
       │   - Catalogue dynamique (Glaces, Yaourts, Jus, Resto)  │
       │   - Fiches produits & Variantes de prix / formats      │
       │   - Panier d'achat & Tarification Gros / Détail        │
       │   - Tunnel de Commande (Checkout express sans compte)  │
       │   - Suivi direct de commande par Code + Téléphone      │
       └────────────────────────────┬───────────────────────────┘
                                    │
       ┌────────────────────────────┼───────────────────────────┐
       │                            │                           │
       ▼                            ▼                           ▼
┌──────────────┐             ┌──────────────┐            ┌──────────────┐
│  CATALOGUE   │             │   COMMANDES  │            │  LIVRAISONS  │
│  & PRODUITS  │             │   & PAIEMENT │            │   & ZONES    │
└──────┬───────┘             └──────┬───────┘            └──────┬───────┘
       │                            │                           │
       └────────────────────────────┼───────────────────────────┘
                                    ▼
                   ┌─────────────────────────────────┐
                   │    MODULES DOMAINE & SERVICES   │
                   │  - PricingService (Gros/Détail) │
                   │  - OrderService & Transitions   │
                   │  - InventoryService & Mouvements│
                   │  - DeliveryZoneService          │
                   └────────────────┬────────────────┘
                                    ▼
                   ┌─────────────────────────────────┐
                   │   STOCKAGE & PERSISTENCE STATE  │
                   │ SQLite locale persistante (Node) │
                   └─────────────────────────────────┘
```

## 2. Principes Fondamentaux d'Architecture

1. **Simplicité & Monolithe Modulaire** : Pas de micro-services surdimensionnés. Chaque domaine (Catalogue, Panier, Commandes, Livraison, Inventaire) est isolé avec des interfaces claires.
2. **Prix Côté Serveur & Règle d'Or d'Immutabilité** : Le client choisit `variant_id` et `quantity`. Le moteur de prix calcule le total. Les informations historiques (nom, variante, prix unitaire, devise) sont scellées dans `order_items` à la création et ne changent jamais.
3. **Mobile First & Parcours Épuré** : L'immense majorité des commandes s'effectue sur smartphone. Le panier et le checkout sont conçus pour être remplis en moins de 60 secondes.
4. **Zéro Compte Obligatoire** : Tout client peut commander avec son nom, son numéro WhatsApp/téléphone et son adresse avec repère. Le suivi s'effectue via le numéro de commande unique (ex. `OLA-20260923-A8F4`) et son numéro de téléphone.
5. **Double Vue Utilisateur & Administration / Livreur** :
   - Vue Storefront pour les clients
   - Dashboard Administrateur complet (CA, commandes, produits, stock, zones)
   - Interface Livreur adaptée aux tournées ("Mes livraisons", appel client 1-clic, encaissement COD).

## 3. Machine à États des Commandes

Les statuts de commande obéissent à un graphe strict et unidirectionnel :

```
             ┌───────────► CANCELLED (Annulée)
             │
[PENDING] ───┴──► [CONFIRMED] ──► [PREPARING] ──► [READY] ──► [OUT_FOR_DELIVERY] ──► [DELIVERED]
                         │                                           │
                         └──────► CANCELLED                          └──────► [FAILED_DELIVERY]
```
Une commande `DELIVERED` ne peut plus jamais redevenir `PENDING` ou `CANCELLED`.
Chaque transition génère un enregistrement dans l'historique d'audit `order_status_histories`.

## 4. Stratégie de Stockage et Images
- Les images ne sont jamais stockées en Base de Données sous forme de binary blob.
- Chemins d'accès relatifs et CDN WebP/AVIF avec fallback visuel élégant (Zero-Broken-Image).
- Stockage persistant avec synchronisation instantanée.
