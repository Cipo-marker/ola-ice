import { CustomerProfile } from '../types';

const STORAGE_KEYS = {
  CURRENT_CUSTOMER: 'olaice_customer_auth_v1',
  ALL_CUSTOMERS: 'olaice_customers_v1',
  PROMPT_DISMISSED: 'olaice_profile_prompt_dismissed_v1',
};

class CustomerAuthService {
  private currentCustomer: CustomerProfile | null = null;
  private subscribers: Array<(customer: CustomerProfile | null) => void> = [];

  constructor() {
    this.currentCustomer = this.loadCurrentCustomer();
  }

  private loadCurrentCustomer(): CustomerProfile | null {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.CURRENT_CUSTOMER);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed to load customer profile from storage', e);
    }
    return null;
  }

  private loadAllCustomers(): CustomerProfile[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.ALL_CUSTOMERS);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // ignore
    }
    return [];
  }

  private saveAllCustomers(customers: CustomerProfile[]) {
    try {
      localStorage.setItem(STORAGE_KEYS.ALL_CUSTOMERS, JSON.stringify(customers));
    } catch {
      // ignore
    }
  }

  private saveCurrentCustomer(customer: CustomerProfile | null) {
    this.currentCustomer = customer;
    try {
      if (customer) {
        localStorage.setItem(STORAGE_KEYS.CURRENT_CUSTOMER, JSON.stringify(customer));
        // Also sync in all customers list
        const all = this.loadAllCustomers();
        const index = all.findIndex((c) => c.id === customer.id || c.phone === customer.phone);
        if (index >= 0) {
          all[index] = customer;
        } else {
          all.push(customer);
        }
        this.saveAllCustomers(all);
      } else {
        localStorage.removeItem(STORAGE_KEYS.CURRENT_CUSTOMER);
      }
    } catch {
      // ignore
    }
    this.notify();
  }

  subscribe(callback: (customer: CustomerProfile | null) => void): () => void {
    this.subscribers.push(callback);
    callback(this.currentCustomer);
    return () => {
      this.subscribers = this.subscribers.filter((cb) => cb !== callback);
    };
  }

  private notify() {
    this.subscribers.forEach((cb) => cb(this.currentCustomer));
  }

  getCurrentCustomer(): CustomerProfile | null {
    return this.currentCustomer;
  }

  isAuthenticated(): boolean {
    return this.currentCustomer !== null;
  }

  /**
   * Smart login or register in 1 step:
   * If a user with this phone exists, logs them in.
   * If not, automatically creates their account and logs them in.
   * Zero cognitive friction.
   */
  loginOrRegister(phone: string, fullName?: string): { customer: CustomerProfile; isNew: boolean } {
    const cleanPhone = phone.trim();
    const all = this.loadAllCustomers();
    const normalizedTarget = cleanPhone.replace(/[^0-9]/g, '');

    const existing = all.find(
      (c) => c.phone.replace(/[^0-9]/g, '') === normalizedTarget
    );

    const now = new Date().toISOString();

    if (existing) {
      const updated: CustomerProfile = {
        ...existing,
        fullName: fullName?.trim() || existing.fullName,
        lastActiveAt: now,
      };
      this.saveCurrentCustomer(updated);
      return { customer: updated, isNew: false };
    }

    // New profile creation
    const newCustomer: CustomerProfile = {
      id: `cust_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      phone: cleanPhone,
      fullName: fullName?.trim() || 'Client Ola Ice',
      createdAt: now,
      lastActiveAt: now,
    };

    this.saveCurrentCustomer(newCustomer);
    return { customer: newCustomer, isNew: true };
  }

  /**
   * One-click instant guest-to-customer creation
   */
  quickOneClickRegister(defaultName?: string): CustomerProfile {
    const now = new Date().toISOString();
    const guestNumber = Math.floor(1000 + Math.random() * 9000);
    const newCustomer: CustomerProfile = {
      id: `cust_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      phone: '',
      fullName: defaultName?.trim() || `Gourmand #${guestNumber}`,
      createdAt: now,
      lastActiveAt: now,
    };

    this.saveCurrentCustomer(newCustomer);
    return newCustomer;
  }

  /**
   * Update current customer's profile info (addresses, landmarks, preferences)
   */
  updateProfile(data: Partial<CustomerProfile>): CustomerProfile | null {
    if (!this.currentCustomer) return null;

    const updated: CustomerProfile = {
      ...this.currentCustomer,
      ...data,
      lastActiveAt: new Date().toISOString(),
    };

    this.saveCurrentCustomer(updated);
    return updated;
  }

  logout() {
    this.saveCurrentCustomer(null);
  }

  /**
   * Check if profile has enough data to perform 1-click orders
   */
  getProfileCompletion(customer: CustomerProfile | null) {
    if (!customer) {
      return {
        percent: 0,
        hasName: false,
        hasPhone: false,
        hasAddress: false,
        hasZone: false,
        missingFields: ['Nom', 'Téléphone', 'Zone', 'Adresse'],
      };
    }

    const hasName = Boolean(customer.fullName && customer.fullName.trim() && !customer.fullName.startsWith('Gourmand #'));
    const hasPhone = Boolean(customer.phone && customer.phone.replace(/[^0-9]/g, '').length >= 8);
    const hasZone = Boolean(customer.deliveryZoneId);
    const hasAddress = Boolean(customer.deliveryAddress && customer.deliveryAddress.trim());

    const fields = [hasName, hasPhone, hasZone, hasAddress];
    const completedCount = fields.filter(Boolean).length;
    const percent = Math.round((completedCount / fields.length) * 100);

    const missingFields: string[] = [];
    if (!hasName) missingFields.push('Nom complet');
    if (!hasPhone) missingFields.push('Numéro de téléphone');
    if (!hasZone) missingFields.push('Zone de livraison');
    if (!hasAddress) missingFields.push('Adresse / Quartier');

    return {
      percent,
      hasName,
      hasPhone,
      hasZone,
      hasAddress,
      missingFields,
    };
  }

  /**
   * Dismiss the homepage prompt temporarily for this session
   */
  isPromptDismissed(): boolean {
    return sessionStorage.getItem(STORAGE_KEYS.PROMPT_DISMISSED) === 'true';
  }

  dismissPrompt() {
    sessionStorage.setItem(STORAGE_KEYS.PROMPT_DISMISSED, 'true');
  }
}

export const customerAuthService = new CustomerAuthService();
