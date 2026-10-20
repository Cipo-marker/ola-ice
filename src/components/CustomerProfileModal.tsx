import React, { useState, useEffect } from 'react';
import { customerAuthService } from '../services/customerAuth';
import { store } from '../services/store';
import { CustomerProfile, Order } from '../types';
import {
  X,
  User,
  Phone,
  MapPin,
  Clock,
  LogOut,
  CheckCircle2,
  Package,
  ArrowRight,
  ShieldCheck,
  Save,
  AlertCircle,
  Truck,
  Navigation,
  Briefcase,
  Building2,
} from 'lucide-react';

interface CustomerProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTrackOrder?: (orderNumber: string, phone: string) => void;
  onOpenLocationModal?: () => void;
}

export const CustomerProfileModal: React.FC<CustomerProfileModalProps> = ({
  isOpen,
  onClose,
  onTrackOrder,
  onOpenLocationModal,
}) => {
  const customer = customerAuthService.getCurrentCustomer();
  const zones = store.getZones();
  const allOrders = store.getOrders();

  // Find customer orders by customer_id or phone
  const customerOrders = customer
    ? allOrders.filter(
        (o) =>
          (o.customer_id && o.customer_id === customer.id) ||
          (customer.phone &&
            o.customer_phone.replace(/[^0-9]/g, '') === customer.phone.replace(/[^0-9]/g, ''))
      )
    : [];

  const [fullName, setFullName] = useState(customer?.fullName || '');
  const [phone, setPhone] = useState(customer?.phone || '');
  const [deliveryZoneId, setDeliveryZoneId] = useState(customer?.deliveryZoneId || zones[0]?.id || '');
  const [deliveryAddress, setDeliveryAddress] = useState(customer?.deliveryAddress || '');
  const [deliveryLandmark, setDeliveryLandmark] = useState(customer?.deliveryLandmark || '');
  const [workAddress, setWorkAddress] = useState(customer?.workAddress || '');
  const [workLandmark, setWorkLandmark] = useState(customer?.workLandmark || '');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'orders'>('profile');

  // Keep state updated when customer changes or modal opens
  useEffect(() => {
    if (customer && isOpen) {
      setFullName(customer.fullName || '');
      setPhone(customer.phone || '');
      if (customer.deliveryZoneId) setDeliveryZoneId(customer.deliveryZoneId);
      setDeliveryAddress(customer.deliveryAddress || '');
      setDeliveryLandmark(customer.deliveryLandmark || '');
      setWorkAddress(customer.workAddress || '');
      setWorkLandmark(customer.workLandmark || '');
    }
  }, [customer, isOpen]);

  const completion = customer
    ? customerAuthService.getProfileCompletion(customer)
    : { isComplete: false, percent: 0, missingFields: [] };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer) return;
    const selectedZone = zones.find((z) => z.id === deliveryZoneId);

    customerAuthService.updateProfile({
      fullName: fullName.trim(),
      phone: phone.trim(),
      deliveryZoneId,
      deliveryZoneName: selectedZone?.name || customer.deliveryZoneName,
      deliveryAddress: deliveryAddress.trim(),
      deliveryLandmark: deliveryLandmark.trim(),
      workAddress: workAddress.trim(),
      workLandmark: workLandmark.trim(),
    });

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleLogout = () => {
    customerAuthService.logout();
    onClose();
  };

  if (!isOpen || !customer) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden border border-neutral-200 flex flex-col my-4 max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-neutral-900 text-white p-5 sm:p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-neutral-800 hover:bg-neutral-700 text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500 to-rose-600 text-white flex items-center justify-center font-display font-black text-xl shadow-md">
              {customer.fullName ? customer.fullName[0].toUpperCase() : 'C'}
            </div>
            <div>
              <div className="text-xs text-rose-400 font-bold uppercase tracking-wider">
                Profil Client Enregistré
              </div>
              <h2 className="font-display font-black text-xl text-white">
                {customer.fullName || 'Client Ola Ice'}
              </h2>
              <div className="text-xs text-neutral-400 font-mono">
                {customer.phone || 'Aucun numéro configuré'}
              </div>
            </div>
          </div>

          {/* Completion Progress Bar */}
          <div className="mt-4 pt-3 border-t border-neutral-800">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-neutral-400">Complétion des infos de livraison</span>
              <span className="font-bold text-rose-400">{completion.percent}%</span>
            </div>
            <div className="w-full bg-neutral-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-amber-500 to-rose-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${completion.percent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-neutral-200 bg-neutral-50 px-4 pt-2 gap-2 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`pb-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'profile'
                ? 'border-rose-600 text-rose-600'
                : 'border-transparent text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Coordonnées & Adresse</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className={`pb-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'orders'
                ? 'border-rose-600 text-rose-600'
                : 'border-transparent text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Mes Commandes ({customerOrders.length})</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="overflow-y-auto p-5 sm:p-6 space-y-4">
          {activeTab === 'profile' && (
            <form onSubmit={handleSave} className="space-y-4">
              {savedSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Vos informations ont été enregistrées avec succès !</span>
                </div>
              )}

              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700">
                    Nom & Prénom
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Ex: Jean Dossou"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 bg-neutral-50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700">
                    Numéro de Téléphone
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Ex: 01 41 40 41 11"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-rose-500 bg-neutral-50"
                  />
                </div>
              </div>

              {/* GPS Geolocation info in Profile */}
              <div className="p-3.5 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Navigation className="w-4 h-4 text-rose-600" />
                    <span className="text-xs font-bold text-neutral-800">
                      Position GPS & Distance Boutique
                    </span>
                  </div>
                  {customer.distanceFormatted && (
                    <span className="text-[11px] font-mono font-bold bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full">
                      {customer.distanceFormatted} ({customer.calculatedDeliveryFee} F CFA)
                    </span>
                  )}
                </div>
                {customer.distanceFormatted ? (
                  <p className="text-[11px] text-neutral-600">
                    Vos frais de livraison sont calculés automatiquement à{' '}
                    <strong>{customer.calculatedDeliveryFee} F CFA</strong> selon votre distance réelle à la boutique.
                  </p>
                ) : (
                  <p className="text-[11px] text-neutral-500">
                    Activez votre localisation GPS pour obtenir le tarif précis de livraison (50 F &lt;500m, 100 F dès 500m, 200 F à 1km).
                  </p>
                )}

                {onOpenLocationModal && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenLocationModal();
                    }}
                    className="w-full py-2 bg-white hover:bg-neutral-100 text-rose-600 border border-neutral-200 hover:border-rose-300 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer mt-1"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    <span>
                      {customer.distanceFormatted
                        ? 'Google a mal calculé ma position ? Ajuster sur la carte'
                        : 'Définir ma position exacte sur Google Maps'}
                    </span>
                  </button>
                )}
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700">
                  Zone de livraison habituelle
                </label>
                <select
                  value={deliveryZoneId}
                  onChange={(e) => setDeliveryZoneId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 bg-neutral-50"
                >
                  {zones.map((zone) => (
                    <option key={zone.id} value={zone.id}>
                      {zone.name} (+{zone.delivery_fee.toLocaleString('fr-FR')} F CFA)
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700">
                  Adresse exacte ou Quartier
                </label>
                <input
                  type="text"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder="Ex: Haie Vive, rue des Cocotiers, maison blanche portail bleu"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 bg-neutral-50"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700">
                  Repère visible pour le livreur moto (Maison)
                </label>
                <input
                  type="text"
                  value={deliveryLandmark}
                  onChange={(e) => setDeliveryLandmark(e.target.value)}
                  placeholder="Ex: En face de la Pharmacie, portail noir..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 bg-neutral-50"
                />
              </div>

              {/* Work Address Section */}
              <div className="p-3.5 bg-sky-50/60 rounded-2xl border border-sky-200/80 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-sky-950">
                  <Briefcase className="w-4 h-4 text-sky-600 shrink-0" />
                  <span>Adresse sur votre lieu de travail (Au boulot / Bureau)</span>
                </div>

                <div className="space-y-2">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-semibold text-sky-900">
                      Entreprise, service ou adresse de bureau
                    </label>
                    <input
                      type="text"
                      value={workAddress}
                      onChange={(e) => setWorkAddress(e.target.value)}
                      placeholder="Ex: Direction Société X, 2ème étage, bureau 14"
                      className="w-full px-3.5 py-2 rounded-xl border border-sky-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-semibold text-sky-900">
                      Repère au bureau (entrée, gardiennage...)
                    </label>
                    <input
                      type="text"
                      value={workLandmark}
                      onChange={(e) => setWorkLandmark(e.target.value)}
                      placeholder="Ex: Face au carrefour, entrée gardiennage"
                      className="w-full px-3.5 py-2 rounded-xl border border-sky-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between gap-3">
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs sm:text-sm font-bold transition-all shadow-sm flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>Enregistrer mon profil</span>
                </button>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="px-3.5 py-2.5 text-neutral-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Se déconnecter</span>
                </button>
              </div>
            </form>
          )}

          {activeTab === 'orders' && (
            <div className="space-y-3">
              {customerOrders.length === 0 ? (
                <div className="p-8 text-center bg-neutral-50 rounded-2xl border border-neutral-200 space-y-2">
                  <Package className="w-10 h-10 text-neutral-400 mx-auto" />
                  <div className="font-bold text-neutral-800 text-sm">
                    Aucune commande enregistrée
                  </div>
                  <p className="text-xs text-neutral-500">
                    Vos commandes passées apparaîtront ici pour un suivi en temps réel.
                  </p>
                </div>
              ) : (
                customerOrders.map((order) => (
                  <div
                    key={order.id}
                    className="p-4 bg-white rounded-2xl border border-neutral-200 shadow-xs space-y-2.5 hover:border-neutral-300 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-black text-sm text-neutral-900">
                        {order.order_number}
                      </span>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-100">
                        {order.order_status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-neutral-600">
                      <div>
                        {order.items.length} article(s) · {order.delivery_zone_name}
                      </div>
                      <div className="font-mono font-bold text-neutral-900">
                        {order.total.toLocaleString('fr-FR')} F CFA
                      </div>
                    </div>

                    {onTrackOrder && (
                      <button
                        type="button"
                        onClick={() => {
                          onTrackOrder(order.order_number, order.customer_phone);
                          onClose();
                        }}
                        className="w-full mt-1 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Truck className="w-3.5 h-3.5 text-rose-600" />
                        <span>Suivre cette commande en direct →</span>
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
