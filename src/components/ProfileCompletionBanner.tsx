import React, { useState, useEffect } from 'react';
import { customerAuthService } from '../services/customerAuth';
import { CustomerProfile } from '../types';
import { Sparkles, MapPin, ArrowRight, X, UserCheck, ShieldCheck } from 'lucide-react';

interface ProfileCompletionBannerProps {
  onOpenProfile: () => void;
  onOpenAuth: () => void;
}

export const ProfileCompletionBanner: React.FC<ProfileCompletionBannerProps> = ({
  onOpenProfile,
  onOpenAuth,
}) => {
  const [customer, setCustomer] = useState<CustomerProfile | null>(() =>
    customerAuthService.getCurrentCustomer()
  );
  const [isDismissed, setIsDismissed] = useState<boolean>(() =>
    customerAuthService.isPromptDismissed()
  );

  useEffect(() => {
    const unsub = customerAuthService.subscribe((c) => {
      setCustomer(c);
    });
    return () => unsub();
  }, []);

  if (isDismissed) return null;

  // Case 1: Logged in customer with incomplete address/zone
  if (customer) {
    const completion = customerAuthService.getProfileCompletion(customer);
    // If already 100% complete, no need to show prompt
    if (completion.percent >= 100) return null;

    const handleDismiss = () => {
      customerAuthService.dismissPrompt();
      setIsDismissed(true);
    };

    return (
      <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-40 animate-in slide-in-from-bottom-5 duration-300">
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-rose-200/90 shadow-2xl space-y-3 relative">
          <button
            onClick={handleDismiss}
            className="absolute top-3 right-3 p-1 rounded-full text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors"
            title="Ignorer pour le moment"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-start gap-3 pr-6">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider font-bold text-rose-600 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-500" />
                <span>Profil à {completion.percent}%</span>
              </div>
              <h4 className="font-display font-black text-sm text-neutral-900 mt-0.5">
                Bonjour {customer.fullName.split(' ')[0]} !
              </h4>
              <p className="text-xs text-neutral-600 leading-relaxed mt-0.5">
                Complétez votre quartier et votre adresse de livraison pour être livré en 1 clic sans rien retaper.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={onOpenProfile}
              className="flex-1 py-2 px-3.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5"
            >
              <span>Compléter mon adresse</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={handleDismiss}
              className="py-2 px-3 text-xs font-semibold text-neutral-500 hover:text-neutral-800 transition-colors"
            >
              Plus tard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Case 2: Guest user browsing the store (dismissible non-intrusive prompt)
  return null;
};
