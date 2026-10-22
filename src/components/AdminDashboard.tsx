import React, { useEffect, useRef, useState } from 'react';
import { store } from '../services/store';
import { Category, CustomerProfile, Order, OrderStatus, Product, ProductVariant, DeliveryZone, StaffAccount } from '../types';
import { BeninLocationSelector } from './BeninLocationSelector';
import {
  TrendingUp,
  ShoppingBag,
  Clock,
  Truck,
  CheckCircle2,
  Search,
  Filter,
  Eye,
  MapPin,
  X,
  Phone,
  Check,
  MessageSquare,
  ChevronRight,
  UserCheck,
  RotateCcw,
  Lock,
  LogOut,
  ShieldCheck,
  Plus,
  Pencil,
  Archive,
} from 'lucide-react';
import { authService } from '../services/auth';
import { popupQueueService } from '../services/popupQueueService';

interface AdminDashboardProps {
  onOpenLogin?: () => void;
  onLogout?: () => void;
}

const STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; bg: string; text: string; border: string }
> = {
  PENDING: { label: 'En attente', bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200' },
  CONFIRMED: { label: 'Confirmée', bg: 'bg-indigo-50', text: 'text-indigo-800', border: 'border-indigo-200' },
  PREPARING: { label: 'En préparation', bg: 'bg-rose-50', text: 'text-rose-800', border: 'border-rose-200' },
  READY: { label: 'Prête', bg: 'bg-purple-50', text: 'text-purple-800', border: 'border-purple-200' },
  ASSIGNED: { label: 'Livreur accepté', bg: 'bg-indigo-50', text: 'text-indigo-800', border: 'border-indigo-200' },
  PICKED_UP: { label: 'Colis récupéré', bg: 'bg-violet-50', text: 'text-violet-800', border: 'border-violet-200' },
  OUT_FOR_DELIVERY: { label: 'En livraison', bg: 'bg-sky-50', text: 'text-sky-800', border: 'border-sky-300' },
  DELIVERED: { label: 'Livrée & Encaissée', bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-300' },
  FAILED_DELIVERY: { label: 'Échec livraison', bg: 'bg-orange-50', text: 'text-orange-800', border: 'border-orange-200' },
  CANCELLED: { label: 'Annulée', bg: 'bg-neutral-100', text: 'text-neutral-700', border: 'border-neutral-300' },
};

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onOpenLogin, onLogout }) => {
  const isAdmin = authService.isAdmin();

  const [activeTab, setActiveTab] = useState<'orders' | 'products' | 'categories' | 'zones' | 'customers' | 'staff' | 'popups'>('orders');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [, setStoreRevision] = useState(0);
  const [departmentOptions, setDepartmentOptions] = useState<Array<{ code: string; nom: string }>>([]);
  const [orderSoundEnabled, setOrderSoundEnabled] = useState(false);
  const orderAudioRef = useRef<AudioContext | null>(null);
  const pendingSeenRef = useRef<Set<string> | null>(null);

  // Edit variant & zone modal state
  const [editingVariant, setEditingVariant] = useState<ProductVariant | null>(null);
  const [editingZone, setEditingZone] = useState<DeliveryZone | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<CustomerProfile | null>(null);
  const [editingStaff, setEditingStaff] = useState<(Partial<StaffAccount> & { pin?: string }) | null>(null);
  const [coverageDraft, setCoverageDraft] = useState<(Partial<StaffAccount> & { pin?: string; role: 'delivery' }) | null>(null);
  const [coverageSaveError, setCoverageSaveError] = useState<string | null>(null);
  const [coverageSaving, setCoverageSaving] = useState(false);

  const orders = store.getOrders();
  const products = store.getAllProducts();
  const categories = store.getAllCategories();
  const zones = store.getAllZones();
  const customers = store.getCustomers();
  const staff = store.getStaff();
  const pendingOrderIds = orders.filter((order) => order.order_status === 'PENDING').map((order) => order.id).join('|');

  useEffect(() => {
    const unsubscribe = store.subscribe(() => setStoreRevision((revision) => revision + 1));
    void store.refreshCustomers().catch(() => undefined);
    void store.refreshStaff().catch(() => undefined);
    void store.refreshOrders().catch(() => undefined);
    const orderRefreshTimer = window.setInterval(() => { void store.refreshOrders().catch(() => undefined); }, 5000);
    fetch('https://geobj.emunadigitalsolution.com/api/v1/departements').then((response) => response.json()).then((result) => { if (Array.isArray(result.data)) setDepartmentOptions(result.data); }).catch(() => undefined);
    return () => { unsubscribe(); window.clearInterval(orderRefreshTimer); };
  }, []);

  useEffect(() => {
    const ids = new Set(pendingOrderIds ? pendingOrderIds.split('|') : []);
    if (pendingSeenRef.current === null) { pendingSeenRef.current = ids; return; }
    const newIds = [...ids].filter((id) => !pendingSeenRef.current?.has(id));
    pendingSeenRef.current = ids;
    if (!newIds.length) return;
    setToastMessage(`${newIds.length} nouvelle${newIds.length > 1 ? 's' : ''} commande${newIds.length > 1 ? 's' : ''} à traiter.`);
    const context = orderAudioRef.current;
    if (orderSoundEnabled && context) {
      const oscillator = context.createOscillator(); const gain = context.createGain();
      oscillator.frequency.value = 740; gain.gain.setValueAtTime(0.0001, context.currentTime); gain.gain.exponentialRampToValueAtTime(0.2, context.currentTime + 0.03); gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.5);
      oscillator.connect(gain); gain.connect(context.destination); oscillator.start(); oscillator.stop(context.currentTime + 0.55);
    }
  }, [pendingOrderIds, orderSoundEnabled]);

  const enableOrderSound = async () => {
    if (!window.AudioContext) { showToast('Le son des notifications n’est pas pris en charge.'); return; }
    const context = orderAudioRef.current || new window.AudioContext(); orderAudioRef.current = context;
    await context.resume(); setOrderSoundEnabled(true); showToast('Alerte sonore des nouvelles commandes activée.');
  };

  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 sm:p-8 bg-white rounded-3xl border border-neutral-200 shadow-xl text-center space-y-4 animate-in fade-in duration-200">
        <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
          <Lock className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <h2 className="font-display font-black text-2xl text-neutral-900">
            Espace Direction Ola Ice
          </h2>
          <p className="text-xs sm:text-sm text-neutral-500 max-w-xs mx-auto leading-relaxed">
            L'accès aux commandes, aux finances et à la gestion du catalogue est strictement réservé à la direction.
          </p>
        </div>

        <button
          onClick={onOpenLogin}
          className="w-full py-3.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-2xl text-sm transition-all shadow-md flex items-center justify-center gap-2"
        >
          <ShieldCheck className="w-4 h-4" />
          <span>S'identifier (Code Secret Direction)</span>
        </button>
      </div>
    );
  }

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Metrics
  const totalRevenue = orders
    .filter((o) => o.order_status === 'DELIVERED')
    .reduce((sum, o) => sum + o.total, 0);

  const pendingOrders = orders.filter((o) => o.order_status === 'PENDING').length;
  const preparingOrders = orders.filter((o) => o.order_status === 'PREPARING' || o.order_status === 'CONFIRMED').length;
  const outOrders = orders.filter((o) => o.order_status === 'OUT_FOR_DELIVERY').length;
  const deliveredOrders = orders.filter((o) => o.order_status === 'DELIVERED').length;

  // Filter orders
  const filteredOrders = orders.filter((o) => {
    const matchesStatus = statusFilter === 'all' || o.order_status === statusFilter;
    const matchesSearch =
      searchQuery === '' ||
      o.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.customer_phone.includes(searchQuery);
    return matchesStatus && matchesSearch;
  });

  const handleStatusChange = async (
    orderId: string,
    targetStatus: OrderStatus,
    agentName?: string
  ) => {
    const res = await store.updateOrderStatus(
      orderId,
      targetStatus,
      'Administrateur Ola Ice',
      `Passage rapide à ${STATUS_CONFIG[targetStatus]?.label || targetStatus}`,
      agentName
    );

    if (!res.success) {
      showToast(`⚠️ Erreur : ${res.error}`);
    } else {
      showToast(`✓ Commande mise à jour : ${STATUS_CONFIG[targetStatus]?.label || targetStatus}`);
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder(store.getOrderById(orderId) || null);
      }
    }
  };

  const handleSaveVariant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVariant) return;
    try {
      await store.updateVariant(editingVariant);
      setEditingVariant(null);
      showToast('✓ Tarif et stock produit enregistrés avec succès !');
    } catch (error) {
      showToast(`⚠️ ${error instanceof Error ? error.message : 'Enregistrement impossible.'}`);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    try { await store.updateProduct(editingProduct); setEditingProduct(null); showToast('✓ Produit enregistré.'); }
    catch (error) { showToast(`⚠️ ${error instanceof Error ? error.message : 'Enregistrement impossible.'}`); }
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;
    try { await store.updateCategory(editingCategory); setEditingCategory(null); showToast('✓ Catégorie enregistrée.'); }
    catch (error) { showToast(`⚠️ ${error instanceof Error ? error.message : 'Enregistrement impossible.'}`); }
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer) return;
    try { if (editingCustomer.id) await store.updateCustomer(editingCustomer); else await store.createCustomer({ fullName: editingCustomer.fullName, phone: editingCustomer.phone, email: editingCustomer.email }); setEditingCustomer(null); showToast('✓ Fiche client enregistrée.'); }
    catch (error) { showToast(`⚠️ ${error instanceof Error ? error.message : 'Enregistrement impossible.'}`); }
  };

  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff?.name || !editingStaff.role) return;
    if (editingStaff.role === 'delivery' && (!editingStaff.departments?.length || !editingStaff.phone || !editingStaff.licensePlate)) {
      setCoverageDraft({ ...editingStaff, role: 'delivery', departments: editingStaff.departments || [], phone: editingStaff.phone || '', licensePlate: editingStaff.licensePlate || '' });
      setEditingStaff(null);
      return;
    }
    try { await store.saveStaff({ ...editingStaff, name: editingStaff.name, role: editingStaff.role, zone: editingStaff.zone || '' }); setEditingStaff(null); showToast('✓ Compte personnel enregistré.'); }
    catch (error) { showToast(`⚠️ ${error instanceof Error ? error.message : 'Enregistrement impossible.'}`); }
  };

  const handleSaveCoverage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coverageDraft?.name?.trim() || !coverageDraft.departments?.length || !coverageDraft.phone?.trim() || !coverageDraft.licensePlate?.trim()) { showToast('Indiquez le nom, les départements, le téléphone et la plaque du livreur.'); return; }
    if (coverageSaving) return;
    setCoverageSaving(true);
    setCoverageSaveError(null);
    try {
      await store.saveStaff({ ...coverageDraft, name: coverageDraft.name.trim(), role: 'delivery', zone: coverageDraft.zone || '' });
      setCoverageDraft(null);
      showToast('Profil et départements du livreur enregistrés.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Enregistrement impossible.';
      setCoverageSaveError(/401|connexion du personnel/i.test(message) ? 'Votre session administrateur a expiré. Fermez cette fenêtre, reconnectez-vous comme administrateur, puis réessayez.' : message);
    } finally { setCoverageSaving(false); }
  };

  const handleSaveZone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingZone) return;
    try {
      await store.updateZone(editingZone);
      setEditingZone(null);
      showToast(`✓ Zone "${editingZone.name}" mise à jour avec succès !`);
    } catch (error) {
      showToast(`⚠️ ${error instanceof Error ? error.message : 'Enregistrement impossible.'}`);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-neutral-900 text-white text-xs sm:text-sm font-semibold px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-neutral-700 animate-in slide-in-from-bottom-3 duration-200">
          <span>{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="text-neutral-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-2xl border border-neutral-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-rose-600 mb-1">
            <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping" />
            <span>Gestion des Opérations & Ventes</span>
          </div>
          <h1 className="font-display font-black text-2xl sm:text-3xl text-neutral-900 tracking-tight">
            Tableau de Bord Administrateur
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 mt-1">
            Gérez le flux des commandes, assignez les livreurs et ajustez les prix de gros et détail.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onLogout && (
            <button
              onClick={onLogout}
              className="px-3.5 py-2 bg-neutral-100 hover:bg-rose-50 text-neutral-700 hover:text-rose-700 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 shrink-0 border border-neutral-200"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Déconnexion</span>
            </button>
          )}

        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 sm:p-5 bg-white rounded-2xl border border-neutral-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-neutral-500 font-semibold">
            <span>CA Livré & Encaissé</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="font-mono font-black text-xl sm:text-2xl text-neutral-900 tabular-nums">
            {totalRevenue.toLocaleString('fr-FR')}{' '}
            <span className="text-xs font-sans text-neutral-500 font-normal">F CFA</span>
          </div>
          <div className="text-[11px] text-emerald-600 font-bold">
            {deliveredOrders} commande(s) finalisée(s)
          </div>
        </div>

        <div className="p-4 sm:p-5 bg-white rounded-2xl border border-neutral-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-neutral-500 font-semibold">
            <span>Nouvelles (À valider)</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="font-mono font-black text-xl sm:text-2xl text-amber-600 tabular-nums">
            {pendingOrders}
          </div>
          <div className="text-[11px] text-amber-700 font-medium">Validation immédiate requise</div>
        </div>

        <div className="p-4 sm:p-5 bg-white rounded-2xl border border-neutral-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-neutral-500 font-semibold">
            <span>En préparation</span>
            <ShoppingBag className="w-4 h-4 text-rose-500" />
          </div>
          <div className="font-mono font-black text-xl sm:text-2xl text-rose-600 tabular-nums">
            {preparingOrders}
          </div>
          <div className="text-[11px] text-neutral-500">Mise sous sacs isothermes</div>
        </div>

        <div className="p-4 sm:p-5 bg-white rounded-2xl border border-neutral-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-neutral-500 font-semibold">
            <span>En cours de livraison</span>
            <Truck className="w-4 h-4 text-sky-500" />
          </div>
          <div className="font-mono font-black text-xl sm:text-2xl text-sky-600 tabular-nums">
            {outOrders}
          </div>
          <div className="text-[11px] text-sky-700 font-semibold">Livreurs en déplacement</div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-neutral-200 overflow-x-auto pb-px">
        <button
          onClick={() => setActiveTab('orders')}
          className={`px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all shrink-0 ${
            activeTab === 'orders'
              ? 'border-rose-600 text-rose-600'
              : 'border-transparent text-neutral-500 hover:text-neutral-900'
          }`}
        >
          Toutes les Commandes ({orders.length})
        </button>
        <button
          onClick={() => setActiveTab('products')}
          className={`px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all shrink-0 ${
            activeTab === 'products'
              ? 'border-rose-600 text-rose-600'
              : 'border-transparent text-neutral-500 hover:text-neutral-900'
          }`}
        >
          Produits, Tarifs & Stocks ({products.length})
        </button>
        <button
          onClick={() => setActiveTab('categories')}
          className={`px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all shrink-0 ${activeTab === 'categories' ? 'border-rose-600 text-rose-600' : 'border-transparent text-neutral-500 hover:text-neutral-900'}`}
        >
          Catégories ({categories.length})
        </button>
        <button
          onClick={() => setActiveTab('zones')}
          className={`px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all shrink-0 ${
            activeTab === 'zones'
              ? 'border-rose-600 text-rose-600'
              : 'border-transparent text-neutral-500 hover:text-neutral-900'
          }`}
        >
          Zones de Livraison ({zones.length})
        </button>
        <button
          onClick={() => setActiveTab('customers')}
          className={`px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all shrink-0 ${
            activeTab === 'customers'
              ? 'border-rose-600 text-rose-600'
              : 'border-transparent text-neutral-500 hover:text-neutral-900'
          }`}
        >
          Clients ({customers.length})
        </button>
        <button
          onClick={() => setActiveTab('staff')}
          className={`px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all shrink-0 ${activeTab === 'staff' ? 'border-rose-600 text-rose-600' : 'border-transparent text-neutral-500 hover:text-neutral-900'}`}
        >
          Équipe ({staff.length})
        </button>
        <button
          onClick={() => setActiveTab('popups')}
          className={`px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all shrink-0 ${activeTab === 'popups' ? 'border-rose-600 text-rose-600' : 'border-transparent text-neutral-500 hover:text-neutral-900'}`}
        >
          Pop-ups & produits
        </button>
      </div>

      {activeTab === 'popups' && (() => {
        const campaign = popupQueueService.getAllCampaigns().find((item) => item.type === 'new_arrivals');
        if (!campaign) return null;
        const selected = campaign.featuredProductIds || [];
        const toggle = (id: string) => popupQueueService.updateCampaign({
          ...campaign,
          featuredProductIds: selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id],
        });
        return <section className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-4 sm:p-6 shadow-xs">
          <div><h2 className="font-display text-lg font-black text-neutral-900">Produits du pop-up nouveautés</h2><p className="mt-1 text-sm text-neutral-500">Choisissez les produits qui apparaîtront. Les changements sont enregistrés dans ce navigateur et appliqués immédiatement.</p></div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {products.filter((product) => product.status === 'active').map((product) => <label key={product.id} className="flex cursor-pointer items-center gap-3 rounded-xl border border-neutral-200 p-3 hover:border-rose-300">
              <input type="checkbox" checked={selected.includes(product.id)} onChange={() => toggle(product.id)} className="h-4 w-4 accent-rose-600" />
              {product.main_image && <img src={product.main_image} alt="" className="h-12 w-12 rounded-lg object-cover" />}
              <span className="text-sm font-semibold text-neutral-800">{product.name}</span>
            </label>)}
          </div>
          {selected.length === 0 && <p className="text-sm text-amber-700">Sélectionnez au moins un produit pour alimenter le pop-up.</p>}
        </section>;
      })()}

      {/* Tab 1: Orders Management */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          <div className="flex justify-end"><button type="button" onClick={() => void enableOrderSound()} className={`rounded-xl px-3 py-2 text-xs font-bold ${orderSoundEnabled ? 'bg-emerald-100 text-emerald-800' : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'}`}>{orderSoundEnabled ? 'Alerte sonore activée' : 'Activer les alertes sonores de commande'}</button></div>
          {/* Controls: Search & Status Filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 sm:p-4 rounded-2xl border border-neutral-200 shadow-xs">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-3 text-neutral-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher par n°, nom, téléphone..."
                className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-neutral-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 bg-neutral-50/50"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
              <span className="text-xs font-semibold text-neutral-500 flex items-center gap-1 mr-1 shrink-0">
                <Filter className="w-3.5 h-3.5" />
                Filtre :
              </span>
              {[
                { id: 'all', label: 'Tous' },
                { id: 'PENDING', label: 'En attente' },
                { id: 'CONFIRMED', label: 'Confirmées' },
                { id: 'PREPARING', label: 'En préparation' },
                { id: 'READY', label: 'Prêtes' },
                { id: 'ASSIGNED', label: 'Livreur accepté' },
                { id: 'PICKED_UP', label: 'Colis récupéré' },
                { id: 'OUT_FOR_DELIVERY', label: 'En livraison' },
                { id: 'DELIVERED', label: 'Livrées' },
                { id: 'CANCELLED', label: 'Annulées' },
              ].map((st) => (
                <button
                  key={st.id}
                  onClick={() => setStatusFilter(st.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                    statusFilter === st.id
                      ? 'bg-neutral-900 text-white shadow-xs'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          {/* Orders Table with Direct Quick-Actions & Desktop Optimization */}
          <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse min-w-[900px]">
                <thead className="bg-neutral-50 text-neutral-600 font-bold uppercase tracking-wider border-b border-neutral-200">
                  <tr>
                    <th className="p-3.5">Numéro & Date</th>
                    <th className="p-3.5">Client & Contact</th>
                    <th className="p-3.5">Zone & Lieu</th>
                    <th className="p-3.5">Montant</th>
                    <th className="p-3.5">Statut Actuel</th>
                    <th className="p-3.5">Livreur Assigné</th>
                    <th className="p-3.5 text-right">Actions Rapides</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-neutral-400">
                        Aucune commande trouvée.
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((ord) => {
                      const statusInfo = STATUS_CONFIG[ord.order_status] || {
                        label: ord.order_status,
                        bg: 'bg-neutral-100',
                        text: 'text-neutral-800',
                        border: 'border-neutral-200',
                      };

                      return (
                        <tr key={ord.id} className="hover:bg-neutral-50/80 transition-colors">
                          <td className="p-3.5 font-medium">
                            <div className="font-mono font-bold text-neutral-900">{ord.order_number}</div>
                            <div className="text-[11px] text-neutral-500">
                              {new Date(ord.placed_at).toLocaleTimeString('fr-FR', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                          </td>
                          <td className="p-3.5">
                            <div className="font-bold text-neutral-900">{ord.customer_name}</div>
                            <a
                              href={`tel:${ord.customer_phone}`}
                              className="font-mono text-neutral-600 text-[11px] hover:text-rose-600 flex items-center gap-1"
                            >
                              <Phone className="w-3 h-3 text-rose-500" />
                              <span>{ord.customer_phone}</span>
                            </a>
                          </td>
                          <td className="p-3.5">
                            <div className="font-semibold text-neutral-800">{ord.delivery_zone_name}</div>
                            <div className="text-neutral-500 text-[11px] truncate max-w-[170px]" title={ord.delivery_address}>
                              {ord.delivery_address}
                            </div>
                          </td>
                          <td className="p-3.5 font-mono font-bold tabular-nums text-neutral-900 text-sm">
                            {ord.total.toLocaleString('fr-FR')} F
                          </td>
                          <td className="p-3.5">
                            {/* Direct Status Selector */}
                            <select
                              value={ord.order_status}
                              onChange={(e) =>
                                handleStatusChange(ord.id, e.target.value as OrderStatus)
                              }
                              className={`px-2 py-1 rounded-lg text-xs font-bold border ${statusInfo.bg} ${statusInfo.text} ${statusInfo.border} focus:outline-none focus:ring-1 focus:ring-rose-500 cursor-pointer`}
                            >
                              <option value="PENDING">⏳ En attente</option>
                              <option value="CONFIRMED">✓ Confirmée</option>
                              <option value="PREPARING">👨‍🍳 En préparation</option>
                              <option value="READY">📦 Prête</option>
                              <option value="ASSIGNED" disabled>✓ Livreur accepté</option>
                              <option value="PICKED_UP" disabled>🛍️ Colis récupéré</option>
                              <option value="OUT_FOR_DELIVERY" disabled>🛵 En livraison (livreur)</option>
                              <option value="DELIVERED" disabled>✓ Livrée & Encaissée (livreur)</option>
                              <option value="FAILED_DELIVERY" disabled>⚠️ Échec livraison (livreur)</option>
                              <option value="CANCELLED">✕ Annulée</option>
                            </select>
                          </td>
                          <td className="p-3.5 text-xs">
                            {ord.delivery_agent_name ? <div className="font-semibold text-sky-800">{ord.delivery_agent_name}</div> : <div className="font-medium text-neutral-500">{ord.delivery_assignment_status === 'offered' ? 'Offerte aux livreurs du département' : ord.delivery_assignment_status === 'auto_assigned' ? `Livreur sélectionné : ${ord.delivery_selected_agent_name || 'confirmation en attente'}` : ord.delivery_assignment_status === 'unmatched' ? 'Aucun livreur configuré pour ce département' : 'Attribution en attente de préparation'}</div>}
                            {ord.delivery_agent_plate && <div className="text-[10px] text-neutral-500">Plaque {ord.delivery_agent_plate}</div>}
                          </td>
                          <td className="p-3.5 text-right space-x-1.5 whitespace-nowrap">
                            {/* ONE-CLICK ACTION BUTTONS */}
                            {ord.order_status === 'PENDING' && (
                              <button
                                onClick={() => handleStatusChange(ord.id, 'CONFIRMED')}
                                className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs inline-flex items-center gap-1"
                                title="Valider immédiatement la commande"
                              >
                                <Check className="w-3 h-3" />
                                <span>Valider</span>
                              </button>
                            )}

                            {ord.order_status === 'FAILED_DELIVERY' && (
                              <button
                                onClick={() => handleStatusChange(ord.id, 'OUT_FOR_DELIVERY')}
                                className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs inline-flex items-center gap-1"
                              >
                                <RotateCcw className="w-3 h-3" />
                                <span>Relancer</span>
                              </button>
                            )}

                            <button
                              onClick={() => setSelectedOrder(ord)}
                              className="px-2.5 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1"
                            >
                              <Eye className="w-3 h-3" />
                              <span>Fiche</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Products & Stock Management */}
      {activeTab === 'products' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-neutral-200 bg-neutral-50 flex items-center justify-between">
              <div className="flex w-full items-center justify-between gap-3">
                <div>
                <h3 className="font-display font-bold text-base text-neutral-900">
                  Catalogue Produits, Formats et Tarifs
                </h3>
                <p className="text-xs text-neutral-500">
                  Modifiez les prix unitaires, les tarifs de gros pour revendeuses et gérez les stocks physiques.
                </p>
                </div>
                <button type="button" onClick={() => setEditingProduct({ id: crypto.randomUUID(), category_id: categories.find((item) => item.is_active !== false)?.id || '', name: '', slug: '', short_description: '', description: '', main_image: '', status: 'draft', is_featured: false, allow_wholesale: false, created_at: new Date().toISOString() })} className="flex shrink-0 items-center gap-1.5 rounded-xl bg-rose-600 px-3 py-2 text-xs font-bold text-white hover:bg-rose-700"><Plus className="h-4 w-4" />Ajouter un produit</button>
              </div>
            </div>

            <div className="divide-y divide-neutral-100">
              {products.map((product) => {
                const variants = store.getAllVariantsForProduct(product.id);
                return (
                  <div key={product.id} className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <img
                          src={product.main_image}
                          alt={product.name}
                          className="w-12 h-12 rounded-lg object-cover bg-neutral-100 shrink-0"
                          referrerPolicy="no-referrer"
                        />
                        <div>
                          <div className="font-bold text-sm text-neutral-900">{product.name}</div>
                          <div className="text-xs text-neutral-500 line-clamp-1">
                            {product.short_description}
                          </div>
                        </div>
                      </div>

                      {product.allow_wholesale && (
                        <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                          Éligible Gros
                        </span>
                      )}
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold ${product.status === 'active' ? 'text-emerald-700' : 'text-neutral-500'}`}>{product.status === 'active' ? 'En boutique' : product.status === 'archived' ? 'Archivé' : 'Brouillon'}</span>
                        <button type="button" onClick={() => setEditingProduct({ ...product })} className="rounded-lg border border-neutral-200 bg-white px-2.5 py-1 text-[11px] font-bold text-neutral-700"><Pencil className="mr-1 inline h-3 w-3" />Modifier</button>
                        {product.status === 'archived' ? <button type="button" onClick={() => setEditingProduct({ ...product, status: 'draft' })} className="text-[11px] font-bold text-sky-700">Réactiver</button> : <button type="button" onClick={() => { if (window.confirm(`Archiver « ${product.name} » ?`)) void store.archiveCatalog('product', product.id).then(() => showToast('Produit archivé.')).catch((error) => showToast(error.message)); }} className="text-[11px] font-bold text-neutral-500"><Archive className="mr-1 inline h-3 w-3" />Archiver</button>}
                      </div>
                    </div>

                    {/* Variants list table */}
                    <div className="bg-neutral-50 rounded-xl p-3 border border-neutral-200">
                      <div className="mb-2 flex items-center justify-between gap-2"><div className="text-xs font-bold text-neutral-600">Formats & Variantes configurés :</div><button type="button" onClick={() => setEditingVariant({ id: crypto.randomUUID(), product_id: product.id, name: '', sku: `SKU-${crypto.randomUUID().slice(0, 8).toUpperCase()}`, price: 0, stock_quantity: 0, track_stock: true, is_active: true })} className="flex items-center gap-1 text-[11px] font-bold text-rose-700"><Plus className="h-3.5 w-3.5" />Ajouter un format</button></div>
                      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                        {variants.map((variant) => (
                          <div
                            key={variant.id}
                            className="bg-white p-3 rounded-lg border border-neutral-200 text-xs space-y-1.5 shadow-xs"
                          >
                            <div className="flex justify-between font-bold text-neutral-900">
                              <span className="truncate">{variant.name}</span>
                              <span className="font-mono tabular-nums text-rose-600">
                                {variant.price.toLocaleString('fr-FR')} F
                              </span>
                            </div>
                            {!variant.is_active && <div className="text-[10px] font-bold text-neutral-400">Format désactivé</div>}

                            <div className="flex justify-between text-neutral-500 text-[11px]">
                              <span>Stock : {variant.stock_quantity} unités</span>
                              {variant.wholesale_price && (
                                <span className="text-amber-700 font-semibold">
                                  Gros dès {variant.wholesale_min_quantity} : {variant.wholesale_price} F
                                </span>
                              )}
                            </div>

                            <div className="flex gap-1"><button onClick={() => setEditingVariant({ ...variant })} className="mt-1 flex-1 rounded bg-neutral-100 py-1 text-center text-[11px] font-bold text-neutral-700 transition-colors hover:bg-neutral-200">Modifier</button>{variant.is_active ? <button type="button" onClick={() => { if (window.confirm(`Désactiver le format « ${variant.name} » ?`)) void store.archiveCatalog('variant', variant.id).then(() => showToast('Format désactivé.')); }} className="mt-1 rounded px-2 text-[11px] font-bold text-neutral-500">Désactiver</button> : <button type="button" onClick={() => void store.updateVariant({ ...variant, is_active: true }).then(() => showToast('Format réactivé.'))} className="mt-1 rounded px-2 text-[11px] font-bold text-sky-700">Réactiver</button>}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'categories' && (
        <section className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between gap-3"><div><h3 className="font-display text-base font-bold text-neutral-900">Catégories du catalogue</h3><p className="text-xs text-neutral-500">Créer, modifier ou désactiver une catégorie. Les produits liés restent conservés.</p></div><button type="button" onClick={() => setEditingCategory({ id: crypto.randomUUID(), name: '', slug: '', description: '', is_active: true, sort_order: categories.length + 1 })} className="flex shrink-0 items-center gap-1.5 rounded-xl bg-rose-600 px-3 py-2 text-xs font-bold text-white"><Plus className="h-4 w-4" />Ajouter</button></div>
          <div className="divide-y divide-neutral-100">{categories.map((category) => <div key={category.id} className="flex items-center justify-between gap-3 py-3"><div><div className="font-semibold text-sm text-neutral-900">{category.name}</div><div className="text-xs text-neutral-500">{category.description}</div><div className="text-[10px] text-neutral-400">{category.is_active === false ? 'Désactivée' : 'Active'}</div></div><div className="flex items-center gap-2"><button type="button" onClick={() => setEditingCategory({ ...category })} className="rounded-lg border border-neutral-200 px-2.5 py-1.5 text-[11px] font-bold text-neutral-700"><Pencil className="mr-1 inline h-3 w-3" />Modifier</button>{category.is_active === false ? <button type="button" onClick={() => void store.updateCategory({ ...category, is_active: true }).then(() => showToast('Catégorie réactivée.'))} className="text-[11px] font-bold text-sky-700">Réactiver</button> : <button type="button" onClick={() => { if (window.confirm(`Désactiver la catégorie « ${category.name} » ?`)) void store.archiveCatalog('category', category.id).then(() => showToast('Catégorie désactivée.')); }} className="text-[11px] font-bold text-neutral-500"><Archive className="mr-1 inline h-3 w-3" />Désactiver</button>}</div></div>)}</div>
        </section>
      )}

      {/* Tab 3: Delivery Zones */}
      {activeTab === 'zones' && (
        <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
            <h3 className="font-display font-bold text-base text-neutral-900">
              Zones de Livraison Desservies
            </h3>
            <p className="text-xs text-neutral-500">
              Ajustez les frais de livraison et les délais moyens par secteur urbain.
            </p>
            </div>
            <button type="button" onClick={() => setEditingZone({ id: crypto.randomUUID(), name: '', delivery_fee: 0, minimum_order: 0, estimated_duration: '30 - 45 min', is_active: true })} className="flex shrink-0 items-center gap-1.5 rounded-xl bg-rose-600 px-3 py-2 text-xs font-bold text-white"><Plus className="h-4 w-4" />Ajouter</button>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            {zones.map((zone) => (
              <div
                key={zone.id}
                className="p-4 bg-neutral-50 rounded-xl border border-neutral-200 space-y-2 text-xs"
              >
                <div className="flex items-center justify-between font-bold text-neutral-900 text-sm">
                  <span>{zone.name}</span>
                  <span className="font-mono text-rose-600 tabular-nums">
                    {zone.delivery_fee === 0 ? 'Gratuit' : `${zone.delivery_fee.toLocaleString('fr-FR')} F`}
                  </span>
                </div>
                <div className="text-neutral-600 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-neutral-400" />
                  <span>Délai estimé : {zone.estimated_duration}</span>
                </div>
                {zone.location?.department_name && <div className="text-[11px] text-neutral-500">{zone.location.department_name} · {zone.location.commune_name} · {zone.location.arrondissement_name} · {zone.location.quarter_name}</div>}
                <div className="pt-2 flex items-center justify-between">
                  <span
                    className={`font-semibold ${
                      zone.is_active ? 'text-emerald-700' : 'text-neutral-400'
                    }`}
                  >
                    {zone.is_active ? '✓ Zone Active' : 'Désactivée'}
                  </span>
                  <button
                    onClick={() => setEditingZone({ ...zone })}
                    className="px-2.5 py-1 bg-white hover:bg-neutral-100 border border-neutral-200 rounded font-bold text-neutral-700 cursor-pointer"
                  >
                    Modifier
                  </button>
                  {zone.is_active ? <button type="button" onClick={() => { if (window.confirm(`Désactiver la zone « ${zone.name} » ?`)) void store.archiveCatalog('zone', zone.id).then(() => showToast('Zone désactivée.')); }} className="text-[11px] font-bold text-neutral-500"><Archive className="mr-1 inline h-3 w-3" />Désactiver</button> : <button type="button" onClick={() => void store.updateZone({ ...zone, is_active: true }).then(() => showToast('Zone réactivée.'))} className="text-[11px] font-bold text-sky-700">Réactiver</button>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'customers' && (
        <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden shadow-xs">
          <div className="p-4 sm:p-5 border-b border-neutral-100 flex items-center justify-between gap-3">
            <h3 className="font-display font-bold text-base text-neutral-900">Clients ayant passé commande</h3>
            <p className="text-xs text-neutral-500 mt-1">Les coordonnées restent visibles uniquement dans l’espace direction.</p>
            <button type="button" onClick={() => setEditingCustomer({ id: '', fullName: '', phone: '', email: '', createdAt: new Date().toISOString(), lastActiveAt: new Date().toISOString(), is_active: true })} className="flex shrink-0 items-center gap-1.5 rounded-xl bg-rose-600 px-3 py-2 text-xs font-bold text-white"><Plus className="h-4 w-4"/>Ajouter un client</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[620px]">
              <thead className="bg-neutral-50 text-neutral-600 font-bold uppercase tracking-wider">
                <tr><th className="p-3.5">Nom</th><th className="p-3.5">Téléphone</th><th className="p-3.5">Commandes</th><th className="p-3.5">Dernière activité</th><th>Actions</th></tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {customers.length === 0 ? <tr><td colSpan={5} className="p-8 text-center text-neutral-400">Aucun client enregistré pour le moment.</td></tr> : customers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-neutral-50/70">
                    <td className="p-3.5 font-semibold text-neutral-900">{customer.fullName}</td>
                    <td className="p-3.5"><a className="text-sky-700 hover:underline" href={`tel:${customer.phone}`}>{customer.phone}</a></td>
                    <td className="p-3.5 tabular-nums">{orders.filter((order) => order.customer_id === customer.id).length}</td>
                    <td className="p-3.5 text-neutral-500">{new Date(customer.lastActiveAt || customer.createdAt).toLocaleDateString('fr-FR')}</td>
                    <td className="p-3.5"><button type="button" onClick={() => setEditingCustomer({ ...customer })} className="mr-2 rounded-lg border border-neutral-200 px-2 py-1 font-bold"><Pencil className="inline h-3 w-3"/> Modifier</button>{customer.is_active === false ? <button type="button" onClick={() => void store.updateCustomer({ ...customer, is_active: true }).then(() => showToast('Client réactivé.'))} className="text-sky-700 font-bold">Réactiver</button> : <button type="button" onClick={() => { if (window.confirm(`Désactiver ${customer.fullName} ?`)) void store.archiveCustomer(customer.id).then(() => showToast('Client désactivé.')); }} className="text-neutral-500 font-bold"><Archive className="inline h-3 w-3"/> Désactiver</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'staff' && <section className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-4 shadow-xs">
        <div className="flex items-center justify-between gap-3"><div><h3 className="font-display text-base font-bold text-neutral-900">Comptes du personnel</h3><p className="text-xs text-neutral-500">Gérez les accès et départements de livraison des livreurs.</p></div><button type="button" onClick={() => setEditingStaff({ name: '', role: 'delivery', zone: '', departments: [], phone: '', licensePlate: '', is_active: true, pin: '' })} className="flex shrink-0 items-center gap-1.5 rounded-xl bg-rose-600 px-3 py-2 text-xs font-bold text-white"><Plus className="h-4 w-4"/>Ajouter un compte</button></div>
        <div className="divide-y divide-neutral-100">{staff.map((person) => <div key={person.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><div className="font-semibold text-sm text-neutral-900">{person.name}</div><div className="text-xs text-neutral-500">{person.role === 'admin' ? 'Direction' : 'Livreur'}{person.zone ? ` · ${person.zone}` : ''} · {person.is_active ? 'Actif' : 'Désactivé'}</div></div><div className="flex items-center gap-2"><button type="button" onClick={() => setEditingStaff({ ...person, pin: '' })} className="rounded-lg border border-neutral-200 px-2.5 py-1.5 text-[11px] font-bold"><Pencil className="mr-1 inline h-3 w-3"/>Modifier</button>{person.is_active ? <button type="button" onClick={() => { if (window.confirm(`Désactiver le compte de ${person.name} ?`)) void store.archiveStaff(person.id).then(() => showToast('Compte désactivé.')); }} className="text-[11px] font-bold text-neutral-500"><Archive className="mr-1 inline h-3 w-3"/>Désactiver</button> : <button type="button" onClick={() => void store.saveStaff({ ...person, is_active: true }).then(() => showToast('Compte réactivé.'))} className="text-[11px] font-bold text-sky-700">Réactiver</button>}</div></div>)}</div>
      </section>}

      {activeTab === 'staff' && <section className="space-y-3 rounded-2xl border border-sky-200 bg-sky-50/50 p-4 shadow-xs">
        <div><h3 className="font-display text-base font-bold text-neutral-900">Couverture et coordonnées des livreurs</h3><p className="text-xs text-neutral-600">Chaque livreur ne recevra que les courses des départements sélectionnés. Le premier à accepter une offre la prend en charge.</p></div>
        <div className="flex flex-wrap gap-2">{staff.filter((person) => person.role === 'delivery').map((person) => <button key={person.id} type="button" onClick={() => setCoverageDraft({ ...person, role: 'delivery', pin: '' })} className="rounded-xl border border-sky-200 bg-white px-3 py-2 text-xs font-bold text-sky-900 hover:border-sky-400">Configurer {person.name}</button>)}<button type="button" onClick={() => setCoverageDraft({ role: 'delivery', name: '', zone: '', departments: [], phone: '', licensePlate: '', pin: '', is_active: true })} className="rounded-xl bg-sky-700 px-3 py-2 text-xs font-bold text-white">Ajouter un livreur et choisir ses départements</button></div>
        {staff.filter((person) => person.role === 'delivery').map((person) => <div key={`${person.id}-coverage`} className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-neutral-700"><strong>{person.name}</strong><span>{(person.departments || []).map((code) => departmentOptions.find((item) => item.code === code)?.nom || code).join(', ') || 'Aucun département configuré'}</span>{person.phone && <span>Tél. {person.phone}</span>}{person.licensePlate && <span>Plaque {person.licensePlate}</span>}</div>)}
      </section>}

      {coverageDraft && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"><form onSubmit={handleSaveCoverage} className="max-h-[90vh] w-full max-w-lg space-y-3 overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl">
        <div className="flex items-center justify-between"><h3 className="font-display text-lg font-black">{coverageDraft.id ? 'Départements et fiche livreur' : 'Nouveau livreur'}</h3><button type="button" onClick={() => setCoverageDraft(null)}><X className="h-4 w-4"/></button></div>
        <label className="block text-xs font-semibold">Nom complet<input required value={coverageDraft.name || ''} onChange={(e) => setCoverageDraft({ ...coverageDraft, name: e.target.value })} className="mt-1 w-full rounded-lg border p-2"/></label>
        <label className="block text-xs font-semibold">Départements desservis (choix multiple)<select multiple required value={coverageDraft.departments || []} onChange={(e) => setCoverageDraft({ ...coverageDraft, departments: Array.from(e.currentTarget.selectedOptions, (option) => option.value) })} className="mt-1 h-40 w-full rounded-lg border p-2">{departmentOptions.map((department) => <option key={department.code} value={department.code}>{department.nom}</option>)}</select><span className="mt-1 block text-[10px] font-normal text-neutral-500">Sur ordinateur, maintenez Ctrl pour choisir plusieurs départements.</span></label>
        <div className="grid grid-cols-2 gap-2"><label className="block text-xs font-semibold">Téléphone du livreur *<input required value={coverageDraft.phone || ''} onChange={(e) => setCoverageDraft({ ...coverageDraft, phone: e.target.value })} className="mt-1 w-full rounded-lg border p-2"/></label><label className="block text-xs font-semibold">Plaque de la moto *<input required value={coverageDraft.licensePlate || ''} onChange={(e) => setCoverageDraft({ ...coverageDraft, licensePlate: e.target.value })} className="mt-1 w-full rounded-lg border p-2"/></label></div>
        <label className="block text-xs font-semibold">Secteur<input value={coverageDraft.zone || ''} onChange={(e) => setCoverageDraft({ ...coverageDraft, zone: e.target.value })} className="mt-1 w-full rounded-lg border p-2"/></label>
        <label className="block text-xs font-semibold">Code PIN {coverageDraft.id ? '(laisser vide pour conserver)' : '(6 caractères minimum)'}<input type="password" minLength={coverageDraft.id ? 0 : 6} required={!coverageDraft.id} value={coverageDraft.pin || ''} onChange={(e) => setCoverageDraft({ ...coverageDraft, pin: e.target.value })} className="mt-1 w-full rounded-lg border p-2"/></label>
        {coverageSaveError && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800">{coverageSaveError}</div>}
        <button disabled={coverageSaving} className="w-full rounded-xl bg-sky-700 py-2.5 font-bold text-white disabled:cursor-wait disabled:opacity-60">{coverageSaving ? 'Enregistrement…' : 'Enregistrer le profil livreur'}</button>
      </form></div>}

      {/* Selected Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-4 sm:p-6 space-y-5 my-8 shadow-2xl animate-in zoom-in-95 duration-150 border border-neutral-200">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-neutral-200 pb-3">
              <div>
                <span className="text-xs font-bold text-rose-600 uppercase tracking-wider">
                  Détail de la Commande
                </span>
                <h2 className="font-display font-black text-xl sm:text-2xl text-neutral-900 font-mono">
                  {selectedOrder.order_number}
                </h2>
                <div className="text-xs text-neutral-500">
                  Enregistrée le {new Date(selectedOrder.placed_at).toLocaleDateString('fr-FR')} à{' '}
                  {new Date(selectedOrder.placed_at).toLocaleTimeString('fr-FR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>

              <button
                onClick={() => setSelectedOrder(null)}
                className="p-2 rounded-xl text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Status Bar & Stepper Selector */}
            <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs uppercase text-neutral-600">
                  Modifier le statut en direct :
                </span>
                <span
                  className={`font-mono font-bold text-xs px-2.5 py-0.5 rounded-full ${
                    STATUS_CONFIG[selectedOrder.order_status]?.bg
                  } ${STATUS_CONFIG[selectedOrder.order_status]?.text}`}
                >
                  {STATUS_CONFIG[selectedOrder.order_status]?.label}
                </span>
              </div>

              {/* Status Buttons Matrix */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'PENDING', label: '⏳ En attente' },
                  { id: 'CONFIRMED', label: '✓ Confirmée' },
                  { id: 'PREPARING', label: '👨‍🍳 En préparation' },
                  { id: 'READY', label: '📦 Prête atelier' },
                  { id: 'OUT_FOR_DELIVERY', label: '🛵 En livraison' },
                  { id: 'DELIVERED', label: '🎉 Livrée & Payée' },
                  { id: 'FAILED_DELIVERY', label: '⚠️ Échec livraison' },
                  { id: 'CANCELLED', label: '✕ Annulée' },
                ].filter((status) => ['CONFIRMED', 'PREPARING', 'READY', 'CANCELLED'].includes(status.id) && store.canTransition(selectedOrder.order_status, status.id as OrderStatus)).map((s) => (
                  <button
                    key={s.id}
                    onClick={() =>
                      handleStatusChange(selectedOrder.id, s.id as OrderStatus)
                    }
                    className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all border text-center ${
                      selectedOrder.order_status === s.id
                        ? 'bg-neutral-900 text-white border-neutral-900 shadow-sm scale-102'
                        : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-100'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              <div className="pt-2 border-t border-neutral-200 text-xs">
                <span className="font-semibold text-neutral-700">Affectation automatique : </span>
                {selectedOrder.delivery_agent_name ? <span className="text-sky-800">{selectedOrder.delivery_agent_name}{selectedOrder.delivery_agent_phone ? ` · ${selectedOrder.delivery_agent_phone}` : ''}{selectedOrder.delivery_agent_plate ? ` · Plaque ${selectedOrder.delivery_agent_plate}` : ''}</span> : <span className="text-neutral-600">{selectedOrder.delivery_assignment_status === 'offered' ? 'offerte aux livreurs de ce département, en attente d’acceptation' : selectedOrder.delivery_assignment_status === 'auto_assigned' ? `sélection automatique pour ${selectedOrder.delivery_selected_agent_name || 'un livreur'}, en attente d’acceptation` : selectedOrder.delivery_assignment_status === 'unmatched' ? 'aucun livreur configuré pour ce département' : 'en attente de préparation'}</span>}
              </div>
            </div>

            {/* Client & Delivery Info */}
            <div className="grid sm:grid-cols-2 gap-3 sm:gap-4 text-xs">
              <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200 space-y-2">
                <div className="font-bold text-neutral-900 flex items-center justify-between">
                  <span>Coordonnées Client</span>
                  <a
                    href={`https://wa.me/229${selectedOrder.customer_phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                      `Bonjour ${selectedOrder.customer_name}, concernant votre commande Ola Ice ${selectedOrder.order_number} (${STATUS_CONFIG[selectedOrder.order_status]?.label})...`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-700 font-bold hover:underline flex items-center gap-1"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </a>
                </div>
                <div>Nom : <strong className="text-neutral-900">{selectedOrder.customer_name}</strong></div>
                <div className="flex items-center gap-2 font-mono font-bold text-neutral-900">
                  <Phone className="w-3.5 h-3.5 text-rose-600" />
                  <a href={`tel:${selectedOrder.customer_phone}`} className="hover:underline">
                    {selectedOrder.customer_phone}
                  </a>
                </div>
                {selectedOrder.customer_email && <div>Email : {selectedOrder.customer_email}</div>}
                {selectedOrder.customer_note && (
                  <div className="pt-1 text-rose-700 italic border-t border-neutral-200">
                    Note client : "{selectedOrder.customer_note}"
                  </div>
                )}
                {selectedOrder.customer_voice_note_available && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 space-y-2">
                    <div className="text-xs font-bold text-rose-900">Note vocale — repère de la maison</div>
                    <audio controls preload="none" className="h-10 w-full" src={`/api/orders/${encodeURIComponent(selectedOrder.id)}/voice-note`}>
                      Votre navigateur ne peut pas lire cette note vocale.
                    </audio>
                  </div>
                )}
              </div>

              <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200 space-y-1.5">
                <div className="font-bold text-neutral-900">Lieu de Livraison</div>
                <div>Zone : <strong>{selectedOrder.delivery_zone_name}</strong></div>
                {selectedOrder.delivery_location && <div>Localité : {selectedOrder.delivery_location.department_name} · {selectedOrder.delivery_location.commune_name} · {selectedOrder.delivery_location.arrondissement_name} · {selectedOrder.delivery_location.quarter_name}</div>}
                <div>Adresse : {selectedOrder.delivery_address}</div>
                {selectedOrder.delivery_landmark && (
                  <div className="font-semibold text-neutral-700">
                    Repère : <span className="bg-amber-100 text-amber-900 px-1 py-0.5 rounded">{selectedOrder.delivery_landmark}</span>
                  </div>
                )}
                {selectedOrder.delivery_agent_name && (
                  <div className="pt-1 font-bold text-sky-700">
                    Livreur en charge : {selectedOrder.delivery_agent_name}
                  </div>
                )}
              </div>
            </div>

            {/* Articles Details */}
            <div className="space-y-2">
              <div className="font-bold text-xs uppercase tracking-wider text-neutral-600">
                Articles commandés ({selectedOrder.items.length})
              </div>
              <div className="divide-y divide-neutral-100 border border-neutral-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                {selectedOrder.items.map((item) => (
                  <div key={item.id} className="p-2.5 sm:p-3 bg-white flex justify-between items-center text-xs">
                    <div>
                      <div className="font-bold text-neutral-900">{item.product_name}</div>
                      <div className="text-neutral-500">
                        {item.variant_name} {item.flavor ? `· Parfum : ${item.flavor}` : ''}
                      </div>
                    </div>
                    <div className="text-right font-mono tabular-nums">
                      <div>
                        {item.quantity} × {item.unit_price.toLocaleString('fr-FR')} F
                      </div>
                      <div className="font-bold text-neutral-900">
                        {item.total_price.toLocaleString('fr-FR')} F
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Total Financial Summary */}
            <div className="p-3.5 bg-neutral-50 rounded-xl space-y-1 text-xs border border-neutral-200">
              <div className="flex justify-between text-neutral-600">
                <span>Sous-total articles</span>
                <span className="font-mono tabular-nums">
                  {selectedOrder.subtotal.toLocaleString('fr-FR')} F CFA
                </span>
              </div>
              <div className="flex justify-between text-neutral-600">
                <span>Frais de livraison</span>
                <span className="font-mono tabular-nums">
                  {selectedOrder.delivery_fee.toLocaleString('fr-FR')} F CFA
                </span>
              </div>
              <div className="flex justify-between font-black text-base text-neutral-900 pt-1.5 border-t border-neutral-200">
                <span>Total à Encaisser en Espèces</span>
                <span className="font-mono tabular-nums text-rose-600">
                  {selectedOrder.total.toLocaleString('fr-FR')} F CFA
                </span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedOrder(null)}
                className="px-5 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
              >
                Fermer la fiche
              </button>
            </div>
          </div>
        </div>
      )}

      {editingProduct && <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto"><form onSubmit={handleSaveProduct} className="my-8 w-full max-w-xl space-y-3 rounded-2xl border border-neutral-200 bg-white p-5 shadow-2xl">
        <div className="flex items-center justify-between"><h3 className="font-bold">{products.some((item) => item.id === editingProduct.id) ? 'Modifier' : 'Créer'} un produit</h3><button type="button" onClick={() => setEditingProduct(null)}><X className="h-4 w-4"/></button></div>
        <label className="block text-xs font-semibold">Nom<input required value={editingProduct.name} onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value, slug: products.some((item) => item.id === editingProduct.id) ? editingProduct.slug : e.target.value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') })} className="mt-1 w-full rounded-lg border p-2 text-sm"/></label>
        <label className="block text-xs font-semibold">Catégorie<select required value={editingProduct.category_id} onChange={(e) => setEditingProduct({ ...editingProduct, category_id: e.target.value })} className="mt-1 w-full rounded-lg border p-2 text-sm"><option value="">Choisir</option>{categories.filter((item) => item.is_active !== false).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label className="block text-xs font-semibold">Description courte<input value={editingProduct.short_description} onChange={(e) => setEditingProduct({ ...editingProduct, short_description: e.target.value })} className="mt-1 w-full rounded-lg border p-2 text-sm"/></label>
        <label className="block text-xs font-semibold">Description<textarea value={editingProduct.description} onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })} className="mt-1 w-full rounded-lg border p-2 text-sm" rows={3}/></label>
        <label className="block text-xs font-semibold">URL de l’image<input value={editingProduct.main_image} onChange={(e) => setEditingProduct({ ...editingProduct, main_image: e.target.value })} className="mt-1 w-full rounded-lg border p-2 text-sm"/></label>
        <div className="grid grid-cols-2 gap-3"><label className="text-xs font-semibold">Statut<select value={editingProduct.status} onChange={(e) => setEditingProduct({ ...editingProduct, status: e.target.value as Product['status'] })} className="mt-1 w-full rounded-lg border p-2"><option value="draft">Brouillon</option><option value="active">En boutique</option><option value="archived">Archivé</option></select></label><label className="text-xs font-semibold">Saveurs (séparées par virgule)<input value={(editingProduct.available_flavors || []).join(', ')} onChange={(e) => setEditingProduct({ ...editingProduct, available_flavors: e.target.value.split(',').map((v) => v.trim()).filter(Boolean) })} className="mt-1 w-full rounded-lg border p-2"/></label></div>
        <div className="flex flex-wrap gap-4 text-xs"><label><input type="checkbox" checked={editingProduct.is_featured} onChange={(e) => setEditingProduct({ ...editingProduct, is_featured: e.target.checked })}/> Produit vedette</label><label><input type="checkbox" checked={editingProduct.allow_wholesale} onChange={(e) => setEditingProduct({ ...editingProduct, allow_wholesale: e.target.checked })}/> Vente en gros</label></div>
        <button className="w-full rounded-xl bg-rose-600 py-2.5 text-sm font-bold text-white">Enregistrer le produit</button>
      </form></div>}

      {editingCategory && <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"><form onSubmit={handleSaveCategory} className="w-full max-w-md space-y-3 rounded-2xl bg-white p-5 shadow-2xl"><div className="flex justify-between"><h3 className="font-bold">Catégorie</h3><button type="button" onClick={() => setEditingCategory(null)}><X className="h-4 w-4"/></button></div><label className="block text-xs font-semibold">Nom<input required value={editingCategory.name} onChange={(e) => { const name = e.target.value; setEditingCategory({ ...editingCategory, name, slug: categories.some((item) => item.id === editingCategory.id) ? editingCategory.slug : name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') }); }} className="mt-1 w-full rounded-lg border p-2"/></label><label className="block text-xs font-semibold">Description<input value={editingCategory.description} onChange={(e) => setEditingCategory({ ...editingCategory, description: e.target.value })} className="mt-1 w-full rounded-lg border p-2"/></label><label className="block text-xs font-semibold">Ordre d’affichage<input type="number" min="0" value={editingCategory.sort_order} onChange={(e) => setEditingCategory({ ...editingCategory, sort_order: Number(e.target.value) })} className="mt-1 w-full rounded-lg border p-2"/></label><label className="text-xs"><input type="checkbox" checked={editingCategory.is_active} onChange={(e) => setEditingCategory({ ...editingCategory, is_active: e.target.checked })}/> Catégorie active</label><button className="w-full rounded-xl bg-rose-600 py-2 font-bold text-white">Enregistrer</button></form></div>}

      {editingCustomer && <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"><form onSubmit={handleSaveCustomer} className="w-full max-w-md space-y-3 rounded-2xl bg-white p-5 shadow-2xl"><div className="flex justify-between"><h3 className="font-bold">Fiche client</h3><button type="button" onClick={() => setEditingCustomer(null)}><X className="h-4 w-4"/></button></div><label className="block text-xs font-semibold">Nom complet<input required value={editingCustomer.fullName} onChange={(e) => setEditingCustomer({ ...editingCustomer, fullName: e.target.value })} className="mt-1 w-full rounded-lg border p-2"/></label><label className="block text-xs font-semibold">Téléphone<input required value={editingCustomer.phone} onChange={(e) => setEditingCustomer({ ...editingCustomer, phone: e.target.value })} className="mt-1 w-full rounded-lg border p-2"/></label><label className="block text-xs font-semibold">E-mail<input type="email" value={editingCustomer.email || ''} onChange={(e) => setEditingCustomer({ ...editingCustomer, email: e.target.value })} className="mt-1 w-full rounded-lg border p-2"/></label><label className="text-xs"><input type="checkbox" checked={editingCustomer.is_active !== false} onChange={(e) => setEditingCustomer({ ...editingCustomer, is_active: e.target.checked })}/> Compte client actif</label><button className="w-full rounded-xl bg-rose-600 py-2 font-bold text-white">Enregistrer</button></form></div>}

      {editingStaff && <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"><form onSubmit={handleSaveStaff} className="w-full max-w-md space-y-3 rounded-2xl bg-white p-5 shadow-2xl"><div className="flex justify-between"><h3 className="font-bold">Compte du personnel</h3><button type="button" onClick={() => setEditingStaff(null)}><X className="h-4 w-4"/></button></div><label className="block text-xs font-semibold">Nom<input required value={editingStaff.name || ''} onChange={(e) => setEditingStaff({ ...editingStaff, name: e.target.value })} className="mt-1 w-full rounded-lg border p-2"/></label><label className="block text-xs font-semibold">Rôle<select value={editingStaff.role || 'delivery'} onChange={(e) => setEditingStaff({ ...editingStaff, role: e.target.value as StaffAccount['role'] })} className="mt-1 w-full rounded-lg border p-2"><option value="delivery">Livreur</option><option value="admin">Direction</option></select></label><label className="block text-xs font-semibold">Zone de livraison<input value={editingStaff.zone || ''} onChange={(e) => setEditingStaff({ ...editingStaff, zone: e.target.value })} className="mt-1 w-full rounded-lg border p-2"/></label><label className="block text-xs font-semibold">Code secret {editingStaff.id ? '(laisser vide pour conserver)' : '(6 caractères minimum)'}<input type="password" minLength={editingStaff.id ? 0 : 6} required={!editingStaff.id} value={editingStaff.pin || ''} onChange={(e) => setEditingStaff({ ...editingStaff, pin: e.target.value })} className="mt-1 w-full rounded-lg border p-2"/></label><label className="text-xs"><input type="checkbox" checked={editingStaff.is_active !== false} onChange={(e) => setEditingStaff({ ...editingStaff, is_active: e.target.checked })}/> Compte actif</label><button className="w-full rounded-xl bg-rose-600 py-2 font-bold text-white">Enregistrer</button></form></div>}

      {/* Edit Variant Modal */}
      {editingVariant && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveVariant}
            className="bg-white rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl border border-neutral-200 animate-in zoom-in-95"
          >
            <div className="flex justify-between items-center border-b border-neutral-200 pb-2">
              <h3 className="font-bold text-sm text-neutral-900">
                {store.getAllVariantsForProduct(editingVariant.product_id).some((item) => item.id === editingVariant.id) ? 'Modifier' : 'Créer'} un format : {editingVariant.name}
              </h3>
              <button
                type="button"
                onClick={() => setEditingVariant(null)}
                className="text-neutral-400 hover:text-neutral-900"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div><label className="font-semibold block mb-1">Nom du format :</label><input required value={editingVariant.name} onChange={(e) => setEditingVariant({ ...editingVariant, name: e.target.value })} className="w-full p-2.5 rounded-xl border border-neutral-300 text-sm" placeholder="Ex. Pot 250 ml"/></div>
              <div><label className="font-semibold block mb-1">Référence SKU :</label><input required value={editingVariant.sku} onChange={(e) => setEditingVariant({ ...editingVariant, sku: e.target.value })} className="w-full p-2.5 rounded-xl border border-neutral-300 font-mono text-sm"/></div>
              <div>
                <label className="font-semibold block mb-1">Prix Unitaire (Détail en F CFA) :</label>
                <input
                  type="number"
                  min="0"
                  step="50"
                  value={editingVariant.price}
                  onChange={(e) =>
                    setEditingVariant({
                      ...editingVariant,
                      price: Math.max(0, Number(e.target.value)),
                    })
                  }
                  className="w-full p-2.5 rounded-xl border border-neutral-300 font-mono text-sm"
                  required
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">Stock Physique Disponible :</label>
                <input
                  type="number"
                  min="0"
                  value={editingVariant.stock_quantity}
                  onChange={(e) =>
                    setEditingVariant({
                      ...editingVariant,
                      stock_quantity: Math.max(0, Number(e.target.value)),
                    })
                  }
                  className="w-full p-2.5 rounded-xl border border-neutral-300 font-mono text-sm"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold block mb-1">Prix de Gros (F CFA) :</label>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    value={editingVariant.wholesale_price || ''}
                    onChange={(e) =>
                      setEditingVariant({
                        ...editingVariant,
                        wholesale_price: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                    className="w-full p-2.5 rounded-xl border border-neutral-300 font-mono text-sm"
                    placeholder="Optionnel"
                  />
                </div>

                <div>
                  <label className="font-semibold block mb-1">Seuil Quantité Gros :</label>
                  <input
                    type="number"
                    min="1"
                    value={editingVariant.wholesale_min_quantity || ''}
                    onChange={(e) =>
                      setEditingVariant({
                        ...editingVariant,
                        wholesale_min_quantity: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                    className="w-full p-2.5 rounded-xl border border-neutral-300 font-mono text-sm"
                    placeholder="Ex: 10"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 font-semibold"><input type="checkbox" checked={editingVariant.is_active} onChange={(e) => setEditingVariant({ ...editingVariant, is_active: e.target.checked })}/>Format actif à la vente</label>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingVariant(null)}
                className="flex-1 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold rounded-xl text-xs"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shadow-xs"
              >
                Enregistrer
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Zone Modal */}
      {editingZone && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveZone}
            className="bg-white rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl border border-neutral-200 animate-in zoom-in-95"
          >
            <div className="flex justify-between items-center border-b border-neutral-200 pb-2">
              <h3 className="font-bold text-sm text-neutral-900">
                Modifier la Zone : {editingZone.name}
              </h3>
              <button
                type="button"
                onClick={() => setEditingZone(null)}
                className="text-neutral-400 hover:text-neutral-900"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold block mb-1">Nom de la zone :</label>
                <input
                  type="text"
                  value={editingZone.name}
                  onChange={(e) =>
                    setEditingZone({
                      ...editingZone,
                      name: e.target.value,
                    })
                  }
                  className="w-full p-2.5 rounded-xl border border-neutral-300 text-sm"
                  required
                />
              </div>

              <BeninLocationSelector compact value={editingZone.location} onChange={(location) => setEditingZone({ ...editingZone, location: location || undefined })} />

              <label className="flex items-center gap-2 text-xs font-semibold"><input type="checkbox" checked={editingZone.is_active} onChange={(event) => setEditingZone({ ...editingZone, is_active: event.target.checked })} />Zone active dans le parcours de commande</label>

              <div>
                <label className="font-semibold block mb-1">Frais de livraison (en F CFA) :</label>
                <input
                  type="number"
                  min="0"
                  step="50"
                  value={editingZone.delivery_fee}
                  onChange={(e) =>
                    setEditingZone({
                      ...editingZone,
                      delivery_fee: Math.max(0, Number(e.target.value)),
                    })
                  }
                  className="w-full p-2.5 rounded-xl border border-neutral-300 font-mono text-sm"
                  required
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">Délai estimé :</label>
                <input
                  type="text"
                  value={editingZone.estimated_duration}
                  onChange={(e) =>
                    setEditingZone({
                      ...editingZone,
                      estimated_duration: e.target.value,
                    })
                  }
                  className="w-full p-2.5 rounded-xl border border-neutral-300 text-sm"
                  required
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingZone(null)}
                className="flex-1 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold rounded-xl text-xs"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shadow-xs"
              >
                Enregistrer
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};
