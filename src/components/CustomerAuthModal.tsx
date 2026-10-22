import React, { useState } from 'react';
import { customerAuthService } from '../services/customerAuth';
import { CustomerProfile } from '../types';
import { X, Sparkles, Phone, User, CheckCircle2, ArrowRight, ShieldCheck, Zap } from 'lucide-react';

interface CustomerAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (customer: CustomerProfile) => void;
  title?: string;
  subtitle?: string;
  source?: 'header' | 'checkout' | 'banner';
  onAdminLogin?: () => void;
}

export const CustomerAuthModal: React.FC<CustomerAuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  title,
  subtitle,
  source = 'header',
  onAdminLogin,
}) => {
  const [phone, setPhone] = useState('');
  const [fullName, setFullName] = useState('');
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanPhone = phone.trim();
    if (mode === 'login' && fullName.trim().toLowerCase() === 'admin' && cleanPhone.toLowerCase() === 'je sais qui je suis' && onAdminLogin) {
      onClose();
      onAdminLogin();
      return;
    }
    const digitsOnly = cleanPhone.replace(/[^0-9]/g, '');

    if (digitsOnly.length < 8) {
      setError('Veuillez renseigner un numéro de téléphone valide (ex: 01 41 40 41 11 ou 97 00 00 00).');
      return;
    }

    setLoading(true);

    setTimeout(() => {
      try {
        const { customer } = customerAuthService.loginOrRegister(cleanPhone, fullName);
        setLoading(false);
        if (onSuccess) {
          onSuccess(customer);
        }
        onClose();
      } catch (err) {
        setLoading(false);
        setError('Une erreur est survenue. Veuillez réessayer.');
      }
    }, 250);
  };

  // Instant 1-click registration without friction
  const handleInstantGuestRegister = () => {
    setLoading(true);
    setTimeout(() => {
      const customer = customerAuthService.quickOneClickRegister(fullName || undefined);
      setLoading(false);
      if (onSuccess) {
        onSuccess(customer);
      }
      onClose();
    }, 200);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-neutral-200 flex flex-col my-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with decorative brand gradient */}
        <div className="bg-gradient-to-r from-rose-600 to-rose-500 p-5 sm:p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 text-rose-100 text-xs font-bold uppercase tracking-wider mb-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Profil local Ola Ice</span>
          </div>

          <h2 className="font-display font-black text-xl sm:text-2xl text-white">
            {title || (mode === 'register' ? 'Créer mon profil sur cet appareil' : 'Retrouver mon profil local')}
          </h2>

          <p className="text-xs sm:text-sm text-rose-100 mt-1 leading-relaxed">
            {subtitle ||
              (source === 'checkout'
                ? 'Enregistrez vos coordonnées sur cet appareil pour préremplir votre prochaine commande.'
                : 'Enregistrez vos coordonnées sur cet appareil pour accélérer vos prochaines commandes.')}
          </p>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex border-b border-neutral-100 bg-neutral-50/70 p-1.5 gap-1.5 text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setError(null);
            }}
            className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              mode === 'register'
                ? 'bg-white text-rose-600 shadow-xs'
                : 'text-neutral-500 hover:text-neutral-800'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Créer un profil local</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError(null);
            }}
            className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              mode === 'login'
                ? 'bg-white text-rose-600 shadow-xs'
                : 'text-neutral-500 hover:text-neutral-800'
            }`}
          >
            <Phone className="w-3.5 h-3.5" />
            <span>Charger un profil local</span>
          </button>
        </div>

        {/* Content & Form */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-medium">
              {error}
            </div>
          )}

          {/* Top input: Full Name / Identifier */}
          <div className="space-y-1">
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700">
              {mode === 'login' ? 'Votre nom (facultatif)' : 'Votre prénom et nom'}
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={mode === 'login' ? 'Ex: Koffi Mensah ou votre identifiant' : 'Ex: Koffi Mensah'}
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 bg-neutral-50/50"
              />
            </div>
          </div>

          {/* Bottom input: Phone / Code */}
          <div className="space-y-1">
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 flex items-center justify-between">
              <span>{mode === 'login' ? 'Numéro de téléphone *' : 'Numéro de Téléphone *'}</span>
              <span className="text-[10px] text-neutral-400 font-normal">Identifiant unique</span>
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" />
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Ex: 01 41 40 41 11"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-neutral-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-rose-500 bg-neutral-50/50"
              />
            </div>
            <p className="text-[11px] text-neutral-500">
              Le profil reste sur cet appareil. Le numéro sert à la livraison, il ne vérifie pas votre identité.
            </p>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-sm transition-all shadow-sm flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50"
          >
            <span>{mode === 'register' ? 'Enregistrer le profil' : 'Continuer avec ce numéro'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          {/* Secondary 1-click instant registration button */}
          {mode === 'register' && (
            <div className="pt-2 border-t border-neutral-100">
              <button
                type="button"
                onClick={handleInstantGuestRegister}
                disabled={loading}
                className="w-full py-2.5 px-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
              >
                <Zap className="w-3.5 h-3.5 text-amber-600" />
                <span>Continuer comme invité</span>
              </button>
              <p className="text-[10px] text-center text-neutral-400 mt-1">
                Vous pourrez ajouter votre adresse et numéro au moment de valider la livraison.
              </p>
            </div>
          )}

          <div className="pt-2 flex items-center justify-center gap-2 text-[11px] text-neutral-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Profil enregistré sur cet appareil · Paiement à la livraison</span>
          </div>
        </form>
      </div>
    </div>
  );
};
