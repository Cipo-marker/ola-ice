import React from 'react';
import { Phone, MapPin, Clock, Facebook, Sparkles, HeartHandshake } from 'lucide-react';

interface FooterProps {
  onNavigate: (view: 'store' | 'admin' | 'delivery' | 'tracking') => void;
  onSelectCategory?: (slug: string) => void;
  onOpenStaffLogin?: (role?: 'admin' | 'delivery') => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate, onSelectCategory, onOpenStaffLogin }) => {
  return (
    <footer className="bg-neutral-900 text-neutral-300 pt-16 pb-12 border-t border-neutral-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 pb-12 border-b border-neutral-800">
          {/* Brand Info */}
          <div className="lg:col-span-5 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center font-black text-xl">
                OI
              </div>
              <div>
                <span className="font-display font-black text-2xl text-white tracking-tight">
                  OLA <span className="text-rose-500">ICE</span>
                </span>
                <div className="text-xs text-neutral-400">Le goût de la fraîcheur</div>
              </div>
            </div>

            <p className="text-sm text-neutral-400 leading-relaxed max-w-sm">
              Plateforme officielle de commande de glaces artisanales, yaourts onctueux Groto, jus naturels d’Afrique
              de l'Ouest et restauration rapide de qualité. Commandes au détail et en gros pour revendeuses et événements.
            </p>

            <div className="pt-2 flex items-center gap-3 text-xs text-neutral-400">
              <span className="flex items-center gap-1.5 text-rose-400 font-semibold">
                <Sparkles className="w-4 h-4" />
                100% Frais & Naturel
              </span>
              <span>·</span>
              <span>Paiement à la livraison</span>
            </div>
          </div>

          {/* Quick links */}
          <div className="lg:col-span-3 space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-white">
              Gourmandises Ola Ice
            </div>
            <ul className="space-y-2 text-sm text-neutral-400">
              <li>
                <button
                  onClick={() => {
                    onNavigate('store');
                    if (onSelectCategory) onSelectCategory('yaourts-groto');
                  }}
                  className="hover:text-white transition-colors"
                >
                  Yaourt Groto (Toutes saveurs)
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    onNavigate('store');
                    if (onSelectCategory) onSelectCategory('glaces-et-cremes');
                  }}
                  className="hover:text-white transition-colors"
                >
                  Crèmes Glacées & Glaces Événements
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    onNavigate('store');
                    if (onSelectCategory) onSelectCategory('jus-naturels');
                  }}
                  className="hover:text-white transition-colors"
                >
                  Jus de Fruits (Bissap, Tamarin, Ananas)
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    onNavigate('store');
                    if (onSelectCategory) onSelectCategory('restauration');
                  }}
                  className="hover:text-white transition-colors"
                >
                  Panini, Shawarma, Tacos & Jolof Rice
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('tracking')}
                  className="text-rose-400 hover:text-rose-300 transition-colors font-semibold"
                >
                  Suivre une commande en cours →
                </button>
              </li>
            </ul>
          </div>

          {/* Contact Details from Menu */}
          <div className="lg:col-span-4 space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-white">
              Nous Contacter au Bénin
            </div>
            <ul className="space-y-3 text-sm text-neutral-400">
              <li className="flex items-start gap-2.5">
                <Phone className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-white">Commandes & Vente en Gros :</div>
                  <div className="font-mono text-neutral-300">
                    <a href="tel:+2290141404111" className="hover:text-white">
                      +229 01 41 40 41 11
                    </a>{' '}
                    /{' '}
                    <a href="tel:+2290195794389" className="hover:text-white">
                      01 95 79 43 89
                    </a>
                  </div>
                </div>
              </li>

              <li className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-white">Zones de livraison :</div>
                  <div>Cotonou (Haie Vive, Akpakpa, Fidjrossè) et Abomey-Calavi / Godomey</div>
                </div>
              </li>

              <li className="flex items-start gap-2.5">
                <Clock className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-white">Horaires de service :</div>
                  <div>Du Lundi au Dimanche de 08h00 à 22h00</div>
                </div>
              </li>

              <li className="flex items-center gap-2 pt-1">
                <Facebook className="w-4 h-4 text-sky-400 shrink-0" />
                <span className="text-neutral-300">Facebook :</span>
                <span className="font-bold text-white">@OlaICE</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom strip */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-neutral-500 gap-4">
          <div>
            © {new Date().getFullYear()} OLA ICE. « Le goût de la fraîcheur ». Tous droits réservés.
          </div>

          <div className="flex items-center gap-3 text-neutral-400">
            <span>Paiement en espèces à la livraison au Bénin</span>
            <span>·</span>
            <span>Service Client : 01 41 40 41 11</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
