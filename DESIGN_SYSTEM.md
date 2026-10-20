# DESIGN SYSTEM — OLA ICE (« Le Goût de la Fraîcheur »)

Ce document établit la charte visuelle, l'ergonomie mobile-first, les règles typographiques et les composants de la plateforme Ola Ice.

---

## 1. Direction Visuelle & Philosophie

L'identité Ola Ice évoque immédiatement :
- **La Fraîcheur Glacée** (ice pop, condensation rafraîchissante, canicule apaisée)
- **La Gourmandise & Le Plaisir** (fruits d'Afrique de l'Ouest, yaourts onctueux, crèmes glacées, street-food gourmande)
- **La Proximité et la Simplicité** (commande rapide, communication directe au Bénin via téléphone et repères urbains).

### Règle d'or Anti-Slop & Zéro-Pill
- Pas d'empilement de badges multicolores ou de pilules statiques sur les cartes.
- Les métadonnées (catégorie, contenance, saveurs) s'affichent en typographie épurée avec séparateur discret (`·` ou `/`).
- Les prix sont affichés en grand avec chiffres tabulaires (`tabular-nums`) et symbole officiel `F CFA`.
- Les contrôles interactifs (sélecteurs de saveurs, onglets de catégories, steppers de quantité) sont de vrais boutons réactifs.

---

## 2. Palette de Couleurs

| Rôle | Teinte | Code Hex | Description |
|---|---|---|---|
| **Canvas Neutre (60%)** | Stone 50 / Off-White | `#FAFAF9` / `#FFFFFF` | Fond lumineux, respirant et épuré |
| **Surfaces & Cartes (30%)**| Pure White & Border | `#FFFFFF` (bordure `#E7E5E4`) | Cartes unifiées avec ombres subtiles |
| **Accent Principal (10%)** | Strawberry Rose / Framboise | `#E11D48` (`hover: #BE123C`) | Boutons d'action, CTA panier, panier flottant |
| **Fraîcheur Iced** | Ocean Blue Ice | `#0284C7` (`hover: #0369A1`) | Accents fraîcheur, Yaourt Groto, badges événement |
| **Accents Gourmands** | Warm Mango & Honey | `#D97706` / `#F59E0B` | Badges vente en gros, frites & snacks chauds |
| **Texte Principal** | Slate 900 | `#0F172A` | Contraste optimal lisible en plein soleil |
| **Texte Secondaire**| Slate 500 / 600 | `#64748B` | Tailles, volumes, descriptions |

---

## 3. Typographie

- **Display & Headings** : `Outfit`, sans-serif (titres chaleureux, gourmands, arrondis, assurant une forte présence).
- **Body & Controls** : `Plus Jakarta Sans`, sans-serif (excellente lisibilité sur écrans mobiles de 360px à 430px).
- **Chiffres & Prix** : `font-mono tabular-nums` pour l'alignement parfait des montants en F CFA.

---

## 4. Composants Principaux

### ProductCard
- Hauteur d'image : 60-70% de la carte, ratio 4:3 avec fond épuré et mise en valeur du produit
- Nom du produit en gras 16px
- Variante par défaut et prix : « À partir de X F CFA » ou prix exact sélectionné
- Bouton sélecteur de quantité / Ajout rapide avec retour visuel immédiat

### Cart Drawer & Flottant Mobile
- Indicateur sticky inférieur respectant la limite de 15% de hauteur de viewport sur mobile
- Badge de quantité dynamique
- Calcul du sous-total en temps réel

### Checkout Express
- Formulaire 1 colonne sur mobile, 2 colonnes sur desktop
- Choix de la zone avec affichage immédiat des frais de livraison
- Récapitulatif clair : Sous-total + Livraison = TOTAL À PAYER À LA LIVRAISON (en espèces).
