// Source: Google Maps Platform Code Assist
import React, { useState, useEffect, useRef } from 'react';
import { store } from '../services/store';
import { customerAuthService } from '../services/customerAuth';
import { BeninLocation, Order, OrderType, CustomerProfile } from '../types';
import {
  computeDistanceToShop,
  requestCurrentPosition,
  DeliveryCalculationResult,
  OLA_ICE_SHOP,
  LOCAL_LANDMARK_PRESETS,
  isLikelyInaccurateDesktopLocation,
} from '../services/distanceService';
import { DeliveryDistanceMap } from './DeliveryDistanceMap';
import { BeninLocationSelector } from './BeninLocationSelector';
import { VoiceNoteRecorder } from './VoiceNoteRecorder';
import { GooglePlaceAddressInput } from './GooglePlaceAddressInput';
import {
  X,
  ShieldCheck,
  MapPin,
  Phone,
  User,
  Banknote,
  AlertCircle,
  Loader2,
  ShoppingBag,
  ArrowRight,
  Sparkles,
  Zap,
  CheckCircle2,
  LogIn,
  Navigation,
  RefreshCw,
  MousePointerClick,
  AlertTriangle,
  LocateFixed,
  Home,
  Briefcase,
  Building2,
  Edit3,
} from 'lucide-react';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderSuccess: (order: Order) => void;
  onRequestOpenLocationModal?: () => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  onOrderSuccess,
}) => {
  const zones = store.getZones();
  const [currentCustomer, setCurrentCustomer] = useState<CustomerProfile | null>(() =>
    customerAuthService.getCurrentCustomer()
  );

  // Form fields
  const [selectedZoneId, setSelectedZoneId] = useState<string>(zones[0]?.id || '');
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [customerEmail, setCustomerEmail] = useState<string>('');
  const [deliveryAddress, setDeliveryAddress] = useState<string>('');
  const [deliveryLandmark, setDeliveryLandmark] = useState<string>('');
  const [deliveryLocation, setDeliveryLocation] = useState<BeninLocation | null>(null);
  const [orderType, setOrderType] = useState<OrderType>('standard');
  const [customerNote, setCustomerNote] = useState('');
  const [customerVoiceNote, setCustomerVoiceNote] = useState<Blob | null>(null);

  // GPS Distance delivery state
  const [customerCoords, setCustomerCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [distanceResult, setDistanceResult] = useState<DeliveryCalculationResult | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isAdjustingMap, setIsAdjustingMap] = useState(false);
  const [locationContext, setLocationContext] = useState<'home' | 'work' | 'custom'>('home');
  const [saveToProfile, setSaveToProfile] = useState<boolean>(true);

  // Directly select coordinates on the Google Map
  const handleSelectMapCoords = (coords: { lat: number; lng: number }) => {
    const calc = computeDistanceToShop(coords.lat, coords.lng);
    setCustomerCoords(coords);
    setDistanceResult(calc);
    if (currentCustomer && saveToProfile) {
      if (locationContext === 'work') {
        customerAuthService.updateProfile({
          workLatitude: coords.lat,
          workLongitude: coords.lng,
          workDistanceMeters: calc.distanceMeters,
          workDistanceFormatted: calc.distanceFormatted,
          workCalculatedDeliveryFee: calc.deliveryFee,
        });
      } else {
        customerAuthService.updateProfile({
          latitude: coords.lat,
          longitude: coords.lng,
          distanceMeters: calc.distanceMeters,
          distanceFormatted: calc.distanceFormatted,
          calculatedDeliveryFee: calc.deliveryFee,
          locationConfirmed: true,
        });
      }
    }
  };

  // Switch between Home, Work, and Custom location presets
  const handleSwitchLocationContext = (context: 'home' | 'work' | 'custom') => {
    setLocationContext(context);
    if (!currentCustomer) return;

    if (context === 'home') {
      if (currentCustomer.deliveryAddress) setDeliveryAddress(currentCustomer.deliveryAddress);
      if (currentCustomer.deliveryLandmark) setDeliveryLandmark(currentCustomer.deliveryLandmark);
      if (currentCustomer.deliveryZoneId) setSelectedZoneId(currentCustomer.deliveryZoneId);
      setDeliveryLocation(currentCustomer.deliveryLocation || null);
      if (currentCustomer.latitude && currentCustomer.longitude) {
        const coords = { lat: currentCustomer.latitude, lng: currentCustomer.longitude };
        setCustomerCoords(coords);
        const calc = computeDistanceToShop(coords.lat, coords.lng);
        setDistanceResult(calc);
      }
    } else if (context === 'work') {
      setDeliveryLocation(currentCustomer.workLocation || null);
      if (currentCustomer.workAddress) {
        setDeliveryAddress(currentCustomer.workAddress);
        if (currentCustomer.workLandmark) setDeliveryLandmark(currentCustomer.workLandmark);
        if (currentCustomer.workLatitude && currentCustomer.workLongitude) {
          const coords = { lat: currentCustomer.workLatitude, lng: currentCustomer.workLongitude };
          setCustomerCoords(coords);
          const calc = computeDistanceToShop(coords.lat, coords.lng);
          setDistanceResult(calc);
        }
      } else {
        // Clear address for workplace so user can enter it cleanly
        setDeliveryAddress('');
        setDeliveryLandmark('');
      }
    } else if (context === 'custom') {
      setDeliveryAddress('');
      setDeliveryLandmark('');
      setDeliveryLocation(null);
    }
  };

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Quick inline login accordion for returning customers
  const [showQuickLogin, setShowQuickLogin] = useState(false);
  const [quickLoginPhone, setQuickLoginPhone] = useState('');
  const [quickLoginMsg, setQuickLoginMsg] = useState<string | null>(null);

  // Function to apply customer profile to form
  const applyCustomerProfile = (cust: CustomerProfile) => {
    if (cust.fullName && cust.fullName !== 'Client Ola Ice') {
      setCustomerName(cust.fullName);
    }
    if (cust.phone) {
      setCustomerPhone(cust.phone);
    }
    if (cust.email) {
      setCustomerEmail(cust.email);
    }
    if (cust.deliveryAddress) {
      setDeliveryAddress(cust.deliveryAddress);
    }
    setDeliveryLocation(cust.deliveryLocation || null);
    if (cust.deliveryLandmark) {
      setDeliveryLandmark(cust.deliveryLandmark);
    }
    if (cust.deliveryZoneId && zones.some((z) => z.id === cust.deliveryZoneId)) {
      setSelectedZoneId(cust.deliveryZoneId);
    }
    if (cust.latitude && cust.longitude) {
      const coords = { lat: cust.latitude, lng: cust.longitude };
      setCustomerCoords(coords);
      const calc = computeDistanceToShop(cust.latitude, cust.longitude);
      setDistanceResult(calc);
    }
  };

  // CRITICAL: Pre-fill on mount/open
  useEffect(() => {
    if (!isOpen) return;
    const cust = customerAuthService.getCurrentCustomer();
    setCurrentCustomer(cust);
    if (cust) {
      applyCustomerProfile(cust);
    }
  }, [isOpen, zones]);

  // Subscribe to customer auth changes
  useEffect(() => {
    const unsub = customerAuthService.subscribe((cust) => {
      setCurrentCustomer(cust);
      if (cust && isOpen) {
        applyCustomerProfile(cust);
      }
    });
    return () => unsub();
  }, [isOpen, zones]);

  // Request GPS Location directly from checkout
  const handleLocateMe = async () => {
    setIsLocating(true);
    setLocationError(null);
    try {
      const coords = await requestCurrentPosition();
      const calc = computeDistanceToShop(coords.latitude, coords.longitude);
      setCustomerCoords({ lat: coords.latitude, lng: coords.longitude });
      setDistanceResult(calc);
      setIsLocating(false);

      // Also persist in customer profile if logged in
      if (currentCustomer) {
        customerAuthService.updateProfile({
          latitude: coords.latitude,
          longitude: coords.longitude,
          distanceMeters: calc.distanceMeters,
          distanceFormatted: calc.distanceFormatted,
          calculatedDeliveryFee: calc.deliveryFee,
          locationConfirmed: true,
        });
      }
    } catch (err: unknown) {
      setIsLocating(false);
      const msg = err instanceof Error ? err.message : 'Impossible de récupérer votre position GPS.';
      setLocationError(msg);
    }
  };

  // Calculate pricing (use GPS distance fee if calculated, otherwise zone fee)
  const activeCustomFee = distanceResult ? distanceResult.deliveryFee : undefined;
  const pricing = store.calculatePricing(selectedZoneId, activeCustomFee);
  const selectedZone = zones.find((z) => z.id === selectedZoneId);

  // Quick inline login
  const handleQuickLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setQuickLoginMsg(null);
    const cleanDigits = quickLoginPhone.replace(/[^0-9]/g, '');

    if (cleanDigits.length < 8) {
      setQuickLoginMsg('Veuillez entrer un numéro de téléphone valide.');
      return;
    }

    const { customer, isNew } = customerAuthService.loginOrRegister(quickLoginPhone.trim());
    setCurrentCustomer(customer);
    setShowQuickLogin(false);
    applyCustomerProfile(customer);

    setQuickLoginMsg(
      isNew
        ? 'Compte créé avec succès ! Vos futures adresses seront sauvegardées.'
        : 'Bienvenue de retour ! Vos adresses enregistrées ont été chargées.'
    );
    setTimeout(() => setQuickLoginMsg(null), 3500);
  };

  // Main order confirmation
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Validation checks
    if (pricing.itemCount === 0) {
      setErrorMessage('Votre panier est vide. Veuillez ajouter un produit avant de commander.');
      return;
    }
    if (!customerName.trim()) {
      setErrorMessage('Veuillez renseigner votre nom complet.');
      return;
    }
    const cleanDigits = customerPhone.replace(/[^0-9]/g, '');
    if (cleanDigits.length < 8) {
      setErrorMessage(
        'Veuillez renseigner un numéro de téléphone valide pour le livreur (ex: 01 41 40 41 11 ou 97 XX XX XX).'
      );
      return;
    }
    if (!deliveryAddress.trim()) {
      setErrorMessage('Veuillez préciser votre adresse de livraison.');
      return;
    }
    if (!deliveryLocation) {
      setErrorMessage('Sélectionnez le département, la commune, l’arrondissement et le quartier de livraison.');
      return;
    }

    setIsSubmitting(true);

    try {
      const selectedZoneObj = zones.find((z) => z.id === selectedZoneId);
      const formattedPhone = customerPhone.startsWith('+229')
        ? customerPhone.trim()
        : `+229 ${customerPhone.trim()}`;

      // 1-Click Registration / Profile Update
      let customerId = currentCustomer?.id;
      if (!currentCustomer) {
        const authResult = customerAuthService.loginOrRegister(customerPhone.trim(), customerName.trim());
        customerId = authResult.customer.id;
        setCurrentCustomer(authResult.customer);
      }

      // Save profile with location and address if saveToProfile is selected
      if (saveToProfile) {
        if (locationContext === 'work') {
          customerAuthService.updateProfile({
            fullName: customerName.trim(),
            phone: customerPhone.trim(),
            workAddress: deliveryAddress.trim(),
            workLandmark: deliveryLandmark.trim(),
            workLocation: deliveryLocation || undefined,
            workLatitude: customerCoords?.lat,
            workLongitude: customerCoords?.lng,
            workDistanceMeters: distanceResult?.distanceMeters,
            workDistanceFormatted: distanceResult?.distanceFormatted,
            workCalculatedDeliveryFee: distanceResult?.deliveryFee,
          });
        } else {
          customerAuthService.updateProfile({
            fullName: customerName.trim(),
            phone: customerPhone.trim(),
            deliveryZoneId: selectedZoneId,
            deliveryZoneName: selectedZoneObj?.name,
            deliveryAddress: deliveryAddress.trim(),
            deliveryLandmark: deliveryLandmark.trim(),
            deliveryLocation: deliveryLocation || undefined,
            latitude: customerCoords?.lat,
            longitude: customerCoords?.lng,
            distanceMeters: distanceResult?.distanceMeters,
            distanceFormatted: distanceResult?.distanceFormatted,
            calculatedDeliveryFee: distanceResult?.deliveryFee,
            locationConfirmed: Boolean(customerCoords),
          });
        }
      }

      const voiceNote = customerVoiceNote
        ? await new Promise<{ mime_type: string; data_base64: string }>((resolve, reject) => {
            const reader = new FileReader();
            reader.onerror = () => reject(new Error('La note vocale ne peut pas être lue.'));
            reader.onload = () => {
              const dataUrl = String(reader.result || '');
              const comma = dataUrl.indexOf(',');
              if (comma < 0) reject(new Error('Format de note vocale invalide.'));
              else resolve({ mime_type: customerVoiceNote.type || 'audio/webm', data_base64: dataUrl.slice(comma + 1) });
            };
            reader.readAsDataURL(customerVoiceNote);
          })
        : undefined;

      // Create the order with distance metadata
      const result = await store.createOrder({
        customer_id: customerId,
        customer_name: customerName.trim(),
        customer_phone: formattedPhone,
        customer_email: customerEmail.trim() || undefined,
        delivery_zone_id: selectedZoneId,
        delivery_address: deliveryAddress.trim(),
        delivery_landmark: deliveryLandmark.trim() || undefined,
        delivery_location: deliveryLocation,
        order_type: orderType,
        customer_note: customerNote.trim() || undefined,
        customer_voice_note: voiceNote,
        custom_delivery_fee: distanceResult ? distanceResult.deliveryFee : undefined,
        customer_latitude: customerCoords?.lat,
        customer_longitude: customerCoords?.lng,
        delivery_distance_meters: distanceResult?.distanceMeters,
        delivery_distance_text: distanceResult?.distanceFormatted,
        delivery_fee_calculation_mode: distanceResult ? 'gps_distance' : 'zone_fixed',
      });

      setIsSubmitting(false);

      if (result.success && result.order) {
        onOrderSuccess(result.order);
      } else {
        setErrorMessage(result.error || 'Une erreur est survenue lors de la validation.');
      }
    } catch (err) {
      console.error('Order creation error:', err);
      setIsSubmitting(false);
      setErrorMessage('Une erreur technique est survenue. Veuillez réessayer.');
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden my-4 flex flex-col max-h-[92vh] relative animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-neutral-200 flex items-center justify-between bg-neutral-50 shrink-0">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-rose-600 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Commande Ola Ice · Frais mesurés par distance GPS</span>
            </div>
            <h2 className="font-display font-black text-xl text-neutral-900">
              Finaliser ma commande de fraîcheur
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-neutral-200 text-neutral-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* If cart is empty */}
        {pricing.itemCount === 0 ? (
          <div className="p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <ShoppingBag className="w-8 h-8" />
            </div>
            <h3 className="font-display font-bold text-lg text-neutral-900">
              Votre panier est vide
            </h3>
            <p className="text-xs text-neutral-500 max-w-sm mx-auto">
              Ajoutez au moins un yaourt Groto, une glace ou un jus à partir de 100 F CFA pour passer votre commande.
            </p>
            <button
              onClick={onClose}
              className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition-colors"
            >
              Voir la carte des produits
            </button>
          </div>
        ) : (
          /* Content Form */
          <form
            ref={formRef}
            onSubmit={handleSubmit}
            className="overflow-y-auto p-4 sm:p-6 space-y-4"
          >
            {/* Status / Pre-fill Notice Banner */}
            {currentCustomer ? (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                    {currentCustomer.fullName ? currentCustomer.fullName[0].toUpperCase() : '✓'}
                  </div>
                  <div>
                    <div className="font-bold text-emerald-950 flex items-center gap-1.5">
                      <span>Bonjour {currentCustomer.fullName} !</span>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    </div>
                    <div className="text-emerald-700 text-[11px] leading-tight">
                      Vos adresses et coordonnées enregistrées sont automatiquement pré-remplies.
                    </div>
                  </div>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full shrink-0">
                  Profil connecté
                </span>
              </div>
            ) : (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-amber-900">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    <strong>Commande Rapide :</strong> Remplissez vos coordonnées. Votre compte sera mémorisé sans mot de passe !
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowQuickLogin(!showQuickLogin)}
                  className="text-rose-600 font-bold hover:underline shrink-0 text-left sm:text-right"
                >
                  {showQuickLogin ? 'Masquer la connexion' : 'Déjà un compte ? Se connecter'}
                </button>
              </div>
            )}

            {/* Quick Inline Login Accordion */}
            {showQuickLogin && !currentCustomer && (
              <div className="p-3.5 bg-neutral-100 rounded-2xl border border-neutral-300 space-y-2.5 animate-in slide-in-from-top-2 duration-150">
                <div className="text-xs font-bold text-neutral-800 flex items-center gap-1.5">
                  <LogIn className="w-3.5 h-3.5 text-rose-600" />
                  <span>Retrouver mon compte et mes adresses enregistrées</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="tel"
                    value={quickLoginPhone}
                    onChange={(e) => setQuickLoginPhone(e.target.value)}
                    placeholder="Ex: 01 41 40 41 11"
                    className="flex-1 px-3 py-2 text-xs rounded-xl border border-neutral-300 bg-white font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleQuickLogin}
                    className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shrink-0 transition-colors"
                  >
                    Charger mes infos
                  </button>
                </div>
                {quickLoginMsg && (
                  <p className="text-[11px] text-emerald-700 font-semibold">{quickLoginMsg}</p>
                )}
              </div>
            )}

            {/* GPS Geolocation & Distance Calculation Card */}
            <div className="p-4 bg-gradient-to-br from-rose-50/70 via-amber-50/50 to-neutral-50 rounded-2xl border border-rose-200/80 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0">
                    <Navigation className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-xs text-neutral-900 flex items-center gap-1.5">
                      <span>Calcul de la distance boutique & frais réels</span>
                      <span className="text-[10px] bg-rose-100 text-rose-700 px-1.5 py-0.2 rounded font-mono">
                        Google Maps
                      </span>
                    </h3>
                    <p className="text-[11px] text-neutral-600">
                      Boutique Ola Ice ({OLA_ICE_SHOP.city}) : 50 F (&lt;500m), 100 F (500m-1km), 200 F (1km+)
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleLocateMe}
                  disabled={isLocating}
                  className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 disabled:bg-neutral-300 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 shrink-0 self-start sm:self-auto cursor-pointer"
                >
                  {isLocating ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Recherche GPS...</span>
                    </>
                  ) : distanceResult ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Actualiser ma position</span>
                    </>
                  ) : (
                    <>
                      <Navigation className="w-3.5 h-3.5" />
                      <span>Allumer ma localisation GPS</span>
                    </>
                  )}
                </button>
              </div>

              {/* Inaccurate location warning banner for desktop */}
              {distanceResult && isLikelyInaccurateDesktopLocation(distanceResult.distanceMeters) && (
                <div className="p-3 bg-amber-500/10 border-2 border-amber-400 rounded-xl space-y-1.5 animate-in fade-in duration-150">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-xs text-amber-950 block">
                        Position à distance élevée détectée ({distanceResult.distanceFormatted})
                      </span>
                      <p className="text-[11px] text-amber-900 leading-snug">
                        Sur ordinateur Windows, votre adresse IP a pu vous situer à Porto-Novo au lieu de Bohicon/Abomey. Cliquez ci-dessous pour pointer votre vraie position !
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAdjustingMap(true);
                      if (!customerCoords || isLikelyInaccurateDesktopLocation(distanceResult.distanceMeters)) {
                        handleSelectMapCoords({
                          lat: OLA_ICE_SHOP.lat + 0.0005,
                          lng: OLA_ICE_SHOP.lng + 0.0005,
                        });
                      }
                    }}
                    className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <MousePointerClick className="w-3.5 h-3.5" />
                    <span>Google a mal calculé ma position · Pointer sur la carte</span>
                  </button>
                </div>
              )}

              {/* Distance Result & Interactive Map */}
              {distanceResult && customerCoords && (
                <div className="space-y-2 pt-1 animate-in fade-in duration-200">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 bg-white rounded-xl border border-neutral-200 shadow-2xs">
                      <span className="text-neutral-500 block text-[10px] uppercase font-bold">
                        Distance calculée
                      </span>
                      <span className="font-mono font-bold text-neutral-900 text-sm">
                        {distanceResult.distanceFormatted}
                      </span>
                    </div>

                    <div className="p-2.5 bg-white rounded-xl border border-emerald-300 shadow-2xs">
                      <span className="text-emerald-700 block text-[10px] uppercase font-bold">
                        Frais de livraison appliqués
                      </span>
                      <span className="font-mono font-black text-rose-600 text-sm">
                        {distanceResult.deliveryFee.toLocaleString('fr-FR')} F CFA
                      </span>
                    </div>
                  </div>

                  {/* Toggle button to adjust on map */}
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setIsAdjustingMap(!isAdjustingMap)}
                      className="text-xs font-bold text-rose-600 hover:text-rose-700 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <MousePointerClick className="w-3.5 h-3.5" />
                      <span>
                        {isAdjustingMap
                          ? 'Masquer le mode ajustement'
                          : 'Google a mal calculé ma position ? Ajuster sur la carte'}
                      </span>
                    </button>
                    {isAdjustingMap && (
                      <span className="text-[10px] bg-rose-100 text-rose-800 font-bold px-2 py-0.5 rounded-full">
                        Mode clic actif
                      </span>
                    )}
                  </div>

                  {/* Quick landmark chips when adjusting */}
                  {isAdjustingMap && (
                    <div className="space-y-1 p-2.5 bg-white rounded-xl border border-rose-200 shadow-2xs">
                      <div className="text-[11px] font-bold text-neutral-700 flex items-center gap-1">
                        <LocateFixed className="w-3.5 h-3.5 text-rose-600" />
                        <span>Raccourcis vers la zone de la boutique :</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {LOCAL_LANDMARK_PRESETS.map((preset) => (
                          <button
                            key={preset.name}
                            type="button"
                            onClick={() => handleSelectMapCoords({ lat: preset.lat, lng: preset.lng })}
                            className="px-2 py-0.5 bg-neutral-100 hover:bg-rose-50 hover:text-rose-700 text-neutral-700 text-[10px] rounded-lg border border-neutral-200 transition-colors cursor-pointer"
                          >
                            {preset.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Interactive Google Map */}
                  <DeliveryDistanceMap
                    customerCoords={customerCoords}
                    distanceFormatted={distanceResult.distanceFormatted}
                    deliveryFee={distanceResult.deliveryFee}
                    height={isAdjustingMap ? '250px' : '170px'}
                    interactive={isAdjustingMap}
                    onSelectCoords={handleSelectMapCoords}
                    helperText="Cliquez sur la carte ou glissez le repère bleu pour pointer votre maison"
                  />

                  {isAdjustingMap && (
                    <button
                      type="button"
                      onClick={() => setIsAdjustingMap(false)}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Confirmer cet emplacement ({distanceResult.distanceFormatted} · {distanceResult.deliveryFee} F CFA)</span>
                    </button>
                  )}
                </div>
              )}

              {/* If no GPS has been run yet: button to pick directly on map */}
              {!distanceResult && (
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      const defaultCoords = {
                        lat: OLA_ICE_SHOP.lat + 0.0005,
                        lng: OLA_ICE_SHOP.lng + 0.0005,
                      };
                      handleSelectMapCoords(defaultCoords);
                      setIsAdjustingMap(true);
                    }}
                    className="w-full py-2.5 px-3 bg-white hover:bg-neutral-50 text-neutral-700 hover:text-rose-600 rounded-xl text-xs font-bold border border-neutral-200 hover:border-rose-300 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <MousePointerClick className="w-3.5 h-3.5 text-rose-600" />
                    <span>Google a mal calculé ma position ? Choisir manuellement sur Google Maps</span>
                  </button>
                </div>
              )}

              {locationError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{locationError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const defaultCoords = {
                        lat: OLA_ICE_SHOP.lat + 0.0005,
                        lng: OLA_ICE_SHOP.lng + 0.0005,
                      };
                      handleSelectMapCoords(defaultCoords);
                      setIsAdjustingMap(true);
                      setLocationError(null);
                    }}
                    className="text-[11px] font-bold text-rose-700 hover:underline shrink-0 cursor-pointer"
                  >
                    Pointer sur la carte →
                  </button>
                </div>
              )}
            </div>

            {/* Order type selector */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700">
                Type de Commande
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setOrderType('standard')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    orderType === 'standard'
                      ? 'border-rose-600 bg-rose-50/50 text-rose-950 font-bold shadow-xs ring-1 ring-rose-600'
                      : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50'
                  }`}
                >
                  <div className="font-bold">🛍️ Détail / Consommation Directe</div>
                  <div className="text-[11px] text-neutral-500 font-normal">
                    Pots, cornets, bouteilles dès 100 F CFA
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setOrderType('wholesale')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    orderType === 'wholesale'
                      ? 'border-amber-600 bg-amber-50/50 text-amber-950 font-bold shadow-xs ring-1 ring-amber-600'
                      : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50'
                  }`}
                >
                  <div className="font-bold">📦 Tarif Gros (Revendeuse / Fête)</div>
                  <div className="text-[11px] text-neutral-500 font-normal">
                    Remises automatiques sur quantité
                  </div>
                </button>
              </div>
            </div>

            {/* Identification fields */}
            <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-neutral-700 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-neutral-500" />
                  <span>Votre Nom complet *</span>
                </label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Ex: Jean Dossou"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 bg-neutral-50"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-neutral-700 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-neutral-500" />
                  <span>Téléphone / WhatsApp pour le livreur *</span>
                </label>
                <input
                  type="tel"
                  required
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="Ex: 01 41 40 41 11 ou 97 XX XX XX"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-rose-500 bg-neutral-50"
                />
              </div>
            </div>

            {/* Email (Optional) */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-neutral-500">
                Email (Optionnel - pour reçu numérique)
              </label>
              <input
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="Ex: client@gmail.com"
                className="w-full px-3.5 py-2 rounded-xl border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 bg-neutral-50"
              />
            </div>

            {/* Delivery Zone / Mode Selection */}
            {!distanceResult && (
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-rose-600" />
                  <span>Zone de livraison habituelle (ou activez le GPS ci-dessus) *</span>
                </label>
                <select
                  value={selectedZoneId}
                  onChange={(e) => setSelectedZoneId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white"
                >
                  {zones.map((zone) => (
                    <option key={zone.id} value={zone.id}>
                      {zone.name} —{' '}
                      {zone.delivery_fee === 0
                        ? 'Gratuit'
                        : `${zone.delivery_fee.toLocaleString('fr-FR')} F CFA`}{' '}
                      ({zone.estimated_duration})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Location Context Selector (Home vs Work vs Custom) */}
            <div className="space-y-2 pt-2 border-t border-neutral-200/80">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-800 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-rose-600" />
                  <span>Lieu de livraison pour cette commande *</span>
                </label>
                {currentCustomer && (
                  <span className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    Pré-rempli · 100% modifiable
                  </span>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => handleSwitchLocationContext('home')}
                  className={`p-2.5 rounded-xl border text-center font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 cursor-pointer ${
                    locationContext === 'home'
                      ? 'border-rose-600 bg-rose-50 text-rose-900 shadow-xs ring-1 ring-rose-600'
                      : 'border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50'
                  }`}
                >
                  <Home className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>🏠 Domicile</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSwitchLocationContext('work')}
                  className={`p-2.5 rounded-xl border text-center font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 cursor-pointer ${
                    locationContext === 'work'
                      ? 'border-sky-600 bg-sky-50 text-sky-900 shadow-xs ring-1 ring-sky-600'
                      : 'border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50'
                  }`}
                >
                  <Briefcase className="w-4 h-4 text-sky-600 shrink-0" />
                  <span>💼 Au boulot</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSwitchLocationContext('custom')}
                  className={`p-2.5 rounded-xl border text-center font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 cursor-pointer ${
                    locationContext === 'custom'
                      ? 'border-amber-600 bg-amber-50 text-amber-900 shadow-xs ring-1 ring-amber-600'
                      : 'border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50'
                  }`}
                >
                  <MapPin className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>📍 Autre lieu</span>
                </button>
              </div>

              {/* Context banner for work or custom location */}
              {locationContext === 'work' && (
                <div className="p-2.5 bg-sky-50 border border-sky-200 rounded-xl text-xs text-sky-950 flex items-start justify-between gap-2 animate-in fade-in duration-150">
                  <div className="flex items-start gap-2">
                    <Building2 className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Vous commandez depuis votre lieu de travail</span>
                      <p className="text-[11px] text-sky-800">
                        Indiquez le nom de l'entreprise, du bureau ou du service. N'hésitez pas à cliquer sur "Ajuster sur la carte" ci-dessus pour recalculer les frais exacts pour votre bureau.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAdjustingMap(true)}
                    className="px-2 py-1 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-[10px] font-bold shrink-0 transition-colors cursor-pointer"
                  >
                    Ajuster GPS
                  </button>
                </div>
              )}

              {locationContext === 'custom' && (
                <div className="p-2 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Indiquez l'adresse de destination pour cette commande spécifique.</span>
                </div>
              )}
            </div>

            <BeninLocationSelector
              value={deliveryLocation}
              onChange={setDeliveryLocation}
              required
            />

            {/* Detailed Address and Landmark */}
            <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-neutral-700">
                  {locationContext === 'work'
                    ? 'Adresse ou Entreprise / Bureau *'
                    : 'Adresse détaillée de la maison *'}
                </label>
                <div>
                  <GooglePlaceAddressInput
                    value={deliveryAddress}
                    onChange={setDeliveryAddress}
                    onSelect={(address, coords) => {
                      setDeliveryAddress(address);
                      setCustomerCoords(coords);
                      setDistanceResult(computeDistanceToShop(coords.lat, coords.lng));
                    }}
                    placeholder={
                    locationContext === 'work'
                      ? 'Ex: Agence BOA, étage 2, bureau 14 / Société X'
                      : 'Ex: Rue 12, maison blanche avec portail bleu'
                    }
                  />
                  {!import.meta.env.VITE_GOOGLE_MAPS_API_KEY && <p className="mt-1 text-[10px] text-neutral-400">Saisie Google Maps indisponible tant que la clé n’est pas configurée.</p>}
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-neutral-700">
                  Point de repère (très utile pour le livreur moto)
                </label>
                <textarea
                  rows={2}
                  value={deliveryLandmark}
                  onChange={(e) => setDeliveryLandmark(e.target.value)}
                  placeholder={
                    locationContext === 'work'
                      ? 'Ex: Face au carrefour, entrée gardiennage...'
                      : 'Ex: En face de la pharmacie, portail noir...'
                  }
                  className="w-full px-3.5 py-2 rounded-xl border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 bg-neutral-50"
                />
              </div>
            </div>

            {/* Checkbox to remember address in profile */}
            {currentCustomer && (
              <div className="flex items-center justify-between text-xs pt-0.5">
                <label className="flex items-center gap-2 cursor-pointer text-neutral-700 font-medium select-none">
                  <input
                    type="checkbox"
                    checked={saveToProfile}
                    onChange={(e) => setSaveToProfile(e.target.checked)}
                    className="w-4 h-4 text-rose-600 rounded border-neutral-300 focus:ring-rose-500 cursor-pointer"
                  />
                  <span>
                    {locationContext === 'work'
                      ? 'Enregistrer cette adresse comme lieu de travail (boulot) dans mon profil'
                      : 'Mettre à jour mon profil avec cette adresse pour mes prochaines commandes'}
                  </span>
                </label>
              </div>
            )}

            {/* Delivery Note */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-neutral-500">
                Note spéciale ou consigne (Optionnel)
              </label>
              <input
                type="text"
                value={customerNote}
                onChange={(e) => setCustomerNote(e.target.value)}
                placeholder="Ex: Prévoir de la monnaie sur 5 000 F..."
                className="w-full px-3.5 py-2 rounded-xl border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 bg-neutral-50"
              />
            </div>

            <VoiceNoteRecorder onChange={setCustomerVoiceNote} />

            {/* Financial Summary */}
            <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-2">
              <div className="flex justify-between text-xs text-neutral-600">
                <span>Articles ({pricing.itemCount}) :</span>
                <span className="font-mono tabular-nums">
                  {pricing.subtotal.toLocaleString('fr-FR')} F CFA
                </span>
              </div>

              {pricing.discountAmount > 0 && (
                <div className="flex justify-between text-xs text-amber-700 font-semibold">
                  <span>Remise Vente en Gros :</span>
                  <span className="font-mono tabular-nums">
                    -{pricing.discountAmount.toLocaleString('fr-FR')} F CFA
                  </span>
                </div>
              )}

              <div className="flex justify-between text-xs text-neutral-600">
                <span>
                  Frais de livraison{' '}
                  {distanceResult
                    ? `(Mesuré GPS : ${distanceResult.distanceFormatted})`
                    : `(${selectedZone?.estimated_duration || 'Zone'})`}
                  :
                </span>
                <span className="font-mono tabular-nums font-bold text-neutral-900">
                  {pricing.deliveryFee === 0
                    ? 'Gratuit'
                    : `${pricing.deliveryFee.toLocaleString('fr-FR')} F CFA`}
                </span>
              </div>

              <div className="pt-2 border-t border-neutral-200 flex justify-between items-baseline">
                <span className="font-bold text-sm text-neutral-900">
                  Total en Espèces à payer au livreur :
                </span>
                <span className="font-mono font-black text-xl text-rose-600 tabular-nums">
                  {pricing.total.toLocaleString('fr-FR')}{' '}
                  <span className="text-xs font-sans font-medium text-neutral-600">F CFA</span>
                </span>
              </div>
            </div>

            {/* Error right above the button if any */}
            {errorMessage && (
              <div className="p-3.5 bg-rose-50 border border-rose-300 rounded-2xl text-xs text-rose-900 flex items-center gap-2 font-medium animate-in shake duration-200">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Action submit button */}
            <div className="pt-1">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 bg-rose-600 hover:bg-rose-700 disabled:bg-neutral-400 text-white font-bold rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 text-base active:scale-98 cursor-pointer disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Validation de votre commande...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-5 h-5" />
                    <span>Confirmer ma commande (Paiement à la livraison)</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
              <div className="flex items-center justify-center gap-2 text-[11px] text-neutral-500 pt-2">
                <Banknote className="w-3.5 h-3.5 text-emerald-600" />
                <span>Paiement 100% en espèces à la livraison par notre coursier moto</span>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
