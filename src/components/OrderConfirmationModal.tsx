import React, { useState } from 'react';
import { Order } from '../types';
import { CheckCircle2, Copy, Check, MessageSquare, Truck, ArrowRight } from 'lucide-react';

interface OrderConfirmationModalProps {
  order: Order | null;
  onClose: () => void;
  onTrackOrder: (orderNumber: string, phone: string) => void;
}

export const OrderConfirmationModal: React.FC<OrderConfirmationModalProps> = ({
  order,
  onClose,
  onTrackOrder,
}) => {
  const [copied, setCopied] = useState(false);

  if (!order) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(order.order_number);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const whatsappMessage = encodeURIComponent(
    `Bonjour Ola Ice ! Je viens de passer la commande *${order.order_number}* pour un montant de *${order.total.toLocaleString(
      'fr-FR'
    )} F CFA* au nom de *${order.customer_name}*. Merci de me confirmer la préparation !`
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl p-6 sm:p-8 space-y-6 text-center">
        {/* Animated Check */}
        <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
          <CheckCircle2 className="w-10 h-10" />
        </div>

        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-emerald-700">
            Commande enregistrée avec succès !
          </div>
          <h2 className="font-display font-black text-2xl sm:text-3xl text-neutral-900 mt-1">
            Merci pour votre commande
          </h2>
          <p className="text-xs sm:text-sm text-neutral-600 mt-2 max-w-sm mx-auto">
            Notre équipe prépare vos produits glacés. Vous paierez directement en espèces à la livraison.
          </p>
        </div>

        {/* Unique Order Code Box */}
        <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-1">
          <div className="text-xs text-neutral-500 font-medium">Votre numéro de commande :</div>
          <div className="flex items-center justify-center gap-2">
            <span className="font-mono font-black text-xl sm:text-2xl text-rose-600 tracking-wider">
              {order.order_number}
            </span>
            <button
              onClick={handleCopy}
              className="p-1.5 rounded-lg bg-neutral-200/80 hover:bg-neutral-300 text-neutral-700 transition-colors"
              title="Copier le code"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          <div className="text-[11px] text-neutral-500">
            Conservez ce numéro pour suivre votre livraison.
          </div>
        </div>

        {/* Summary Receipt Snapshot */}
        <div className="bg-neutral-50 rounded-xl p-3.5 border border-neutral-200 text-left text-xs space-y-1.5">
          <div className="flex justify-between text-neutral-600">
            <span>Client :</span>
            <span className="font-semibold text-neutral-900">{order.customer_name}</span>
          </div>
          <div className="flex justify-between text-neutral-600">
            <span>Destination :</span>
            <span className="font-semibold text-neutral-900">{order.delivery_address}</span>
          </div>
          {order.delivery_distance_text && (
            <div className="flex justify-between text-neutral-600">
              <span>Distance boutique :</span>
              <span className="font-semibold text-rose-600 font-mono">
                {order.delivery_distance_text}
              </span>
            </div>
          )}
          <div className="flex justify-between text-neutral-600">
            <span>Frais de livraison :</span>
            <span className="font-semibold text-neutral-900">
              {order.delivery_fee === 0
                ? 'Gratuit'
                : `${order.delivery_fee.toLocaleString('fr-FR')} F CFA`}
            </span>
          </div>
          <div className="flex justify-between text-neutral-600">
            <span>Articles :</span>
            <span className="font-semibold text-neutral-900">{order.items.length} produit(s)</span>
          </div>
          <div className="pt-1.5 border-t border-neutral-200 flex justify-between font-bold text-sm">
            <span>Montant à préparer en espèces :</span>
            <span className="font-mono text-rose-600 tabular-nums">
              {order.total.toLocaleString('fr-FR')} F CFA
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5 pt-2">
          {/* WhatsApp Direct Notification */}
          <a
            href={`https://wa.me/2290141404111?text=${whatsappMessage}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow transition-all flex items-center justify-center gap-2 text-sm"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Envoyer la commande sur WhatsApp</span>
          </a>

          {/* Track order directly */}
          <button
            onClick={() => {
              onTrackOrder(order.order_number, order.customer_phone);
              onClose();
            }}
            className="w-full py-3 px-4 bg-neutral-900 hover:bg-neutral-800 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 text-sm"
          >
            <Truck className="w-4 h-4 text-sky-400" />
            <span>Suivre l'avancement de ma livraison en direct</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          {/* Back to store */}
          <button
            onClick={onClose}
            className="w-full py-2.5 text-xs font-bold text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-xl transition-colors"
          >
            ← Rester sur la boutique (Continuer mes achats)
          </button>
        </div>
      </div>
    </div>
  );
};
