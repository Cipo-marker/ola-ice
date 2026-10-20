import React, { useState } from 'react';
import { authService, REGISTERED_DRIVERS } from '../services/auth';
import { ShieldCheck, Truck, Lock, X, Check, AlertCircle } from 'lucide-react';

interface StaffLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (targetView: 'admin' | 'delivery') => void;
  initialRole?: 'admin' | 'delivery';
}

export const StaffLoginModal: React.FC<StaffLoginModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialRole = 'delivery',
}) => {
  const [tab, setTab] = useState<'admin' | 'delivery'>(initialRole);
  const [adminPin, setAdminPin] = useState('');
  const [selectedDriver, setSelectedDriver] = useState(REGISTERED_DRIVERS[0]?.name || '');
  const [driverPin, setDriverPin] = useState('');
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setTab(initialRole);
      setError(null);
      setAdminPin('');
      setDriverPin('');
    }
  }, [isOpen, initialRole]);

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const res = await authService.loginAdmin(adminPin);
    if (res.success) {
      setAdminPin('');
      onSuccess('admin');
    } else {
      setError(res.error || 'Erreur de connexion');
    }
  };

  const handleDriverSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const res = await authService.loginDriver(selectedDriver, driverPin);
    if (res.success) {
      setDriverPin('');
      onSuccess('delivery');
    } else {
      setError(res.error || 'Erreur de connexion');
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-neutral-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-neutral-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-600 flex items-center justify-center font-bold">
              <Lock className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-display font-black text-lg text-white">Espace Personnel Ola Ice</h2>
              <p className="text-xs text-neutral-400">Authentification requise pour le personnel</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white rounded-xl hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="grid grid-cols-2 p-2 bg-neutral-100 border-b border-neutral-200">
          <button
            onClick={() => {
              setTab('delivery');
              setError(null);
            }}
            className={`py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
              tab === 'delivery'
                ? 'bg-white text-sky-600 shadow-sm'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>Livreur Moto 🛵</span>
          </button>

          <button
            onClick={() => {
              setTab('admin');
              setError(null);
            }}
            className={`py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
              tab === 'admin'
                ? 'bg-white text-rose-600 shadow-sm'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Direction / Admin 🔐</span>
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 text-rose-800 rounded-xl text-xs flex items-center gap-2 border border-rose-200">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {tab === 'admin' ? (
            <form onSubmit={handleAdminSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                  Code Secret Administrateur
                </label>
                <input
                  type="password"
                  value={adminPin}
                  onChange={(e) => setAdminPin(e.target.value)}
                  placeholder="Entrez le code administrateur"
                  autoFocus
                  required
                  className="w-full px-4 py-3 rounded-xl border border-neutral-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-sm transition-all shadow-sm"
              >
                Déverrouiller le Tableau de Bord
              </button>
            </form>
          ) : (
            <form onSubmit={handleDriverSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                  Sélectionnez votre profil coursier
                </label>
                <select
                  value={selectedDriver}
                  onChange={(e) => setSelectedDriver(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-neutral-300 text-sm font-semibold text-neutral-900 bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  {REGISTERED_DRIVERS.map((d) => (
                    <option key={d.name} value={d.name}>
                      {d.name} · {d.zone}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                  Code PIN Livreur
                </label>
                <input
                  type="password"
                  value={driverPin}
                  onChange={(e) => setDriverPin(e.target.value)}
                  placeholder="Code d’accès livreur"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-neutral-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl text-sm transition-all shadow-sm"
              >
                Ouvrir ma Tournée de Livraison
              </button>
            </form>
          )}

          <div className="pt-2 text-center border-t border-neutral-100">
            <span className="text-[11px] text-neutral-400">
              Accès strictement réservé à l'équipe Ola Ice Bénin. Les données clients sont protégées.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
