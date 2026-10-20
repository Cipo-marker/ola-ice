import React, { useState } from 'react';
import { Product, ProductVariant } from '../types';
import { X, Check, ShoppingBag, Plus, Minus, HeartHandshake, ShieldCheck } from 'lucide-react';

interface ProductModalProps {
  product: Product | null;
  variants: ProductVariant[];
  onClose: () => void;
  onAddToCart: (variantId: string, quantity: number, flavor?: string) => void;
}

export const ProductModal: React.FC<ProductModalProps> = ({
  product,
  variants,
  onClose,
  onAddToCart,
}) => {
  const [selectedVariantId, setSelectedVariantId] = useState<string>(
    variants[0]?.id || ''
  );
  const [selectedFlavor, setSelectedFlavor] = useState<string | undefined>(
    product?.available_flavors?.[0]
  );
  const [quantity, setQuantity] = useState<number>(1);
  const [added, setAdded] = useState(false);

  const currentVariant =
    variants.find((v) => v.id === selectedVariantId) || variants[0];

  const isWholesaleEligible = Boolean(
    product?.allow_wholesale &&
      currentVariant?.wholesale_price &&
      currentVariant?.wholesale_min_quantity &&
      quantity >= currentVariant.wholesale_min_quantity
  );

  const effectiveUnitPrice =
    isWholesaleEligible && currentVariant?.wholesale_price
      ? currentVariant.wholesale_price
      : currentVariant?.price || 0;

  const totalPrice = effectiveUnitPrice * quantity;
  const regularTotal = (currentVariant?.price || 0) * quantity;
  const savings = regularTotal - totalPrice;

  const handleAdd = () => {
    if (!currentVariant) return;
    onAddToCart(currentVariant.id, quantity, selectedFlavor);
    setAdded(true);
    setTimeout(() => {
      setAdded(false);
      onClose();
    }, 900);
  };

  if (!product) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:max-w-2xl max-h-[90vh] rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Close */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-100">
          <div className="text-xs font-semibold uppercase tracking-wider text-rose-600">
            Détails du produit
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-neutral-100 text-neutral-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto p-4 sm:p-6 space-y-6">
          <div className="grid sm:grid-cols-2 gap-6">
            {/* Visual */}
            <div className="relative aspect-square sm:aspect-[4/3] rounded-xl overflow-hidden bg-neutral-100">
              <img
                src={product.main_image}
                alt={product.name}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  const categoryFallbacks: Record<string, string> = {
                    'cat-yaourts-groto': '/images/product_yaourt_groto_1790119101835.jpg',
                    'cat-cremes-glacees': '/images/product_creme_glacee_artisanale_1790119122257.jpg',
                    'cat-jus-naturels': '/images/product_jus_fruits_artisanaux_1790119113427.jpg',
                    'cat-restauration': '/images/product_restauration_fastfood_1790119131775.jpg',
                  };
                  target.src = categoryFallbacks[product.category_id] || '/images/hero_ola_ice_showcase_1790119089620.jpg';
                }}
              />
              {product.allow_wholesale && (
                <div className="absolute bottom-3 left-3 bg-amber-600 text-white text-xs font-bold px-3 py-1 rounded-md shadow">
                  Tarif de Gros Disponible
                </div>
              )}
            </div>

            {/* Info */}
            <div className="space-y-3">
              <h2 className="font-display font-bold text-2xl text-neutral-900 leading-tight">
                {product.name}
              </h2>
              <p className="text-sm text-neutral-600 leading-relaxed">
                {product.description}
              </p>

              <div className="pt-2 flex items-center gap-3 text-xs text-neutral-500 font-medium">
                <span className="flex items-center gap-1 text-emerald-700">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Produit frais garanti
                </span>
                <span>·</span>
                <span>Paiement à la livraison</span>
              </div>
            </div>
          </div>

          {/* Flavor Selection */}
          {product.available_flavors && product.available_flavors.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-neutral-100">
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700">
                1. Choisissez la saveur :
              </label>
              <div className="flex flex-wrap gap-2">
                {product.available_flavors.map((flavor) => (
                  <button
                    key={flavor}
                    type="button"
                    onClick={() => setSelectedFlavor(flavor)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      selectedFlavor === flavor
                        ? 'bg-rose-600 text-white shadow-sm ring-2 ring-rose-300'
                        : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                    }`}
                  >
                    {flavor}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Format / Variant Selection */}
          <div className="space-y-2 pt-2 border-t border-neutral-100">
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700">
              2. Choisissez le format / variante :
            </label>
            <div className="grid sm:grid-cols-2 gap-2.5">
              {variants.map((v) => {
                const isSelected = selectedVariantId === v.id;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setSelectedVariantId(v.id)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'border-rose-600 bg-rose-50/60 ring-1 ring-rose-500'
                        : 'border-neutral-200 hover:border-neutral-300 bg-white'
                    }`}
                  >
                    <div className="font-semibold text-sm text-neutral-900">{v.name}</div>
                    <div className="flex items-baseline justify-between mt-1">
                      <span className="font-mono font-bold text-neutral-900 text-base">
                        {v.price.toLocaleString('fr-FR')} F CFA
                      </span>
                      {v.wholesale_price && v.wholesale_min_quantity && (
                        <span className="text-[11px] text-amber-700 font-medium">
                          Dès {v.wholesale_min_quantity} pcs : {v.wholesale_price.toLocaleString('fr-FR')} F
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Wholesale Incentive Banner if applicable */}
          {currentVariant?.wholesale_price && currentVariant?.wholesale_min_quantity && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-3 text-xs text-amber-900">
              <HeartHandshake className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold">Tarif Revendeuse & Vente en Gros :</strong> Dès{' '}
                <span className="font-bold">{currentVariant.wholesale_min_quantity} unités</span>, le prix passe
                automatiquement de{' '}
                <span className="line-through">{currentVariant.price.toLocaleString('fr-FR')} F</span> à{' '}
                <span className="font-bold text-amber-800">
                  {currentVariant.wholesale_price.toLocaleString('fr-FR')} F CFA
                </span>{' '}
                par unité !
                {quantity < currentVariant.wholesale_min_quantity && (
                  <button
                    type="button"
                    onClick={() => setQuantity(currentVariant.wholesale_min_quantity || 10)}
                    className="block mt-1 font-bold text-rose-700 hover:underline"
                  >
                    Passer à {currentVariant.wholesale_min_quantity} unités pour en profiter →
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Quantity Selector */}
          <div className="flex items-center justify-between pt-2 border-t border-neutral-100">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-neutral-700">
                Quantité :
              </div>
              {isWholesaleEligible && (
                <div className="text-[11px] text-emerald-600 font-bold">
                  ✓ Tarif de gros activé (-{savings.toLocaleString('fr-FR')} F CFA)
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-9 h-9 rounded-xl border border-neutral-300 flex items-center justify-center hover:bg-neutral-100 active:scale-95 transition-all"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-10 text-center font-mono font-bold text-lg tabular-nums">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity(quantity + 1)}
                className="w-9 h-9 rounded-xl border border-neutral-300 flex items-center justify-center hover:bg-neutral-100 active:scale-95 transition-all"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Footer with Total and Add to Cart Button */}
        <div className="p-4 bg-neutral-50 border-t border-neutral-200 flex items-center justify-between gap-4">
          <div>
            <div className="text-xs text-neutral-500 font-medium">Total estimé</div>
            <div className="font-mono font-bold text-2xl text-neutral-900 tabular-nums">
              {totalPrice.toLocaleString('fr-FR')}{' '}
              <span className="text-sm font-sans font-normal text-neutral-500">F CFA</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleAdd}
            className={`px-6 py-3.5 rounded-xl font-bold text-sm shadow-md transition-all flex items-center gap-2 ${
              added
                ? 'bg-emerald-600 text-white'
                : 'bg-rose-600 hover:bg-rose-700 text-white active:scale-95'
            }`}
          >
            {added ? (
              <>
                <Check className="w-5 h-5" />
                <span>Ajouté au panier !</span>
              </>
            ) : (
              <>
                <ShoppingBag className="w-5 h-5" />
                <span>Ajouter au panier</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
