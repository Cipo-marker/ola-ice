import React, { useState } from 'react';
import {
  requestCurrentPosition,
  computeDistanceToShop,
  OLA_ICE_SHOP,
  LOCAL_LANDMARK_PRESETS,
  isLikelyInaccurateDesktopLocation,
  DeliveryCalculationResult,
} from '../services/distanceService';
import { DeliveryDistanceMap } from './DeliveryDistanceMap';
import {
  MapPin,
  Navigation,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ShieldCheck,
  ArrowRight,
  Info,
  X,
  MousePointerClick,
  RotateCcw,
  AlertTriangle,
  LocateFixed,
} from 'lucide-react';

interface LocationPermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLocationSuccess: (result: DeliveryCalculationResult & { latitude: number; longitude: number }) => void;
  forceMandatory?: boolean;
}

export const LocationPermissionModal: React.FC<LocationPermissionModalProps> = ({
  isOpen,
  onClose,
  onLocationSuccess,
  forceMandatory = false,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'auto' | 'manual_picker'>('auto');
  const [result, setResult] = useState<
    (DeliveryCalculationResult & { latitude: number; longitude: number }) | null
  >(null);

  // Manual interactive coords (defaults to shop if no GPS was obtained yet)
  const [manualCoords, setManualCoords] = useState<{ lat: number; lng: number }>({
    lat: OLA_ICE_SHOP.lat + 0.0006,
    lng: OLA_ICE_SHOP.lng + 0.0006,
  });

  const handleRequestLocation = async () => {
    setLoading(true);
    setError(null);

    try {
      const coords = await requestCurrentPosition();
      const calc = computeDistanceToShop(coords.latitude, coords.longitude);
      const combined = { ...calc, ...coords };
      setResult(combined);
      setManualCoords({ lat: coords.latitude, lng: coords.longitude });
      setLoading(false);
      onLocationSuccess(combined);
    } catch (err: unknown) {
      setLoading(false);
      const message = err instanceof Error ? err.message : 'Impossible de récupérer votre position GPS.';
      setError(message);
    }
  };

  // Called when user clicks or drags pin on the interactive map
  const handleMapCoordSelect = (coords: { lat: number; lng: number }) => {
    setManualCoords(coords);
    const calc = computeDistanceToShop(coords.lat, coords.lng);
    const combined = { ...calc, latitude: coords.lat, longitude: coords.lng };
    setResult(combined);
  };

  // Switch to interactive map picker
  const handleStartManualPicker = () => {
    setMode('manual_picker');
    setError(null);
    // If we don't have coords yet or if coords were > 15 km away, seed near shop
    if (!result || isLikelyInaccurateDesktopLocation(result.distanceMeters)) {
      const defaultClose = {
        lat: OLA_ICE_SHOP.lat + 0.0005,
        lng: OLA_ICE_SHOP.lng + 0.0005,
      };
      setManualCoords(defaultClose);
      const calc = computeDistanceToShop(defaultClose.lat, defaultClose.lng);
      setResult({ ...calc, latitude: defaultClose.lat, longitude: defaultClose.lng });
    }
  };

  // Validate manual position
  const handleConfirmManualLocation = () => {
    if (!result) {
      const calc = computeDistanceToShop(manualCoords.lat, manualCoords.lng);
      const combined = { ...calc, latitude: manualCoords.lat, longitude: manualCoords.lng };
      setResult(combined);
      onLocationSuccess(combined);
    } else {
      onLocationSuccess(result);
    }
    onClose();
  };

  const isInaccurate = result ? isLikelyInaccurateDesktopLocation(result.distanceMeters) : false;

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
      onClick={() => {
        if (!forceMandatory && !loading) onClose();
      }}
    >
      <div
        className="bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden border border-neutral-200 flex flex-col my-4 relative animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-rose-600 via-rose-500 to-amber-600 p-5 sm:p-6 text-white relative">
          {!forceMandatory && !loading && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          <div className="flex items-center gap-2 text-rose-100 text-xs font-bold uppercase tracking-wider mb-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Localisation GPS & Carte Interactive · Ola Ice</span>
          </div>

          <h2 className="font-display font-black text-xl sm:text-2xl text-white">
            {mode === 'manual_picker'
              ? 'Pointez votre position sur la carte'
              : 'Localisation de livraison'}
          </h2>

          <p className="text-xs sm:text-sm text-rose-100 mt-1 leading-relaxed">
            {mode === 'manual_picker'
              ? 'Cliquez directement sur la carte pour corriger votre position. Les frais sont calculés automatiquement en temps réel !'
              : "Mesurez la distance exacte jusqu'à la boutique Ola Ice pour calculer vos frais de livraison réels au franc près."}
          </p>
        </div>

        {/* Pricing Guide Card */}
        <div className="p-4 sm:p-6 space-y-4">
          <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-3 text-xs text-amber-950 space-y-1.5">
            <div className="font-bold flex items-center justify-between text-amber-900">
              <div className="flex items-center gap-1.5">
                <Info className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Barème officiel par distance (Boutique Bohicon) :</span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-[11px] pt-1">
              <div className="bg-white p-2 rounded-xl border border-amber-200 shadow-2xs">
                <div className="text-neutral-500 font-medium">&lt; 500 m</div>
                <div className="font-bold text-rose-600 font-mono">50 F CFA</div>
              </div>
              <div className="bg-white p-2 rounded-xl border border-amber-200 shadow-2xs">
                <div className="text-neutral-500 font-medium">500 m - 1 km</div>
                <div className="font-bold text-rose-600 font-mono">100 F CFA</div>
              </div>
              <div className="bg-white p-2 rounded-xl border border-amber-200 shadow-2xs">
                <div className="text-neutral-500 font-medium">À partir de 1 km</div>
                <div className="font-bold text-rose-600 font-mono">200 F CFA*</div>
              </div>
            </div>
            <p className="text-[10px] text-amber-700 leading-tight">
              * +100 F par tranche de 500 m au-delà d'1 km.
            </p>
          </div>

          {/* MODE 1: AUTO GPS VIEW */}
          {mode === 'auto' && (
            <>
              {/* Inaccurate Desktop / Windows IP Warning Banner */}
              {isInaccurate && result && (
                <div className="p-3.5 bg-amber-500/10 border-2 border-amber-400 rounded-2xl space-y-2 animate-in fade-in duration-200">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-xs text-amber-950">
                        Position inexacte détectée ({result.distanceFormatted})
                      </h4>
                      <p className="text-[11px] text-amber-900 mt-0.5 leading-snug">
                        Sur les ordinateurs Windows ou les réseaux Wi-Fi, la localisation IP situe souvent le client à <strong>Porto-Novo ou Cotonou</strong> alors que vous êtes à côté de la boutique à Bohicon/Abomey !
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleStartManualPicker}
                    className="w-full py-2.5 px-3 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <MousePointerClick className="w-4 h-4" />
                    <span>Google a mal calculé ma position · Pointer sur la carte</span>
                  </button>
                </div>
              )}

              {/* Success Result View */}
              {result && !isInaccurate && (
                <div className="space-y-3 animate-in fade-in duration-300">
                  <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs sm:text-sm">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Position calculée avec succès !</span>
                      </div>
                      <span className="text-[10px] bg-emerald-200/80 text-emerald-950 px-2 py-0.5 rounded-full font-bold">
                        {result.source === 'google_maps_geometry' ? 'Google Maps' : 'GPS'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5 text-xs">
                      <div className="bg-white p-2.5 rounded-xl border border-emerald-200">
                        <span className="text-neutral-500 block text-[10px] uppercase font-bold">
                          Distance mesurée
                        </span>
                        <strong className="text-neutral-900 font-mono text-sm">
                          {result.distanceFormatted}
                        </strong>
                      </div>
                      <div className="bg-white p-2.5 rounded-xl border border-emerald-200">
                        <span className="text-neutral-500 block text-[10px] uppercase font-bold">
                          Frais de livraison
                        </span>
                        <strong className="text-rose-600 font-mono text-sm">
                          {result.deliveryFee.toLocaleString('fr-FR')} F CFA
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Map Preview */}
                  <DeliveryDistanceMap
                    customerCoords={{ lat: result.latitude, lng: result.longitude }}
                    distanceFormatted={result.distanceFormatted}
                    deliveryFee={result.deliveryFee}
                    height="190px"
                  />

                  {/* Actions: Confirm OR Report Wrong Location */}
                  <div className="grid sm:grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleStartManualPicker}
                      className="py-2.5 px-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-xl font-bold text-xs border border-neutral-300 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <MousePointerClick className="w-3.5 h-3.5 text-rose-600" />
                      <span>Google a mal calculé ma position</span>
                    </button>

                    <button
                      type="button"
                      onClick={onClose}
                      className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span>Valider & Continuer</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-900 space-y-2 animate-in shake duration-200">
                  <div className="flex items-center gap-2 font-bold text-rose-800">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>Localisation GPS automatique indisponible</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">{error}</p>

                  <button
                    type="button"
                    onClick={handleStartManualPicker}
                    className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <MousePointerClick className="w-4 h-4" />
                    <span>Choisir moi-même ma position sur la carte Google Maps</span>
                  </button>
                </div>
              )}

              {/* Initial Action Buttons when no result yet */}
              {!result && !error && (
                <div className="space-y-3 pt-1">
                  <button
                    type="button"
                    onClick={handleRequestLocation}
                    disabled={loading}
                    className="w-full py-3.5 bg-rose-600 hover:bg-rose-700 disabled:bg-neutral-400 text-white rounded-2xl font-bold text-sm shadow-lg transition-all flex items-center justify-center gap-2 active:scale-98 cursor-pointer"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Recherche satellite GPS en cours...</span>
                      </>
                    ) : (
                      <>
                        <Navigation className="w-5 h-5" />
                        <span>Allumer ma localisation GPS & Calculer</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  <div className="relative flex py-1 items-center">
                    <div className="flex-grow border-t border-neutral-200" />
                    <span className="flex-shrink mx-3 text-neutral-400 text-[11px] font-medium">
                      OU SUR ORDINATEUR / POSITION IMPRÉCISE
                    </span>
                    <div className="flex-grow border-t border-neutral-200" />
                  </div>

                  <button
                    type="button"
                    onClick={handleStartManualPicker}
                    className="w-full py-3 bg-neutral-100 hover:bg-rose-50 text-neutral-800 hover:text-rose-700 rounded-2xl font-bold text-xs border border-neutral-300 hover:border-rose-300 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <MousePointerClick className="w-4 h-4 text-rose-600" />
                    <span>Google a mal calculé ma position ? Pointer sur Google Maps</span>
                  </button>

                  <div className="flex items-center justify-center gap-2 text-[11px] text-neutral-500 pt-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Votre position est utilisée uniquement pour acheminer votre livreur</span>
                  </div>
                </div>
              )}
            </>
          )}

          {/* MODE 2: MANUAL INTERACTIVE MAP PICKER ("Google a mal calculé ma position") */}
          {mode === 'manual_picker' && (
            <div className="space-y-3 animate-in fade-in duration-200">
              {/* Instructions banner */}
              <div className="p-3 bg-sky-50 border border-sky-200 rounded-2xl text-xs text-sky-950 flex items-start gap-2">
                <MousePointerClick className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-bold">
                    Cliquez sur la carte pour indiquer votre position exacte :
                  </strong>
                  <span className="text-[11px] text-sky-800">
                    Déplacez le repère bleu ou cliquez n'importe où. La distance à la boutique et le tarif se calculent immédiatement !
                  </span>
                </div>
              </div>

              {/* Local Area Quick Preset Chips */}
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-neutral-600 block">
                  Raccourcis rapides (Bohicon / Abomey) :
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {LOCAL_LANDMARK_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => handleMapCoordSelect({ lat: preset.lat, lng: preset.lng })}
                      className="px-2.5 py-1 rounded-xl bg-neutral-100 hover:bg-rose-50 hover:text-rose-700 text-neutral-700 text-[11px] font-medium border border-neutral-200 hover:border-rose-200 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
                      <span>{preset.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Interactive Map Component */}
              <DeliveryDistanceMap
                customerCoords={manualCoords}
                distanceFormatted={result?.distanceFormatted}
                deliveryFee={result?.deliveryFee}
                height="280px"
                interactive={true}
                onSelectCoords={handleMapCoordSelect}
                helperText="Cliquez sur la carte pour placer votre repère bleu"
              />

              {/* Live Calculation Preview */}
              {result && (
                <div className="p-3.5 bg-neutral-900 text-white rounded-2xl shadow-md flex items-center justify-between gap-3 text-xs">
                  <div>
                    <div className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">
                      Position sélectionnée
                    </div>
                    <div className="font-mono text-sm font-bold flex items-center gap-2">
                      <span className="text-amber-300">{result.distanceFormatted}</span>
                      <span className="text-neutral-500">·</span>
                      <span className="text-emerald-400">
                        {result.deliveryFee.toLocaleString('fr-FR')} F CFA
                      </span>
                    </div>
                    <div className="text-[10px] text-neutral-400">{result.bracketLabel}</div>
                  </div>

                  <button
                    type="button"
                    onClick={handleConfirmManualLocation}
                    className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-neutral-950 font-black rounded-xl text-xs transition-colors flex items-center gap-1.5 shadow-md shrink-0 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4 text-neutral-950" />
                    <span>Valider cette position</span>
                  </button>
                </div>
              )}

              {/* Bottom Navigation */}
              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => setMode('auto')}
                  className="text-xs text-neutral-500 hover:text-neutral-800 font-medium flex items-center gap-1 hover:underline cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Revenir au mode automatique</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleMapCoordSelect({
                      lat: OLA_ICE_SHOP.lat + 0.0003,
                      lng: OLA_ICE_SHOP.lng + 0.0003,
                    })
                  }
                  className="text-xs text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <LocateFixed className="w-3.5 h-3.5" />
                  <span>Placer juste à côté de la boutique (50 F)</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
