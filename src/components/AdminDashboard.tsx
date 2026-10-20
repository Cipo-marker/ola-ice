import React, { useState } from 'react';
import { store } from '../services/store';
import { Order, OrderStatus, Product, ProductVariant, DeliveryZone } from '../types';
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
} from 'lucide-react';
import { authService } from '../services/auth';

interface AdminDashboardProps {
  onOpenLogin?: () => void;
  onLogout?: () => void;
}

const RIDERS_LIST = [
  'Koffi (Moto Express 01 - Cotonou)',
  'Moussa (Moto Express 02 - Calavi & Godomey)',
  'Aïcha (Moto Express 03 - Akpakpa)',
  'Bio (Moto Express 04 - Haie Vive & Cadjehoun)',
  'Retrait sur place (Comptoir Ola Ice)',
];

const STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; bg: string; text: string; border: string }
> = {
  PENDING: { label: 'En attente', bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200' },
  CONFIRMED: { label: 'Confirmée', bg: 'bg-indigo-50', text: 'text-indigo-800', border: 'border-indigo-200' },
  PREPARING: { label: 'En préparation', bg: 'bg-rose-50', text: 'text-rose-800', border: 'border-rose-200' },
  READY: { label: 'Prête', bg: 'bg-purple-50', text: 'text-purple-800', border: 'border-purple-200' },
  OUT_FOR_DELIVERY: { label: 'En livraison', bg: 'bg-sky-50', text: 'text-sky-800', border: 'border-sky-300' },
  DELIVERED: { label: 'Livrée & Encaissée', bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-300' },
  FAILED_DELIVERY: { label: 'Échec livraison', bg: 'bg-orange-50', text: 'text-orange-800', border: 'border-orange-200' },
  CANCELLED: { label: 'Annulée', bg: 'bg-neutral-100', text: 'text-neutral-700', border: 'border-neutral-300' },
};

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onOpenLogin, onLogout }) => {
  const isAdmin = authService.isAdmin();

  const [activeTab, setActiveTab] = useState<'orders' | 'products' | 'zones' | 'customers'>('orders');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Edit variant & zone modal state
  const [editingVariant, setEditingVariant] = useState<ProductVariant | null>(null);
  const [editingZone, setEditingZone] = useState<DeliveryZone | null>(null);

  const orders = store.getOrders();
  const products = store.getProducts();
  const zones = store.getAllZones();
  const customers = store.getCustomers();

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
      </div>

      {/* Tab 1: Orders Management */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
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
                              <option value="OUT_FOR_DELIVERY">🛵 En livraison</option>
                              <option value="DELIVERED">✓ Livrée & Encaissée</option>
                              <option value="FAILED_DELIVERY">⚠️ Échec livraison</option>
                              <option value="CANCELLED">✕ Annulée</option>
                            </select>
                          </td>
                          <td className="p-3.5">
                            <select
                              value={ord.delivery_agent_name || ''}
                              onChange={(e) => {
                                const newRider = e.target.value;
                                handleStatusChange(
                                  ord.id,
                                  ord.order_status === 'PENDING' ? 'CONFIRMED' : ord.order_status,
                                  newRider
                                );
                              }}
                              className="px-2 py-1 bg-neutral-50 border border-neutral-200 rounded-lg text-xs text-neutral-700 max-w-[160px] truncate focus:outline-none focus:ring-1 focus:ring-rose-500"
                            >
                              <option value="">-- Non assigné --</option>
                              {RIDERS_LIST.map((rider) => (
                                <option key={rider} value={rider}>
                                  {rider}
                                </option>
                              ))}
                            </select>
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

                            {(ord.order_status === 'PENDING' ||
                              ord.order_status === 'CONFIRMED' ||
                              ord.order_status === 'PREPARING' ||
                              ord.order_status === 'READY') && (
                              <button
                                onClick={() => handleStatusChange(ord.id, 'OUT_FOR_DELIVERY')}
                                className="px-2.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs inline-flex items-center gap-1"
                                title="Passer directement en livraison"
                              >
                                <Truck className="w-3 h-3" />
                                <span>En livraison</span>
                              </button>
                            )}

                            {ord.order_status === 'OUT_FOR_DELIVERY' && (
                              <button
                                onClick={() => handleStatusChange(ord.id, 'DELIVERED')}
                                className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-black transition-all shadow-xs inline-flex items-center gap-1 animate-pulse"
                                title="Encaisser les espèces et finaliser la commande"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Livré & Encaissé</span>
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
              <div>
                <h3 className="font-display font-bold text-base text-neutral-900">
                  Catalogue Produits, Formats et Tarifs
                </h3>
                <p className="text-xs text-neutral-500">
                  Modifiez les prix unitaires, les tarifs de gros pour revendeuses et gérez les stocks physiques.
                </p>
              </div>
            </div>

            <div className="divide-y divide-neutral-100">
              {products.map((product) => {
                const variants = store.getVariantsForProduct(product.id);
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
                    </div>

                    {/* Variants list table */}
                    <div className="bg-neutral-50 rounded-xl p-3 border border-neutral-200">
                      <div className="text-xs font-bold text-neutral-600 mb-2">
                        Formats & Variantes configurés :
                      </div>
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

                            <div className="flex justify-between text-neutral-500 text-[11px]">
                              <span>Stock : {variant.stock_quantity} unités</span>
                              {variant.wholesale_price && (
                                <span className="text-amber-700 font-semibold">
                                  Gros dès {variant.wholesale_min_quantity} : {variant.wholesale_price} F
                                </span>
                              )}
                            </div>

                            <button
                              onClick={() => setEditingVariant({ ...variant })}
                              className="w-full mt-1 py-1 text-center bg-neutral-100 hover:bg-neutral-200 rounded text-[11px] font-bold text-neutral-700 transition-colors"
                            >
                              Modifier Prix & Stock
                            </button>
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

      {/* Tab 3: Delivery Zones */}
      {activeTab === 'zones' && (
        <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden shadow-xs p-5 space-y-4">
          <div>
            <h3 className="font-display font-bold text-base text-neutral-900">
              Zones de Livraison Desservies
            </h3>
            <p className="text-xs text-neutral-500">
              Ajustez les frais de livraison et les délais moyens par secteur urbain.
            </p>
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
                    Changer tarif
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'customers' && (
        <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden shadow-xs">
          <div className="p-4 sm:p-5 border-b border-neutral-100">
            <h3 className="font-display font-bold text-base text-neutral-900">Clients ayant passé commande</h3>
            <p className="text-xs text-neutral-500 mt-1">Les coordonnées restent visibles uniquement dans l’espace direction.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[620px]">
              <thead className="bg-neutral-50 text-neutral-600 font-bold uppercase tracking-wider">
                <tr><th className="p-3.5">Nom</th><th className="p-3.5">Téléphone</th><th className="p-3.5">Commandes</th><th className="p-3.5">Dernière activité</th></tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {customers.length === 0 ? <tr><td colSpan={4} className="p-8 text-center text-neutral-400">Aucun client enregistré pour le moment.</td></tr> : customers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-neutral-50/70">
                    <td className="p-3.5 font-semibold text-neutral-900">{customer.fullName}</td>
                    <td className="p-3.5"><a className="text-sky-700 hover:underline" href={`tel:${customer.phone}`}>{customer.phone}</a></td>
                    <td className="p-3.5 tabular-nums">{orders.filter((order) => order.customer_id === customer.id).length}</td>
                    <td className="p-3.5 text-neutral-500">{new Date(customer.lastActiveAt || customer.createdAt).toLocaleDateString('fr-FR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
                ].map((s) => (
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

              {/* Driver Assignment Dropdown in Modal */}
              <div className="pt-2 border-t border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <span className="font-semibold text-neutral-700 flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-sky-600" />
                  <span>Assigner un livreur :</span>
                </span>
                <select
                  value={selectedOrder.delivery_agent_name || ''}
                  onChange={(e) => {
                    const rider = e.target.value;
                    handleStatusChange(
                      selectedOrder.id,
                      selectedOrder.order_status,
                      rider
                    );
                  }}
                  className="px-3 py-1.5 rounded-xl border border-neutral-300 bg-white font-medium text-neutral-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  <option value="">-- Choisir un livreur --</option>
                  {RIDERS_LIST.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
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
              </div>

              <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200 space-y-1.5">
                <div className="font-bold text-neutral-900">Lieu de Livraison</div>
                <div>Zone : <strong>{selectedOrder.delivery_zone_name}</strong></div>
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

      {/* Edit Variant Modal */}
      {editingVariant && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveVariant}
            className="bg-white rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl border border-neutral-200 animate-in zoom-in-95"
          >
            <div className="flex justify-between items-center border-b border-neutral-200 pb-2">
              <h3 className="font-bold text-sm text-neutral-900">
                Modifier le Format : {editingVariant.name}
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
