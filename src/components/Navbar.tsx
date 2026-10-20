import React, { useState } from 'react';
import {
  ShoppingBag,
  Phone,
  ShieldCheck,
  Truck,
  Sparkles,
  Menu,
  X,
  Store,
  PackageCheck,
  Lock,
  LogOut,
  User,
  MapPin,
} from 'lucide-react';
import { StaffUser } from '../services/auth';
import { CustomerProfile } from '../types';

interface NavbarProps {
  cartCount: number;
  onOpenCart: () => void;
  currentView: 'store' | 'admin' | 'delivery' | 'tracking';
  onNavigate: (view: 'store' | 'admin' | 'delivery' | 'tracking') => void;
  onSelectCategory?: (slug: string) => void;
  activeOrderNumber?: string;
  staffUser: StaffUser | null;
  onOpenStaffLogin: (role?: 'admin' | 'delivery') => void;
  onStaffLogout: () => void;
  customer: CustomerProfile | null;
  onOpenCustomerAuth: () => void;
  onOpenCustomerProfile: () => void;
  onOpenLocationModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  cartCount,
  onOpenCart,
  currentView,
  onNavigate,
  onSelectCategory,
  activeOrderNumber,
  staffUser,
  onOpenStaffLogin,
  onStaffLogout,
  customer,
  onOpenCustomerAuth,
  onOpenCustomerProfile,
  onOpenLocationModal,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-neutral-200 shadow-xs">
      {/* Top micro info strip */}
      <div className="bg-rose-600 text-white text-xs py-1.5 px-3 sm:px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 font-medium min-w-0">
            {activeOrderNumber ? (
              <button
                onClick={() => onNavigate('tracking')}
                className="flex items-center gap-2 hover:underline text-left font-semibold text-amber-200 truncate"
              >
                <Truck className="w-3.5 h-3.5 animate-bounce text-amber-300 shrink-0" />
                <span className="truncate">
                  Votre commande {activeOrderNumber} est en cours · Suivre en direct →
                </span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5 truncate">
                <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                <span className="truncate">
                  Ola Ice Bénin · Gros & Détail dès 100 F CFA · Yaourts Groto, Glaces & Restauration
                </span>
              </div>
            )}
          </div>
          <div className="hidden sm:flex items-center gap-3 text-rose-100 shrink-0 text-xs">
            <span className="text-rose-200 text-[11px]">Commandes express :</span>
            <a
              href="tel:+2290141404111"
              className="hover:text-white transition-colors flex items-center gap-1 font-mono font-semibold"
            >
              <Phone className="w-3 h-3" />
              <span>01 41 40 41 11</span>
            </a>
            <span className="text-rose-300">/</span>
            <a
              href="tel:+2290195794389"
              className="hover:text-white transition-colors font-mono font-semibold"
            >
              01 95 79 43 89
            </a>
          </div>
        </div>
      </div>

      {/* Main Bar */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: Brand Logo */}
        <button
          onClick={() => {
            onNavigate('store');
            if (onSelectCategory) onSelectCategory('all');
          }}
          className="flex items-center gap-2.5 text-left group shrink-0"
        >
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-rose-500 to-rose-600 text-white flex items-center justify-center font-black text-lg sm:text-xl shadow-sm group-hover:scale-105 transition-transform">
            OI
          </div>
          <div>
            <div className="font-display font-black text-lg sm:text-xl tracking-tight text-neutral-900 group-hover:text-rose-600 transition-colors">
              OLA <span className="text-rose-600">ICE</span>
            </div>
            <div className="text-[10px] sm:text-[11px] font-semibold text-neutral-500 leading-none">
              Gros & Détail · Bénin
            </div>
          </div>
        </button>

        {/* Center: Navigation Options */}
        <div className="hidden md:flex items-center gap-1 bg-neutral-100 p-1 rounded-2xl border border-neutral-200/80">
          <button
            onClick={() => onNavigate('store')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              currentView === 'store'
                ? 'bg-white text-rose-600 shadow-sm'
                : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/50'
            }`}
          >
            <Store className="w-4 h-4 text-rose-600" />
            <span>Boutique Client</span>
          </button>

          <button
            onClick={() => onNavigate('tracking')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all relative ${
              currentView === 'tracking'
                ? 'bg-white text-sky-600 shadow-sm'
                : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/50'
            }`}
          >
            <PackageCheck className="w-4 h-4 text-sky-600" />
            <span>Suivi Commande</span>
            {activeOrderNumber && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping absolute -top-0.5 -right-0.5" />
            )}
          </button>

          {/* If authenticated as Admin: show Admin & Delivery tabs */}
          {staffUser?.role === 'admin' && (
            <>
              <button
                onClick={() => onNavigate('admin')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                  currentView === 'admin'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/50'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Espace Admin</span>
              </button>

              <button
                onClick={() => onNavigate('delivery')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                  currentView === 'delivery'
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/50'
                }`}
              >
                <Truck className="w-4 h-4" />
                <span>Mode Livreur</span>
              </button>
            </>
          )}

          {/* If authenticated as Courier: show Delivery tab */}
          {staffUser?.role === 'delivery' && (
            <button
              onClick={() => onNavigate('delivery')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                currentView === 'delivery'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/50'
              }`}
            >
              <Truck className="w-4 h-4" />
              <span>Tournée : {staffUser.name.split(' ')[0]}</span>
            </button>
          )}
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {/* GPS Location Quick Trigger */}
          {onOpenLocationModal && (
            <button
              onClick={onOpenLocationModal}
              className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                customer?.distanceFormatted
                  ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                  : 'bg-neutral-100 text-neutral-700 border-neutral-200 hover:bg-neutral-200'
              }`}
              title="Mesurer la distance et calculer mes frais de livraison"
            >
              <MapPin className="w-3.5 h-3.5 text-rose-600 shrink-0" />
              <span>
                {customer?.distanceFormatted
                  ? `${customer.distanceFormatted} (${customer.calculatedDeliveryFee} F)`
                  : 'Localisation GPS'}
              </span>
            </button>
          )}

          {/* Customer Profile / Login Button */}
          {customer ? (
            <button
              onClick={onOpenCustomerProfile}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-bold transition-all border border-neutral-200/80 active:scale-95"
              title="Mon Compte & Mes Adresses"
            >
              <div className="w-5 h-5 rounded-lg bg-rose-600 text-white flex items-center justify-center text-[10px] font-black">
                {customer.fullName ? customer.fullName[0].toUpperCase() : 'C'}
              </div>
              <span className="hidden sm:inline max-w-[90px] truncate">
                {customer.fullName.split(' ')[0]}
              </span>
            </button>
          ) : (
            <button
              onClick={onOpenCustomerAuth}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-neutral-100 hover:bg-rose-50 hover:text-rose-700 text-neutral-700 text-xs font-bold transition-all border border-neutral-200/80 active:scale-95"
              title="Se connecter ou s'inscrire en 1 clic"
            >
              <User className="w-3.5 h-3.5 text-neutral-500" />
              <span className="hidden sm:inline">Mon Compte</span>
            </button>
          )}

          {/* Staff Session indicator (shown only when staff is authenticated) */}
          {staffUser && (
            <div className="hidden sm:flex items-center gap-2 bg-neutral-100 py-1 px-2.5 rounded-xl border border-neutral-200">
              <span className="text-[11px] font-bold text-neutral-700 truncate max-w-[120px]">
                {staffUser.role === 'admin' ? '🛡️ Admin' : `🛵 ${staffUser.name.split(' ')[0]}`}
              </span>
              <button
                onClick={onStaffLogout}
                className="text-neutral-400 hover:text-rose-600 transition-colors p-1"
                title="Déconnexion du personnel"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Cart Trigger */}
          <button
            onClick={onOpenCart}
            className="relative flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 font-bold text-xs sm:text-sm transition-all shadow-xs border border-rose-200/60 active:scale-95"
            aria-label="Voir le panier"
          >
            <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5 text-rose-600" />
            <span className="hidden sm:inline">Mon Panier</span>
            {cartCount > 0 ? (
              <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 text-xs font-black text-white bg-rose-600 rounded-full font-mono tabular-nums animate-pulse shadow-xs">
                {cartCount}
              </span>
            ) : (
              <span className="text-neutral-400 font-normal text-xs hidden sm:inline">(0)</span>
            )}
          </button>

          {/* Mobile hamburger menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl text-neutral-700 hover:bg-neutral-100 border border-neutral-200"
            aria-label="Menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Secondary Category Ribbon when viewing Store (Desktop) */}
      {currentView === 'store' && (
        <div className="hidden md:block bg-neutral-50/80 border-t border-neutral-200/70 px-4 sm:px-6 py-2">
          <div className="max-w-7xl mx-auto flex items-center justify-between text-xs font-semibold text-neutral-600">
            <div className="flex items-center gap-5">
              <span className="text-[11px] uppercase tracking-wider font-bold text-neutral-400">Rayons :</span>
              <button
                onClick={() => onSelectCategory && onSelectCategory('all')}
                className="hover:text-rose-600 transition-colors"
              >
                Tout le catalogue
              </button>
              <button
                onClick={() => onSelectCategory && onSelectCategory('yaourts-groto')}
                className="hover:text-rose-600 transition-colors"
              >
                🥛 Yaourts Groto
              </button>
              <button
                onClick={() => onSelectCategory && onSelectCategory('glaces-et-cremes')}
                className="hover:text-rose-600 transition-colors"
              >
                🍨 Crèmes Glacées & Fêtes
              </button>
              <button
                onClick={() => onSelectCategory && onSelectCategory('jus-naturels')}
                className="hover:text-rose-600 transition-colors"
              >
                🍍 Jus de Fruits Naturels
              </button>
              <button
                onClick={() => onSelectCategory && onSelectCategory('restauration')}
                className="hover:text-rose-600 transition-colors"
              >
                🍔 Restauration (Panini, Tacos, Jolof)
              </button>
            </div>

            <div className="text-[11px] font-mono text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              Paiement en espèces à la livraison
            </div>
          </div>
        </div>
      )}

      {/* Mobile Drawer Menu (Visible when hamburger open) */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-neutral-200 bg-white px-4 py-5 space-y-4 shadow-xl animate-in slide-in-from-top-2 duration-200">
          {/* Customer Account on Mobile */}
          <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-2">
            <div className="text-[11px] font-bold uppercase text-neutral-400 tracking-wider">
              Espace Client Gourmand
            </div>
            {customer ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center font-bold text-xs">
                    {customer.fullName ? customer.fullName[0].toUpperCase() : 'C'}
                  </div>
                  <div>
                    <div className="font-bold text-xs text-neutral-900">{customer.fullName}</div>
                    <div className="text-[10px] text-neutral-500">{customer.phone || 'Connecté'}</div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenCustomerProfile();
                  }}
                  className="px-2.5 py-1 bg-white border border-neutral-200 text-rose-600 rounded-lg text-xs font-bold"
                >
                  Mon Profil
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenCustomerAuth();
                }}
                className="w-full py-2 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs"
              >
                <User className="w-3.5 h-3.5" />
                <span>Connexion / Inscription en 1 Clic</span>
              </button>
            )}
          </div>

          <div className="text-xs font-bold uppercase text-neutral-400 tracking-wider">
            Navigation principale
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                onNavigate('store');
                setMobileMenuOpen(false);
              }}
              className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all ${
                currentView === 'store'
                  ? 'bg-rose-50 text-rose-700 border-rose-300'
                  : 'bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100'
              }`}
            >
              <Store className="w-4 h-4 text-rose-600 shrink-0" />
              <span>Boutique Client</span>
            </button>

            <button
              onClick={() => {
                onNavigate('tracking');
                setMobileMenuOpen(false);
              }}
              className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all ${
                currentView === 'tracking'
                  ? 'bg-sky-50 text-sky-700 border-sky-300'
                  : 'bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100'
              }`}
            >
              <PackageCheck className="w-4 h-4 text-sky-600 shrink-0" />
              <span>Suivi Commande</span>
            </button>
          </div>

          {/* Authenticated Staff Links on Mobile */}
          {staffUser && (
            <div className="pt-2 border-t border-neutral-100 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-neutral-700">
                <span>Personnel : {staffUser.name}</span>
                <button
                  onClick={() => {
                    onStaffLogout();
                    setMobileMenuOpen(false);
                  }}
                  className="text-rose-600 hover:underline flex items-center gap-1 text-[11px]"
                >
                  <LogOut className="w-3 h-3" />
                  <span>Déconnexion</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {staffUser.role === 'admin' && (
                  <button
                    onClick={() => {
                      onNavigate('admin');
                      setMobileMenuOpen(false);
                    }}
                    className="p-2.5 rounded-xl bg-rose-600 text-white text-xs font-bold flex items-center justify-center gap-1.5"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Admin</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    onNavigate('delivery');
                    setMobileMenuOpen(false);
                  }}
                  className="p-2.5 rounded-xl bg-sky-600 text-white text-xs font-bold flex items-center justify-center gap-1.5"
                >
                  <Truck className="w-4 h-4" />
                  <span>Livreur</span>
                </button>
              </div>
            </div>
          )}

          {/* Authenticated Staff Links on Mobile */}

          {/* Quick contact on mobile */}
          <div className="pt-3 border-t border-neutral-100 space-y-2">
            <div className="text-[11px] font-bold uppercase text-neutral-400">
              Commandes directes & WhatsApp
            </div>
            <div className="flex items-center justify-between text-xs font-mono font-bold text-neutral-800">
              <a href="tel:+2290141404111" className="text-rose-600 hover:underline">
                01 41 40 41 11
              </a>
              <span className="text-neutral-300">|</span>
              <a href="tel:+2290195794389" className="text-rose-600 hover:underline">
                01 95 79 43 89
              </a>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
