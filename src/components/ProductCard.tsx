import React, { useState } from 'react';
import { Product, ProductVariant } from '../types';
import { Plus, Check, Eye } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  variants: ProductVariant[];
  onAddToCart: (variantId: string, quantity: number, flavor?: string) => void;
  onViewDetails: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  variants,
  onAddToCart,
  onViewDetails,
}) => {
  const [selectedVariantId, setSelectedVariantId] = useState<string>(
    variants[0]?.id || ''
  );
  const [selectedFlavor, setSelectedFlavor] = useState<string | undefined>(
    product.available_flavors?.[0]
  );
  const [addedAnimation, setAddedAnimation] = useState(false);

  const currentVariant =
    variants.find((v) => v.id === selectedVariantId) || variants[0];

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentVariant) return;
    onAddToCart(currentVariant.id, 1, selectedFlavor);
    setAddedAnimation(true);
    setTimeout(() => setAddedAnimation(false), 1200);
  };

  // Find lowest price
  const minPrice = variants.reduce(
    (min, v) => (v.price < min ? v.price : min),
    variants[0]?.price || 0
  );

  return (
    <div
      onClick={() => onViewDetails(product)}
      className="group bg-white rounded-2xl border border-neutral-200 overflow-hidden shadow-sm hover:shadow-md hover:border-neutral-300 transition-all flex flex-col cursor-pointer"
    >
      {/* Product Image slot with guaranteed fallback */}
      <div className="relative aspect-[4/3] bg-neutral-100 overflow-hidden">
        <img
          src={product.main_image}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          referrerPolicy="no-referrer"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            const categoryFallbacks: Record<string, string> = {
              'cat-yaourts-groto': '/images/product_yaourt_groto_1790119101835.jpg',
              'cat-cremes-glacees': '/images/product_creme_glacee_artisanale_1790119122257.jpg',
              'cat-jus-naturels': '/images/product_jus_fruits_artisanaux_1790119113427.jpg',
              'cat-restauration': '/images/product_restauration_fastfood_1790119131775.jpg',
            };
            const fallback = categoryFallbacks[product.category_id] || '/images/hero_ola_ice_showcase_1790119089620.jpg';
            if (target.src !== fallback && !target.src.endsWith(fallback)) {
              target.src = fallback;
            } else {
              target.src = 'https://images.unsplash.com/photo-1501443762994-82bd5dace89a?auto=format&fit=crop&w=600&q=80';
            }
          }}
        />

        {/* Wholesale or featured indicator as quiet clean text flag */}
        <div className="absolute top-3 left-3 flex flex-col gap-1">
          {product.allow_wholesale && (
            <span className="bg-amber-600/90 backdrop-blur-sm text-white text-[11px] font-bold px-2.5 py-0.5 rounded-md shadow-sm">
              Tarif Gros Revendeuse
            </span>
          )}
        </div>

        {/* Quick detail eye button on hover */}
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <span className="bg-white/90 backdrop-blur-sm text-neutral-900 text-xs font-bold px-3 py-1.5 rounded-lg shadow flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5 text-neutral-700" />
            <span>Voir détails</span>
          </span>
        </div>
      </div>

      {/* Content Area */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3">
        <div>
          {/* Unboxed clean metadata with dot */}
          <div className="flex items-center gap-2 text-xs text-neutral-500 font-medium">
            <span>{variants.length} format{variants.length > 1 ? 's' : ''}</span>
            {product.available_flavors && product.available_flavors.length > 0 && (
              <>
                <span aria-hidden="true">·</span>
                <span>{product.available_flavors.length} saveurs</span>
              </>
            )}
          </div>

          <h3 className="font-display font-bold text-base sm:text-lg text-neutral-900 group-hover:text-rose-600 transition-colors mt-1 line-clamp-1">
            {product.name}
          </h3>

          <p className="text-xs sm:text-sm text-neutral-600 line-clamp-2 mt-1 leading-relaxed">
            {product.short_description}
          </p>
        </div>

        {/* Flavor Selector if available */}
        {product.available_flavors && product.available_flavors.length > 0 && (
          <div
            className="space-y-1 pt-1"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-[11px] font-semibold text-neutral-500">
              Saveur : <span className="text-neutral-800">{selectedFlavor || 'Au choix'}</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {product.available_flavors.slice(0, 4).map((flavor) => (
                <button
                  key={flavor}
                  type="button"
                  onClick={() => setSelectedFlavor(flavor)}
                  className={`text-[11px] px-2 py-0.5 rounded-md font-medium transition-all ${
                    selectedFlavor === flavor
                      ? 'bg-rose-100 text-rose-800 border border-rose-300'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  }`}
                >
                  {flavor}
                </button>
              ))}
              {product.available_flavors.length > 4 && (
                <span className="text-[10px] text-neutral-400 self-center">
                  +{product.available_flavors.length - 4} autres
                </span>
              )}
            </div>
          </div>
        )}

        {/* Variant selector dropdown or buttons */}
        {variants.length > 1 && (
          <div
            className="space-y-1"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-[11px] font-semibold text-neutral-500">Format :</div>
            <div className="grid grid-cols-2 gap-1.5">
              {variants.slice(0, 2).map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setSelectedVariantId(v.id)}
                  className={`text-xs p-1.5 rounded-lg border text-left truncate transition-all ${
                    selectedVariantId === v.id
                      ? 'border-rose-500 bg-rose-50/50 text-rose-900 font-semibold'
                      : 'border-neutral-200 hover:border-neutral-300 text-neutral-700 bg-neutral-50'
                  }`}
                >
                  <div className="truncate font-medium">{v.name}</div>
                  <div className="font-mono text-[11px] text-neutral-900 font-bold">
                    {v.price.toLocaleString('fr-FR')} F
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Bottom Price & Add Action */}
        <div className="pt-2 border-t border-neutral-100 flex items-center justify-between gap-2">
          <div>
            <div className="text-[11px] text-neutral-500">
              {variants.length > 1 && !selectedVariantId ? 'À partir de' : 'Prix unitaire'}
            </div>
            <div className="font-mono font-bold text-lg text-neutral-900 tabular-nums">
              {(currentVariant ? currentVariant.price : minPrice).toLocaleString('fr-FR')}{' '}
              <span className="text-xs font-sans font-medium text-neutral-500">F CFA</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleQuickAdd}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 shadow-sm ${
              addedAnimation
                ? 'bg-emerald-600 text-white'
                : 'bg-rose-600 hover:bg-rose-700 text-white active:scale-95'
            }`}
          >
            {addedAnimation ? (
              <>
                <Check className="w-4 h-4" />
                <span>Ajouté</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                <span>Ajouter</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
