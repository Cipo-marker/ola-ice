import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, Loader2, MapPin } from 'lucide-react';
import { BeninLocation } from '../types';

interface Division { code: string; nom: string; }
interface DivisionResponse { data?: Division[]; }

const API = 'https://geobj.emunadigitalsolution.com/api/v1';
const fieldClass = 'w-full rounded-xl border border-neutral-300 bg-neutral-50 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 disabled:cursor-not-allowed disabled:opacity-60';

async function getDivisions(path: string): Promise<Division[]> {
  const response = await fetch(`${API}${path}`);
  if (!response.ok) throw new Error('La liste des localités est momentanément indisponible. Réessayez dans un instant.');
  const payload = await response.json() as DivisionResponse;
  if (!Array.isArray(payload.data)) throw new Error('La source des localités a renvoyé un format inattendu.');
  return payload.data;
}

export const BeninLocationSelector: React.FC<{
  value?: Partial<BeninLocation> | null;
  onChange: (value: BeninLocation | null) => void;
  required?: boolean;
  compact?: boolean;
}> = ({ value, onChange, required = false, compact = false }) => {
  const [departments, setDepartments] = useState<Division[]>([]);
  const [communes, setCommunes] = useState<Division[]>([]);
  const [arrondissements, setArrondissements] = useState<Division[]>([]);
  const [quarters, setQuarters] = useState<Division[]>([]);
  const [departmentCode, setDepartmentCode] = useState(value?.department_code || '');
  const [communeCode, setCommuneCode] = useState(value?.commune_code || '');
  const [arrondissementCode, setArrondissementCode] = useState(value?.arrondissement_code || '');
  const [quarterCode, setQuarterCode] = useState(value?.quarter_code || '');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const valueRef = useRef(value);
  valueRef.current = value;

  // Profile data often arrives after this selector has mounted. Hydrate the
  // cascading controls when a complete saved location becomes available.
  useEffect(() => {
    if (!value?.department_code) return;
    setDepartmentCode(value.department_code);
    setCommuneCode(value.commune_code || '');
    setArrondissementCode(value.arrondissement_code || '');
    setQuarterCode(value.quarter_code || '');
  }, [value?.department_code, value?.commune_code, value?.arrondissement_code, value?.quarter_code]);

  useEffect(() => {
    let active = true;
    setBusy('departments');
    getDivisions('/departements').then((rows) => {
      if (!active) return;
      setDepartments(rows);
      setDepartmentCode(valueRef.current?.department_code || '');
    }).catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : 'Impossible de charger les départements.');
    }).finally(() => { if (active) setBusy(''); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!departmentCode) { setCommunes([]); return; }
    let active = true;
    setBusy('communes'); setError(''); setCommunes([]);
    getDivisions(`/departements/${encodeURIComponent(departmentCode)}/communes`).then((rows) => {
      if (active) { setCommunes(rows); const saved = valueRef.current; if (saved?.department_code === departmentCode && saved.commune_code) setCommuneCode(saved.commune_code); }
    }).catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : 'Impossible de charger les communes.');
    }).finally(() => { if (active) setBusy(''); });
    return () => { active = false; };
  }, [departmentCode]);

  useEffect(() => {
    if (!communeCode) { setArrondissements([]); return; }
    let active = true;
    setBusy('arrondissements'); setError(''); setArrondissements([]);
    getDivisions(`/communes/${encodeURIComponent(communeCode)}/arrondissements`).then((rows) => {
      if (active) { setArrondissements(rows); const saved = valueRef.current; if (saved?.commune_code === communeCode && saved.arrondissement_code) setArrondissementCode(saved.arrondissement_code); }
    }).catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : 'Impossible de charger les arrondissements.');
    }).finally(() => { if (active) setBusy(''); });
    return () => { active = false; };
  }, [communeCode]);

  useEffect(() => {
    if (!arrondissementCode) { setQuarters([]); return; }
    let active = true;
    setBusy('quarters'); setError(''); setQuarters([]);
    getDivisions(`/arrondissements/${encodeURIComponent(arrondissementCode)}/quartiers`).then((rows) => {
      if (active) { setQuarters(rows); const saved = valueRef.current; if (saved?.arrondissement_code === arrondissementCode && saved.quarter_code) setQuarterCode(saved.quarter_code); }
    }).catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : 'Impossible de charger les quartiers.');
    }).finally(() => { if (active) setBusy(''); });
    return () => { active = false; };
  }, [arrondissementCode]);

  const finishSelection = (nextQuarter: string) => {
    const department = departments.find((item) => item.code === departmentCode);
    const commune = communes.find((item) => item.code === communeCode);
    const arrondissement = arrondissements.find((item) => item.code === arrondissementCode);
    const quarter = quarters.find((item) => item.code === nextQuarter);
    if (!department || !commune || !arrondissement || !quarter) { onChange(null); return; }
    onChange({
      department_code: department.code, department_name: department.nom,
      commune_code: commune.code, commune_name: commune.nom,
      arrondissement_code: arrondissement.code, arrondissement_name: arrondissement.nom,
      quarter_code: quarter.code, quarter_name: quarter.nom,
    });
  };

  const select = (label: string, selected: string, rows: Division[], disabled: boolean, onSelect: (code: string) => void, placeholder: string, busyKey: string, final = false) => (
    <label className="block min-w-0 space-y-1">
      <span className="block text-[11px] font-semibold text-neutral-700">{label}{required && final ? ' *' : ''}</span>
      <select
        required={required && final}
        value={selected}
        disabled={disabled || busy === busyKey}
        onChange={(event) => onSelect(event.target.value)}
        className={compact ? `${fieldClass} py-2 text-xs` : fieldClass}
      >
        <option value="">{busy === busyKey ? 'Chargement…' : placeholder}</option>
        {rows.map((item) => <option key={item.code} value={item.code}>{item.nom}</option>)}
      </select>
    </label>
  );

  return (
    <div className="space-y-3">
      {!compact && <div className="flex items-center gap-2 text-xs font-bold text-neutral-800"><MapPin className="h-4 w-4 text-rose-600" />Localisation au Bénin</div>}
      <div className={`grid ${compact ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2'} gap-3`}>
        {select('Département', departmentCode, departments, busy === 'departments', (code) => { setDepartmentCode(code); setCommuneCode(''); setArrondissementCode(''); setQuarterCode(''); setCommunes([]); setArrondissements([]); setQuarters([]); onChange(null); }, 'Choisir un département', 'departments')}
        {select('Commune', communeCode, communes, !departmentCode, (code) => { setCommuneCode(code); setArrondissementCode(''); setQuarterCode(''); setArrondissements([]); setQuarters([]); onChange(null); }, 'Choisir une commune', 'communes')}
        {select('Arrondissement', arrondissementCode, arrondissements, !communeCode, (code) => { setArrondissementCode(code); setQuarterCode(''); setQuarters([]); onChange(null); }, 'Choisir un arrondissement', 'arrondissements')}
        {select('Village / quartier', quarterCode, quarters, !arrondissementCode, (code) => { setQuarterCode(code); finishSelection(code); }, 'Choisir un village ou quartier', 'quarters', true)}
      </div>
      {busy && <div className="flex items-center gap-2 text-[11px] text-neutral-500"><Loader2 className="h-3.5 w-3.5 animate-spin" />Chargement de la liste correspondante…</div>}
      {error && <div role="alert" className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-[11px] text-amber-900"><AlertCircle className="h-4 w-4 shrink-0" />{error}</div>}
    </div>
  );
};
