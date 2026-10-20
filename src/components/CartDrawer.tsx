import React from 'react';
import { store } from '../services/store';
import { X, Trash2, Plus, Minus, ArrowRight, ShoppingBag, ShieldCheck } from 'lucide-react';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onProceedToCheckout: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  onProceedToCheckout,
}) => {
  if (!isOpen) return null;

  const pricing = store.calculatePricing();
  const items = pricing.itemsDetails;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="p-4 sm:p-5 border-b border-neutral-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-rose-600" />
            <h2 className="font-display font-bold text-lg text-neutral-900">
              Mon Panier ({pricing.itemCount})
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-neutral-100 text-neutral-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Free delivery or COD reassurance strip */}
        <div className="bg-rose-50/70 border-b border-rose-100 px-4 py-2.5 text-xs text-rose-900 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-rose-600 shrink-0" />
          <span>Paiement en espèces à la livraison · Produits frais garantis</span>
        </div>

        {/* Cart items list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
              <div className="w-16 h-16 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-400">
                <ShoppingBag className="w-8 h-8" />
              </div>
              <h3 className="font-display font-bold text-lg text-neutral-800">
                Votre panier est vide
              </h3>
              <p className="text-xs text-neutral-500 max-w-xs">
                Découvrez nos délicieux Yaourts Groto, crèmes glacées, jus naturels et snacks chauds.
              </p>
              <button
                onClick={onClose}
                className="mt-2 px-5 py-2.5 bg-rose-600 text-white text-xs font-bold rounded-xl hover:bg-rose-700 transition-colors"
              >
                Explorer le catalogue
              </button>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={`${item.variant.id}-${item.flavor || 'default'}`}
                className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 flex gap-3 items-center"
              >
                {/* Product thumbnail */}
                <div className="w-16 h-16 rounded-lg overflow-hidden bg-neutral-200 shrink-0">
                  <img
                    src={item.product.main_image}
                    alt={item.product.name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-xs sm:text-sm text-neutral-900 truncate">
                    {item.product.name}
                  </div>
                  <div className="text-[11px] text-neutral-600 truncate">
                    {item.variant.name}
                    {item.flavor && <span className="text-rose-600 font-medium"> · {item.flavor}</span>}
                  </div>

                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-mono text-xs font-bold text-neutral-900 tabular-nums">
                      {item.unitPrice.toLocaleString('fr-FR')} F
                    </span>
                    {item.isWholesale && (
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                        Tarif Gros
                      </span>
                    )}
                  </div>
                </div>

                {/* Steppers & Remove */}
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <button
                    onClick={() => store.removeFromCart(item.variant.id, item.flavor)}
                    className="text-neutral-400 hover:text-rose-600 p-1 transition-colors"
                    title="Supprimer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  <div className="flex items-center gap-1.5 bg-white border border-neutral-300 rounded-lg p-0.5 shadow-2xs">
                    <button
                      onClick={() =>
                        store.updateCartQuantity(item.variant.id, item.quantity - 1, item.flavor)
                      }
                      className="w-6 h-6 flex items-center justify-center hover:bg-neutral-100 rounded text-neutral-600"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-6 text-center font-mono text-xs font-bold tabular-nums">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() =>
                        store.updateCartQuantity(item.variant.id, item.quantity + 1, item.flavor)
                      }
                      className="w-6 h-6 flex items-center justify-center hover:bg-neutral-100 rounded text-neutral-600"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Drawer Footer with calculation & checkout button */}
        {items.length > 0 && (
          <div className="p-4 sm:p-5 border-t border-neutral-200 bg-neutral-50 space-y-3">
            {pricing.discountAmount > 0 && (
              <div className="flex items-center justify-between text-xs text-amber-700 font-bold bg-amber-50 p-2 rounded-lg border border-amber-200">
                <span>Économie Vente en Gros :</span>
                <span className="font-mono tabular-nums">
                  -{pricing.discountAmount.toLocaleString('fr-FR')} F CFA
                </span>
              </div>
            )}

            <div className="flex items-baseline justify-between">
              <span className="text-sm font-semibold text-neutral-600">Sous-total :</span>
              <span className="font-mono font-bold text-xl text-neutral-900 tabular-nums">
                {pricing.subtotal.toLocaleString('fr-FR')}{' '}
                <span className="text-xs font-sans font-normal text-neutral-500">F CFA</span>
              </span>
            </div>

            <p className="text-[11px] text-neutral-500">
              * Frais de livraison calculés à l'étape suivante selon votre zone (Cotonou, Calavi, etc.).
            </p>

            <button
              onClick={() => {
                onClose();
                onProceedToCheckout();
              }}
              className="w-full py-3.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 group active:scale-98"
            >
              <span>Valider la commande</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
