export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PREPARING'
  | 'READY'
  | 'ASSIGNED'
  | 'PICKED_UP'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'FAILED_DELIVERY';

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

export type OrderType = 'standard' | 'wholesale' | 'event';

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon?: string;
  is_active: boolean;
  sort_order: number;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  name: string; // Ex: 'Pot 250ml', 'Bâtonnet', 'Bouteille 50cl'
  sku: string;
  price: number; // In XOF (FCFA)
  compare_price?: number;
  wholesale_price?: number;
  wholesale_min_quantity?: number; // e.g. 10 units for wholesale price
  stock_quantity: number;
  track_stock: boolean;
  is_active: boolean;
  flavor?: string; // Ex: 'Mangue', 'Bissap', 'Vanille-Fraise'
}

export interface Product {
  id: string;
  category_id: string;
  name: string;
  slug: string;
  short_description: string;
  description: string;
  main_image: string;
  status: 'active' | 'draft' | 'archived';
  is_featured: boolean;
  allow_wholesale: boolean;
  available_flavors?: string[];
  created_at: string;
}

export interface DeliveryZone {
  id: string;
  name: string;
  delivery_fee: number;
  minimum_order: number;
  estimated_duration: string;
  is_active: boolean;
  location?: Partial<BeninLocation>;
}

export interface BeninLocation {
  department_code: string;
  department_name: string;
  commune_code: string;
  commune_name: string;
  arrondissement_code: string;
  arrondissement_name: string;
  quarter_code: string;
  quarter_name: string;
}

export interface CartItem {
  variant_id: string;
  product_id: string;
  quantity: number;
  flavor?: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_variant_id: string;
  product_name: string; // Snapshot for historical immutability
  variant_name: string;
  flavor?: string;
  sku?: string;
  unit_price: number;
  is_wholesale: boolean;
  quantity: number;
  total_price: number;
}

export interface OrderStatusHistory {
  id: string;
  order_id: string;
  from_status?: OrderStatus;
  to_status: OrderStatus;
  changed_by: string;
  comment?: string;
  created_at: string;
}

export interface CustomerProfile {
  id: string;
  phone: string;
  fullName: string;
  email?: string;
  deliveryZoneId?: string;
  deliveryZoneName?: string;
  deliveryAddress?: string;
  deliveryLandmark?: string;
  deliveryLocation?: BeninLocation;
  latitude?: number;
  longitude?: number;
  distanceMeters?: number;
  distanceFormatted?: string;
  calculatedDeliveryFee?: number;
  locationConfirmed?: boolean;
  workAddress?: string;
  workLandmark?: string;
  workLocation?: BeninLocation;
  workLatitude?: number;
  workLongitude?: number;
  workDistanceMeters?: number;
  workDistanceFormatted?: string;
  workCalculatedDeliveryFee?: number;
  notes?: string;
  createdAt: string;
  lastActiveAt: string;
  is_active?: boolean;
}

export interface StaffAccount {
  id: string;
  name: string;
  role: 'admin' | 'delivery';
  zone: string;
  departments?: string[];
  phone?: string;
  licensePlate?: string;
  is_active: boolean;
}

export interface Order {
  id: string;
  customer_id?: string;
  order_number: string; // Ex: OLA-20260923-A8F4
  order_type: OrderType;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  delivery_zone_id: string;
  delivery_zone_name: string;
  delivery_address: string;
  delivery_landmark?: string;
  delivery_location?: BeninLocation;
  customer_latitude?: number;
  customer_longitude?: number;
  delivery_distance_meters?: number;
  delivery_distance_text?: string;
  delivery_fee_calculation_mode?: 'gps_distance' | 'zone_fixed';
  subtotal: number;
  delivery_fee: number;
  discount_amount: number;
  total: number;
  payment_method: 'cash_on_delivery';
  payment_status: PaymentStatus;
  order_status: OrderStatus;
  delivery_agent_name?: string;
  delivery_agent_id?: string;
  delivery_agent_phone?: string;
  delivery_agent_plate?: string;
  delivery_selected_agent_id?: string;
  delivery_selected_agent_name?: string;
  delivery_assignment_status?: 'unmatched' | 'pending' | 'auto_assigned' | 'offered' | 'accepted';
  delivery_candidate_ids?: string[];
  delivery_assigned_at?: string;
  customer_note?: string;
  customer_voice_note_available?: boolean;
  customer_confirmed_at?: string;
  customer_confirmation_method?: 'press_hold';
  customer_confirmation_hold_ms?: number;
  admin_note?: string;
  placed_at: string;
  confirmed_at?: string;
  delivered_at?: string;
  cancelled_at?: string;
  items: OrderItem[];
  status_history: OrderStatusHistory[];
}
