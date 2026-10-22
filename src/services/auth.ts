export type StaffRole = 'admin' | 'delivery' | 'none';
export interface StaffUser { role: StaffRole; name: string; badgeId: string; assignedZone?: string; assignedDepartments?: string[]; phone?: string; licensePlate?: string; }
export const REGISTERED_DRIVERS = [
  { name: 'Koffi (Moto Express 01)', zone: 'Cotonou Centre & Littoral' },
  { name: 'Moussa (Moto Express 02)', zone: 'Calavi & Godomey' },
  { name: 'Aïcha (Moto Express 03)', zone: 'Akpakpa & Cotonou Est' },
  { name: 'Bio (Moto Express 04)', zone: 'Cadjehoun & Haie Vive' },
];

class AuthService {
  private currentUser: StaffUser | null = null;
  private subscribers: Array<(user: StaffUser | null) => void> = [];
  constructor() { void this.restoreSession(); }
  private publish(user: StaffUser | null) { this.currentUser = user; this.subscribers.forEach((callback) => callback(user)); }
  async restoreSession() {
    try { const response = await fetch('/api/staff/session', { credentials: 'same-origin' }); const result = await response.json(); this.publish(result.user); }
    catch { this.publish(null); }
  }
  subscribe(callback: (user: StaffUser | null) => void) { this.subscribers.push(callback); callback(this.currentUser); return () => { this.subscribers = this.subscribers.filter((item) => item !== callback); }; }
  getCurrentUser() { return this.currentUser; }
  isAdmin() { return this.currentUser?.role === 'admin'; }
  isDelivery() { return this.currentUser?.role === 'delivery'; }
  private async login(role: 'admin' | 'delivery', pin: string, name?: string) {
    try {
      const response = await fetch('/api/staff/login', { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ role, pin, name }) });
      const result = await response.json();
      if (!response.ok) return { success: false, error: result.error || 'Code d’accès invalide.' };
      this.publish(result.user); return { success: true };
    } catch { return { success: false, error: 'Connexion au serveur impossible.' }; }
  }
  loginAdmin(code: string) { return this.login('admin', code); }
  loginDriver(driverName: string, pin: string) { return this.login('delivery', pin, driverName); }
  async logout() { try { await fetch('/api/staff/logout', { method: 'POST', credentials: 'same-origin' }); } finally { this.publish(null); } }
}
export const authService = new AuthService();
