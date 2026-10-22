import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { store } from '../services/store';
import { customerAuthService } from '../services/customerAuth';
import { popupQueueService } from '../services/popupQueueService';
import { CustomerProfile, Product } from '../types';
import {
  X,
  Flame,
  Sparkles,
  UserCheck,
  MapPin,
  Phone,
  User,
  ShoppingBag,
  Check,
  ArrowRight,
  ChevronRight,
  ChevronLeft,
  HeartHandshake,
  ShieldCheck,
  Bell,
  Layers,
  Navigation,
  Utensils,
} from 'lucide-react';

export type PopupId =
  | 'profile_completion'
  | 'charcoal_promo'
  | 'new_products'
  | 'wholesale_offer';

interface SmartPopupQueueProps {
  customer: CustomerProfile | null;
  isExternalModalOpen: boolean;
  hasMobileStickyCart?: boolean;
  onAddToCart: (variantId: string, quantity: number, flavor?: string) => void;
  onViewProduct: (product: Product) => void;
  onOpenLocationModal: () => void;
  onOpenProfileModal: () => void;
  onSelectWholesaleCatalog: () => void;
}

const SESSION_DISMISSED_ALL_KEY = 'olaice_popup_queue_muted_v1';
const SEEN_POPUPS_KEY = 'olaice_seen_popups_v1';
const PROMO_LAST_SHOWN_KEY = 'olaice_promo_last_shown_v1';
const PROMO_SHOWN_SESSION_KEY = 'olaice_promo_shown_session_v1';

export const SmartPopupQueue: React.FC<SmartPopupQueueProps> = ({
  customer,
  isExternalModalOpen,
  hasMobileStickyCart = false,
  onAddToCart,
  onViewProduct,
  onOpenLocationModal,
  onOpenProfileModal,
  onSelectWholesaleCatalog,
}) => {
  const completion = customerAuthService.getProfileCompletion(customer);
  const isProfileIncomplete = completion.percent < 100;

  // Build dynamic ordered queue based on user state
  const getOrderedQueue = useCallback((): PopupId[] => {
    const list: PopupId[] = [];
    if (isProfileIncomplete) {
      list.push('profile_completion');
    }
    list.push('charcoal_promo');
    list.push('new_products');
    list.push('wholesale_offer');
    return list;
  }, [isProfileIncomplete]);

  const [queue, setQueue] = useState<PopupId[]>(() => getOrderedQueue());
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [isMutedForSession, setIsMutedForSession] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(SESSION_DISMISSED_ALL_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const [seenIds, setSeenIds] = useState<PopupId[]>(() => {
    try {
      const raw = sessionStorage.getItem(SEEN_POPUPS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  // Inline Profile Completion Form State
  const zones = store.getZones();
  const [fullName, setFullName] = useState(
    customer?.fullName && !customer.fullName.startsWith('Gourmand #')
      ? customer.fullName
      : ''
  );
  const [phone, setPhone] = useState(customer?.phone || '');
  const [zoneId, setZoneId] = useState(
    customer?.deliveryZoneId || zones[0]?.id || ''
  );
  const [address, setAddress] = useState(customer?.deliveryAddress || '');
  const [profileSavedSuccess, setProfileSavedSuccess] = useState(false);

  // Quick-add feedback inside popups
  const [addedVariantId, setAddedVariantId] = useState<string | null>(null);
  const [, setCampaignRevision] = useState(0);

  useEffect(() => popupQueueService.subscribe(() => setCampaignRevision((revision) => revision + 1)), []);

  // Sync form fields when customer changes
  useEffect(() => {
    if (customer) {
      if (customer.fullName && !customer.fullName.startsWith('Gourmand #')) {
        setFullName(customer.fullName);
      }
      if (customer.phone) setPhone(customer.phone);
      if (customer.deliveryZoneId) setZoneId(customer.deliveryZoneId);
      if (customer.deliveryAddress) setAddress(customer.deliveryAddress);
    }
  }, [customer]);

  // Keep queue in sync if profile becomes complete
  useEffect(() => {
    const updatedQueue = getOrderedQueue();
    setQueue(updatedQueue);
    if (currentIndex >= updatedQueue.length) {
      setCurrentIndex(0);
    }
  }, [getOrderedQueue, currentIndex]);

  // Initial automatic launch & queue scheduler (Strictly 1 popup at a time, never fighting!)
  useEffect(() => {
    if (isExternalModalOpen || isMutedForSession || isVisible) {
      return;
    }

    // Find the first unseen popup in the ordered queue
    const promoAlreadyShown = (() => {
      try {
        if (sessionStorage.getItem(PROMO_SHOWN_SESSION_KEY) === 'true') return true;
        const lastShown = Number(localStorage.getItem(PROMO_LAST_SHOWN_KEY) || 0);
        return Date.now() - lastShown < 24 * 60 * 60 * 1000;
      } catch { return false; }
    })();
    const nextUnseenIndex = queue.findIndex((id) => !seenIds.includes(id) && (id === 'profile_completion' || !promoAlreadyShown));
    if (nextUnseenIndex === -1) {
      return; // All popups in queue have been presented once automatically
    }

    // Wait a polite delay before showing the next queued popup
    // Let an incomplete profile prompt appear early; promotions wait longer and
    // are limited to one per session and one per day across sessions.
    const nextId = queue[nextUnseenIndex];
    const delayMs = nextId === 'profile_completion' ? 5000 : 60000;

    const timer = window.setTimeout(() => {
      if (!isExternalModalOpen) {
        setCurrentIndex(nextUnseenIndex);
        setIsVisible(true);
        if (nextId !== 'profile_completion') {
          try {
            sessionStorage.setItem(PROMO_SHOWN_SESSION_KEY, 'true');
            localStorage.setItem(PROMO_LAST_SHOWN_KEY, String(Date.now()));
          } catch { /* storage may be unavailable */ }
        }
      }
    }, delayMs);

    return () => window.clearTimeout(timer);
  }, [isExternalModalOpen, isMutedForSession, isVisible, queue, seenIds]);

  const markAsSeen = (id: PopupId) => {
    setSeenIds((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      try {
        sessionStorage.setItem(SEEN_POPUPS_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const activePopupId = queue[currentIndex] || queue[0];

  // Close current popup and let the queue schedule the next one after cooldown
  const handleCloseCurrent = () => {
    if (activePopupId) {
      markAsSeen(activePopupId);
    }
    setIsVisible(false);
  };

  // Immediately advance to the next popup in the queue (manual user navigation)
  const handleNextInQueue = () => {
    if (activePopupId) {
      markAsSeen(activePopupId);
    }
    const nextIdx = (currentIndex + 1) % queue.length;
    setCurrentIndex(nextIdx);
  };

  const handlePrevInQueue = () => {
    const prevIdx = (currentIndex - 1 + queue.length) % queue.length;
    setCurrentIndex(prevIdx);
  };

  const handleMuteAllSession = () => {
    if (activePopupId) {
      markAsSeen(activePopupId);
    }
    setIsMutedForSession(true);
    setIsVisible(false);
    try {
      sessionStorage.setItem(SESSION_DISMISSED_ALL_KEY, 'true');
    } catch {
      // ignore
    }
  };

  const handleOpenManualHub = (targetId?: PopupId) => {
    if (targetId) {
      const idx = queue.indexOf(targetId);
      if (idx !== -1) setCurrentIndex(idx);
    } else {
      // Pick first unseen or 0
      const nextUnseen = queue.findIndex((id) => !seenIds.includes(id));
      setCurrentIndex(nextUnseen !== -1 ? nextUnseen : 0);
    }
    setIsVisible(true);
  };

  const handleQuickAddVariant = (variantId: string, qty = 1, flavor?: string) => {
    onAddToCart(variantId, qty, flavor);
    setAddedVariantId(variantId);
    window.setTimeout(() => {
      setAddedVariantId((prev) => (prev === variantId ? null : prev));
    }, 1500);
  };

  const handleInlineProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim() || !fullName.trim()) return;

    // Login or create account if guest
    if (!customer) {
      customerAuthService.loginOrRegister(phone.trim(), fullName.trim());
    }
    customerAuthService.updateProfile({
      fullName: fullName.trim(),
      phone: phone.trim(),
      deliveryZoneId: zoneId,
      deliveryAddress: address.trim(),
    });

    setProfileSavedSuccess(true);
    markAsSeen('profile_completion');

    window.setTimeout(() => {
      setProfileSavedSuccess(false);
      setIsVisible(false);
    }, 1100);
  };

  // Lookup products & variants for rich display
  const charcoalProduct = store.getProductById('prod-charbon-bois');
  const charcoalVariants = charcoalProduct
    ? store.getVariantsForProduct(charcoalProduct.id)
    : [];

  const arrivalsCampaign = popupQueueService.getAllCampaigns().find((campaign) => campaign.type === 'new_arrivals');
  const showcaseProducts = (arrivalsCampaign?.featuredProductIds || ['prod-jolof-rice', 'prod-shawarma', 'prod-yaourt-groto'])
    .map((id) => store.getProductById(id)).filter((p): p is Product => Boolean(p));

  const grotoProduct = store.getProductById('prod-yaourt-groto');
  const grotoPackVariant = store.getVariantById('var-groto-pack-revendeuse');

  const popupTitles: Record<PopupId, string> = {
    profile_completion: 'Profil & Livraison 1-Clic',
    charcoal_promo: 'Nouveau : Prix du Charbon',
    new_products: 'Carte Chaude & Glacée',
    wholesale_offer: 'Offre Gros Revendeuses',
  };

  const unseenCount = queue.filter((id) => !seenIds.includes(id)).length;

  // Never render anything on top if an external transactional modal is open
  if (isExternalModalOpen) {
    return null;
  }

  return (
    <>
      {/* Discrete Floating Launcher Button when queue modal is closed */}
      {!isVisible && (
        <div
          className={`fixed left-4 z-30 flex items-center gap-2 transition-all ${
            hasMobileStickyCart ? 'bottom-20 md:bottom-4' : 'bottom-4'
          }`}
        >
          <button
            type="button"
            onClick={() => handleOpenManualHub()}
            className="group bg-neutral-900/95 hover:bg-neutral-900 text-white pl-3 pr-3.5 py-2.5 rounded-2xl shadow-xl border border-white/15 flex items-center gap-2.5 text-xs font-bold transition-all active:scale-95 cursor-pointer"
            title="Voir les nouveautés, le tarif du charbon et compléter mon profil"
          >
            <span className="relative flex h-6 w-6 items-center justify-center rounded-xl bg-rose-600 text-white shrink-0">
              <Flame className="w-3.5 h-3.5" />
              {unseenCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-400 text-neutral-950 text-[10px] font-black flex items-center justify-center font-mono">
                  {unseenCount}
                </span>
              )}
            </span>
            <div className="text-left">
              <div className="leading-none text-white flex items-center gap-1">
                <span>Nouveautés & Tarifs</span>
              </div>
              <div className="text-[10px] font-medium text-neutral-400 mt-0.5">
                Charbon 250F · Profil · Promos
              </div>
            </div>
          </button>
        </div>
      )}

      {/* Strictly Single-Instance Responsive Modal / Bottom-Sheet Queue */}
      <AnimatePresence mode="wait">
        {isVisible && activePopupId && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 md:p-6">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={handleCloseCurrent}
              className="fixed inset-0 bg-neutral-950/65 backdrop-blur-xs"
            />

            {/* Modal Container: Bottom-sheet on Android/Mobile, Split-Card on Tablet/Desktop */}
            <motion.div
              key={activePopupId}
              initial={{ opacity: 0, y: 40, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.97 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="relative z-10 w-full sm:max-w-2xl lg:max-w-3xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-neutral-200 overflow-hidden max-h-[90dvh] flex flex-col"
            >
              {/* Mobile Drag Handle Bar */}
              <div className="sm:hidden flex justify-center pt-2.5 pb-1 bg-neutral-900 text-white">
                <div className="w-10 h-1 rounded-full bg-white/30" />
              </div>

              {/* Queue Header Bar: Shows current position in Queue + Quick Switch Tabs */}
              <div className="bg-neutral-900 text-white px-4 sm:px-6 py-2.5 flex items-center justify-between gap-2 border-b border-neutral-800 shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-600 text-white text-[11px] font-mono font-bold shrink-0">
                    <Layers className="w-3 h-3" />
                    <span>
                      {currentIndex + 1}/{queue.length}
                    </span>
                  </span>

                  {/* Interactive Queue Pills on Desktop / Tablet */}
                  <div className="hidden md:flex items-center gap-1 overflow-x-auto scrollbar-none">
                    {queue.map((id, idx) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setCurrentIndex(idx)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors whitespace-nowrap cursor-pointer ${
                          idx === currentIndex
                            ? 'bg-white text-neutral-900'
                            : 'text-neutral-400 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        {popupTitles[id]}
                      </button>
                    ))}
                  </div>

                  <span className="md:hidden text-xs font-bold text-neutral-200 truncate">
                    {popupTitles[activePopupId]}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {queue.length > 1 && (
                    <div className="flex items-center gap-1 mr-1">
                      <button
                        type="button"
                        onClick={handlePrevInQueue}
                        className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                        title="Annonce précédente"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={handleNextInQueue}
                        className="px-2.5 py-1 rounded-lg bg-white/15 hover:bg-white/25 text-white text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                        title="Passer à l'annonce suivante dans la file"
                      >
                        <span>Suivant</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleCloseCurrent}
                    className="p-1.5 rounded-full bg-white/10 hover:bg-rose-600 text-white transition-colors cursor-pointer"
                    aria-label="Fermer ce pop-up"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* POPUP 1: CHARCOAL PRICE & EXPRESS DELIVERY SHOWCASE */}
              {activePopupId === 'charcoal_promo' && (
                <div className="grid grid-cols-1 sm:grid-cols-12 overflow-y-auto">
                  {/* Left Visual Column */}
                  <div className="sm:col-span-5 relative bg-neutral-950 min-h-[190px] sm:min-h-full flex flex-col justify-end overflow-hidden">
                    <img
                      src={
                        charcoalProduct?.main_image ||
                        '/images/charbon_bois_sac_1791270478931.jpg'
                      }
                      alt="Charbon de Bois & Braise Express Ola Ice"
                      className="absolute inset-0 w-full h-full object-cover opacity-90"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

                    <div className="relative z-10 p-4 sm:p-5 text-white space-y-2">
                      <div className="inline-flex items-center gap-1.5 bg-amber-500 text-neutral-950 px-2.5 py-0.5 rounded-md text-[11px] font-black uppercase tracking-wider">
                        <Flame className="w-3.5 h-3.5 fill-current" />
                        <span>Nouveau chez Ola Ice</span>
                      </div>
                      <h3 className="font-display font-black text-xl sm:text-2xl leading-tight text-white">
                        Charbon de Bois & Braise Express
                      </h3>
                      <p className="text-xs text-neutral-200 leading-relaxed">
                        Bois dur sélectionné, allumage rapide sans fumée excessive. Livré directement à domicile avec vos glaces ou repas !
                      </p>
                    </div>
                  </div>

                  {/* Right Pricing & Action Column */}
                  <div className="sm:col-span-7 p-4 sm:p-6 flex flex-col justify-between space-y-4 bg-white">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-rose-600">
                          Grille Tarifaire Officielle
                        </span>
                        <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          En stock · Livraison immédiate
                        </span>
                      </div>

                      <h4 className="font-display font-black text-base sm:text-lg text-neutral-900">
                        Choisissez votre format de Charbon de Bois :
                      </h4>

                      {/* Price Cards for Each Format */}
                      <div className="space-y-2">
                        {charcoalVariants.map((v) => {
                          const isAdded = addedVariantId === v.id;
                          return (
                            <div
                              key={v.id}
                              className="p-3 rounded-2xl border border-neutral-200 hover:border-rose-300 bg-neutral-50/70 flex items-center justify-between gap-3 transition-all"
                            >
                              <div className="min-w-0">
                                <div className="font-bold text-xs sm:text-sm text-neutral-900 truncate">
                                  {v.name}
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="font-mono font-black text-sm sm:text-base text-rose-600 tabular-nums">
                                    {v.price.toLocaleString('fr-FR')} F CFA
                                  </span>
                                  {v.wholesale_price && v.wholesale_min_quantity && (
                                    <span className="text-[11px] text-amber-800 bg-amber-100/80 px-1.5 py-0.5 rounded font-semibold">
                                      Gros : {v.wholesale_price.toLocaleString('fr-FR')} F (dès {v.wholesale_min_quantity})
                                    </span>
                                  )}
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleQuickAddVariant(v.id, 1)}
                                className={`px-3.5 py-2.5 rounded-xl text-xs font-bold shrink-0 flex items-center gap-1.5 transition-all cursor-pointer ${
                                  isAdded
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-neutral-900 hover:bg-rose-600 text-white active:scale-95'
                                }`}
                              >
                                {isAdded ? (
                                  <>
                                    <Check className="w-3.5 h-3.5" />
                                    <span>Ajouté !</span>
                                  </>
                                ) : (
                                  <>
                                    <ShoppingBag className="w-3.5 h-3.5" />
                                    <span>Ajouter</span>
                                  </>
                                )}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Footer Controls */}
                    <div className="pt-3 border-t border-neutral-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                      {charcoalProduct && (
                        <button
                          type="button"
                          onClick={() => {
                            handleCloseCurrent();
                            onViewProduct(charcoalProduct);
                          }}
                          className="flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                        >
                          <span>Voir les détails & commander en gros</span>
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={handleCloseCurrent}
                        className="py-2.5 px-3 text-xs font-bold text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-xl transition-colors cursor-pointer"
                      >
                        Fermer
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* POPUP 2: PROFILE COMPLETION (WHEN INCOMPLETE) */}
              {activePopupId === 'profile_completion' && (
                <div className="grid grid-cols-1 sm:grid-cols-12 overflow-y-auto">
                  {/* Left Visual / Progress Column */}
                  <div className="sm:col-span-5 bg-gradient-to-br from-rose-600 via-rose-700 to-neutral-900 text-white p-5 sm:p-6 flex flex-col justify-between space-y-4">
                    <div className="space-y-3">
                      <div className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-xs px-2.5 py-1 rounded-lg text-[11px] font-bold">
                        <UserCheck className="w-3.5 h-3.5 text-amber-300" />
                        <span>Profil Client Express</span>
                      </div>

                      <h3 className="font-display font-black text-xl sm:text-2xl leading-tight">
                        Complétez votre profil pour commander en 1 clic !
                      </h3>

                      <p className="text-xs text-rose-100 leading-relaxed">
                        Enregistrez votre numéro WhatsApp et votre quartier une seule fois. Vos prochaines livraisons de glaces, jus et repas seront pré-remplies instantanément.
                      </p>
                    </div>

                    {/* Completion Meter */}
                    <div className="bg-black/25 rounded-2xl p-3.5 space-y-2 border border-white/10">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-rose-100">Progression du profil</span>
                        <span className="font-mono text-amber-300 font-black">
                          {completion.percent}%
                        </span>
                      </div>
                      <div className="w-full h-2 bg-white/15 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-400 transition-all duration-500 rounded-full"
                          style={{ width: `${ Math.max(15, completion.percent) }%` }}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          handleCloseCurrent();
                          onOpenLocationModal();
                        }}
                        className="w-full mt-2 py-2 px-3 bg-white/15 hover:bg-white/25 text-white rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Navigation className="w-3.5 h-3.5 text-amber-300" />
                        <span>Calculer mes frais par GPS exact (dès 50 F)</span>
                      </button>
                    </div>
                  </div>

                  {/* Right Interactive Form Column */}
                  <div className="sm:col-span-7 p-4 sm:p-6 bg-white flex flex-col justify-between">
                    {profileSavedSuccess ? (
                      <div className="py-10 text-center space-y-3">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                          <Check className="w-6 h-6" />
                        </div>
                        <h4 className="font-display font-black text-lg text-neutral-900">
                          Profil enregistré avec succès !
                        </h4>
                        <p className="text-xs text-neutral-600 max-w-xs mx-auto">
                          Vos coordonnées de livraison sont prêtes. Affichage de l'annonce suivante...
                        </p>
                      </div>
                    ) : (
                      <form onSubmit={handleInlineProfileSubmit} className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold uppercase tracking-wider text-rose-600">
                            Coordonnées de livraison
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              handleCloseCurrent();
                              onOpenProfileModal();
                            }}
                            className="text-[11px] font-bold text-neutral-500 hover:text-rose-600 underline cursor-pointer"
                          >
                            Ouvrir mon espace complet
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <div>
                            <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                              Votre Nom & Prénom *
                            </label>
                            <div className="relative">
                              <User className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-3" />
                              <input
                                type="text"
                                required
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                placeholder="Ex: Clarisse Soglo"
                                className="w-full pl-8 pr-3 py-2 rounded-xl border border-neutral-300 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                              Téléphone / WhatsApp *
                            </label>
                            <div className="relative">
                              <Phone className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-3" />
                              <input
                                type="tel"
                                required
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="Ex: 01 97 00 00 00"
                                className="w-full pl-8 pr-3 py-2 rounded-xl border border-neutral-300 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-rose-500"
                              />
                            </div>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                            Zone de livraison habituelle
                          </label>
                          <select
                            value={zoneId}
                            onChange={(e) => setZoneId(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                          >
                            {zones.map((z) => (
                              <option key={z.id} value={z.id}>
                                {z.name} ({z.delivery_fee} F CFA)
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                            Quartier précis & Repère visuel *
                          </label>
                          <div className="relative">
                            <MapPin className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-3" />
                            <input
                              type="text"
                              required
                              value={address}
                              onChange={(e) => setAddress(e.target.value)}
                              placeholder="Ex: Bohicon, près de la pharmacie..."
                              className="w-full pl-8 pr-3 py-2 rounded-xl border border-neutral-300 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500"
                            />
                          </div>
                        </div>

                        <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                          <button
                            type="submit"
                            className="flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                          >
                            <Check className="w-4 h-4" />
                            <span>Enregistrer mon profil 1-clic</span>
                          </button>

                          <button
                            type="button"
                            onClick={handleNextInQueue}
                            className="py-2.5 px-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                          >
                            Plus tard · Voir nouveautés →
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                </div>
              )}

              {/* POPUP 3: NEW PRODUCTS & HOT FOOD SHOWCASE */}
              {activePopupId === 'new_products' && (
                <div className="p-4 sm:p-6 space-y-4 overflow-y-auto bg-white">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-rose-600">
                        <Utensils className="w-3.5 h-3.5" />
                        <span>Sélection Fraîcheur & Restauration</span>
                      </div>
                      <h3 className="font-display font-black text-lg sm:text-2xl text-neutral-900">
                        Nos spécialités prêtes à vous régaler aujourd'hui
                      </h3>
                    </div>
                    <span className="text-xs text-neutral-500 font-medium">
                      Paiement à la livraison
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {showcaseProducts.map((prod) => {
                      const variants = store.getVariantsForProduct(prod.id);
                      const firstVar = variants[0];
                      const isAdded = firstVar && addedVariantId === firstVar.id;

                      return (
                        <div
                          key={prod.id}
                          className="rounded-2xl border border-neutral-200 overflow-hidden bg-neutral-50 flex flex-row sm:flex-col"
                        >
                          <div className="w-28 sm:w-full sm:aspect-[4/3] bg-neutral-200 relative shrink-0">
                            <img
                              src={prod.main_image}
                              alt={prod.name}
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          </div>

                          <div className="p-3 flex-1 flex flex-col justify-between space-y-2">
                            <div>
                              <button type="button" onClick={() => { handleCloseCurrent(); onViewProduct(prod); }} className="text-left font-display font-bold text-xs sm:text-sm text-neutral-900 line-clamp-1 hover:text-rose-600">
                                {prod.name}
                              </button>
                              <p className="text-[11px] text-neutral-500 line-clamp-2 mt-0.5">
                                {prod.short_description}
                              </p>
                            </div>

                            {firstVar && (
                              <div className="pt-1 flex items-center justify-between gap-2">
                                <span className="font-mono font-black text-xs sm:text-sm text-rose-600 tabular-nums">
                                  {firstVar.price.toLocaleString('fr-FR')} F
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleQuickAddVariant(
                                      firstVar.id,
                                      1,
                                      prod.available_flavors?.[0]
                                    )
                                  }
                                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                                    isAdded
                                      ? 'bg-emerald-600 text-white'
                                      : 'bg-neutral-900 hover:bg-rose-600 text-white'
                                  }`}
                                >
                                  {isAdded ? (
                                    <>
                                      <Check className="w-3 h-3" />
                                      <span>Ajouté</span>
                                    </>
                                  ) : (
                                    <>
                                      <ShoppingBag className="w-3 h-3" />
                                      <span>Ajouter</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="pt-2 border-t border-neutral-100 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={handleMuteAllSession}
                      className="text-[11px] text-neutral-400 hover:text-neutral-700 underline cursor-pointer"
                    >
                      Ne plus afficher les annonces auto
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleNextInQueue}
                        className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <span>Voir l'offre Revendeuses</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* POPUP 4: WHOLESALE & RESELLER OFFER */}
              {activePopupId === 'wholesale_offer' && (
                <div className="grid grid-cols-1 sm:grid-cols-12 overflow-y-auto">
                  <div className="sm:col-span-5 relative bg-amber-950 min-h-[180px] sm:min-h-full flex flex-col justify-end overflow-hidden">
                    <img
                      src={
                        grotoProduct?.main_image ||
                        '/images/product_yaourt_groto_1790119101835.jpg'
                      }
                      alt="Vente en gros Yaourt Groto Ola Ice"
                      className="absolute inset-0 w-full h-full object-cover opacity-85"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                    <div className="relative z-10 p-4 sm:p-5 text-white space-y-1.5">
                      <div className="inline-flex items-center gap-1.5 bg-amber-500 text-neutral-950 px-2.5 py-0.5 rounded-md text-[11px] font-black uppercase">
                        <HeartHandshake className="w-3.5 h-3.5" />
                        <span>Spécial Revendeuses & Fêtes</span>
                      </div>
                      <h3 className="font-display font-black text-xl leading-tight">
                        Gagnez plus avec nos Tarifs de Gros !
                      </h3>
                    </div>
                  </div>

                  <div className="sm:col-span-7 p-4 sm:p-6 bg-white flex flex-col justify-between space-y-4">
                    <div className="space-y-3">
                      <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
                        Idéal pour les bonnes dames, cantines scolaires, boutiques et cérémonies (mariages, baptêmes) :
                      </p>

                      <div className="space-y-2 text-xs">
                        <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between">
                          <div>
                            <div className="font-bold text-neutral-900">
                              Pack Revendeuse (20 Bâtonnets Groto)
                            </div>
                            <div className="text-[11px] text-neutral-500">
                              Prix normal : <span className="line-through">5 000 F</span> · Économisez 1 000 F
                            </div>
                          </div>
                          <span className="font-mono font-black text-sm text-amber-800">
                            4 000 F
                          </span>
                        </div>

                        <div className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-200 flex items-center justify-between">
                          <div>
                            <div className="font-bold text-neutral-900">
                              Glaces Événements & Mariages (dès 50 u.)
                            </div>
                            <div className="text-[11px] text-neutral-500">
                              Formats 25 F, 50 F et 100 F disponibles en glacière
                            </div>
                          </div>
                          <span className="font-mono font-black text-sm text-rose-600">
                            Dès 20 F/u
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-neutral-100 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      {grotoPackVariant && (
                        <button
                          type="button"
                          onClick={() =>
                            handleQuickAddVariant(
                              grotoPackVariant.id,
                              1,
                              grotoProduct?.available_flavors?.[0]
                            )
                          }
                          className="flex-1 py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                        >
                          <ShoppingBag className="w-4 h-4" />
                          <span>
                            {addedVariantId === grotoPackVariant.id
                              ? 'Pack ajouté au panier !'
                              : 'Ajouter Pack 20 Groto (4 000 F)'}
                          </span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          handleCloseCurrent();
                          onSelectWholesaleCatalog();
                        }}
                        className="py-2.5 px-3 bg-neutral-900 hover:bg-neutral-800 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
                      >
                        Tout le catalogue Gros →
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
