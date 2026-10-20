// Source: Google Maps Platform Code Assist
/**
 * Distance & Delivery Fee Calculation Service for Ola Ice
 * Shop Coordinates: 7.1833258, 2.0433176 (Bohicon / Abomey, Bénin)
 */

export const OLA_ICE_SHOP = {
  lat: 7.1833258,
  lng: 2.0433176,
  name: 'Boutique Ola Ice Principale',
  city: 'Bohicon / Abomey',
  country: 'Bénin',
};

export const LOCAL_LANDMARK_PRESETS = [
  {
    name: 'À côté de la Boutique Ola Ice (Bohicon)',
    lat: 7.1838,
    lng: 2.0438,
    desc: 'À ~60 mètres de la boutique',
  },
  {
    name: 'Carrefour Zakpo / Station',
    lat: 7.1782,
    lng: 2.062,
    desc: 'Bohicon',
  },
  {
    name: 'Gare Centrale de Bohicon',
    lat: 7.1748,
    lng: 2.0665,
    desc: 'Bohicon',
  },
  {
    name: 'Place Goho / Centre Abomey',
    lat: 7.1856,
    lng: 1.9912,
    desc: 'Abomey',
  },
  {
    name: 'Marché Houndjro',
    lat: 7.1842,
    lng: 1.9965,
    desc: 'Abomey',
  },
];

/**
 * Detects if a location is likely an erroneous IP-based desktop location
 * (e.g. Windows desktop IP resolving to Porto-Novo or Cotonou > 15 km away)
 */
export function isLikelyInaccurateDesktopLocation(distanceMeters: number): boolean {
  return distanceMeters > 15000;
}

export interface DeliveryCalculationResult {
  distanceMeters: number;
  distanceKm: number;
  distanceFormatted: string;
  deliveryFee: number;
  bracketLabel: string;
  source: 'google_maps_geometry' | 'haversine';
}

/**
 * Calculates delivery fee based on customer distance:
 * - Moins de 500 m : 50 francs
 * - Plus de 500 m (500m à 999m) : 100 francs
 * - À 1 km (1000m à 1499m) : 200 francs
 * - Ainsi de suite (+100 francs par tranche de 500m supplémentaire au-delà de 1 km)
 */
export function calculateDeliveryFeeFromDistance(distanceMeters: number): {
  fee: number;
  bracketLabel: string;
  distanceFormatted: string;
} {
  const roundedMeters = Math.max(0, Math.round(distanceMeters));
  const distanceKm = roundedMeters / 1000;
  const distanceFormatted =
    roundedMeters < 1000
      ? `${roundedMeters} m`
      : `${distanceKm.toFixed(2).replace('.', ',')} km`;

  if (roundedMeters < 500) {
    return {
      fee: 50,
      bracketLabel: 'Moins de 500 m (50 F CFA)',
      distanceFormatted,
    };
  }

  if (roundedMeters < 1000) {
    return {
      fee: 100,
      bracketLabel: 'De 500 m à 1 km (100 F CFA)',
      distanceFormatted,
    };
  }

  // At 1 km: 200 F. For each additional 500m tranche above 1 km, add 100 F
  const excessBeyond1000m = roundedMeters - 1000;
  const additionalTranches = Math.floor(excessBeyond1000m / 500);
  const fee = 200 + additionalTranches * 100;

  return {
    fee,
    bracketLabel: `À partir de 1 km (${fee.toLocaleString('fr-FR')} F CFA)`,
    distanceFormatted,
  };
}

/**
 * Precise spherical Haversine formula (Earth radius 6371000 meters)
 */
export function computeHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Computes distance and delivery fee between user coordinates and Ola Ice Shop
 */
export function computeDistanceToShop(userLat: number, userLng: number): DeliveryCalculationResult {
  let distanceMeters = 0;
  let source: 'google_maps_geometry' | 'haversine' = 'haversine';

  // Check if google maps geometry library is loaded
  try {
    const gmaps = (window as unknown as { google?: { maps?: { geometry?: { spherical?: { computeDistanceBetween?: (a: unknown, b: unknown) => number } } } } }).google;
    if (gmaps?.maps?.geometry?.spherical?.computeDistanceBetween) {
      const shopLatLng = new (window as unknown as { google: { maps: { LatLng: new (lat: number, lng: number) => unknown } } }).google.maps.LatLng(
        OLA_ICE_SHOP.lat,
        OLA_ICE_SHOP.lng
      );
      const userLatLng = new (window as unknown as { google: { maps: { LatLng: new (lat: number, lng: number) => unknown } } }).google.maps.LatLng(
        userLat,
        userLng
      );
      distanceMeters = Math.round(gmaps.maps.geometry.spherical.computeDistanceBetween(shopLatLng, userLatLng));
      source = 'google_maps_geometry';
    } else {
      distanceMeters = computeHaversineDistance(OLA_ICE_SHOP.lat, OLA_ICE_SHOP.lng, userLat, userLng);
    }
  } catch {
    distanceMeters = computeHaversineDistance(OLA_ICE_SHOP.lat, OLA_ICE_SHOP.lng, userLat, userLng);
  }

  const { fee, bracketLabel, distanceFormatted } = calculateDeliveryFeeFromDistance(distanceMeters);

  return {
    distanceMeters,
    distanceKm: distanceMeters / 1000,
    distanceFormatted,
    deliveryFee: fee,
    bracketLabel,
    source,
  };
}

/**
 * Browser Geolocation Request with friendly error handling
 */
export function requestCurrentPosition(): Promise<{ latitude: number; longitude: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("La géolocalisation n'est pas supportée par votre navigateur."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        let msg = "Impossible d'accéder à votre position.";
        if (error.code === error.PERMISSION_DENIED) {
          msg = "Vous avez refusé l'accès à la localisation GPS. Veuillez autoriser la localisation dans les paramètres de votre navigateur pour calculer vos frais de livraison.";
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          msg = 'Signal GPS introuvable. Veuillez vérifier que votre puce GPS ou Wi-Fi est activée.';
        } else if (error.code === error.TIMEOUT) {
          msg = 'La recherche de votre position a expiré. Veuillez réessayer.';
        }
        reject(new Error(msg));
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 60000,
      }
    );
  });
}
