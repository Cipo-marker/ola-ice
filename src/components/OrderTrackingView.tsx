import React, { useState, useEffect } from 'react';
import { store } from '../services/store';
import { Order, OrderStatus } from '../types';
import {
  Search,
  CheckCircle2,
  Clock,
  Package,
  Truck,
  Phone,
  MapPin,
  AlertTriangle,
  XCircle,
  Copy,
  Check,
  MessageSquare,
  ShieldCheck,
  Lock,
  ArrowRight,
} from 'lucide-react';

interface OrderTrackingViewProps {
  initialOrderNumber?: string;
  initialPhone?: string;
  onBackToStore: () => void;
}

const STATUS_STEPS: Array<{ key: OrderStatus; label: string; description: string }> = [
  { key: 'PENDING', label: '1. Enregistrée', description: 'Commande reçue par Ola Ice' },
  { key: 'CONFIRMED', label: '2. Validée', description: 'Confirmée par l’équipe' },
  { key: 'PREPARING', label: '3. En préparation', description: 'Glacière isotherme & emballage' },
  { key: 'READY', label: '4. Prête', description: 'Prête pour le départ' },
  { key: 'ASSIGNED', label: '5. Livreur confirmé', description: 'Votre livreur a accepté la course' },
  { key: 'PICKED_UP', label: '6. Colis récupéré', description: 'Le livreur a pris le colis' },
  { key: 'OUT_FOR_DELIVERY', label: '7. En livraison', description: 'Livreur en route vers vous' },
  { key: 'DELIVERED', label: '8. Livrée & Encaissée', description: 'Colis remis et payé en espèces' },
];

export const OrderTrackingView: React.FC<OrderTrackingViewProps> = ({
  initialOrderNumber = '',
  initialPhone = '',
  onBackToStore,
}) => {
  const [orderNumber, setOrderNumber] = useState(initialOrderNumber);
  const [phone, setPhone] = useState(initialPhone);
  const [searchedOrder, setSearchedOrder] = useState<Order | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);

  // Auto load order on mount if user just placed an order in their current session
  useEffect(() => {
    if (initialOrderNumber) {
      setOrderNumber(initialOrderNumber);
      setPhone(initialPhone || '');
      const found = store.getOrderByNumberAndPhone(initialOrderNumber, initialPhone);
      if (found) {
        setSearchedOrder(found);
        setIsPhoneVerified(true);
        setHasSearched(true);
      }
    } else {
      const last = store.getLastOrder();
      if (last) {
        setOrderNumber(last.order_number);
        setPhone(last.customer_phone);
        setSearchedOrder(last);
        setIsPhoneVerified(true);
        setHasSearched(true);
      }
    }
  }, [initialOrderNumber, initialPhone]);

  // Subscribe to real-time status updates from the store
  useEffect(() => {
    const unsub = store.subscribe(() => {
      if (searchedOrder) {
        const live = store.getOrderById(searchedOrder.id);
        if (live) setSearchedOrder(live);
      }
    });
    return () => unsub();
  }, [searchedOrder]);

  useEffect(() => {
    if (!searchedOrder || !isPhoneVerified) return;
    const timer = window.setInterval(() => {
      void store.trackOrder(searchedOrder.order_number, phone).then(({ order }) => setSearchedOrder(order)).catch(() => undefined);
    }, 12000);
    return () => window.clearInterval(timer);
  }, [searchedOrder?.order_number, phone, isPhoneVerified]);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setHasSearched(true);
    const numToSearch = orderNumber.trim().toUpperCase();
    const cleanInputPhone = phone.replace(/[^0-9]/g, '');

    try {
      const { order: found } = await store.trackOrder(numToSearch, phone);
      setSearchedOrder(found);
      setIsPhoneVerified(cleanInputPhone.length >= 8);
    } catch {
      setSearchedOrder(null);
      setIsPhoneVerified(false);
    }
  };

  const handleCopyCode = () => {
    if (!searchedOrder) return;
    navigator.clipboard.writeText(searchedOrder.order_number);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStepStatus = (stepKey: OrderStatus, currentStatus: OrderStatus) => {
    const orderIndex = STATUS_STEPS.findIndex((s) => s.key === currentStatus);
    const stepIndex = STATUS_STEPS.findIndex((s) => s.key === stepKey);

    if (currentStatus === 'CANCELLED' || currentStatus === 'FAILED_DELIVERY') {
      return 'inactive';
    }

    if (stepIndex < orderIndex) return 'completed';
    if (stepIndex === orderIndex) return 'current';
    return 'upcoming';
  };

  // Mask phone number for privacy: e.g. +229 01 ** ** 11
  const maskPhone = (num: string) => {
    const cleaned = num.replace(/\s+/g, '');
    if (cleaned.length < 8) return '********';
    return cleaned.slice(0, 6) + ' **** ' + cleaned.slice(-2);
  };

  // Mask address for privacy: e.g. Haie Vive (Détails masqués)
  const maskAddress = (address: string) => {
    const parts = address.split(',');
    return `${parts[0]} (Adresse précise masquée pour votre sécurité)`;
  };

  const whatsappMessage = searchedOrder
    ? encodeURIComponent(
        `Bonjour Ola Ice ! Je souhaite avoir des nouvelles de ma commande *${searchedOrder.order_number}* (${searchedOrder.delivery_zone_name}). Merci !`
      )
    : '';

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-6 py-8 sm:py-12 space-y-8 animate-in fade-in duration-300">
      {/* Top Banner */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-rose-600 bg-rose-50 px-3 py-1 rounded-full border border-rose-100">
          <Truck className="w-3.5 h-3.5" />
          <span>Suivi en direct & Reçu Client</span>
        </div>
        <h1 className="font-display font-black text-2xl sm:text-4xl text-neutral-900 tracking-tight">
          Suivi de votre Commande Ola Ice
        </h1>
        <p className="text-xs sm:text-sm text-neutral-600 max-w-lg mx-auto">
          Suivez l'avancement de votre commande de glaces, yaourts et repas en direct depuis notre atelier jusqu'à votre porte.
        </p>
      </div>

      {/* Secure Search Form with Phone Authentication */}
      <form
        onSubmit={handleSearch}
        className="bg-white p-4 sm:p-5 rounded-2xl border border-neutral-200 shadow-sm grid sm:grid-cols-12 gap-3"
      >
        <div className="sm:col-span-5">
          <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
            Numéro de commande *
          </label>
          <input
            type="text"
            required
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            placeholder="Ex: OLA-20260922-..."
            className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 font-mono text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 uppercase bg-neutral-50"
          />
        </div>

        <div className="sm:col-span-4">
          <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1 flex items-center justify-between">
            <span>Téléphone de livraison *</span>
            <span className="text-[10px] text-neutral-400 font-normal">Preuve de sécurité</span>
          </label>
          <input
            type="tel"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Ex: 01 41 40 41 11"
            className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 font-mono text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 bg-neutral-50"
          />
        </div>

        <div className="sm:col-span-3 flex items-end">
          <button
            type="submit"
            className="w-full py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs sm:text-sm font-bold transition-all shadow-sm flex items-center justify-center gap-1.5"
          >
            <Search className="w-4 h-4" />
            <span>Rechercher</span>
          </button>
        </div>

        <div className="sm:col-span-12 text-[11px] text-neutral-500 flex items-center gap-1.5 pt-1">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>Protection des données personnelles : le numéro de téléphone est requis pour déverrouiller l'adresse complète.</span>
        </div>
      </form>

      {/* If No search executed yet and no active order */}
      {!hasSearched && !searchedOrder && (
        <div className="bg-white rounded-3xl border border-neutral-200 p-8 sm:p-12 text-center space-y-4 shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <Truck className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="font-display font-black text-xl text-neutral-900">
              Aucune commande affichée
            </h3>
            <p className="text-xs sm:text-sm text-neutral-500 max-w-md mx-auto">
              Si vous venez de passer commande, vos informations s'affichent automatiquement. Sinon, saisissez votre numéro de commande et votre téléphone ci-dessus.
            </p>
          </div>
          <button
            onClick={onBackToStore}
            className="px-5 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold rounded-xl transition-all shadow-sm"
          >
            Aller à la Boutique
          </button>
        </div>
      )}

      {/* If order not found */}
      {hasSearched && !searchedOrder && (
        <div className="bg-white rounded-2xl border border-neutral-200 p-8 text-center space-y-3 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="font-display font-bold text-lg text-neutral-900">
            Commande introuvable
          </h3>
          <p className="text-xs text-neutral-500 max-w-sm mx-auto">
            Vérifiez le numéro saisi (format : OLA-...). En cas de doute, appelez notre service client au{' '}
            <strong className="text-rose-600">01 41 40 41 11</strong>.
          </p>
        </div>
      )}

      {/* Order Display */}
      {searchedOrder && (
        <div className="space-y-6">
          {/* Privacy Verification Warning Banner if phone not verified */}
          {!isPhoneVerified && (
            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 flex items-start gap-3 text-xs text-amber-900">
              <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong>Confidentialité activée :</strong> La commande <strong>{searchedOrder.order_number}</strong> existe bien. 
                Pour afficher l'adresse complète de livraison et les notes, renseignez le numéro de téléphone utilisé lors de la commande dans le formulaire ci-dessus.
              </div>
            </div>
          )}

          {/* Order Header Card */}
          <div className="bg-white rounded-3xl border border-neutral-200 p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-100 pb-4">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600">
                  Numéro de suivi officiel
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                  <h2 className="font-mono font-black text-xl sm:text-2xl text-neutral-900">
                    {searchedOrder.order_number}
                  </h2>
                  <button
                    onClick={handleCopyCode}
                    className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors"
                    title="Copier le numéro"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={`https://wa.me/2290141404111?text=${whatsappMessage}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Assistance WhatsApp</span>
                </a>
                <a
                  href="tel:+2290141404111"
                  className="px-3 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Appeler</span>
                </a>
              </div>
            </div>

            {/* Stepper Progress Bar */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-neutral-500 tracking-wider">
                  Progression de la livraison
                </span>
                <span className="text-xs font-mono font-bold text-rose-600 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-100">
                  {STATUS_STEPS.find((s) => s.key === searchedOrder.order_status)?.label || searchedOrder.order_status}
                </span>
              </div>

              {/* Steps timeline */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {STATUS_STEPS.map((step) => {
                  const state = getStepStatus(step.key, searchedOrder.order_status);
                  return (
                    <div
                      key={step.key}
                      className={`p-3 rounded-2xl border text-center transition-all ${
                        state === 'completed'
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                          : state === 'current'
                          ? 'bg-rose-50 border-rose-300 text-rose-900 shadow-xs ring-2 ring-rose-500/20'
                          : 'bg-neutral-50 border-neutral-200 text-neutral-400 opacity-60'
                      }`}
                    >
                      <div className="text-xs font-bold mb-0.5 truncate">{step.label}</div>
                      <div className="text-[10px] line-clamp-1">{step.description}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Courier highlight if assigned */}
            {searchedOrder.delivery_agent_name && (
              <div className="p-3.5 bg-sky-50 rounded-2xl border border-sky-200 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-sky-600 text-white flex items-center justify-center font-bold">
                    <Truck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-sky-950">Livreur Moto en Charge</div>
                    <div className="text-sky-700 font-semibold">{searchedOrder.delivery_agent_name}</div>
                    {searchedOrder.delivery_agent_phone && <a href={`tel:${searchedOrder.delivery_agent_phone}`} className="mt-1 block font-mono text-sky-800 underline">{searchedOrder.delivery_agent_phone}</a>}
                    {searchedOrder.delivery_agent_plate && <div className="mt-1 text-neutral-600">Plaque : <strong>{searchedOrder.delivery_agent_plate}</strong></div>}
                  </div>
                </div>
                <div className="text-right">
                  <span className="bg-sky-100 text-sky-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    Course active
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Delivery & Billing Summary */}
          <div className="grid md:grid-cols-2 gap-4 text-xs sm:text-sm">
            {/* Delivery address card */}
            <div className="bg-white rounded-3xl border border-neutral-200 p-5 space-y-3 shadow-sm">
              <h3 className="font-display font-bold text-base text-neutral-900 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-rose-600" />
                <span>Destination de Livraison</span>
              </h3>

              <div className="space-y-1.5 text-neutral-700">
                <div>
                  <span className="font-semibold text-neutral-500">Destinataire : </span>
                  <strong>{isPhoneVerified ? searchedOrder.customer_name : `${searchedOrder.customer_name[0]}***`}</strong>
                </div>
                <div>
                  <span className="font-semibold text-neutral-500">Téléphone : </span>
                  <span className="font-mono">{isPhoneVerified ? searchedOrder.customer_phone : maskPhone(searchedOrder.customer_phone)}</span>
                </div>
                <div>
                  <span className="font-semibold text-neutral-500">Zone : </span>
                  <strong>{searchedOrder.delivery_zone_name}</strong>
                </div>
                <div>
                  <span className="font-semibold text-neutral-500">Adresse : </span>
                  <span>{isPhoneVerified ? searchedOrder.delivery_address : maskAddress(searchedOrder.delivery_address)}</span>
                </div>
                {searchedOrder.delivery_landmark && isPhoneVerified && (
                  <div>
                    <span className="font-semibold text-neutral-500">Repère : </span>
                    <span className="bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded font-semibold text-xs">
                      {searchedOrder.delivery_landmark}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Financial summary card */}
            <div className="bg-white rounded-3xl border border-neutral-200 p-5 space-y-3 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="font-display font-bold text-base text-neutral-900">
                  Règlement à la Livraison
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Préparez l'appoint en espèces pour faciliter le travail du livreur.
                </p>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-neutral-100 text-xs text-neutral-600">
                <div className="flex justify-between">
                  <span>Sous-total articles</span>
                  <span className="font-mono tabular-nums">{searchedOrder.subtotal.toLocaleString('fr-FR')} F</span>
                </div>
                <div className="flex justify-between">
                  <span>Frais de livraison</span>
                  <span className="font-mono tabular-nums">{searchedOrder.delivery_fee.toLocaleString('fr-FR')} F</span>
                </div>
                <div className="flex justify-between font-black text-base text-neutral-900 pt-2 border-t border-neutral-200">
                  <span>Total en Espèces à Préparer</span>
                  <span className="font-mono text-rose-600 tabular-nums">
                    {searchedOrder.total.toLocaleString('fr-FR')} F CFA
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Ordered Articles List */}
          <div className="bg-white rounded-3xl border border-neutral-200 p-5 sm:p-6 space-y-4 shadow-sm">
            <h3 className="font-display font-bold text-base text-neutral-900">
              Contenu du Colis Isotherme ({searchedOrder.items.length} référence{searchedOrder.items.length > 1 ? 's' : ''})
            </h3>

            <div className="divide-y divide-neutral-100 border border-neutral-100 rounded-2xl overflow-hidden">
              {searchedOrder.items.map((item) => (
                <div key={item.id} className="p-3.5 bg-neutral-50/50 flex items-center justify-between text-xs sm:text-sm">
                  <div>
                    <div className="font-bold text-neutral-900">{item.product_name}</div>
                    <div className="text-xs text-neutral-500">
                      {item.variant_name} {item.flavor ? `· Saveur : ${item.flavor}` : ''}
                    </div>
                  </div>
                  <div className="text-right font-mono font-bold tabular-nums text-neutral-900">
                    <div>{item.quantity} × {item.unit_price.toLocaleString('fr-FR')} F</div>
                    <div className="text-xs text-neutral-500 font-normal">
                      {item.total_price.toLocaleString('fr-FR')} F CFA
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
