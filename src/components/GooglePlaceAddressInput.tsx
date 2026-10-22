import React, { useEffect, useRef, useState } from 'react';
import { APIProvider, useMapsLibrary } from '@vis.gl/react-google-maps';
import { LocateFixed, MapPin, Search } from 'lucide-react';
import { BeninLocation } from '../types';

const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

const GooglePlaceInput: React.FC<{
  value: string;
  onChange: (value: string) => void;
  onSelect: (address: string, coords: { lat: number; lng: number }) => void;
  placeholder: string;
}> = ({ value, onChange, onSelect, placeholder }) => {
  const places = useMapsLibrary('places');
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompleteSuggestion[]>([]);
  const [error, setError] = useState('');
  const requestId = useRef(0);

  useEffect(() => {
    if (!places || value.trim().length < 3) { setSuggestions([]); return; }
    const currentRequest = ++requestId.current;
    const timer = window.setTimeout(() => {
      places.AutocompleteSuggestion.fetchAutocompleteSuggestions({ input: value.trim(), includedRegionCodes: ['bj'], language: 'fr', region: 'BJ' })
        .then((response) => {
          if (currentRequest === requestId.current) {
            setSuggestions(response.suggestions.filter((item) => item.placePrediction));
            setError('');
          }
        })
        .catch(() => { if (currentRequest === requestId.current) { setSuggestions([]); setError('La recherche Google est indisponible. Saisissez votre adresse manuellement.'); } });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [places, value]);

  const choose = async (suggestion: google.maps.places.AutocompleteSuggestion) => {
    const prediction = suggestion.placePrediction;
    if (!prediction) return;
    try {
      const place = prediction.toPlace();
      await place.fetchFields({ fields: ['formattedAddress', 'location'] });
      const location = place.location;
      const address = place.formattedAddress || prediction.text.toString();
      if (location) onSelect(address, { lat: location.lat(), lng: location.lng() });
      else onChange(address);
      setSuggestions([]);
    } catch {
      setError('Google n’a pas pu confirmer cette adresse. Vous pouvez la saisir manuellement.');
      setSuggestions([]);
    }
  };

  return (
    <div className="relative">
      <div className="relative">
        <input type="text" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="w-full rounded-xl border border-neutral-300 bg-neutral-50 px-3.5 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500" />
        <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
      </div>
      {suggestions.length > 0 && <div className="absolute z-30 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-neutral-200 bg-white py-1 shadow-xl" role="listbox" aria-label="Suggestions Google Maps">{suggestions.map((suggestion) => {
        const prediction = suggestion.placePrediction;
        if (!prediction) return null;
        return <button key={prediction.placeId} type="button" role="option" onMouseDown={(event) => event.preventDefault()} onClick={() => void choose(suggestion)} className="flex w-full items-start gap-2 px-3 py-2 text-left text-xs hover:bg-neutral-50"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-600" /><span>{prediction.text.toString()}</span></button>;
      })}</div>}
      {error && <p className="mt-1 text-[10px] text-amber-800">{error}</p>}
    </div>
  );
};

export const GooglePlaceAddressInput: React.FC<{
  value: string;
  onChange: (value: string) => void;
  onSelect: (address: string, coords: { lat: number; lng: number }) => void;
  placeholder: string;
}> = (props) => {
  if (!apiKey) return <textarea rows={2} value={props.value} onChange={(event) => props.onChange(event.target.value)} placeholder={props.placeholder} className="w-full rounded-xl border border-neutral-300 bg-neutral-50 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500" />;
  return <APIProvider apiKey={apiKey} libraries={['places', 'marker', 'geometry']}><GooglePlaceInput {...props} /></APIProvider>;
};

const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
const LOCALITIES_API = 'https://geobj.emunadigitalsolution.com/api/v1';

async function findDivision(path: string, candidates: string[]): Promise<{ code: string; nom: string } | undefined> {
  const response = await fetch(`${LOCALITIES_API}${path}`);
  if (!response.ok) return undefined;
  const payload = await response.json() as { data?: Array<{ code: string; nom: string }> };
  const names = candidates.map(normalize).filter((item) => item.length > 2);
  return payload.data?.find((item) => names.some((name) => name === normalize(item.nom) || name.includes(normalize(item.nom)) || normalize(item.nom).includes(name)));
}

const GoogleCurrentLocation: React.FC<{ onSelect: (address: string, coords: { lat: number; lng: number }, location?: Partial<BeninLocation>) => void }> = ({ onSelect }) => {
  const geocoding = useMapsLibrary('geocoding');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const locate = () => {
    setMessage('');
    if (!navigator.geolocation) { setMessage('La géolocalisation n’est pas disponible sur cet appareil. Saisissez votre adresse manuellement.'); return; }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      try {
        if (!geocoding) throw new Error('Google Maps est encore en cours de chargement.');
        const results = await new geocoding.Geocoder().geocode({ location: { lat: coords.latitude, lng: coords.longitude } });
        const result = results.results[0];
        if (!result) throw new Error('Google n’a pas trouvé d’adresse à cette position. Saisissez-la manuellement.');
        const components: Array<{ long_name: string; types: string[] }> = result.address_components;
        const byType = (type: string) => components.filter((part: { long_name: string; types: string[] }) => part.types.includes(type)).map((part: { long_name: string; types: string[] }) => part.long_name);
        const location: Partial<BeninLocation> = {};
        const department = await findDivision('/departements', byType('administrative_area_level_1'));
        if (department) {
          location.department_code = department.code; location.department_name = department.nom;
          const commune = await findDivision(`/departements/${encodeURIComponent(department.code)}/communes`, [...byType('locality'), ...byType('administrative_area_level_2'), ...byType('postal_town')]);
          if (commune) {
            location.commune_code = commune.code; location.commune_name = commune.nom;
            const arrondissement = await findDivision(`/communes/${encodeURIComponent(commune.code)}/arrondissements`, [...byType('administrative_area_level_3'), ...byType('sublocality_level_1'), ...byType('sublocality')]);
            if (arrondissement) {
              location.arrondissement_code = arrondissement.code; location.arrondissement_name = arrondissement.nom;
              const quarter = await findDivision(`/arrondissements/${encodeURIComponent(arrondissement.code)}/quartiers`, [...byType('neighborhood'), ...byType('sublocality_level_2'), ...byType('sublocality')]);
              if (quarter) { location.quarter_code = quarter.code; location.quarter_name = quarter.nom; }
            }
          }
        }
        onSelect(result.formatted_address, { lat: coords.latitude, lng: coords.longitude }, location);
        setMessage(location.quarter_code ? 'Position détectée : adresse et quartier préremplis. Vérifiez-les avant d’enregistrer.' : 'Adresse détectée. Vérifiez-la et complétez ou corrigez les listes administratives ci-dessous si nécessaire.');
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'La position n’a pas pu être convertie en adresse. Saisissez-la manuellement.');
      } finally { setBusy(false); }
    }, (error) => {
      const text = error.code === error.PERMISSION_DENIED ? 'Accès à la position refusé. Saisissez votre adresse et choisissez le département, la commune, l’arrondissement et le quartier dans les listes ci-dessous.' : 'Position indisponible. Saisissez votre adresse et choisissez les lieux dans les listes ci-dessous.';
      setMessage(text); setBusy(false);
    }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 });
  };
  return <div className="space-y-1.5"><button type="button" onClick={locate} disabled={busy} className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 disabled:opacity-60"><LocateFixed className="h-4 w-4" />{busy ? 'Détection de votre position…' : 'Utiliser ma position actuelle'}</button>{message && <p role="status" className="text-[11px] text-neutral-600">{message}</p>}</div>;
};

export const GoogleCurrentLocationButton: React.FC<{ onSelect: (address: string, coords: { lat: number; lng: number }, location?: Partial<BeninLocation>) => void }> = ({ onSelect }) => {
  if (!apiKey) return <p className="text-[11px] text-amber-800">Google Maps est indisponible sans clé API. Utilisez les listes de lieux et saisissez votre adresse manuellement.</p>;
  return <APIProvider apiKey={apiKey} libraries={['geocoding']}><GoogleCurrentLocation onSelect={onSelect} /></APIProvider>;
};
