// Source: Google Maps Platform Code Assist
import React, { useEffect } from 'react';
import { APIProvider, Map, AdvancedMarker, Pin, useMap } from '@vis.gl/react-google-maps';
import { OLA_ICE_SHOP, computeHaversineDistance } from '../services/distanceService';
import { Store, Navigation, MapPin, Hand, LocateFixed, Truck, Compass, CheckCircle2 } from 'lucide-react';

interface DeliveryDistanceMapProps {
  customerCoords: { lat: number; lng: number } | null;
  courierCoords?: { lat: number; lng: number } | null;
  courierName?: string;
  customerName?: string;
  distanceFormatted?: string;
  deliveryFee?: number;
  height?: string;
  interactive?: boolean;
  onSelectCoords?: (coords: { lat: number; lng: number }) => void;
  helperText?: string;
}

// Controller component to smoothly pan map when center changes
const MapController: React.FC<{
  targetCoords: { lat: number; lng: number } | null;
}> = ({ targetCoords }) => {
  const map = useMap();

  useEffect(() => {
    if (map && targetCoords) {
      map.panTo(targetCoords);
    }
  }, [map, targetCoords?.lat, targetCoords?.lng]);

  return null;
};

export const DeliveryDistanceMap: React.FC<DeliveryDistanceMapProps> = ({
  customerCoords,
  courierCoords,
  courierName = 'Livreur Moto',
  customerName = 'Client',
  distanceFormatted,
  deliveryFee,
  height = '240px',
  interactive = false,
  onSelectCoords,
  helperText,
}) => {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

  // Calculate live distance between courier and customer if both exist
  const courierToCustomerMeters =
    courierCoords && customerCoords
      ? computeHaversineDistance(
          courierCoords.lat,
          courierCoords.lng,
          customerCoords.lat,
          customerCoords.lng
        )
      : null;

  const courierToCustomerFormatted =
    courierToCustomerMeters !== null
      ? courierToCustomerMeters < 1000
        ? `${courierToCustomerMeters} m`
        : `${(courierToCustomerMeters / 1000).toFixed(2).replace('.', ',')} km`
      : null;

  const isArrived = courierToCustomerMeters !== null && courierToCustomerMeters <= 50;

  // Center calculation
  let center = { lat: OLA_ICE_SHOP.lat, lng: OLA_ICE_SHOP.lng };
  let zoom = 15;

  if (courierCoords && customerCoords) {
    center = {
      lat: (courierCoords.lat + customerCoords.lat) / 2,
      lng: (courierCoords.lng + customerCoords.lng) / 2,
    };
    zoom = courierToCustomerMeters && courierToCustomerMeters > 3000 ? 13 : 15;
  } else if (courierCoords) {
    center = courierCoords;
    zoom = 16;
  } else if (customerCoords) {
    center = customerCoords;
    zoom = 15;
  }

  const handleMapClick = (e: { detail?: { latLng?: { lat: number; lng: number } | null } }) => {
    if (!interactive || !onSelectCoords) return;
    const lat = e.detail?.latLng?.lat;
    const lng = e.detail?.latLng?.lng;
    if (typeof lat === 'number' && typeof lng === 'number') {
      onSelectCoords({ lat, lng });
    }
  };

  const handleMarkerDragEnd = (e: unknown) => {
    if (!interactive || !onSelectCoords) return;
    const eventObj = e as {
      latLng?: { lat: () => number; lng: () => number };
      detail?: { latLng?: { lat: number; lng: number } };
    };

    if (eventObj.latLng?.lat && typeof eventObj.latLng.lat === 'function') {
      onSelectCoords({
        lat: eventObj.latLng.lat(),
        lng: eventObj.latLng.lng(),
      });
    } else if (eventObj.detail?.latLng?.lat && typeof eventObj.detail.latLng.lat === 'number') {
      onSelectCoords({
        lat: eventObj.detail.latLng.lat,
        lng: eventObj.detail.latLng.lng,
      });
    }
  };

  return (
    <div
      style={{ height, width: '100%' }}
      className={`relative rounded-2xl overflow-hidden border border-neutral-200 shadow-inner bg-neutral-100 ${
        interactive ? 'ring-2 ring-rose-500/50 cursor-crosshair' : ''
      }`}
    >
      {apiKey ? <APIProvider apiKey={apiKey} libraries={['marker', 'geometry', 'places']}>
        <Map
          defaultCenter={center}
          defaultZoom={zoom}
          disableDefaultUI={false}
          gestureHandling="cooperative"
          style={{ width: '100%', height: '100%' }}
          onClick={handleMapClick}
        >
          <MapController
            targetCoords={
              courierCoords || customerCoords || { lat: OLA_ICE_SHOP.lat, lng: OLA_ICE_SHOP.lng }
            }
          />

          {/* Shop Marker */}
          <AdvancedMarker
            position={{ lat: OLA_ICE_SHOP.lat, lng: OLA_ICE_SHOP.lng }}
            title={`${OLA_ICE_SHOP.name} (${OLA_ICE_SHOP.city})`}
          >
            <Pin background="#e11d48" glyphColor="#ffffff" borderColor="#9f1239">
              <Store className="w-3.5 h-3.5 text-white" />
            </Pin>
          </AdvancedMarker>

          {/* Customer Position Marker */}
          {customerCoords && (
            <AdvancedMarker
              position={{ lat: customerCoords.lat, lng: customerCoords.lng }}
              title={
                interactive
                  ? 'Glissez ce repère ou cliquez sur la carte'
                  : `Position client : ${customerName}`
              }
              draggable={interactive}
              onDragEnd={handleMarkerDragEnd}
            >
              <Pin background="#0284c7" glyphColor="#ffffff" borderColor="#0369a1">
                <Navigation className="w-3.5 h-3.5 text-white" />
              </Pin>
            </AdvancedMarker>
          )}

          {/* Courier Live Marker */}
          {courierCoords && (
            <AdvancedMarker
              position={{ lat: courierCoords.lat, lng: courierCoords.lng }}
              title={`Livreur en direct : ${courierName}`}
            >
              <div className="relative flex items-center justify-center">
                <span className="animate-ping absolute inline-flex h-8 w-8 rounded-full bg-emerald-400 opacity-75"></span>
                <Pin background="#059669" glyphColor="#ffffff" borderColor="#047857">
                  <Truck className="w-4 h-4 text-white" />
                </Pin>
              </div>
            </AdvancedMarker>
          )}
        </Map>
      </APIProvider> : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-rose-50 via-white to-amber-50 px-6 text-center">
          <div className="rounded-full bg-rose-100 p-3 text-rose-700"><MapPin className="h-6 w-6" /></div>
          <div>
            <p className="font-bold text-neutral-900">{customerCoords ? 'Position de livraison' : 'Boutique Ola Ice'}</p>
            <p className="mt-1 text-sm text-neutral-600">{customerCoords ? `${customerCoords.lat.toFixed(5)}, ${customerCoords.lng.toFixed(5)}` : `${OLA_ICE_SHOP.city}, ${OLA_ICE_SHOP.country}`}</p>
            {distanceFormatted && <p className="mt-1 text-sm text-neutral-600">À {distanceFormatted} de la boutique</p>}
          </div>
          <a className="rounded-full bg-neutral-900 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-700" href={`https://www.openstreetmap.org/?mlat=${customerCoords?.lat ?? OLA_ICE_SHOP.lat}&mlon=${customerCoords?.lng ?? OLA_ICE_SHOP.lng}#map=16/${customerCoords?.lat ?? OLA_ICE_SHOP.lat}/${customerCoords?.lng ?? OLA_ICE_SHOP.lng}`} target="_blank" rel="noreferrer">Ouvrir la carte</a>
          {interactive && <p className="max-w-sm text-xs text-neutral-500">La carte interactive nécessite une clé Google Maps. Vous pouvez continuer avec votre adresse et votre zone de livraison.</p>}
        </div>
      )}

      {/* Floating Header Badges */}
      <div className="absolute top-2.5 left-2.5 right-2.5 z-10 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        <div className="bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-neutral-200/80 shadow-md text-xs flex items-center gap-2 pointer-events-auto">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-600 shrink-0 animate-ping" />
          <span className="font-bold text-neutral-900 truncate">{OLA_ICE_SHOP.name}</span>
        </div>

        {/* Courier vs Customer Live Comparison Badge */}
        {courierCoords && customerCoords && courierToCustomerFormatted && (
          <div
            className={`backdrop-blur-md px-3 py-1.5 rounded-xl border shadow-md text-xs flex items-center gap-2 pointer-events-auto transition-all ${
              isArrived
                ? 'bg-emerald-600 text-white border-emerald-400 font-bold'
                : 'bg-neutral-900/95 text-white border-neutral-700'
            }`}
          >
            {isArrived ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-200 shrink-0 animate-bounce" />
                <span>🎯 Sur place chez le client (&lt; 50 m)</span>
              </>
            ) : (
              <>
                <Compass className="w-3.5 h-3.5 text-emerald-400 shrink-0 animate-spin" />
                <span>
                  Livreur ↔ Client :{' '}
                  <strong className="text-amber-300 font-mono">
                    {courierToCustomerFormatted}
                  </strong>
                </span>
              </>
            )}
          </div>
        )}

        {/* Distance from shop badge (when not in courier comparison mode) */}
        {!courierCoords && customerCoords && distanceFormatted && deliveryFee !== undefined && (
          <div className="bg-neutral-900/95 text-white backdrop-blur-md px-3 py-1.5 rounded-xl border border-neutral-700 shadow-md text-xs flex items-center gap-2 pointer-events-auto">
            <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span>
              Distance : <strong className="text-amber-300 font-mono">{distanceFormatted}</strong>
            </span>
            <span className="text-neutral-400">·</span>
            <span>
              Livraison :{' '}
              <strong className="text-emerald-400 font-mono">
                {deliveryFee.toLocaleString('fr-FR')} F CFA
              </strong>
            </span>
          </div>
        )}
      </div>

      {/* Interactive Helper Banner at bottom */}
      {interactive && (
        <div className="absolute bottom-2.5 left-2.5 right-2.5 z-10 pointer-events-none">
          <div className="bg-neutral-900/90 backdrop-blur-md text-white text-[11px] sm:text-xs px-3 py-2 rounded-xl border border-neutral-700/80 shadow-lg flex items-center justify-between gap-2 pointer-events-auto">
            <div className="flex items-center gap-2">
              <Hand className="w-4 h-4 text-amber-300 shrink-0 animate-bounce" />
              <span className="font-medium">
                {helperText ||
                  'Cliquez sur la carte ou glissez le repère bleu pour pointer votre position exacte'}
              </span>
            </div>
            {onSelectCoords && (
              <button
                type="button"
                onClick={() =>
                  onSelectCoords({
                    lat: OLA_ICE_SHOP.lat + 0.0008,
                    lng: OLA_ICE_SHOP.lng + 0.0008,
                  })
                }
                className="px-2 py-1 bg-white/20 hover:bg-white/30 text-white rounded-lg text-[10px] font-bold shrink-0 transition-colors flex items-center gap-1 cursor-pointer"
                title="Placer à 100 mètres de la boutique Ola Ice"
              >
                <LocateFixed className="w-3 h-3 text-rose-400" />
                <span>Près de la boutique</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
