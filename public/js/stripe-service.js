// =============================================================================
// STRIPE-SERVICE.JS - VERSION SIMPLIFIÉE
// Tous les services sont maintenant gratuits
// Pour les fonctionnalités premium, contacter: duprey.conseil@gmail.com
// =============================================================================

console.log('%c💳 [Stripe] Service initialisé - Tous les services sont gratuits', 'color: #28a745; font-weight: bold;');

// Plans de souscription (plus utilisés, tous en gratuit)
var SubscriptionPlans = window.SubscriptionPlans = {
  FREE: 'free',
  PRO: 'pro',
  ENTERPRISE: 'enterprise'
};

// Données des plans (pour compatibilité)
var SubscriptionPlansData = window.SubscriptionPlansData = [
  { id: 'free', name: 'Gratuit', priceEuros: 0, tokenLimit: 500, bonusRate: 0.0 },
  { id: 'pro', name: 'Pro', priceEuros: 0, tokenLimit: 500, bonusRate: 0.0 },
  { id: 'enterprise', name: 'Enterprise', priceEuros: 0, tokenLimit: 500, bonusRate: 0.0 }
];

// Packs de tokens (plus utilisés)
var TokenPacks = window.TokenPacks = [
  { id: 'contact_us', name: 'Contactez-nous', tokenAmount: 0, priceEuros: 0, 
    description: 'Pour plus de tokens, envoyez un email à duprey.conseil@gmail.com' }
];

// Exposer globalement
window.StripeService = {
    // Plus de fonctionnalités d'achat
    // Pour toute demande, rediriger vers la page de contact
    redirectToContact: function() {
        window.location.href = '/pricing.html';
    },
    
    // Fonction factice pour compatibilité
    purchaseSubscription: function(planId) {
        console.log('⚠️ [Stripe] Les achats sont désactivés. Redirection vers pricing.html');
        this.redirectToContact();
    },
    
    purchaseTokenPack: function(packId) {
        console.log('⚠️ [Stripe] Les achats sont désactivés. Redirection vers pricing.html');
        this.redirectToContact();
    }
};

console.log('%c✅ [Stripe] Service exposé en global - Tous en mode gratuit', 'color: #28a745; font-weight: bold;');
