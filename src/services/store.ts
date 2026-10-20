import { Category, Product, ProductVariant, DeliveryZone, Order, CartItem, OrderStatus, OrderType, CustomerProfile } from '../types';

const CART_KEY = 'olaice_cart_v1';
const LAST_ORDER_KEY = 'olaice_last_order_v1';
async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(path, { ...options, credentials: 'same-origin', headers: { 'content-type': 'application/json', ...options.headers } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || 'Le serveur Ola Ice est momentanément indisponible.');
  return body as T;
}

function readCart(): CartItem[] {
  try { return JSON.parse(localStorage.getItem(CART_KEY) || '[]'); } catch { return []; }
}

class OlaIceStore {
  private categories: Category[] = [];
  private products: Product[] = [];
  private variants: ProductVariant[] = [];
  private zones: DeliveryZone[] = [];
  private orders: Order[] = [];
  private customers: CustomerProfile[] = [];
  private cart: CartItem[] = readCart();
  private subscribers: Array<() => void> = [];

  async initialize() {
    const state = await api<{ categories: Category[]; products: Product[]; variants: ProductVariant[]; zones: DeliveryZone[] }>('/api/bootstrap');
    this.categories = state.categories;
    this.products = state.products;
    this.variants = state.variants;
    this.zones = state.zones;
    this.notify();
  }
  async refreshOrders() {
    const result = await api<{ orders: Order[] }>('/api/orders');
    this.orders = result.orders;
    this.notify();
  }
  async refreshCustomers() {
    const result = await api<{ customers: CustomerProfile[] }>('/api/admin/customers');
    this.customers = result.customers;
    this.notify();
  }
  async trackOrder(orderNumber: string, phone: string) {
    return api<{ order: Order }>('/api/track-order', { method: 'POST', body: JSON.stringify({ order_number: orderNumber, phone }) });
  }
  subscribe(callback: () => void) { this.subscribers.push(callback); return () => { this.subscribers = this.subscribers.filter((cb) => cb !== callback); }; }
  private notify() { this.subscribers.forEach((callback) => callback()); }
  private saveCart() { localStorage.setItem(CART_KEY, JSON.stringify(this.cart)); this.notify(); }
  getCategories() { return [...this.categories].sort((a, b) => a.sort_order - b.sort_order); }
  getProducts() { return this.products.filter((p) => p.status !== 'archived'); }
  getProductById(id: string) { return this.products.find((p) => p.id === id); }
  getProductBySlug(slug: string) { return this.products.find((p) => p.slug === slug); }
  getVariantsForProduct(productId: string) { return this.variants.filter((v) => v.product_id === productId && v.is_active); }
  getVariantById(id: string) { return this.variants.find((v) => v.id === id); }
  getZones() { return this.zones.filter((z) => z.is_active); }
  getAllZones() { return this.zones; }
  getOrders() { return [...this.orders].sort((a, b) => Date.parse(b.placed_at) - Date.parse(a.placed_at)); }
  getCustomers() { return [...this.customers].sort((a, b) => Date.parse(b.lastActiveAt || b.createdAt) - Date.parse(a.lastActiveAt || a.createdAt)); }
  getOrderById(id: string) { return this.orders.find((order) => order.id === id); }
  getLastOrder(): Order | null { try { return JSON.parse(localStorage.getItem(LAST_ORDER_KEY) || 'null'); } catch { return null; } }
  getOrderByNumberAndPhone(orderNumber: string, phone?: string) {
    const cleanNumber = orderNumber.trim().toUpperCase();
    const cleanPhone = (phone || '').replace(/\D/g, '');
    return this.orders.find((order) => order.order_number.toUpperCase() === cleanNumber && order.customer_phone.replace(/\D/g, '').endsWith(cleanPhone));
  }
  getCart() { return this.cart; }
  addToCart(variantId: string, quantity = 1, flavor?: string) {
    const variant = this.getVariantById(variantId); if (!variant || quantity < 1) return;
    const item = this.cart.find((row) => row.variant_id === variantId && row.flavor === flavor);
    const next = Math.min((item?.quantity || 0) + quantity, variant.track_stock ? variant.stock_quantity : 1000);
    if (item) item.quantity = next;
    else if (next > 0) this.cart.push({ variant_id: variantId, product_id: variant.product_id, quantity: next, flavor });
    this.saveCart();
  }
  updateCartQuantity(variantId: string, quantity: number, flavor?: string) {
    if (quantity <= 0) return this.removeFromCart(variantId, flavor);
    const item = this.cart.find((row) => row.variant_id === variantId && row.flavor === flavor);
    if (!item) return;
    const variant = this.getVariantById(variantId);
    item.quantity = Math.min(quantity, variant?.track_stock ? variant.stock_quantity : 1000);
    this.saveCart();
  }
  removeFromCart(variantId: string, flavor?: string) { this.cart = this.cart.filter((item) => !(item.variant_id === variantId && item.flavor === flavor)); this.saveCart(); }
  clearCart() { this.cart = []; this.saveCart(); }
  calculatePricing(selectedZoneId?: string, customDeliveryFee?: number) {
    let subtotal = 0, normalSubtotal = 0;
    const itemsDetails: Array<{ variant: ProductVariant; product: Product; quantity: number; flavor?: string; unitPrice: number; lineTotal: number; isWholesale: boolean; savings: number }> = [];
    for (const item of this.cart) {
      const variant = this.getVariantById(item.variant_id), product = variant && this.getProductById(variant.product_id);
      if (!variant || !product) continue;
      const isWholesale = Boolean(product.allow_wholesale && variant.wholesale_price && variant.wholesale_min_quantity && item.quantity >= variant.wholesale_min_quantity);
      const unitPrice = isWholesale ? variant.wholesale_price! : variant.price;
      const lineTotal = unitPrice * item.quantity;
      subtotal += lineTotal; normalSubtotal += variant.price * item.quantity;
      itemsDetails.push({ variant, product, quantity: item.quantity, flavor: item.flavor, unitPrice, lineTotal, isWholesale, savings: (variant.price - unitPrice) * item.quantity });
    }
    const zone = this.zones.find((row) => row.id === selectedZoneId && row.is_active);
    const deliveryFee = customDeliveryFee !== undefined ? customDeliveryFee : zone?.delivery_fee || 0;
    return { itemsDetails, subtotal, normalSubtotal, discountAmount: Math.max(0, normalSubtotal - subtotal), deliveryFee, total: subtotal + deliveryFee, itemCount: this.cart.reduce((sum, item) => sum + item.quantity, 0) };
  }
  async createOrder(payload: { customer_id?: string; customer_name: string; customer_phone: string; customer_email?: string; delivery_zone_id: string; delivery_address: string; delivery_landmark?: string; order_type?: OrderType; customer_note?: string; custom_delivery_fee?: number; customer_latitude?: number; customer_longitude?: number; delivery_distance_meters?: number; delivery_distance_text?: string; delivery_fee_calculation_mode?: 'gps_distance' | 'zone_fixed' }): Promise<{ success: boolean; order?: Order; error?: string }> {
    if (!this.cart.length) return { success: false, error: 'Votre panier est vide.' };
    try {
      const result = await api<{ order: Order }>('/api/orders', { method: 'POST', body: JSON.stringify({ ...payload, items: this.cart.map(({ variant_id, quantity, flavor }) => ({ variant_id, quantity, flavor })) }) });
      this.orders.unshift(result.order);
      localStorage.setItem(LAST_ORDER_KEY, JSON.stringify(result.order));
      this.cart = []; this.saveCart();
      void this.initialize();
      return { success: true, order: result.order };
    } catch (error) { return { success: false, error: error instanceof Error ? error.message : 'La commande n’a pas pu être enregistrée.' }; }
  }
  canTransition(current: OrderStatus, target: OrderStatus) {
    const next: Record<OrderStatus, OrderStatus[]> = { PENDING:['CONFIRMED','CANCELLED'], CONFIRMED:['PREPARING','CANCELLED'], PREPARING:['READY','CANCELLED'], READY:['OUT_FOR_DELIVERY','CANCELLED'], OUT_FOR_DELIVERY:['DELIVERED','FAILED_DELIVERY'], DELIVERED:[], CANCELLED:[], FAILED_DELIVERY:[] };
    return current === target || next[current].includes(target);
  }
  async updateOrderStatus(orderId: string, targetStatus: OrderStatus, _changedBy: string, comment?: string, deliveryAgentName?: string) {
    const current = this.getOrderById(orderId);
    if (!current) return { success: false, error: 'Commande introuvable' };
    if (!this.canTransition(current.order_status, targetStatus)) return { success: false, error: `Transition impossible : ${current.order_status} → ${targetStatus}.` };
    try {
      const { order } = await api<{ order: Order }>(`/api/orders/${encodeURIComponent(orderId)}/status`, { method: 'PATCH', body: JSON.stringify({ status: targetStatus, comment, agent_name: deliveryAgentName }) });
      this.orders = this.orders.map((row) => row.id === order.id ? order : row);
      this.notify();
      void this.initialize();
      void this.refreshOrders();
      return { success: true as const };
    } catch (error) {
      return { success: false as const, error: error instanceof Error ? error.message : 'La mise à jour a échoué.' };
    }
  }
  async updateProduct(updated: Product) { await this.persistCatalog('product', updated); await this.initialize(); }
  async updateVariant(updated: ProductVariant) { await this.persistCatalog('variant', updated); await this.initialize(); }
  async updateZone(updated: DeliveryZone) { await this.persistCatalog('zone', updated); await this.initialize(); }
  private async persistCatalog(kind: string, row: unknown) { await api('/api/admin/catalog', { method: 'PUT', body: JSON.stringify({ kind, row }) }); }
  resetToInitialSeed() { window.dispatchEvent(new CustomEvent('olaice-error', { detail: 'La réinitialisation générale est désactivée pour protéger les commandes enregistrées.' })); }
}

export const store = new OlaIceStore();
