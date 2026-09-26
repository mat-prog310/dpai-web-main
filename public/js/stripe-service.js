// =============================================================================
// STRIPE-SERVICE.JS - VERSION CORRIGÉE AVEC CALLABLE FUNCTIONS (26/09/2026)
// =============================================================================

// =============================================================================
// DÉFINITIONS GLOBALES AVEC FALLBACK
// =============================================================================
var SubscriptionPlans = window.SubscriptionPlans = window.SubscriptionPlans || {
  FREE: 'free',
  PRO: 'pro',
  ENTERPRISE: 'enterprise'
};

var SubscriptionPlansData = window.SubscriptionPlansData = window.SubscriptionPlansData || [
  { id: 'free',       name: 'Gratuit',    priceEuros: 0,      tokenLimit: 50,   bonusRate: 0.0  },
  { id: 'pro',        name: 'Pro',        priceEuros: 50.00,  tokenLimit: 500,  bonusRate: 0.20 },
  { id: 'enterprise', name: 'Enterprise', priceEuros: 300.00, tokenLimit: 5000, bonusRate: 0.30 }
];

var TokenPacks = window.TokenPacks = window.TokenPacks || [
  { id: 'discovery',     name: 'Découverte',     tokenAmount: 100, priceEuros: 12.00 },
  { id: 'boost',         name: 'Boost',          tokenAmount: 300, priceEuros: 30.00 },
  { id: 'expert',        name: 'Expert',         tokenAmount: 600, priceEuros: 55.00 },
  { id: 'unique_report', name: 'Rapport unique', tokenAmount: 250, priceEuros: 25.00 }
];

// =============================================================================
// HELPERS
// =============================================================================
function getPaymentLink(key) {
  const links = window.PAYMENT_LINKS || {};
  return links[key + '_link'] || links[key] || null;
}

/**
 * Construit l'URL finale avec client_reference_id + prefilled_email
 */
function buildPaymentUrl(baseUrl, data) {
  const params = [];
  const ref = encodeURIComponent(JSON.stringify(data));
  params.push('client_reference_id=' + ref);
  if (data.email) {
    params.push('prefilled_email=' + encodeURIComponent(data.email));
  }
  const separator = baseUrl.includes('?') ? '&' : '?';
  return baseUrl + separator + params.join('&');
}

// =============================================================================
// CLASSE STRIPE SERVICE
// =============================================================================
class StripeService {
  constructor() {
    console.log('%c💳 [Stripe] Service initialisé - Payment Links', 'color: #6772e5; font-weight: bold;');
  }

  async init(publishableKey) {
    if (!publishableKey) {
      console.warn('%c⚠️ [Stripe] Aucune clé publique détectée', 'color: #ffc107;');
      return false;
    }
    if (publishableKey.startsWith('pk_test_')) {
      console.log('%c🧪 [Stripe] Mode TEST activé', 'color: #28a745; font-weight: bold;');
    } else if (publishableKey.startsWith('pk_live_')) {
      console.log('%c✅ [Stripe] Mode PRODUCTION activé', 'color: #28a745;');
    }
    return true;
  }

  // ===========================================================================
  // ACHAT DE PACKS DE TOKENS - VERSION SÉCURISÉE AVEC CALLABLE FUNCTIONS
  // ===========================================================================
  async purchaseTokenPack(packId, userId) {
    try {
      const pack = TokenPacks.find(p => p.id === packId);
      if (!pack) throw new Error('Pack de tokens introuvable');

      const user = authService.currentUser;
      if (!user) throw new Error('Utilisateur non connecté');

      // Pack gratuit - Utiliser Callable Function
      if (pack.priceEuros === 0) {
        const claimFreeTokenPack = firebase.functions().httpsCallable('claimFreeTokenPack');
        const result = await claimFreeTokenPack({
          userId: user.uid,
          packId: packId,
          tokenAmount: pack.tokenAmount
        });
        if (result.data.success && typeof loadUserTokenData === 'function') {
          await loadUserTokenData(userId);
        }
        return { success: true, isFree: true, ...result.data };
      }

      // Pack payant - Initialiser via Callable Function puis rediriger
      const paymentUrl = getPaymentLink(packId);
      if (!paymentUrl) {
        throw new Error(`Payment Link non configuré pour ${packId}. Vérifie js/payment-links-config.js`);
      }

      // Initialiser l'achat via Callable Function
      const initTokenPurchase = firebase.functions().httpsCallable('initTokenPurchase');
      const initResult = await initTokenPurchase({
        userId: user.uid,
        packId: packId,
        tokenAmount: pack.tokenAmount
      });

      if (!initResult.data.success) {
        throw new Error('Échec de l\'initialisation de l\'achat');
      }

      const purchaseId = initResult.data.purchaseId;

      // Construire l'URL Stripe avec purchaseId
      const finalUrl = buildPaymentUrl(paymentUrl, {
        userId: user.uid,
        packId: packId,
        tokenAmount: pack.tokenAmount,
        type: 'token_pack',
        purchaseId: purchaseId,
        email: user.email || ''
      });

      // Stocker purchaseId en sessionStorage pour la confirmation après retour
      sessionStorage.setItem('stripe_purchase_id', purchaseId);
      sessionStorage.setItem('stripe_purchase_type', 'token_pack');
      sessionStorage.setItem('stripe_purchase_packId', packId);

      console.log('🔗 [Stripe] Redirection vers:', finalUrl);
      console.log('💾 [Stripe] purchaseId stocké en sessionStorage:', purchaseId);
      window.location.href = finalUrl;
      return { success: true, redirected: true, purchaseId: purchaseId };

    } catch (error) {
      console.error('❌ [Stripe] Erreur achat pack tokens:', error);
      return { success: false, error: error.message };
    }
  }

  // ===========================================================================
  // ACHAT D'UN ABONNEMENT - VERSION SÉCURISÉE AVEC CALLABLE FUNCTIONS
  // ===========================================================================
  async purchaseSubscription(planId, userId, isAnnual) {
    if (isAnnual === undefined) isAnnual = false;

    try {
      const plan = SubscriptionPlansData.find(p => p.id === planId);
      if (!plan) throw new Error('Plan introuvable');

      const user = authService.currentUser;
      if (!user) throw new Error('Utilisateur non connecté');

      // Plan gratuit - Utiliser Callable Function
      if (plan.priceEuros === 0) {
        const claimFreeSubscription = firebase.functions().httpsCallable('claimFreeSubscription');
        const result = await claimFreeSubscription({
          userId: user.uid,
          planId: planId
        });
        if (result.data.success && typeof loadUserTokenData === 'function') {
          await loadUserTokenData(userId);
        }
        return { success: true, isFree: true, ...result.data };
      }

      // Plan payant - Initialiser via Callable Function puis rediriger
      const linkKey = isAnnual ? (planId + '_annual') : (planId + '_monthly');
      const paymentUrl = getPaymentLink(linkKey);
      if (!paymentUrl) {
        throw new Error(`Payment Link non configuré pour ${linkKey}. Vérifie js/payment-links-config.js`);
      }

      // Initialiser l'achat via Callable Function
      const initSubscription = firebase.functions().httpsCallable('initSubscription');
      const initResult = await initSubscription({
        userId: user.uid,
        planId: planId,
        isAnnual: isAnnual
      });

      if (!initResult.data.success) {
        throw new Error('Échec de l\'initialisation de l\'abonnement');
      }

      const purchaseId = initResult.data.purchaseId;

      // Construire l'URL Stripe avec purchaseId
      const finalUrl = buildPaymentUrl(paymentUrl, {
        userId: user.uid,
        planId: planId,
        isAnnual: isAnnual,
        type: 'subscription',
        purchaseId: purchaseId,
        email: user.email || ''
      });

      // Stocker purchaseId en sessionStorage pour la confirmation après retour
      sessionStorage.setItem('stripe_purchase_id', purchaseId);
      sessionStorage.setItem('stripe_purchase_type', 'subscription');
      sessionStorage.setItem('stripe_purchase_planId', planId);
      sessionStorage.setItem('stripe_purchase_isAnnual', isAnnual);

      console.log('🔗 [Stripe] Redirection vers:', finalUrl);
      console.log('💾 [Stripe] purchaseId stocké en sessionStorage:', purchaseId);
      window.location.href = finalUrl;
      return { success: true, redirected: true, purchaseId: purchaseId };

    } catch (error) {
      console.error('❌ [Stripe] Erreur achat abonnement:', error);
      return { success: false, error: error.message };
    }
  }

  // ===========================================================================
  // FONCTIONS UTILITAIRES
  // ===========================================================================
  handleCardError(error) {
    const el = document.getElementById('card-errors');
    if (el) el.textContent = error.message;
  }

  clearErrors() {
    const el = document.getElementById('card-errors');
    if (el) el.textContent = '';
  }

  getCustomerName() {
    const user = authService.currentUser;
    return user && user.displayName ? user.displayName : 'Client DPAI';
  }
}

// =============================================================================
// EXPOSITION GLOBALE
// =============================================================================
window.stripeService = new StripeService();
var stripeService = window.stripeService;

// Initialisation automatique avec la clé Stripe si disponible
// et vérification que firebase.functions() est disponible
function checkFirebaseFunctions() {
  if (window.firebase && typeof window.firebase.functions === 'function') {
    return true;
  }
  return false;
}

if (window.stripePublishableKey && checkFirebaseFunctions()) {
  stripeService.init(window.stripePublishableKey);
} else {
  // Attendre que tout soit chargé (firebase + clé Stripe)
  const initWhenReady = setInterval(() => {
    if (window.stripePublishableKey && checkFirebaseFunctions()) {
      clearInterval(initWhenReady);
      stripeService.init(window.stripePublishableKey);
    }
  }, 100);
  
  // Timeout de sécurité
  setTimeout(() => {
    clearInterval(initWhenReady);
    if (!checkFirebaseFunctions()) {
      console.error('%c❌ [Firebase] firebase.functions() non disponible - Vérifie que Firebase est initialisé', 'color: #dc3545; font-weight: bold;');
    }
    if (!window.stripePublishableKey) {
      console.warn('%c⚠️ [Stripe] Clé publique Stripe non définie après 5 secondes', 'color: #ffc107;');
    }
  }, 5000);
}

console.log('%c💳 [stripe-service.js] Service exposé en global - Prêt !', 'color: #6772e5; font-weight: bold;');
