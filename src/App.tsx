import React, { useState, useEffect } from 'react';
import { store } from './services/store';
import { Product, Order, CustomerProfile } from './types';
import { Navbar } from './components/Navbar';
import { HeroBanner } from './components/HeroBanner';
import { ProductCard } from './components/ProductCard';
import { ProductModal } from './components/ProductModal';
import { CartDrawer } from './components/CartDrawer';
import { CheckoutModal } from './components/CheckoutModal';
import { OrderConfirmationModal } from './components/OrderConfirmationModal';
import { OrderTrackingView } from './components/OrderTrackingView';
import { AdminDashboard } from './components/AdminDashboard';
import { DeliveryAgentView } from './components/DeliveryAgentView';
import { Footer } from './components/Footer';
import { StaffLoginModal } from './components/StaffLoginModal';
import { CustomerAuthModal } from './components/CustomerAuthModal';
import { CustomerProfileModal } from './components/CustomerProfileModal';
import { SmartPopupQueue } from './components/SmartPopupQueue';
import { LocationPermissionModal } from './components/LocationPermissionModal';
import { DeliveryCalculationResult } from './services/distanceService';
import { authService, StaffUser } from './services/auth';
import { customerAuthService } from './services/customerAuth';
import {
  Search,
  ShoppingBag,
  Sparkles,
  HeartHandshake,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Utensils,
  IceCream,
  CupSoda,
} from 'lucide-react';

export default function App() {
  const [, setTick] = useState(0);
  const [serverError, setServerError] = useState<string | null>(null);

  // Subscribe to store updates
  useEffect(() => {
    const onServerError = (event: Event) => {
      setServerError((event as CustomEvent<string>).detail || 'Le serveur Ola Ice est momentanément indisponible.');
    };
    window.addEventListener('olaice-error', onServerError);
    return () => window.removeEventListener('olaice-error', onServerError);
  }, []);

  useEffect(() => {
    const unsubscribe = store.subscribe(() => {
      setTick((t) => t + 1);
    });
    void store.initialize().catch((error) => {
      window.dispatchEvent(new CustomEvent('olaice-error', { detail: error.message }));
    });
    return () => unsubscribe();
  }, []);

  // View state
  const [currentView, setCurrentView] = useState<'store' | 'admin' | 'delivery' | 'tracking'>('store');
  const [selectedCategorySlug, setSelectedCategorySlug] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [wholesaleOnly, setWholesaleOnly] = useState<boolean>(false);

  // Modals state
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [confirmationOrder, setConfirmationOrder] = useState<Order | null>(null);

  // Google Maps Quota state & GPS Location modal state
  const [gmpQuotaExceeded, setGmpQuotaExceeded] = useState(false);
  const [locationModalOpen, setLocationModalOpen] = useState(false);

  useEffect(() => {
    const handleQuota = () => setGmpQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', handleQuota);
    return () => window.removeEventListener('gmp-quota-exceeded', handleQuota);
  }, []);

  // Customer Authentication & Profile State
  const [customer, setCustomer] = useState<CustomerProfile | null>(() =>
    customerAuthService.getCurrentCustomer()
  );
  const [customerAuthOpen, setCustomerAuthOpen] = useState(false);
  const [customerProfileOpen, setCustomerProfileOpen] = useState(false);

  // Sync customer session
  useEffect(() => {
    const unsub = customerAuthService.subscribe((c) => {
      setCustomer(c);
    });
    return () => unsub();
  }, []);

  // Staff Authentication State
  const [staffUser, setStaffUser] = useState<StaffUser | null>(() => authService.getCurrentUser());
  const [staffLoginOpen, setStaffLoginOpen] = useState(false);
  const [staffLoginRole, setStaffLoginRole] = useState<'admin' | 'delivery'>('admin');

  // Sync staff user session
  useEffect(() => {
    const unsub = authService.subscribe((user) => {
      setStaffUser(user);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!staffUser) return;
    void store.refreshOrders().catch(() => undefined);
    if (staffUser.role === 'admin') void store.refreshCustomers().catch(() => undefined);
    const timer = window.setInterval(() => {
      void store.refreshOrders().catch(() => undefined);
      if (staffUser.role === 'admin') void store.refreshCustomers().catch(() => undefined);
    }, 12000);
    return () => window.clearInterval(timer);
  }, [staffUser]);

  // Tracking query state
  const [activeOrder, setActiveOrder] = useState<Order | null>(() => store.getLastOrder());
  const [trackingOrderNumber, setTrackingOrderNumber] = useState<string>(() => store.getLastOrder()?.order_number || '');
  const [trackingPhone, setTrackingPhone] = useState<string>(() => store.getLastOrder()?.customer_phone || '');

  const categories = store.getCategories();
  const products = store.getProducts();
  const cart = store.getCart();
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const pricing = store.calculatePricing();

  // Filter products
  const filteredProducts = products.filter((product) => {
    const category = categories.find((c) => c.id === product.category_id);
    const matchesCategory =
      selectedCategorySlug === 'all' || (category && category.slug === selectedCategorySlug);
    const matchesSearch =
      searchQuery === '' ||
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.short_description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (product.available_flavors &&
        product.available_flavors.some((f) =>
          f.toLowerCase().includes(searchQuery.toLowerCase())
        ));
    const matchesWholesale = !wholesaleOnly || product.allow_wholesale;

    return matchesCategory && matchesSearch && matchesWholesale;
  });

  const handleAddToCart = (variantId: string, quantity = 1, flavor?: string) => {
    store.addToCart(variantId, quantity, flavor);
  };

  const handleOrderSuccess = (newOrder: Order) => {
    setActiveOrder(newOrder);
    setTrackingOrderNumber(newOrder.order_number);
    setTrackingPhone(newOrder.customer_phone);
    setCheckoutOpen(false);
    setConfirmationOrder(newOrder);
    // Keep currentView so the user sees the confirmation modal smoothly without the storefront disappearing!
    // The confirmation modal has buttons to either track order or continue shopping.
  };

  const handleTrackOrderFromConfirmation = (orderNumber: string, phone: string) => {
    setTrackingOrderNumber(orderNumber);
    setTrackingPhone(phone);
    setCurrentView('tracking');
    setConfirmationOrder(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenStaffLogin = (role?: 'admin' | 'delivery') => {
    setStaffLoginRole(role || 'admin');
    setStaffLoginOpen(true);
  };

  const handleStaffLoginSuccess = async (view: 'admin' | 'delivery') => {
    setStaffLoginOpen(false);
    if (view === 'admin' || view === 'delivery') {
      try { await store.refreshOrders(); }
      catch (error) { window.dispatchEvent(new CustomEvent('olaice-error', { detail: error instanceof Error ? error.message : 'Chargement des commandes impossible.' })); }
    }
    if (view === 'admin') void store.refreshCustomers().catch(() => undefined);
    setCurrentView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStaffLogout = () => {
    void authService.logout();
    if (currentView === 'admin' || currentView === 'delivery') {
      setCurrentView('store');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50 text-neutral-900">
      {/* Tier 2 Google Maps Quota Exhaustion Warning Banner */}
      {gmpQuotaExceeded && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm">
          <span>
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold text-amber-950 hover:text-amber-800"
            >
              maps developer site
            </a>{' '}
            for instructions to update your account.
          </span>
        </div>
      )}

      {/* Universal Top Bar */}
      {serverError && (
        <div className="bg-rose-50 border-b border-rose-200 text-rose-900 px-4 py-2 text-xs text-center" role="alert">
          {serverError}
          <button className="ml-3 underline font-semibold" onClick={() => setServerError(null)}>Fermer</button>
        </div>
      )}
      <Navbar
        cartCount={cartCount}
        onOpenCart={() => setCartOpen(true)}
        currentView={currentView}
        activeOrderNumber={activeOrder?.order_number}
        staffUser={staffUser}
        onOpenStaffLogin={handleOpenStaffLogin}
        onStaffLogout={handleStaffLogout}
        customer={customer}
        onOpenCustomerAuth={() => setCustomerAuthOpen(true)}
        onOpenCustomerProfile={() => setCustomerProfileOpen(true)}
        onOpenLocationModal={() => setLocationModalOpen(true)}
        onNavigate={(view) => {
          setCurrentView(view);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onSelectCategory={(slug) => {
          setSelectedCategorySlug(slug);
          if (currentView !== 'store') setCurrentView('store');
        }}
      />

      {/* Main View Router */}
      <main className="flex-1">
        {currentView === 'admin' && (
          <AdminDashboard
            onOpenLogin={() => handleOpenStaffLogin('admin')}
            onLogout={handleStaffLogout}
          />
        )}

        {currentView === 'delivery' && (
          <DeliveryAgentView
            onBackToStore={() => setCurrentView('store')}
            onOpenLogin={() => handleOpenStaffLogin('delivery')}
            onLogout={handleStaffLogout}
          />
        )}

        {currentView === 'tracking' && (
          <OrderTrackingView
            initialOrderNumber={trackingOrderNumber}
            initialPhone={trackingPhone}
            onBackToStore={() => setCurrentView('store')}
          />
        )}

        {currentView === 'store' && (
          <div className="space-y-12 sm:space-y-16 pb-20">
            {/* Hero Section */}
            <HeroBanner
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onExploreClick={() => {
                const el = document.getElementById('catalogue-section');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              onWholesaleClick={() => {
                setWholesaleOnly(true);
                const el = document.getElementById('catalogue-section');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
            />

            {/* Catalog Section */}
            <section
              id="catalogue-section"
              className="max-w-7xl mx-auto px-4 sm:px-6 pt-4 space-y-6"
            >
              {/* Section Header with Category Tabs */}
              <div className="space-y-4">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-rose-600">
                      Notre Carte Gourmande
                    </div>
                    <h2 className="font-display font-black text-2xl sm:text-3xl text-neutral-900 tracking-tight">
                      Glaces, Yaourts, Jus & Restauration
                    </h2>
                  </div>

                  {/* Search input & wholesale filter toggle */}
                  <div className="flex items-center gap-2 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                      <Search className="w-4 h-4 absolute left-3 top-3 text-neutral-400" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Rechercher bissap, groto, tacos..."
                        className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-neutral-300 text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => setWholesaleOnly(!wholesaleOnly)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all whitespace-nowrap flex items-center gap-1.5 ${
                        wholesaleOnly
                          ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                          : 'bg-white border-neutral-300 text-neutral-700 hover:bg-neutral-100'
                      }`}
                    >
                      <HeartHandshake className="w-3.5 h-3.5" />
                      <span>Tarif Gros</span>
                    </button>
                  </div>
                </div>

                {/* Interactive Functional Category Filter Bar */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
                  <button
                    type="button"
                    onClick={() => setSelectedCategorySlug('all')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                      selectedCategorySlug === 'all'
                        ? 'bg-neutral-900 text-white shadow-sm'
                        : 'bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-100'
                    }`}
                  >
                    Toutes les gourmandises ({products.length})
                  </button>

                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategorySlug(cat.slug)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                        selectedCategorySlug === cat.slug
                          ? 'bg-rose-600 text-white shadow-sm'
                          : 'bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-100'
                      }`}
                    >
                      {cat.slug === 'yaourts-groto' && <IceCream className="w-3.5 h-3.5" />}
                      {cat.slug === 'glaces-et-cremes' && <Sparkles className="w-3.5 h-3.5" />}
                      {cat.slug === 'jus-naturels' && <CupSoda className="w-3.5 h-3.5" />}
                      {cat.slug === 'restauration' && <Utensils className="w-3.5 h-3.5" />}
                      <span>{cat.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Product Grid (Responsive: 1 col on small, 2 cols on mobile/tablet, 3-4 cols on desktop) */}
              {filteredProducts.length === 0 ? (
                <div className="py-16 text-center bg-white rounded-3xl border border-neutral-200 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-neutral-100 text-neutral-400 flex items-center justify-center mx-auto">
                    <Search className="w-6 h-6" />
                  </div>
                  <h3 className="font-display font-bold text-lg text-neutral-800">
                    Aucun produit ne correspond à votre recherche
                  </h3>
                  <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                    Essayez d'autres mots-clés ou réinitialisez les filtres de catégorie.
                  </p>
                  <button
                    onClick={() => {
                      setSelectedCategorySlug('all');
                      setSearchQuery('');
                      setWholesaleOnly(false);
                    }}
                    className="mt-2 px-4 py-2 bg-rose-600 text-white text-xs font-bold rounded-xl hover:bg-rose-700"
                  >
                    Voir tout le catalogue
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 sm:gap-6">
                  {filteredProducts.map((product) => {
                    const variants = store.getVariantsForProduct(product.id);
                    return (
                      <ProductCard
                        key={product.id}
                        product={product}
                        variants={variants}
                        onAddToCart={handleAddToCart}
                        onViewDetails={(p) => setActiveProduct(p)}
                      />
                    );
                  })}
                </div>
              )}
            </section>

            {/* Wholesale & Reseller Focus Section (Flyer 1 feature) */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6">
              <div className="bg-gradient-to-br from-amber-500 via-amber-600 to-rose-600 text-white rounded-3xl p-6 sm:p-10 shadow-lg relative overflow-hidden">
                <div className="relative z-10 grid lg:grid-cols-12 gap-8 items-center">
                  <div className="lg:col-span-8 space-y-4">
                    <div className="inline-flex items-center gap-1.5 bg-black/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider text-amber-100">
                      <HeartHandshake className="w-4 h-4" />
                      <span>Opportunité Revendeuses & Événements</span>
                    </div>

                    <h2 className="font-display font-black text-2xl sm:text-4xl tracking-tight text-balance">
                      Achetez en GROS vos Yaourts Groto et Glaces pour revendre avec marge attractive !
                    </h2>

                    <p className="text-sm sm:text-base text-amber-50 max-w-2xl leading-relaxed">
                      Vous tenez une boutique, une cantine, un supermarché ou organisez une fête (anniversaire, mariage, baptême) ?
                      Profitez de nos <strong>tarifs dégressifs de gros dès 10 unités</strong> avec livraison rapide en glacière isotherme à Cotonou et Calavi.
                    </p>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 text-xs sm:text-sm font-semibold">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-amber-200 shrink-0" />
                        <span>Marge bénéficiaire élevée</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-amber-200 shrink-0" />
                        <span>Saveurs variées assorties</span>
                      </div>
                      <div className="flex items-center gap-2 col-span-2 sm:col-span-1">
                        <CheckCircle2 className="w-4 h-4 text-amber-200 shrink-0" />
                        <span>Livraison froide assurée</span>
                      </div>
                    </div>

                    <div className="pt-2 flex flex-wrap gap-3">
                      <button
                        onClick={() => {
                          setWholesaleOnly(true);
                          const el = document.getElementById('catalogue-section');
                          if (el) el.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className="px-5 py-3 bg-white text-neutral-900 font-bold rounded-xl shadow hover:bg-neutral-100 transition-all text-xs sm:text-sm"
                      >
                        Voir les produits éligibles au gros
                      </button>

                      <a
                        href="tel:+2290195794389"
                        className="px-5 py-3 bg-black/20 hover:bg-black/30 backdrop-blur-md text-white font-bold rounded-xl border border-white/30 transition-all text-xs sm:text-sm flex items-center gap-2"
                      >
                        <span>Parler au responsable : 01 95 79 43 89</span>
                      </a>
                    </div>
                  </div>

                  <div className="lg:col-span-4 hidden lg:block">
                    <div className="rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20 aspect-square">
                      <img
                        src="/images/product_yaourt_groto_1790119101835.jpg"
                        alt="Packs Yaourt Groto pour revendeuses"
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=800&q=80';
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Restaurant & Fast Food Focus Section (Flyer 2 feature) */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6">
              <div className="bg-white rounded-3xl border border-neutral-200 p-6 sm:p-10 shadow-sm">
                <div className="grid lg:grid-cols-12 gap-8 items-center">
                  <div className="lg:col-span-5 rounded-2xl overflow-hidden shadow-md aspect-[4/3] bg-neutral-100">
                    <img
                      src="/images/product_restauration_fastfood_1790119131775.jpg"
                      alt="Panini, shawarma et restauration chaude Ola Ice"
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=800&q=80';
                      }}
                    />
                  </div>

                  <div className="lg:col-span-7 space-y-4">
                    <div className="text-xs font-bold uppercase tracking-wider text-rose-600">
                      Restauration Chaude · « Le goût qui fait revenir »
                    </div>

                    <h2 className="font-display font-black text-2xl sm:text-3xl text-neutral-900 tracking-tight">
                      Des Paninis croustillants, Shawarmas fondants et Jolof Rice parfumés
                    </h2>

                    <p className="text-sm sm:text-base text-neutral-600 leading-relaxed">
                      Préparés à la commande avec des ingrédients frais du jour. Accompagnez vos plats chauds avec un bon
                      jus de bissap glacé ou un yaourt Groto pour un repas parfait, livré chaud chez vous ou à votre bureau.
                    </p>

                    <div className="flex flex-wrap gap-2 pt-1">
                      {['Panini 1 000 F', 'Shawarma 1 000 F', 'Hamburger 2 500 F', 'Tacos 1 000 F', 'Jolof Rice 2 000 F', 'Couscous Royal 2 500 F'].map(
                        (tag) => (
                          <span
                            key={tag}
                            className="bg-neutral-100 text-neutral-800 text-xs font-bold px-3 py-1.5 rounded-lg border border-neutral-200"
                          >
                            {tag}
                          </span>
                        )
                      )}
                    </div>

                    <div className="pt-2">
                      <button
                        onClick={() => {
                          setSelectedCategorySlug('restauration');
                          const el = document.getElementById('catalogue-section');
                          if (el) el.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className="px-5 py-3 bg-neutral-900 hover:bg-neutral-800 text-white font-bold rounded-xl text-xs sm:text-sm flex items-center gap-2 shadow transition-all group"
                      >
                        <span>Commander un repas chaud</span>
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}
      </main>

      {/* Mobile Floating Sticky Cart Bar (Conforming to 15% viewport height max cap) */}
      {cartCount > 0 && currentView === 'store' && (
        <div className="md:hidden fixed bottom-3 left-3 right-3 z-30 animate-in slide-in-from-bottom duration-300">
          <button
            onClick={() => setCartOpen(true)}
            className="w-full bg-rose-600 hover:bg-rose-700 text-white p-3.5 rounded-2xl shadow-xl flex items-center justify-between font-bold text-sm"
          >
            <div className="flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-full bg-white text-rose-600 flex items-center justify-center font-mono text-xs font-black">
                {cartCount}
              </span>
              <span>Voir mon panier</span>
            </div>

            <div className="flex items-center gap-1.5 font-mono tabular-nums">
              <span>{pricing.subtotal.toLocaleString('fr-FR')} F CFA</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </button>
        </div>
      )}

      {/* Product Detail Modal */}
      {activeProduct && (
        <ProductModal
          product={activeProduct}
          variants={store.getVariantsForProduct(activeProduct.id)}
          onClose={() => setActiveProduct(null)}
          onAddToCart={handleAddToCart}
        />
      )}

      {/* Shopping Cart Drawer */}
      {cartOpen && (
        <CartDrawer
          isOpen={cartOpen}
          onClose={() => setCartOpen(false)}
          onProceedToCheckout={() => {
            setCartOpen(false);
            setCheckoutOpen(true);
          }}
        />
      )}

      {/* Express Checkout Modal */}
      {checkoutOpen && (
        <CheckoutModal
          isOpen={checkoutOpen}
          onClose={() => setCheckoutOpen(false)}
          onOrderSuccess={handleOrderSuccess}
        />
      )}

      {/* Order Confirmation Modal */}
      {confirmationOrder && (
        <OrderConfirmationModal
          order={confirmationOrder}
          onClose={() => setConfirmationOrder(null)}
          onTrackOrder={handleTrackOrderFromConfirmation}
        />
      )}

      {/* Universal Footer */}
      <Footer
        onNavigate={(view) => {
          setCurrentView(view);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onSelectCategory={(slug) => {
          setSelectedCategorySlug(slug);
          if (currentView !== 'store') setCurrentView('store');
        }}
      />

      {/* Smart Sequential Pop-up Queue (Profile Completion, Charcoal Prices, New Products, Wholesale) */}
      {currentView === 'store' && (
        <SmartPopupQueue
          customer={customer}
          hasMobileStickyCart={cartCount > 0}
          isExternalModalOpen={Boolean(
            activeProduct ||
              cartOpen ||
              checkoutOpen ||
              confirmationOrder ||
              customerAuthOpen ||
              customerProfileOpen ||
              locationModalOpen ||
              staffLoginOpen
          )}
          onAddToCart={handleAddToCart}
          onViewProduct={(prod) => setActiveProduct(prod)}
          onOpenLocationModal={() => setLocationModalOpen(true)}
          onOpenProfileModal={() =>
            customer ? setCustomerProfileOpen(true) : setCustomerAuthOpen(true)
          }
          onSelectWholesaleCatalog={() => {
            setWholesaleOnly(true);
            const el = document.getElementById('catalogue-section');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
        />
      )}

      {customerAuthOpen && (
        <CustomerAuthModal
          isOpen={customerAuthOpen}
          onClose={() => setCustomerAuthOpen(false)}
          onSuccess={(c) => {
            setCustomer(c);
            setCustomerAuthOpen(false);
            // Mandatory location prompt upon connecting as explicitly requested by user
            if (!c.locationConfirmed) {
              setLocationModalOpen(true);
            }
          }}
        />
      )}

      {/* GPS Location & Distance Calculation Modal */}
      {locationModalOpen && (
        <LocationPermissionModal
          isOpen={locationModalOpen}
          onClose={() => setLocationModalOpen(false)}
          onLocationSuccess={(loc) => {
            const updated = customerAuthService.updateProfile({
              latitude: loc.latitude,
              longitude: loc.longitude,
              distanceMeters: loc.distanceMeters,
              distanceFormatted: loc.distanceFormatted,
              calculatedDeliveryFee: loc.deliveryFee,
              locationConfirmed: true,
            });
            if (updated) setCustomer(updated);
          }}
        />
      )}

      {customerProfileOpen && (
        <CustomerProfileModal
          isOpen={customerProfileOpen}
          onClose={() => setCustomerProfileOpen(false)}
          onTrackOrder={handleTrackOrderFromConfirmation}
          onOpenLocationModal={() => setLocationModalOpen(true)}
        />
      )}

      {/* Staff Authentication Modal */}
      {staffLoginOpen && (
        <StaffLoginModal
          isOpen={staffLoginOpen}
          initialRole={staffLoginRole}
          onClose={() => setStaffLoginOpen(false)}
          onSuccess={handleStaffLoginSuccess}
        />
      )}
    </div>
  );
}
