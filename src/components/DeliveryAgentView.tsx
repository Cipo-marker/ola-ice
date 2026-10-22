import React, { useState, useEffect, useRef } from 'react';
import { store } from '../services/store';
import { authService, StaffUser } from '../services/auth';
import { DeliveryDistanceMap } from './DeliveryDistanceMap';
import { computeHaversineDistance } from '../services/distanceService';
import {
  Truck,
  Phone,
  MapPin,
  Banknote,
  CheckCircle,
  AlertTriangle,
  X,
  Lock,
  LogOut,
  Navigation,
  Compass,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  Loader2,
  Radio,
  Map as MapIcon,
} from 'lucide-react';

interface DeliveryAgentViewProps {
  onBackToStore: () => void;
  onOpenLogin: () => void;
  onLogout: () => void;
}

export const DeliveryAgentView: React.FC<DeliveryAgentViewProps> = ({
  onBackToStore,
  onOpenLogin,
  onLogout,
}) => {
  const currentUser: StaffUser | null = authService.getCurrentUser();
  const isAuthorized = authService.isDelivery() || authService.isAdmin();

  const orders = store.getOrders();
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [failingOrderId, setFailingOrderId] = useState<string | null>(null);

  // Live Courier Geolocation state
  const [courierCoords, setCourierCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isGpsActive, setIsGpsActive] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [expandedMapOrderId, setExpandedMapOrderId] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Toggle courier live GPS tracking
  const handleToggleGps = () => {
    if (isGpsActive) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setIsGpsActive(false);
      showToast('📡 Localisation GPS livreur désactivée');
      return;
    }

    if (!navigator.geolocation) {
      setGpsError("La géolocalisation n'est pas supportée par votre navigateur.");
      return;
    }

    setIsLocating(true);
    setGpsError(null);

    // Initial get
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCourierCoords(coords);
        setIsLocating(false);
        setIsGpsActive(true);
        showToast('📍 GPS Livreur activé avec succès en direct !');

        // Start continuous watch
        watchIdRef.current = navigator.geolocation.watchPosition(
          (watchPos) => {
            setCourierCoords({
              lat: watchPos.coords.latitude,
              lng: watchPos.coords.longitude,
            });
          },
          (err) => {
            console.warn('Watch error:', err.message);
          },
          {
            enableHighAccuracy: true,
            maximumAge: 5000,
            timeout: 10000,
          }
        );
      },
      (err) => {
        setIsLocating(false);
        setGpsError(
          "Impossible d'activer votre localisation. Vérifiez que le GPS de votre téléphone/navigateur est allumé."
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
      }
    );
  };

  // Clean up watcher on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // If not logged in as delivery or admin, display authentication gate
  if (!isAuthorized || !currentUser) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 sm:p-8 bg-white rounded-3xl border border-neutral-200 shadow-xl text-center space-y-4 animate-in fade-in duration-200">
        <div className="w-16 h-16 bg-sky-50 text-sky-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
          <Truck className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <h2 className="font-display font-black text-2xl text-neutral-900">Espace Coursier Moto</h2>
          <p className="text-xs sm:text-sm text-neutral-500 max-w-xs mx-auto leading-relaxed">
            Cet espace est strictement réservé aux livreurs Ola Ice pour la gestion des courses
            terrain et l'encaissement des espèces.
          </p>
        </div>

        <button
          onClick={onOpenLogin}
          className="w-full py-3.5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-2xl text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
        >
          <Lock className="w-4 h-4" />
          <span>S'identifier avec mon PIN Livreur</span>
        </button>

        <button
          onClick={onBackToStore}
          className="text-xs text-neutral-500 hover:text-neutral-800 font-semibold cursor-pointer"
        >
          ← Revenir à la boutique client
        </button>
      </div>
    );
  }

  const driverName = currentUser.name;

  const activeDeliveries = orders.filter((o) => {
    const isOut = o.order_status === 'OUT_FOR_DELIVERY';
    const isReady = o.order_status === 'READY';
    const isAssignedToMe =
      o.delivery_agent_name && o.delivery_agent_name.includes(driverName.split(' ')[0]);
    const isUnassigned = !o.delivery_agent_name || o.delivery_agent_name.trim() === '';

    if (currentUser.role === 'admin') {
      return isOut || isReady;
    }

    return (isOut && isAssignedToMe) || (isReady && (isAssignedToMe || isUnassigned));
  });

  const handleMarkDelivered = async (orderId: string) => {
    const res = await store.updateOrderStatus(
      orderId,
      'DELIVERED',
      driverName,
      `Colis remis en main propre par ${driverName} et montant en espèces encaissé.`
    );
    if (!res.success) {
      showToast(`⚠️ Erreur : ${res.error}`);
    } else {
      showToast('🎉 Commande livrée et espèces encaissées avec succès !');
    }
  };

  const handleConfirmFailed = async (orderId: string, reason: string) => {
    const res = await store.updateOrderStatus(
      orderId,
      'FAILED_DELIVERY',
      driverName,
      `Échec signalé par ${driverName} : ${reason}`
    );
    if (!res.success) {
      showToast(`⚠️ Erreur : ${res.error}`);
      return;
    }
    setFailingOrderId(null);
    showToast('⚠️ Incident de livraison enregistré.');
  };

  const handleTakeDelivery = async (orderId: string) => {
    const res = await store.updateOrderStatus(
      orderId,
      'OUT_FOR_DELIVERY',
      driverName,
      `Prise en charge à l'atelier par ${driverName}, départ immédiat en tournée.`,
      driverName
    );
    if (!res.success) {
      showToast(`⚠️ Erreur : ${res.error}`);
    } else {
      showToast(`🛵 Course assignée à ${driverName.split(' ')[0]} !`);
      setExpandedMapOrderId(orderId);
      // Automatically prompt to enable GPS if not yet active
      if (!isGpsActive) {
        handleToggleGps();
      }
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-4 py-6 sm:py-8 space-y-5 animate-in fade-in duration-200">
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-neutral-900 text-white text-xs sm:text-sm font-semibold px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-neutral-700 animate-in slide-in-from-bottom-3 duration-200">
          <span>{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="text-neutral-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Driver session header banner */}
      <div className="bg-gradient-to-r from-sky-600 to-sky-700 text-white p-5 sm:p-6 rounded-3xl shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center shadow-inner">
              <Truck className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wider text-sky-200 font-bold">
                Session Livreur Active · Ola Ice
              </div>
              <h1 className="font-display font-black text-xl sm:text-2xl text-white">
                {driverName}
              </h1>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-black/20 hover:bg-black/30 rounded-xl text-xs font-semibold text-sky-100 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Déconnexion</span>
          </button>
        </div>

        {/* Live GPS Tracker Controller Card for Courier */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 sm:p-4 border border-white/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-3.5 h-3.5 rounded-full shrink-0 ${
                isGpsActive ? 'bg-emerald-400 animate-ping' : 'bg-neutral-300'
              }`}
            />
            <div>
              <div className="font-bold flex items-center gap-1.5">
                <span>GPS Livreur en direct :</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    isGpsActive ? 'bg-emerald-500 text-neutral-950' : 'bg-black/30 text-white'
                  }`}
                >
                  {isGpsActive ? 'Actif (En route)' : 'Désactivé'}
                </span>
              </div>
              <p className="text-sky-100 text-[11px] mt-0.5">
                {courierCoords
                  ? `Position détectée : ${courierCoords.lat.toFixed(5)}, ${courierCoords.lng.toFixed(5)}`
                  : 'Activez votre GPS pour comparer votre position à celle du client en temps réel.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleToggleGps}
            disabled={isLocating}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all shadow-md flex items-center justify-center gap-2 shrink-0 cursor-pointer ${
              isGpsActive
                ? 'bg-rose-500 hover:bg-rose-600 text-white'
                : 'bg-emerald-400 hover:bg-emerald-300 text-neutral-950 font-black'
            }`}
          >
            {isLocating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Connexion satellite...</span>
              </>
            ) : isGpsActive ? (
              <>
                <Radio className="w-4 h-4 animate-pulse text-white" />
                <span>Désactiver le GPS</span>
              </>
            ) : (
              <>
                <Navigation className="w-4 h-4" />
                <span>Allumer ma localisation Livreur</span>
              </>
            )}
          </button>
        </div>

        {gpsError && (
          <div className="p-2.5 bg-rose-500/20 border border-rose-300/40 rounded-xl text-xs text-rose-100 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-300 shrink-0" />
            <span>{gpsError}</span>
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-sky-100 border-t border-white/20 pt-2.5">
          <span>
            Secteur : <strong>{currentUser.assignedZone || 'Bohicon / Abomey'}</strong>
          </span>
          <span className="font-mono bg-sky-800/80 px-2.5 py-0.5 rounded-full text-[11px] font-bold">
            {activeDeliveries.length} course{activeDeliveries.length > 1 ? 's' : ''} en attente
          </span>
        </div>
      </div>

      {/* Deliveries list */}
      <div className="space-y-4">
        {activeDeliveries.length === 0 ? (
          <div className="p-8 sm:p-12 text-center bg-white rounded-3xl border border-neutral-200 space-y-3 shadow-xs">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle className="w-7 h-7" />
            </div>
            <h3 className="font-display font-black text-lg text-neutral-800">
              Aucune course en attente
            </h3>
            <p className="text-xs sm:text-sm text-neutral-500 max-w-xs mx-auto">
              Toutes les livraisons attribuées sont terminées. Les nouvelles commandes prêtes
              apparaîtront automatiquement dès confirmation.
            </p>
          </div>
        ) : (
          activeDeliveries.map((order) => {
            const isAssigned =
              order.delivery_agent_name &&
              order.delivery_agent_name.includes(driverName.split(' ')[0]);

            const hasCustomerCoords =
              Boolean(order.customer_latitude && order.customer_longitude);

            const customerCoords = hasCustomerCoords
              ? { lat: order.customer_latitude!, lng: order.customer_longitude! }
              : null;

            // Live remaining distance between courier and this customer
            const distanceToClientMeters =
              courierCoords && customerCoords
                ? computeHaversineDistance(
                    courierCoords.lat,
                    courierCoords.lng,
                    customerCoords.lat,
                    customerCoords.lng
                  )
                : null;

            const isArrivedAtClient =
              distanceToClientMeters !== null && distanceToClientMeters <= 50;

            const isMapExpanded = expandedMapOrderId === order.id;

            return (
              <div
                key={order.id}
                className={`bg-white rounded-3xl border transition-all p-5 shadow-sm space-y-4 ${
                  isArrivedAtClient
                    ? 'border-emerald-400 ring-2 ring-emerald-200'
                    : 'border-neutral-200 hover:border-neutral-300'
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2 border-b border-neutral-100 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-base text-neutral-900">
                        {order.order_number}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          order.order_status === 'OUT_FOR_DELIVERY'
                            ? 'bg-sky-100 text-sky-800 animate-pulse'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {order.order_status === 'OUT_FOR_DELIVERY' ? 'En livraison' : 'Prête en boutique'}
                      </span>
                    </div>
                    <span className="text-xs text-neutral-500 font-medium">
                      {order.order_type === 'wholesale'
                        ? '📦 Vente en Gros (Revendeuse)'
                        : '🛍️ Commande Particulier'}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-bold uppercase tracking-wider text-neutral-500 block">
                      Espèces à encaisser
                    </span>
                    <span className="font-mono font-black text-lg text-rose-600">
                      {order.total.toLocaleString('fr-FR')} F CFA
                    </span>
                  </div>
                </div>

                {/* Customer and destination info */}
                <div className="space-y-2 text-xs sm:text-sm text-neutral-700">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-neutral-900">{order.customer_name}</span>
                      <a
                        href={`tel:${order.customer_phone}`}
                        className="px-2.5 py-1 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 rounded-lg font-mono font-bold text-xs flex items-center gap-1 cursor-pointer"
                      >
                        <Phone className="w-3 h-3 text-emerald-600" />
                        <span>{order.customer_phone}</span>
                      </a>
                    </div>

                    {hasCustomerCoords && (
                      <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-emerald-600" />
                        <span>GPS Enregistré</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-start gap-1.5 text-neutral-600">
                    <MapPin className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold text-neutral-900">
                        {order.delivery_zone_name}
                      </div>
                      <div>{order.delivery_address}</div>
                      {order.delivery_landmark && (
                        <div className="text-xs text-amber-800 bg-amber-50 px-2 py-0.5 rounded mt-1 inline-block font-medium">
                          Repère : {order.delivery_landmark}
                        </div>
                      )}
                    </div>
                  </div>

                  {order.delivery_distance_text && (
                    <div className="text-xs text-neutral-500 flex items-center gap-1.5">
                      <span>Distance boutique-client calculée :</span>
                      <strong className="text-neutral-800 font-mono">
                        {order.delivery_distance_text}
                      </strong>
                    </div>
                  )}

                  {order.customer_note && (
                    <div className="p-2.5 bg-neutral-50 rounded-xl text-xs text-neutral-600 italic border border-neutral-200/60">
                      Note client : « {order.customer_note} »
                    </div>
                  )}
                  {order.customer_voice_note_available && (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 p-2.5 space-y-1.5">
                      <div className="text-[11px] font-bold text-rose-900">Écouter le repère vocal de la maison</div>
                      <audio controls preload="none" className="h-10 w-full" src={`/api/orders/${encodeURIComponent(order.id)}/voice-note`}>
                        Votre navigateur ne peut pas lire cette note vocale.
                      </audio>
                    </div>
                  )}
                </div>

                {/* LIVE COURIER vs CUSTOMER MAP SECTION */}
                <div className="space-y-2 pt-1 border-t border-neutral-100">
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setExpandedMapOrderId(isMapExpanded ? null : order.id)}
                      className="text-xs font-bold text-sky-700 hover:text-sky-800 flex items-center gap-1.5 cursor-pointer"
                    >
                      <MapIcon className="w-3.5 h-3.5" />
                      <span>
                        {isMapExpanded
                          ? 'Masquer la carte interactive'
                          : '🗺️ Vérifier ma position et celle du client sur la carte'}
                      </span>
                    </button>

                    {customerCoords && (
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${customerCoords.lat},${customerCoords.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] font-bold text-rose-600 hover:underline flex items-center gap-1 cursor-pointer"
                        title="Lancer l'itinéraire GPS sur l'application Google Maps"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Itinéraire GPS Moto</span>
                      </a>
                    )}
                  </div>

                  {/* Proximity alert if courier is close */}
                  {distanceToClientMeters !== null && (
                    <div
                      className={`p-3 rounded-2xl flex items-center justify-between gap-2 text-xs font-bold transition-all ${
                        isArrivedAtClient
                          ? 'bg-emerald-500 text-white shadow-md animate-pulse'
                          : 'bg-sky-50 border border-sky-200 text-sky-950'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {isArrivedAtClient ? (
                          <CheckCircle2 className="w-5 h-5 text-white shrink-0" />
                        ) : (
                          <Compass className="w-5 h-5 text-sky-600 shrink-0 animate-spin" />
                        )}
                        <div>
                          {isArrivedAtClient ? (
                            <span>🎯 Vous êtes arrivé chez le client (&lt; 50 m) !</span>
                          ) : (
                            <span>
                              Distance restante :{' '}
                              <strong className="font-mono text-sm">
                                {distanceToClientMeters < 1000
                                  ? `${distanceToClientMeters} m`
                                  : `${(distanceToClientMeters / 1000).toFixed(2)} km`}
                              </strong>
                            </span>
                          )}
                          <div className="text-[10px] font-normal opacity-90">
                            {isArrivedAtClient
                              ? 'Remettez les produits frais et encaissez le montant en espèces.'
                              : 'Votre position GPS en direct est synchronisée avec le client.'}
                          </div>
                        </div>
                      </div>

                      {!isGpsActive && (
                        <button
                          type="button"
                          onClick={handleToggleGps}
                          className="px-2.5 py-1 bg-sky-600 text-white rounded-lg text-[10px] font-bold cursor-pointer"
                        >
                          Actualiser
                        </button>
                      )}
                    </div>
                  )}

                  {/* Expanded Interactive Map showing Both Pins */}
                  {isMapExpanded && (
                    <div className="space-y-2 animate-in fade-in duration-200">
                      <DeliveryDistanceMap
                        customerCoords={customerCoords}
                        courierCoords={courierCoords}
                        courierName={driverName}
                        customerName={order.customer_name}
                        distanceFormatted={order.delivery_distance_text}
                        deliveryFee={order.delivery_fee}
                        height="260px"
                      />

                      <div className="flex flex-wrap items-center justify-between text-[11px] text-neutral-500 px-1">
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1">
                            <span className="w-2.5 h-2.5 rounded-full bg-rose-600" />
                            <span>Boutique</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="w-2.5 h-2.5 rounded-full bg-sky-600" />
                            <span>Client</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                            <span>Vous (Livreur)</span>
                          </span>
                        </div>

                        {!isGpsActive && (
                          <button
                            type="button"
                            onClick={handleToggleGps}
                            className="font-bold text-sky-600 hover:underline cursor-pointer"
                          >
                            + Activer mon GPS livreur
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Content preview */}
                <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-100 space-y-1 text-xs">
                  <div className="font-bold text-neutral-700">Contenu de la commande :</div>
                  {order.items.map((it) => (
                    <div key={it.id} className="flex justify-between text-neutral-600">
                      <span>
                        {it.quantity}× {it.product_name} ({it.variant_name})
                      </span>
                      <span className="font-mono font-semibold">
                        {it.total_price.toLocaleString('fr-FR')} F
                      </span>
                    </div>
                  ))}
                </div>

                {/* Action buttons */}
                <div className="pt-1 flex flex-col sm:flex-row gap-2">
                  {order.order_status === 'READY' && (
                    <button
                      onClick={() => handleTakeDelivery(order.id)}
                      className="w-full py-3 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-2xl text-xs sm:text-sm transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Truck className="w-4 h-4" />
                      <span>Prendre en charge cette course (Départ)</span>
                    </button>
                  )}

                  {order.order_status === 'OUT_FOR_DELIVERY' && isAssigned && (
                    <>
                      <button
                        onClick={() => handleMarkDelivered(order.id)}
                        className={`flex-1 py-3 text-white font-bold rounded-2xl text-xs sm:text-sm transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer ${
                          isArrivedAtClient
                            ? 'bg-emerald-600 hover:bg-emerald-700 ring-2 ring-emerald-300 animate-pulse'
                            : 'bg-emerald-600 hover:bg-emerald-700'
                        }`}
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>
                          Confirmer la remise & Encaisser {order.total.toLocaleString('fr-FR')} F
                        </span>
                      </button>

                      <button
                        onClick={() => setFailingOrderId(order.id)}
                        className="py-3 px-4 bg-neutral-100 hover:bg-rose-50 text-neutral-700 hover:text-rose-700 rounded-2xl text-xs font-bold transition-all border border-neutral-200 cursor-pointer"
                      >
                        Signaler Incident
                      </button>
                    </>
                  )}
                </div>

                {/* Incident reporting panel */}
                {failingOrderId === order.id && (
                  <div className="p-4 bg-rose-50 rounded-2xl border border-rose-200 space-y-3 animate-in fade-in duration-150">
                    <div className="font-bold text-rose-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                      <span>Motif de l'impossibilité de livrer :</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <button
                        onClick={() =>
                          handleConfirmFailed(order.id, 'Client injoignable au téléphone')
                        }
                        className="p-2.5 bg-white hover:bg-rose-100 text-rose-900 font-semibold rounded-xl border border-rose-200 text-left transition-colors cursor-pointer"
                      >
                        Client injoignable
                      </button>
                      <button
                        onClick={() =>
                          handleConfirmFailed(order.id, 'Adresse introuvable ou client absent')
                        }
                        className="p-2.5 bg-white hover:bg-rose-100 text-rose-900 font-semibold rounded-xl border border-rose-200 text-left transition-colors cursor-pointer"
                      >
                        Client absent / Introuvable
                      </button>
                      <button
                        onClick={() =>
                          handleConfirmFailed(order.id, 'Refus de commande par le client')
                        }
                        className="p-2.5 bg-white hover:bg-rose-100 text-rose-900 font-semibold rounded-xl border border-rose-200 text-left transition-colors cursor-pointer"
                      >
                        Refus du client
                      </button>
                      <button
                        onClick={() =>
                          handleConfirmFailed(order.id, 'Client sans espèces / Report demandé')
                        }
                        className="p-2.5 bg-white hover:bg-rose-100 text-rose-900 font-semibold rounded-xl border border-rose-200 text-left transition-colors cursor-pointer"
                      >
                        Report / Pas de monnaie
                      </button>
                    </div>

                    <button
                      onClick={() => setFailingOrderId(null)}
                      className="text-xs text-neutral-500 hover:text-neutral-700 underline block text-center pt-1 cursor-pointer"
                    >
                      Annuler le signalement
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
