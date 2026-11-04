// =============================================================================
// TOKENS.JS - Système de gestion des tokens + Intégration Mistral
// =============================================================================

// Helper pour obtenir db (Firestore) avec fallback
function getDB() {
    if (typeof db !== 'undefined') {
        return db;
    }
    if (typeof window !== 'undefined' && typeof window.authService !== 'undefined' && window.authService.db) {
        return window.authService.db;
    }
    if (typeof window !== 'undefined' && typeof window.firebaseDB !== 'undefined') {
        return window.firebaseDB;
    }
    if (typeof window !== 'undefined' && typeof window.firebase !== 'undefined' && window.firebase.firestore) {
        return window.firebase.firestore();
    }
    console.warn('[Tokens] Firestore non disponible');
    return null;
}

// =============================================================================
// CONFIGURATION IA LOCALE DPAI
// L'IA locale est toujours disponible via http://localhost:5002
// Elle doit être gérée côté serveur via des variables d'environnement
// =============================================================================

// URL de l'API IA locale DPAI
const LOCAL_AI_URL = "http://localhost:5002/api/chat";
// Configuration de l'IA locale DPAI
// Pas besoin de clé API pour l'IA locale

// L'IA locale DPAI n'a pas besoin de clé API
const LOCAL_AI_ENABLED = true;  // IA locale toujours disponible
// Fonction pour verifier la disponibilite de l IA locale
async function getLocalAIStatus() {
  return true;  // IA locale toujours disponible
}

// Contexte DPAI pour les prompts
const DPAI_CONTEXT = `
Tu es **DPAI Strategy**, un cabinet français spécialisé dans la **croissance externe** (fusions, acquisitions, rachats) pour les **PME et ETI françaises**.
**Notre méthodologie propriétaire :**
- Nous utilisons des **données marché françaises/européennes** (INSEE, Banque de France, Xerfi).
- Nos analyses sont **basées sur notre expertise** en M&A.
- Nous priorisons les **stratégies actionnables** (pas de théorie vide).

**Règles strictes :**
1. **Toujours personnaliser** : Adapte tes réponses au secteur, taille, et contexte du client.
2. **Chiffres concrets** : Utilise des **benchmarks sectoriels** (ex : "Dans la tech française, le multiple moyen est de 8-12x EBITDA").
3. **Exemples DPAI** : Si tu cites un exemple, utilise un **cas réel traité par DPAI** (à inventer si nécessaire).
4. **Structure claire** : Utilise **toujours** cette structure :
   - **Contexte** (1 phrase)
   - **Analyse** (3-5 points clés)
   - **Recommandations** (2-3 actions concrètes)
   - **Prochaines étapes** (1-2 actions immédiates)
5. **Langage** : **Toujours en français**, avec un ton **professionnel mais accessible**.
6. **Ne JAMAIS dire** : "En tant qu'IA...", "Je suis un modèle de langage...", "Généralement...".
`;

// Configuration des plans (TOUS LES UTILISATEURS ONT UN PLAN GRATUIT AVEC 500 TOKENS)
// Pour plus de tokens ou accéder aux Phases 3 & 4: envoyer un email à window.CONTACT_EMAIL
const TokenConfig = {
  tokenPriceEUR: 0,  // Aucun token : tout est inclus
  baseTokenLimits: {
    premium: -1,
    free: -1,        // alias compatibilité (anciens comptes)
    api_monthly: -1, // alias compatibilité (anciens comptes)
    advisor: -1      // alias compatibilité (anciens comptes)
  },
  
  tokenBonuses: {
    free: 0.0,      // Pas de bonus supplémentaire
    api_monthly: 0.0,
    advisor: 0.0
  },
  
  planPrices: {
    free: 0.0,
    api_monthly: 199.00,
    advisor: 199.00
  },
  
  welcomeBonus: 0,
  firstAnalysisBonus: 0,
  
  referralBonusSponsor: 20,
  referralBonusReferral: 10,
  
  loyaltyBonusPerAnalysis: 1,
  maxMonthlyLoyaltyBonus: {
    free: 10,
    api_monthly: 10,
    advisor: 0
  },
  
  companyDiscountRate: 0.20,
  lowTokenThreshold: 0.20,
  tokenResetDays: 30,
  
  // Durée de validité des tokens et abonnements (en jours)
  tokenValidityDays: 30,
  subscriptionValidityDays: 30
};

// Configuration des plans — UN SEUL PLAN : DPAI Premium.
// Démo 7 jours (tout inclus) puis 199 €/mois, illimité, tout inclus, AUCUN token.
// Les clés historiques ('free', 'api_monthly', 'advisor') pointent toutes vers le même plan
// pour la compatibilité des anciens comptes Firestore.
const PREMIUM_PLAN_CONFIG = {
  name: 'DPAI Premium',
  tokenLimit: -1,
  hasAI: true,
  hasAdvisor: true,
  price: 199
};
const PLAN_CONFIG = {
  premium: PREMIUM_PLAN_CONFIG,
  free: PREMIUM_PLAN_CONFIG,        // alias compatibilité
  api_monthly: PREMIUM_PLAN_CONFIG, // alias compatibilité
  advisor: PREMIUM_PLAN_CONFIG      // alias compatibilité
};

// Coûts des analyses par type - Alignés avec functions/index.js
// Tous les utilisateurs ont accès aux Phases 1 & 2
// Email: window.CONTACT_EMAIL pour Phases 3 & 4
const AnalysisCosts = {
  // PHASE 1 & 2 : Coûts en tokens (alignés avec le serveur)
  swot: 50,
  porter: 60,
  pestel: 55,
  competitive: 45,
  recommendation: 30,
  basic: 50,
  advanced: 55,
  detailed_report: 100,
  synergy: 60,
  modeling: 70,
  benchmark: 40,
  due_diligence: 80,
  valuation: 100,
  mergers_acquisitions: 100,
  strategic_audit: 70,
  risk_assessment: 50,
  // Services supplémentaires Phase 1 & 2
  reports: 100,
  ideal_sector: 40,
  maturity_score: 25,
  integration_matrix: 60,
  valuation_simulator: 100,
  
  // Outils etendus - Croissance externe (M&A)
  target_screening: 40,
  pre_acquisition_checklist: 35,
  synergy_simulator: 70,
  hr_due_diligence: 60,
  plan_100_days: 65,
  
  // Outils etendus - Diagnostic interne
  self_diagnostic: 40,
  value_chain: 45,
  action_matrix: 35,
  growth_readiness: 40,
  org_impact_simulator: 45,
  
  // PHASE 3 : NÉGOCIATION & SIGNATURE - BLOQUÉ (Contact par mail)
  loi_generation: 999999,
  loi_generator: 999999,
  negotiation_simulator: 999999,
  
  // PHASE 4 : INTÉGRATION & SUIVI - BLOQUÉ (Contact par mail)
  action_plan_100: 999999,
  action_plan_100_days: 999999,
  post_acquisition_dashboard: 999999
};

// Tous les services sont gratuits - Plus de packs de tokens
// Pour plus de tokens: contacter window.CONTACT_EMAIL

// Système de fidélité
class LoyaltySystem {
  static create(userId) {
    return {
      userId: userId,
      totalAnalyses: 0,
      monthlyAnalyses: 0,
      monthlyLoyaltyTokens: 0,
      lastAnalysisDate: null,
      lastMonthlyReset: new Date().toISOString()
    };
  }

  static addAnalysis(loyaltyInfo) {
    const newInfo = { ...loyaltyInfo };
    newInfo.totalAnalyses++;
    newInfo.monthlyAnalyses++;
    
    // Ajouter bonus de fidélité
    const bonus = TokenConfig.loyaltyBonusPerAnalysis;
    newInfo.monthlyLoyaltyTokens = Math.min(
      newInfo.monthlyLoyaltyTokens + bonus,
      TokenConfig.maxMonthlyLoyaltyBonus.free
    );
    
    newInfo.lastAnalysisDate = new Date().toISOString();
    return newInfo;
  }

  static resetMonthly(loyaltyInfo) {
    return {
      ...loyaltyInfo,
      monthlyAnalyses: 0,
      monthlyLoyaltyTokens: 0,
      lastMonthlyReset: new Date().toISOString()
    };
  }
}

// Système de parrainage
class ReferralSystem {
  static createReferralInfo(referralCode, sponsorId, sponsorName, sponsorEmail) {
    return {
      referralCode: referralCode,
      sponsorId: sponsorId,
      sponsorName: sponsorName,
      sponsorEmail: sponsorEmail,
      status: 'pending',
      createdAt: new Date().toISOString(),
      validatedAt: null,
      rewardedAt: null
    };
  }

  static generateReferralCode(name) {
    const cleanName = name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${cleanName}-${randomSuffix}`;
  }
}

// Gestionnaire principal des tokens
class TokenManager {
  static init(userData) {
    this.userData = userData;
    
    // L’abonnement serveur est la source de vérité pour les droits.
    let plan = userData.subscription?.plan ||
           userData.plan ||
           userData.tokenState?.plan ||
               'free';
    
    // Si l'utilisateur a isPremium=true mais plan='free', vérifier si c'est un advisor
    if (userData.isPremium && plan === 'free' && 
        (userData.tokenState?.availableTokens === -1 || userData.totalTokens === -1)) {
      plan = 'advisor';
      console.log('[TokenManager] Correction: utilisateur premium avec tokens illimités -> plan advisor');
    }
    
    const expectedBaseTokens = TokenConfig.baseTokenLimits[plan] || TokenConfig.baseTokenLimits.free;
    
    // TOUJOURS créer un tokenState valide
    let usedTokens = 0;
    let availableTokens = expectedBaseTokens === -1 ? -1 : expectedBaseTokens;
    let totalTokens = expectedBaseTokens;
    let firstAnalysisDone = false;
    let monthlyTokensUsed = 0;
    let lastTokenUpdate = new Date().toISOString();
    let lastMonthlyReset = new Date().toISOString();
    let expiresAt = null;
    let subscriptionExpiresAt = null;
    
    // Priorité 1: Récupérer depuis userData.tokenState
    if (userData.tokenState) {
      usedTokens = userData.tokenState.usedTokens || 0;
      availableTokens = userData.tokenState.availableTokens || 0;
      totalTokens = userData.tokenState.totalTokens || expectedBaseTokens;
      firstAnalysisDone = userData.tokenState.firstAnalysisDone || false;
      monthlyTokensUsed = userData.tokenState.monthlyTokensUsed || 0;
      lastTokenUpdate = userData.tokenState.lastTokenUpdate || new Date().toISOString();
      lastMonthlyReset = userData.tokenState.lastMonthlyReset || new Date().toISOString();
      expiresAt = userData.tokenState.expiresAt || null;
      subscriptionExpiresAt = userData.subscription?.expiresAt || userData.subscription?.trialEndsAt || userData.subscription?.endDate || null;
      console.log('[TokenManager] tokenState chargé depuis userData, plan:', plan);
    }
    // Priorité 2: Récupérer depuis les champs racine
    else if (userData.availableTokens !== undefined) {
      usedTokens = userData.tokensUsed || 0;
      availableTokens = userData.availableTokens || 0;
      totalTokens = userData.totalTokens || expectedBaseTokens;
      firstAnalysisDone = (userData.totalAnalyses || 0) > 0;
      subscriptionExpiresAt = userData.subscription?.expiresAt || userData.subscription?.trialEndsAt || userData.subscription?.endDate || null;
      console.log('[TokenManager] tokenState calculé depuis champs racine, plan:', plan);
    }
    
    // Corriger les incohérences: availableTokens = totalTokens - usedTokens
    // SAUF si totalTokens === -1 (illimité), alors availableTokens doit être -1
    let expectedAvailable = availableTokens;
    if (totalTokens === -1) {
      expectedAvailable = -1; // Illimité
    } else {
      expectedAvailable = totalTokens - usedTokens;
    }
    if (availableTokens !== expectedAvailable) {
      console.log('[TokenManager] Correction incohérence: availableTokens =', expectedAvailable);
      availableTokens = expectedAvailable;
    }
    
    // Si totalTokens est 0, initialiser à 500 (nouvel utilisateur)
    if (totalTokens === 0) {
      totalTokens = 500;
      usedTokens = 0;
      availableTokens = 500;
      console.log('[TokenManager] Nouvel utilisateur: 500 tokens');
    }

    if (plan === 'advisor') {
      usedTokens = 0;
      totalTokens = -1;
      availableTokens = -1;
    }
    
    // Vérifier si l'abonnement est expiré
    const now = new Date();
    let isExpired = false;
    
    if (subscriptionExpiresAt) {
      const expiryDate = new Date(subscriptionExpiresAt);
      if (expiryDate < now) {
        isExpired = true;
        console.log('[TokenManager] Abonnement expiré!');
      }
    }
    
    // Créer le tokenState
    this.tokenState = {
      userId: userData.id,
      plan: plan,  // Utiliser le plan déterminé plus haut
      baseTokens: expectedBaseTokens,
      bonusTokens: 0,
      totalTokens: totalTokens,
      usedTokens: usedTokens,
      availableTokens: availableTokens,
      lastTokenUpdate: lastTokenUpdate,
      firstAnalysisDone: firstAnalysisDone,
      monthlyTokensUsed: monthlyTokensUsed,
      lastMonthlyReset: lastMonthlyReset,
      expiresAt: expiresAt || this.calculateExpiryDate(plan),
      isExpired: isExpired
    };
    
    // Synchroniser les flags d'accès avec le plan
    const currentPlan = this.tokenState.plan;
    const updates = {
      hasAccessToAPI: currentPlan === 'advisor' || currentPlan === 'api_monthly',
      hasAccessToAdvancedAnalytics: currentPlan === 'advisor',
      hasAccessToPremiumSuggestions: currentPlan === 'advisor'
    };
    
    // Mettre à jour localement
    this.tokenState.hasAccessToAPI = updates.hasAccessToAPI;
    this.tokenState.hasAccessToAdvancedAnalytics = updates.hasAccessToAdvancedAnalytics;
    this.tokenState.hasAccessToPremiumSuggestions = updates.hasAccessToPremiumSuggestions;
    
    this.loyaltyInfo = userData.loyaltyInfo || LoyaltySystem.create(userData.id);
    this.referralInfo = userData.referralInfo;
    this.hasCompanyDiscount = userData.hasCompanyDiscount || false;
  }

  // Calculer la date d'expiration selon le plan
  static calculateExpiryDate(plan) {
    if (!plan || plan === 'free') {
      return null; // Gratuit n'a pas d'expiration
    }
    const days = TokenConfig.subscriptionValidityDays || 30;
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + days);
    return expiryDate.toISOString();
  }

  // Vérifier si le tokenState est expiré
  static isExpired() {
    if (!this.tokenState) return false;

    const subscription = this.userData?.subscription;
    if (subscription?.status && !['active', 'trialing'].includes(subscription.status)) {
      return true;
    }
    
    // Vérifier d'abord l'expiration du tokenState
    if (this.tokenState.expiresAt) {
      const expiryDate = new Date(this.tokenState.expiresAt);
      const now = new Date();
      if (expiryDate < now) {
        return true;
      }
    }
    
    // Vérifier l'expiration de l'abonnement
    if (this.userData?.subscription?.expiresAt) {
      const expiryDate = new Date(this.userData.subscription.expiresAt);
      const now = new Date();
      if (expiryDate < now) {
        return true;
      }
    }
    
    return false;
  }

  static createTokenState(userId, plan = 'free', existingTokenState = null) {
    const config = TokenConfig.baseTokenLimits[plan] || TokenConfig.baseTokenLimits.free;
    const totalTokens = config === -1 ? -1 : config; // Gérer l'illimité
    const usedTokens = existingTokenState?.usedTokens || 0;
    const monthlyTokensUsed = existingTokenState?.monthlyTokensUsed || 0;
    const firstAnalysisDone = existingTokenState?.firstAnalysisDone || false;
    
    // Calculer availableTokens
    let availableTokens;
    if (totalTokens === -1) {
      availableTokens = -1; // Illimité
    } else {
      availableTokens = totalTokens - usedTokens;
    }
    
    return {
      userId: userId,
      plan: plan,
      baseTokens: totalTokens,
      bonusTokens: 0,
      totalTokens: totalTokens,
      usedTokens: totalTokens === -1 ? 0 : Math.min(usedTokens, totalTokens),
      availableTokens: availableTokens,
      lastTokenUpdate: new Date().toISOString(),
      firstAnalysisDone: firstAnalysisDone,
      monthlyTokensUsed: monthlyTokensUsed,
      lastMonthlyReset: existingTokenState?.lastMonthlyReset || new Date().toISOString(),
      expiresAt: this.calculateExpiryDate(plan),
      isExpired: false
    };
  }

  static get availableTokens() {
    return this.tokenState ? this.tokenState.availableTokens : 0;
  }

  static get tokenLimit() {
    return this.tokenState ? this.tokenState.baseTokens : 0;
  }

  static get tokenUsagePercentage() {
    if (!this.tokenState) return 0;
    return (this.tokenState.usedTokens / this.tokenState.totalTokens) * 100;
  }

  static async addTokens(amount, reason = 'achat') {
    const newState = { ...this.tokenState };
    const currentPlan = newState.plan;
    newState.availableTokens += amount;
    newState.totalTokens += amount;
    
    // Sauvegarder dans Firestore (tokenState + champs racine)
    const firestoreDB = getDB();
    if (firestoreDB && this.userData && this.userData.id) {
      await firestoreDB.collection('users').doc(this.userData.id).update({
        tokenState: newState,
        plan: currentPlan,
        'subscription.plan': currentPlan,
        availableTokens: newState.availableTokens,
        totalTokens: newState.totalTokens
      });
    }

    this.tokenState = newState;
    this.notifyListeners();
    return true;
  }

  static async resetMonthlyTokens() {
    // CORRECTION: Utiliser le plan actuel pour déterminer les tokens
    const currentPlan = this.tokenState?.plan || 'free';
    const baseTokens = TokenConfig.baseTokenLimits[currentPlan] || TokenConfig.baseTokenLimits.free;
    const totalTokens = baseTokens === -1 ? -1 : baseTokens; // Conserver l'illimité pour advisor
    
    const newState = {
      ...this.tokenState,
      plan: currentPlan, // Conserver le plan actuel (advisor, api_monthly, ou free)
      baseTokens: baseTokens,
      totalTokens: totalTokens,
      availableTokens: totalTokens, // Réinitialiser aux tokens de base du plan
      usedTokens: 0,
      monthlyTokensUsed: 0,
      lastMonthlyReset: new Date().toISOString(),
      firstAnalysisDone: false
    };
    
    // Réinitialiser la fidélité mensuelle
    this.loyaltyInfo = LoyaltySystem.resetMonthly(this.loyaltyInfo);
    
    const firestoreDB = getDB();
    if (firestoreDB && this.userData && this.userData.id) {
      await firestoreDB.collection('users').doc(this.userData.id).update({
        tokenState: newState,
        loyaltyInfo: this.loyaltyInfo,
        plan: currentPlan,
        'subscription.plan': currentPlan,
        availableTokens: newState.availableTokens,
        tokensUsed: newState.usedTokens,
        totalTokens: newState.totalTokens
      });
    }

    this.tokenState = newState;
    this.notifyListeners();
  }

  static async changePlan(newPlan) {
    const newState = this.createTokenState(this.userData.id, newPlan);
    
    // Transférer les tokens non utilisés (optionnel)
    const unusedTokens = this.tokenState.totalTokens - this.tokenState.usedTokens;
    newState.availableTokens += Math.min(unusedTokens, newState.baseTokens);
    
    // Synchroniser les flags d'accès avec le nouveau plan
    const planConfig = PLAN_CONFIG.free;
    const configForPlan = PLAN_CONFIG[newPlan] || planConfig;
    newState.hasAccessToAPI = configForPlan.hasAI;
    newState.hasAccessToAdvancedAnalytics = configForPlan.hasAdvisor;
    newState.hasAccessToPremiumSuggestions = configForPlan.hasAdvisor;
    
    const firestoreDB = getDB();
    if (firestoreDB && this.userData && this.userData.id) {
      // Calculer la date d'expiration si c'est un plan payant
      let expiryDate = null;
      if (newPlan !== 'free') {
        expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 30);
      }
      
      await firestoreDB.collection('users').doc(this.userData.id).update({
        tokenState: newState,
        plan: newPlan,
        isPremium: newPlan !== 'free',
        'subscription.plan': newPlan,
        'subscription.status': newPlan !== 'free' ? 'active' : 'free',
        'subscription.expiresAt': expiryDate,
        availableTokens: newState.availableTokens,
        tokensUsed: newState.usedTokens,
        totalTokens: newState.totalTokens,
        hasAccessToAPI: configForPlan.hasAI,
        hasAccessToAdvancedAnalytics: configForPlan.hasAdvisor,
        hasAccessToPremiumSuggestions: configForPlan.hasAdvisor
      });
    }

    this.tokenState = newState;
    this.notifyListeners();
  }

  /**
   * Méthode admin pour changer le plan d'un utilisateur
   * Cette méthode est conçue pour être appelée par les administrateurs
   * via Firebase Console ou Cloud Functions
   */
  static async adminChangePlan(userId, newPlan, adminUserId = null) {
    try {
      const planConfig = PLAN_CONFIG[newPlan];
      
      if (!planConfig) {
        throw new Error(`Plan invalide: ${newPlan}`);
      }
      
      const firestoreDB = getDB();
      if (!firestoreDB) {
        throw new Error('Firestore non disponible');
      }
      
      const userRef = firestoreDB.collection('users').doc(userId);
      const userDoc = await userRef.get();
      
      if (!userDoc.exists) {
        throw new Error(`Utilisateur non trouvé: ${userId}`);
      }
      
      const userData = userDoc.data();
      const oldPlan = userData.subscription?.plan || userData.plan || userData.tokenState?.plan || 'free';
      
      // Calculer les valeurs pour le nouveau plan
      const totalTokens = planConfig.baseTokens;
      const usedTokens = Math.min(
        userData.tokenState?.usedTokens || userData.tokensUsed || 0,
        totalTokens === -1 ? Infinity : totalTokens
      );
      const availableTokens = totalTokens === -1 ? -1 : totalTokens - usedTokens;
      
      // Calculer la date d'expiration (30 jours pour les plans payants)
      let expiryDate = null;
      if (newPlan !== 'free') {
        expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 30);
      }
      
      // Créer le nouveau tokenState
      const newTokenState = {
        userId: userId,
        plan: newPlan,
        baseTokens: totalTokens,
        bonusTokens: 0,
        totalTokens: totalTokens,
        availableTokens: availableTokens,
        usedTokens: usedTokens,
        lastTokenUpdate: new Date().toISOString(),
        firstAnalysisDone: userData.tokenState?.firstAnalysisDone || userData.firstAnalysisDone || false,
        monthlyTokensUsed: userData.tokenState?.monthlyTokensUsed || userData.monthlyTokensUsed || 0,
        lastMonthlyReset: new Date().toISOString(),
        expiresAt: expiryDate?.toISOString() || null,
        isExpired: false,
        hasAccessToAPI: planConfig.hasAI,
        hasAccessToAdvancedAnalytics: planConfig.hasAdvisor,
        hasAccessToPremiumSuggestions: planConfig.hasAdvisor
      };
      
      // Mettre à jour dans Firestore
      const updateData = {
        tokenState: newTokenState,
        plan: newPlan,
        isPremium: planConfig.isPremium,
        'subscription.plan': newPlan,
        'subscription.status': newPlan !== 'free' ? 'active' : 'free',
        'subscription.price': planConfig.price,
        subscription: {
          plan: newPlan,
          status: newPlan !== 'free' ? 'active' : 'free',
          price: planConfig.price,
          expiresAt: expiryDate?.toISOString() || null,
          lastPaymentDate: new Date().toISOString(),
          paymentReceived: true
        },
        availableTokens: availableTokens,
        tokensUsed: usedTokens,
        totalTokens: totalTokens,
        hasAccessToAPI: planConfig.hasAI,
        hasAccessToAdvancedAnalytics: planConfig.hasAdvisor,
        hasAccessToPremiumSuggestions: planConfig.hasAdvisor
      };
      
      await userRef.update(updateData);
      
      console.log(`[TokenManager] Plan changé avec succès pour ${userId}: ${oldPlan} -> ${newPlan}`);
      
      return {
        success: true,
        message: `Plan changé de ${oldPlan} à ${newPlan}`,
        userId: userId,
        oldPlan: oldPlan,
        newPlan: newPlan
      };
      
    } catch (error) {
      console.error('[TokenManager] Erreur adminChangePlan:', error);
      throw error;
    }
  }

  static async applyReferralSponsorBonus() {
    if (!this.referralInfo || this.referralInfo.status !== 'validated') {
      return false;
    }

    const newState = { ...this.tokenState };
    const currentPlan = newState.plan;
    newState.availableTokens += TokenConfig.referralBonusSponsor;
    newState.totalTokens += TokenConfig.referralBonusSponsor;
    
    const firestoreDB = getDB();
    if (firestoreDB && this.userData && this.userData.id) {
      await firestoreDB.collection('users').doc(this.userData.id).update({
        tokenState: newState,
        plan: currentPlan,
        'subscription.plan': currentPlan,
        'referralInfo.status': 'rewarded',
        'referralInfo.rewardedAt': new Date().toISOString(),
        availableTokens: newState.availableTokens,
        totalTokens: newState.totalTokens
      });
    }

    this.tokenState = newState;
    this.referralInfo.status = 'rewarded';
    this.referralInfo.rewardedAt = new Date().toISOString();
    
    return true;
  }

  static getCost(analysisType, plan) {
    return AnalysisCosts[analysisType] || 0;
  }

  static canPerformAnalysis(analysisType, plan) {
    const cost = this.getCost(analysisType);
    return this.availableTokens >= cost;
  }

  // Système de listeners pour les changements de tokenState
  static listeners = [];

  static addListener(callback) {
    this.listeners.push(callback);
  }

  static removeListener(callback) {
    this.listeners = this.listeners.filter(listener => listener !== callback);
  }

  static notifyListeners() {
    this.listeners.forEach(listener => {
      try {
        listener();
      } catch (error) {
        console.error('[TokenManager] Erreur dans listener:', error);
      }
    });
  }

  static clear() {
    this.userData = null;
    this.tokenState = null;
    this.loyaltyInfo = null;
    this.referralInfo = null;
  }

  // =============================================================================
  // MÉTHODES POUR L'INTÉGRATION MISTRAL
  // =============================================================================

  static get isUnlimited() {
    return this.tokenState && this.tokenState.baseTokens === -1;
  }

  static getPlanConfig() {
    const plan = this.tokenState?.plan || 'free';
    return PLAN_CONFIG[plan] || PLAN_CONFIG.free;
  }

  static isAIAllowed() {
    // MODÈLE UNIQUE : démo 7 jours (tout inclus) puis DPAI Premium 199 €/mois (tout inclus).
    // L'accès dépend UNIQUEMENT du statut de l'abonnement — plus aucun système de tokens.
    const subscription = this.userData?.subscription || {};
    const expiry = subscription.expiresAt || subscription.trialEndsAt;
    const expiryDate = expiry?.toDate ? expiry.toDate() : (expiry ? new Date(expiry) : null);
    const active = ['active', 'trialing'].includes(subscription.status) && (!expiryDate || expiryDate > new Date());
    if (active) return true;
    // Fallback compatibilité anciens comptes : plan payant non expiré
    const plan = this.tokenState?.plan || 'free';
    return (plan === 'api_monthly' || plan === 'advisor') && !this.isExpired();
  }

  static isAdvisorAllowed() {
    // Un seul plan : DPAI Premium (démo ou abonné) — accès Conseiller IA inclus
    return this.isAIAllowed();
  }

  static isTokensUnlimited() {
    return this.tokenState?.plan === 'advisor' && !this.isExpired();
  }

  // Appel à Mistral API
  // Appel a l API locale DPAI
  static async callLocalAI(prompt, model = "mistral-large") {
    try {
      // Verifier que l IA locale est disponible
      const isEnabled = await getLocalAIStatus();
      if (!isEnabled) {
        throw new Error('IA locale DPAI non disponible. Assurez-vous que le serveur est demarre.');
      }
      
      // Appeler l API locale via le proxy Node.js
      const currentUser = window.authService?.currentUser;
      if (!currentUser) throw new Error('Utilisateur non connecté');
      const response = await fetch('/api/local-ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await currentUser.getIdToken()}`
        },
        body: JSON.stringify({
          message: prompt,
          userId: this.userData?.id || 'anonymous',
          conversationId: null
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur IA locale DPAI');
      }

      const data = await response.json();
      if (!data.success || !data.response) {
        throw new Error('Pas de reponse de l IA locale');
      }
      return data.response;
    } catch (error) {
      console.error('Erreur IA locale DPAI:', error);
      throw error;
    }
  }

  // Exécuter une analyse avec IA
  static async runAIAnalysis(type, data) {
    // Vérifier si l'abonnement est expiré
    if (this.isExpired()) {
      throw new Error('Votre abonnement a expiré. Veuillez le renouveler.');
    }
    
    // Générer le prompt
    const prompt = `${DPAI_CONTEXT}\n\nAnalyse ${type} pour ${data.name || 'cette entreprise'} dans le secteur ${data.sector || 'non spécifié'}`;

    // Vérifier l'accès à l'IA
    if (!this.isAIAllowed()) {
      throw new Error('Votre période de démonstration est terminée. Passez à DPAI Premium (199 €/mois) pour continuer.');
    }

    // Appeler Mistral
    const response = await this.callLocalAI(prompt);

    return response;
  }

  // =============================================================================
  // GESTION DE L'EXPIRATION ET DU RENOUVELLEMENT
  // =============================================================================

  // Vérifier si l'utilisateur doit renouveler son abonnement
  static needsRenewal() {
    return this.isExpired();
  }

  // Prolonger l'abonnement de 30 jours (à appeler après paiement)
  static async renewSubscription(days = 30) {
    const firestoreDB = getDB();
    if (!firestoreDB || !this.userData || !this.userData.id) {
      throw new Error('Impossible de renouveler: données utilisateur manquantes');
    }

    const newExpiryDate = new Date();
    newExpiryDate.setDate(newExpiryDate.getDate() + days);
    
    const newState = { ...this.tokenState };
    newState.expiresAt = newExpiryDate.toISOString();
    newState.isExpired = false;
    
    // Pour les abonnés payants, réinitialiser les tokens si nécessaire
    const plan = this.tokenState.plan || 'free';
    if (plan === 'api_monthly') {
      newState.availableTokens = TokenConfig.baseTokenLimits.api_monthly;
      newState.totalTokens = TokenConfig.baseTokenLimits.api_monthly;
      newState.usedTokens = 0;
    } else if (plan === 'advisor') {
      // Conseiller IA reste illimité
      newState.availableTokens = -1;
      newState.totalTokens = -1;
      newState.usedTokens = 0;
    }

    // Mettre à jour dans Firestore
    // CORRECTION: Toujours inclure plan et subscription.plan pour éviter réinitialisation
    const updates = {
      tokenState: newState,
      plan: plan,
      'subscription.plan': plan,
      'subscription.expiresAt': newExpiryDate,
      'subscription.lastRenewalDate': new Date().toISOString(),
      availableTokens: newState.availableTokens,
      tokensUsed: newState.usedTokens,
      totalTokens: newState.totalTokens,
      lastAnalysisAt: firestoreDB.FieldValue.serverTimestamp()
    };

    await firestoreDB.collection('users').doc(this.userData.id).update(updates);
    
    this.tokenState = newState;
    this.userData.subscription = {
      ...this.userData.subscription,
      plan: plan,
      expiresAt: newExpiryDate.toISOString(),
      lastRenewalDate: new Date().toISOString()
    };
    
    return { success: true, newExpiryDate: newExpiryDate.toISOString() };
  }

  // Activer un abonnement après paiement (à appeler manuellement)
  static async activateSubscription(plan, paymentReceived = true) {
    const firestoreDB = getDB();
    if (!firestoreDB || !this.userData || !this.userData.id) {
      throw new Error('Impossible d\'activer: données utilisateur manquantes');
    }

    const days = TokenConfig.subscriptionValidityDays || 30;
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + days);

    let tokenStateUpdates;
    if (plan === 'api_monthly') {
      tokenStateUpdates = {
        plan: 'api_monthly',
        baseTokens: 1000,
        totalTokens: 1000,
        availableTokens: 1000,
        usedTokens: 0,
        expiresAt: expiryDate.toISOString(),
        isExpired: false
      };
    } else if (plan === 'advisor') {
      tokenStateUpdates = {
        plan: 'advisor',
        baseTokens: -1,
        totalTokens: -1,
        availableTokens: -1,
        usedTokens: 0,
        expiresAt: expiryDate.toISOString(),
        isExpired: false
      };
    } else {
      throw new Error('Plan invalide. Utilisez api_monthly ou advisor.');
    }

    const updates = {
      tokenState: tokenStateUpdates,
      plan: plan,  // CORRECTION: Mettre à jour le champ racine plan
      'subscription.plan': plan,
      'subscription.status': 'active',
      'subscription.expiresAt': expiryDate,
      'subscription.lastPaymentDate': paymentReceived ? new Date().toISOString() : null,
      'subscription.paymentReceived': paymentReceived,
      'subscription.lastRenewalDate': new Date().toISOString()
    };

    await firestoreDB.collection('users').doc(this.userData.id).update(updates);

    // Mettre à jour localement
    this.tokenState = tokenStateUpdates;
    this.userData.subscription = {
      plan: plan,
      status: 'active',
      expiresAt: expiryDate.toISOString(),
      paymentReceived: paymentReceived,
      lastPaymentDate: paymentReceived ? new Date().toISOString() : null,
      lastRenewalDate: new Date().toISOString()
    };

    return { success: true, plan: plan, expiresAt: expiryDate.toISOString() };
  }
}

// Utilitaires
class TokenUtils {
  static extractDomain(email) {
    if (!email) return null;
    const parts = email.split('@');
    return parts.length > 1 ? parts[1] : null;
  }

  static isPremiumPlan(plan) {
    return false; // Plus de plans premium, tout est gratuit
  }

  static formatTokens(amount) {
    return new Intl.NumberFormat('fr-FR').format(amount);
  }

  static formatPrice(price) {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(price);
  }
}

// Charger les données utilisateur
async function loadUserTokenData(userId) {
  try {
    const firestoreDB = getDB();
    if (!firestoreDB) {
      console.log('[loadUserTokenData] Firestore non disponible');
      return null;
    }
    const userDoc = await firestoreDB.collection('users').doc(userId).get();
    if (userDoc.exists) {
      const userData = { id: userId, ...userDoc.data() };
      TokenManager.init(userData);
      return userData;
    }
  } catch (error) {
    console.error('Erreur chargement données tokens:', error);
  }
  return null;
}

// Exposer les objets globalement
window.TokenConfig = TokenConfig;
window.TokenManager = TokenManager;
window.TokenUtils = TokenUtils;
window.AnalysisCosts = AnalysisCosts;
window.PLAN_CONFIG = PLAN_CONFIG;
window.DPAI_CONTEXT = DPAI_CONTEXT;
