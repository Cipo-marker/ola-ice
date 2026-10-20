import React from 'react';
import {
  ArrowRight,
  Sparkles,
  CheckCircle2,
  ShieldCheck,
  HeartHandshake,
  Search,
  X,
  Flame,
} from 'lucide-react';

interface HeroBannerProps {
  onExploreClick: () => void;
  onWholesaleClick: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSelectQuickTag?: (tag: string) => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({
  onExploreClick,
  onWholesaleClick,
  searchQuery,
  onSearchChange,
  onSelectQuickTag,
}) => {
  const quickSearchTags = [
    { label: 'Yaourt Groto', value: 'groto', icon: '🥛' },
    { label: 'Cornets & Glaces', value: 'glace', icon: '🍦' },
    { label: 'Jus d’Ananas & Bissap', value: 'jus', icon: '🍹' },
    { label: 'Pots 250ml & 500ml', value: 'pot', icon: '🍨' },
    { label: 'Tacos & Restauration', value: 'tacos', icon: '🌮' },
    { label: 'Tarif Gros', value: 'gros', icon: '📦' },
  ];

  const handleTagClick = (tagValue: string) => {
    onSearchChange(tagValue);
    if (onSelectQuickTag) {
      onSelectQuickTag(tagValue);
    }
    const el = document.getElementById('catalogue-section');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const el = document.getElementById('catalogue-section');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="relative overflow-hidden bg-gradient-to-b from-rose-50/70 via-white to-neutral-50 border-b border-neutral-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 pb-14 lg:py-16">
        <div className="grid lg:grid-cols-12 gap-10 items-center">
          {/* Left Content */}
          <div className="lg:col-span-7 space-y-5">
            {/* Kicker badge */}
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-rose-700 uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-rose-600 shrink-0" />
              <span>Vente en Gros & Détail</span>
              <span className="text-neutral-300">·</span>
              <span className="bg-rose-100 text-rose-800 font-bold px-2 py-0.5 rounded-md font-mono">
                Dès 100 F CFA
              </span>
              <span className="text-neutral-300">·</span>
              <span className="text-neutral-600">Boutique Ola Ice Bénin</span>
            </div>

            {/* Display headline */}
            <h1 className="font-display text-3xl sm:text-5xl lg:text-5xl font-black text-neutral-900 tracking-tight leading-[1.1] text-balance">
              Le goût de la <span className="text-rose-600">fraîcheur</span> en gros et au détail.
            </h1>

            {/* Prose description */}
            <p className="text-sm sm:text-base text-neutral-600 max-w-2xl leading-relaxed">
              Commandez nos <strong>Yaourts Groto</strong> onctueux, crèmes glacées, jus 100% naturels
              et restauration rapide dès <strong>100 F CFA</strong>. Livraison rapide à domicile et
              au travail avec <strong>paiement en espèces à la livraison</strong> !
            </p>

            {/* PROMINENT HIGH-VISIBILITY SEARCH BAR ON HOME PAGE */}
            <div className="pt-2 space-y-2.5">
              <form
                onSubmit={handleSearchSubmit}
                className="relative flex items-center bg-white rounded-2xl border-2 border-rose-300/80 hover:border-rose-500 focus-within:border-rose-600 shadow-lg shadow-rose-600/5 transition-all p-1.5"
              >
                <div className="pl-3 text-rose-600 shrink-0">
                  <Search className="w-5 h-5" />
                </div>

                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    onSearchChange(e.target.value);
                  }}
                  placeholder="Que désirez-vous déguster ? (Groto, cornet fraise, bissap, mangue...)"
                  className="w-full px-3 py-2.5 text-xs sm:text-sm text-neutral-900 placeholder-neutral-400 bg-transparent focus:outline-none font-medium"
                />

                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => onSearchChange('')}
                    className="p-1.5 text-neutral-400 hover:text-neutral-700 transition-colors shrink-0 mr-1"
                    title="Effacer la recherche"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}

                <button
                  type="submit"
                  className="px-4 sm:px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all shrink-0 flex items-center gap-1.5 cursor-pointer active:scale-98"
                >
                  <span>Trouver</span>
                  <ArrowRight className="w-3.5 h-3.5 hidden sm:inline" />
                </button>
              </form>

              {/* Quick Search Tag Chips */}
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                <span className="text-[11px] font-bold text-neutral-500 flex items-center gap-1 mr-1">
                  <Flame className="w-3 h-3 text-rose-500" />
                  <span>Populaire :</span>
                </span>
                {quickSearchTags.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => handleTagClick(t.value)}
                    className="px-2.5 py-1 rounded-xl bg-white hover:bg-rose-50 text-neutral-700 hover:text-rose-700 text-[11px] font-semibold border border-neutral-200 hover:border-rose-300 shadow-2xs transition-all flex items-center gap-1 cursor-pointer active:scale-95"
                  >
                    <span>{t.icon}</span>
                    <span>{t.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Value markers */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3">
              <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-neutral-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>100% Frais & Naturels</span>
              </div>
              <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-neutral-800">
                <ShieldCheck className="w-4 h-4 text-sky-600 shrink-0" />
                <span>Sans conservateur</span>
              </div>
              <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-neutral-800 col-span-2 sm:col-span-1">
                <HeartHandshake className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Tarif Gros Revendeuses</span>
              </div>
            </div>

            {/* Call to action buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
              <button
                onClick={onExploreClick}
                className="px-5 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 group text-sm cursor-pointer"
              >
                <span>Voir le catalogue complet</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                onClick={onWholesaleClick}
                className="px-4 py-3 bg-white border border-neutral-300 hover:border-neutral-400 hover:bg-neutral-50 text-neutral-800 font-bold rounded-xl transition-all flex items-center justify-center gap-2 text-sm cursor-pointer"
              >
                <span>📦 Tarifs Revendeuses</span>
              </button>
            </div>
          </div>

          {/* Right Visual Image */}
          <div className="lg:col-span-5 relative">
            <div className="relative rounded-3xl overflow-hidden shadow-2xl bg-neutral-100 border border-neutral-200 aspect-[4/3] sm:aspect-[16/10] lg:aspect-[4/3]">
              <img
                src="/images/hero_ola_ice_showcase_1790119089620.jpg"
                alt="Assortiment de glaces, yaourts Groto et jus naturels Ola Ice"
                className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-700"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    'https://images.unsplash.com/photo-1501443762994-82bd5dace89a?auto=format&fit=crop&w=1000&q=80';
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>

              {/* In-image highlight tag */}
              <div className="absolute bottom-4 left-4 right-4 text-white p-3.5 backdrop-blur-md bg-black/40 rounded-2xl border border-white/20">
                <div className="flex items-center justify-between gap-2 text-xs font-semibold uppercase tracking-wider">
                  <span className="text-rose-300">En gros & au détail</span>
                  <span className="font-mono bg-rose-600 text-white px-2 py-0.5 rounded-full text-[10px] font-bold">
                    Dès 100 F CFA
                  </span>
                </div>
                <div className="font-display font-bold text-sm text-white mt-1">
                  Boutique Ola Ice Principale (Bohicon / Abomey)
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
