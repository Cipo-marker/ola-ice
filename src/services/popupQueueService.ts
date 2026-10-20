import { customerAuthService } from './customerAuth';
import { CustomerProfile } from '../types';

export type PopupCampaignType =
  | 'profile_completion'
  | 'product_spotlight'
  | 'new_arrivals'
  | 'wholesale_promo'
  | 'gps_delivery';

export interface PopupCampaign {
  id: string;
  type: PopupCampaignType;
  priority: number;
  isActive: boolean;
  kicker: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  badgeText?: string;
  primaryCtaLabel: string;
  productId?: string;
  featuredProductIds?: string[];
  customPriceNote?: string;
}

const STORAGE_KEYS = {
  CAMPAIGNS: 'olaice_popup_campaigns_v1',
  DISMISSED_IDS: 'olaice_popup_dismissed_session_v1',
  QUEUE_PAUSED: 'olaice_popup_queue_paused_session_v1',
};

export const INITIAL_POPUP_CAMPAIGNS: PopupCampaign[] = [
  {
    id: 'popup-profile-completion',
    type: 'profile_completion',
    priority: 1,
    isActive: true,
    kicker: 'Service Express · Zéro saisie à la prochaine commande',
    title: 'Complétez votre profil de livraison en 15 secondes',
    subtitle:
      'Enregistrez votre nom, votre numéro WhatsApp et votre quartier une seule fois. Vos prochaines commandes seront pré-remplies automatiquement en 1 clic.',
    imageUrl: '/images/hero_ola_ice_showcase_1790119089620.jpg',
    badgeText: 'Commande 1-Clic activée',
    primaryCtaLabel: 'Enregistrer mes coordonnées',
  },
  {
    id: 'popup-charbon-price',
    type: 'product_spotlight',
    priority: 2,
    isActive: true,
    kicker: 'Nouveau Produit · Tarif Officiel & Livraison Express',
    title: 'Nouveau : Prix du Charbon de Bois & Braise Ola Ice',
    subtitle:
      'Charbon de bois dur de qualité supérieure, sans poussière ni fumée excessive. Allumage rapide et braise longue durée pour votre cuisine et vos grillades, livré directement chez vous !',
    imageUrl: '/src/assets/images/charbon_bois_sac_1791270478931.jpg',
    badgeText: 'Dès 250 F CFA',
    productId: 'prod-charbon-bois',
    customPriceNote: 'Sachet : 250 F CFA · Sac Ménage : 1 500 F CFA · Grand Sac : 3 500 F CFA',
    primaryCtaLabel: 'Ajouter du charbon au panier',
  },
  {
    id: 'popup-new-arrivals',
    type: 'new_arrivals',
    priority: 3,
    isActive: true,
    kicker: 'Nouveautés à la Carte · Fraîcheur & Restauration',
    title: 'Découvrez nos nouveautés chaudes et glacées du jour',
    subtitle:
      'Laissez-vous tenter par nos nouveaux Grands Pots de Yaourt Onctueux, nos Tacos Français gratinés au fromage et notre célèbre Jolof Rice au poulet doré.',
    imageUrl: '/src/assets/images/tacos_francais_gratine_1791269292061.jpg',
    badgeText: 'Préparé à la minute',
    featuredProductIds: ['prod-les-yaourts', 'prod-tacos', 'prod-jolof-rice'],
    primaryCtaLabel: 'Explorer toutes les nouveautés',
  },
  {
    id: 'popup-wholesale-resellers',
    type: 'wholesale_promo',
    priority: 4,
    isActive: true,
    kicker: 'Opportunité Revendeuses, Boutiques & Fêtes',
    title: 'Achetez en Gros et multipliez vos bénéfices avec Ola Ice',
    subtitle:
      'Tarif de gros appliqué automatiquement dans votre panier dès 10 unités sur les Yaourts Groto, Glaces Événements et Jus Naturels. Livraison en glacière isotherme.',
    imageUrl: '/src/assets/images/glaces_evenements_popsicles_1791269249788.jpg',
    badgeText: 'Jusqu’à -20% sur quantité',
    primaryCtaLabel: 'Voir les produits éligibles au Gros',
  },
  {
    id: 'popup-gps-delivery',
    type: 'gps_delivery',
    priority: 5,
    isActive: true,
    kicker: 'Tarification GPS Transparente · Bohicon & Abomey',
    title: 'Vos frais de livraison dès 50 F CFA selon votre distance',
    subtitle:
      'Calculez votre distance exacte par rapport à la boutique Ola Ice : 50 F CFA à moins de 500 m, 100 F CFA de 500 m à 1 km, et 200 F CFA à partir d’1 km.',
    imageUrl: '/images/product_creme_glacee_artisanale_1790119122257.jpg',
    badgeText: 'Dès 50 F CFA',
    primaryCtaLabel: 'Mesurer ma distance GPS maintenant',
  },
];

class PopupQueueService {
  private campaigns: PopupCampaign[] = [];
  private dismissedIds: Set<string> = new Set();
  private isPausedForSession = false;
  private subscribers: Array<() => void> = [];

  constructor() {
    this.campaigns = this.loadCampaigns();
    this.dismissedIds = this.loadDismissedIds();
    this.isPausedForSession = sessionStorage.getItem(STORAGE_KEYS.QUEUE_PAUSED) === 'true';
  }

  private loadCampaigns(): PopupCampaign[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.CAMPAIGNS);
      if (raw) {
        const parsed = JSON.parse(raw) as PopupCampaign[];
        // Merge any new default campaigns not yet in localStorage
        for (const initCamp of INITIAL_POPUP_CAMPAIGNS) {
          if (!parsed.some((c) => c.id === initCamp.id)) {
            parsed.push(initCamp);
          } else {
            // Keep image synced if it was updated
            const idx = parsed.findIndex((c) => c.id === initCamp.id);
            if (idx >= 0 && initCamp.id === 'popup-charbon-price') {
              parsed[idx].imageUrl = initCamp.imageUrl;
            }
          }
        }
        return parsed.sort((a, b) => a.priority - b.priority);
      }
    } catch {
      // ignore
    }
    return [...INITIAL_POPUP_CAMPAIGNS].sort((a, b) => a.priority - b.priority);
  }

  private saveCampaigns() {
    try {
      localStorage.setItem(STORAGE_KEYS.CAMPAIGNS, JSON.stringify(this.campaigns));
    } catch {
      // ignore
    }
    this.notify();
  }

  private loadDismissedIds(): Set<string> {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEYS.DISMISSED_IDS);
      if (raw) {
        return new Set(JSON.parse(raw));
      }
    } catch {
      // ignore
    }
    return new Set();
  }

  private saveDismissedIds() {
    try {
      sessionStorage.setItem(
        STORAGE_KEYS.DISMISSED_IDS,
        JSON.stringify(Array.from(this.dismissedIds))
      );
    } catch {
      // ignore
    }
    this.notify();
  }

  subscribe(callback: () => void): () => void {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter((cb) => cb !== callback);
    };
  }

  private notify() {
    this.subscribers.forEach((cb) => cb());
  }

  getAllCampaigns(): PopupCampaign[] {
    return [...this.campaigns].sort((a, b) => a.priority - b.priority);
  }

  /**
   * Returns the ordered FIFO queue of eligible pop-ups that haven't been dismissed yet in this session.
   * Ensures `profile_completion` only shows if the user's profile is not yet 100% complete.
   */
  getEligibleQueue(customer: CustomerProfile | null): PopupCampaign[] {
    if (this.isPausedForSession) return [];

    const completion = customerAuthService.getProfileCompletion(customer);
    const isProfileComplete = completion.percent >= 100;
    const hasGpsConfirmed = Boolean(customer?.locationConfirmed && customer?.distanceFormatted);

    return this.getAllCampaigns().filter((camp) => {
      if (!camp.isActive) return false;
      if (this.dismissedIds.has(camp.id)) return false;

      // Conditional eligibility rules
      if (camp.type === 'profile_completion' && isProfileComplete) {
        return false;
      }
      if (camp.type === 'gps_delivery' && hasGpsConfirmed) {
        return false;
      }

      return true;
    });
  }

  /**
   * Marks a single popup as seen/dismissed so the queue advances smoothly to the next item
   */
  dismissPopup(id: string) {
    this.dismissedIds.add(id);
    this.saveDismissedIds();
  }

  /**
   * Pause all automatic popups for the rest of the current browsing session
   */
  pauseAllForSession() {
    this.isPausedForSession = true;
    try {
      sessionStorage.setItem(STORAGE_KEYS.QUEUE_PAUSED, 'true');
    } catch {
      // ignore
    }
    this.notify();
  }

  /**
   * Reset session dismissals and unpause so the user or admin can replay the full queue from the start
   */
  resetQueueSession() {
    this.dismissedIds.clear();
    this.isPausedForSession = false;
    try {
      sessionStorage.removeItem(STORAGE_KEYS.DISMISSED_IDS);
      sessionStorage.removeItem(STORAGE_KEYS.QUEUE_PAUSED);
    } catch {
      // ignore
    }
    this.notify();
  }

  /**
   * Update a popup campaign (Admin feature: e.g. changing the price of charcoal or editing a new product popup)
   */
  updateCampaign(updated: PopupCampaign) {
    const idx = this.campaigns.findIndex((c) => c.id === updated.id);
    if (idx >= 0) {
      this.campaigns[idx] = updated;
    } else {
      this.campaigns.push(updated);
    }
    this.campaigns.sort((a, b) => a.priority - b.priority);
    this.saveCampaigns();
  }

  resetCampaignsToDefault() {
    this.campaigns = [...INITIAL_POPUP_CAMPAIGNS];
    this.saveCampaigns();
    this.resetQueueSession();
  }
}

export const popupQueueService = new PopupQueueService();
