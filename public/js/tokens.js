// =============================================================================
// TOKENS.JS - Système de gestion des tokens + Intégration Mistral
// =============================================================================

// Helper pour obtenir db (Firestore) avec fallback
function getDB() {
    if (typeof db !== 'undefined') {
        return db;
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
// CONFIGURATION MISTRAL
// =============================================================================
const MISTRAL_API_KEY = "mstrl_OUgXuc71KYyO2QoWZ8h0okTn14wCYUnG_20gLSU";
const MISTRAL_API_URL = "https://api.mistral.ai/v1/chat/completions";

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
  tokenPriceEUR: 0.25,  // Prix par token en euros
  baseTokenLimits: {
    free: 500,       // 500 tokens gratuits pour tous les utilisateurs (valeur: 125 €)
    api_monthly: 1000, // 1000 tokens pour les abonnés API Monthly (valeur: 250 €)
    advisor: -1      // Tokens illimités + IA illimitée + Conseiller IA
  },
  
  tokenBonuses: {
    free: 0.0,      // Pas de bonus supplémentaire
    api_monthly: 0.0,
    advisor: 0.0
  },
  
  planPrices: {
    free: 0.0,
    api_monthly: 199.00,
    advisor: 499.00
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

// Configuration des plans avec accès IA
const PLAN_CONFIG = {
  free: {
    name: "Gratuit",
    tokenLimit: 500,
    hasAI: false,
    hasAdvisor: false,
    price: 0
  },
  api_monthly: {
    name: "API Mensuel",
    tokenLimit: 1000,
    hasAI: true,
    hasAdvisor: false,
    price: 199
  },
  advisor: {
    name: "Conseiller IA",
    tokenLimit: -1,
    hasAI: true,
    hasAdvisor: true,
    price: 499
  }
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
  
  // PHASE 3 : NÉGOCIATION & SIGNATURE - BLOQUÉ (Contact par mail)
  loi_generation: 999999,
  loi_generator: 999999,
  negotiation_simulator: 999999,
  
  // PHASE 4 : INTÉGRATION & SUIVI - BLOQUÉ (Contact par mail)
  action_plan_100: 999999,
  action_plan_100_days: 999999,
  post_acquisition_dashboard: 999999,
  
  // ANALYSES AVEC IA (coût en tokens DPAI)
  ai_swot: 50,
  ai_porter: 60,
  ai_pestel: 55,
  ai_due_diligence: 80,
  ai_valuation: 100,
  ai_recommendation: 30
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
    
    const expectedBaseTokens = TokenConfig.baseTokenLimits.free; // 500
    
    // TOUJOURS créer un tokenState valide
    let usedTokens = 0;
    let availableTokens = 500;
    let totalTokens = 500;
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
      totalTokens = userData.tokenState.totalTokens || 500;
      firstAnalysisDone = userData.tokenState.firstAnalysisDone || false;
      monthlyTokensUsed = userData.tokenState.monthlyTokensUsed || 0;
      lastTokenUpdate = userData.tokenState.lastTokenUpdate || new Date().toISOString();
      lastMonthlyReset = userData.tokenState.lastMonthlyReset || new Date().toISOString();
      expiresAt = userData.tokenState.expiresAt || null;
      subscriptionExpiresAt = userData.subscription?.expiresAt || userData.subscription?.endDate || null;
      console.log('[TokenManager] tokenState chargé depuis userData');
    }
    // Priorité 2: Récupérer depuis les champs racine
    else if (userData.availableTokens !== undefined) {
      usedTokens = userData.tokensUsed || 0;
      availableTokens = userData.availableTokens || 0;
      totalTokens = userData.totalTokens || 500;
      firstAnalysisDone = (userData.totalAnalyses || 0) > 0;
      subscriptionExpiresAt = userData.subscription?.expiresAt || userData.subscription?.endDate || null;
      console.log('[TokenManager] tokenState calculé depuis champs racine');
    }
    
    // Corriger les incohérences: availableTokens = totalTokens - usedTokens
    const expectedAvailable = totalTokens - usedTokens;
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
      plan: userData.subscription?.plan || 'free',
      baseTokens: expectedBaseTokens,
      bonusTokens: 0,
      totalTokens: totalTokens,
      usedTokens: usedTokens,
      availableTokens: availableTokens,
      lastTokenUpdate: lastTokenUpdate,
      firstAnalysisDone: firstAnalysisDone,
      monthlyTokensUsed: monthlyTokensUsed,
      lastMonthlyReset: lastMonthlyReset,
      expiresAt: expiresAt || this.calculateExpiryDate(userData.subscription?.plan),
      isExpired: isExpired
    };
    
    // Sauvegarder dans Firestore pour corriger les anciens utilisateurs
    const firestoreDB = getDB();
    if (userData.id && firestoreDB) {
      firestoreDB.collection('users').doc(userData.id).update({
        tokenState: this.tokenState,
        availableTokens: this.tokenState.availableTokens,
        tokensUsed: this.tokenState.usedTokens,
        totalTokens: this.tokenState.totalTokens
      }).catch(err => {
        console.warn('[TokenManager] Impossible de corriger tokenState:', err);
      });
    }
    
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

  static async useTokens(amount, analysisType = 'basic') {
    // Vérifier si le tokenState est expiré
    if (this.isExpired()) {
      throw new Error('Votre abonnement a expiré. Veuillez le renouveler.');
    }
    
    // Vérifier si c'est un service qui nécessite un contact mail (bloqué à 999999 tokens)
    if (amount === 999999) {
      throw new Error('CONTACT_PAR_MAIL');
    }
    
    // Seuls les abonnés advisor ont des tokens illimités
    if (!this.isTokensUnlimited() && this.availableTokens < amount) {
      throw new Error('Pas assez de tokens');
    }

    // Si tokens illimités (advisor), on ne déduit pas, on met juste à jour le timestamp
    if (this.isTokensUnlimited()) {
      const newState = { ...this.tokenState };
      newState.lastTokenUpdate = new Date().toISOString();
      
      const firestoreDB = getDB();
      if (firestoreDB && this.userData && this.userData.id) {
        await firestoreDB.collection('users').doc(this.userData.id).update({
          tokenState: newState,
          lastAnalysisAt: firestoreDB.FieldValue.serverTimestamp()
        });
      }
      this.tokenState = newState;
      return true;
    }

    const newState = { ...this.tokenState };
    newState.usedTokens += amount;
    newState.availableTokens -= amount;
    newState.monthlyTokensUsed += amount;
    
    // Si c'est la première analyse, ajouter le bonus
    if (!newState.firstAnalysisDone) {
      newState.firstAnalysisDone = true;
      newState.availableTokens += TokenConfig.firstAnalysisBonus;
      newState.totalTokens += TokenConfig.firstAnalysisBonus;
    }

    // Mettre à jour la fidélité
    this.loyaltyInfo = LoyaltySystem.addAnalysis(this.loyaltyInfo);
    
    // Sauvegarder dans Firestore (tokenState + champs racine pour compatibilité)
    const updateData = {
      tokenState: newState,
      loyaltyInfo: this.loyaltyInfo,
      availableTokens: newState.availableTokens,
      tokensUsed: newState.usedTokens,
      totalTokens: newState.totalTokens
    };
    
    const firestoreDB = getDB();
    if (firestoreDB && this.userData && this.userData.id) {
      await firestoreDB.collection('users').doc(this.userData.id).update(updateData);
    }

    this.tokenState = newState;
    return true;
  }

  static async addTokens(amount, reason = 'achat') {
    const newState = { ...this.tokenState };
    newState.availableTokens += amount;
    newState.totalTokens += amount;
    
    // Sauvegarder dans Firestore (tokenState + champs racine)
    const firestoreDB = getDB();
    if (firestoreDB && this.userData && this.userData.id) {
      await firestoreDB.collection('users').doc(this.userData.id).update({
        tokenState: newState,
        availableTokens: newState.availableTokens,
        totalTokens: newState.totalTokens
      });
    }

    this.tokenState = newState;
    return true;
  }

  static async resetMonthlyTokens() {
    const totalTokens = TokenConfig.baseTokenLimits.free; // 500 tokens
    
    const newState = {
      ...this.tokenState,
      availableTokens: totalTokens,
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
        availableTokens: newState.availableTokens,
        tokensUsed: newState.usedTokens,
        totalTokens: newState.totalTokens
      });
    }

    this.tokenState = newState;
  }

  static async changePlan(newPlan) {
    const newState = this.createTokenState(this.userData.id, newPlan);
    
    // Transférer les tokens non utilisés (optionnel)
    const unusedTokens = this.tokenState.totalTokens - this.tokenState.usedTokens;
    newState.availableTokens += Math.min(unusedTokens, newState.baseTokens);
    
    const firestoreDB = getDB();
    if (firestoreDB && this.userData && this.userData.id) {
      await firestoreDB.collection('users').doc(this.userData.id).update({
        tokenState: newState,
        plan: newPlan,
        availableTokens: newState.availableTokens,
        tokensUsed: newState.usedTokens,
        totalTokens: newState.totalTokens
      });
    }

    this.tokenState = newState;
  }

  static async applyReferralSponsorBonus() {
    if (!this.referralInfo || this.referralInfo.status !== 'validated') {
      return false;
    }

    const newState = { ...this.tokenState };
    newState.availableTokens += TokenConfig.referralBonusSponsor;
    newState.totalTokens += TokenConfig.referralBonusSponsor;
    
    const firestoreDB = getDB();
    if (firestoreDB && this.userData && this.userData.id) {
      await firestoreDB.collection('users').doc(this.userData.id).update({
        tokenState: newState,
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
    const plan = this.tokenState?.plan || 'free';
    return plan === 'api_monthly' || plan === 'advisor';
  }

  static isAdvisorAllowed() {
    return this.tokenState?.plan === 'advisor';
  }

  static isTokensUnlimited() {
    // Seuls les abonnés advisor ont des tokens illimités
    return this.tokenState?.plan === 'advisor';
  }

  // Appel à Mistral API
  static async callMistral(prompt, model = "mistral-large") {
    try {
      const response = await fetch(MISTRAL_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${MISTRAL_API_KEY}`
        },
        body: JSON.stringify({
          model: model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
          max_tokens: 2000
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur Mistral API');
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error('❌ Erreur Mistral:', error);
      throw error;
    }
  }

  // Exécuter une analyse avec IA
  static async runAIAnalysis(type, data) {
    // Vérifier si l'abonnement est expiré
    if (this.isExpired()) {
      throw new Error('Votre abonnement a expiré. Veuillez le renouveler.');
    }
    
    // Importer les prompts dynamiquement
    let prompt;
    try {
      // Charger le module dpai-prompts
      const prompts = await import('./prompt/dpai-prompts.js');
      
      // Générer le prompt
      const promptFunction = prompts[`${type.toUpperCase()}_PROMPT`];
      if (!promptFunction) {
        throw new Error('Type d\'analyse inconnu');
      }
      prompt = promptFunction(data);
    } catch (error) {
      console.error('Erreur chargement prompts:', error);
      // Fallback: créer un prompt manuel
      prompt = `${DPAI_CONTEXT}

Analyse ${type} pour ${data.name || 'cette entreprise'} dans le secteur ${data.sector || 'non spécifié'}`;
    }

    // Vérifier l'accès à l'IA
    if (!this.isAIAllowed()) {
      throw new Error('Accès IA non autorisé. Souscrivez à l\'API Mensuel (199 €) ou au Conseiller IA (499 €).');
    }

    // Appeler Mistral
    const response = await this.callMistral(prompt);

    // Déduire les tokens pour les utilisateurs non-advisor (api_monthly a des tokens limités)
    if (!this.isTokensUnlimited()) {
      const tokenCost = AnalysisCosts[`ai_${type}`] || 100;
      await this.useTokens(tokenCost, `ai_${type}`);
    }

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
    const updates = {
      tokenState: newState,
      'subscription.expiresAt': newExpiryDate,
      'subscription.lastRenewalDate': new Date().toISOString(),
      lastAnalysisAt: firestoreDB.FieldValue.serverTimestamp()
    };

    await firestoreDB.collection('users').doc(this.userData.id).update(updates);
    
    this.tokenState = newState;
    this.userData.subscription = {
      ...this.userData.subscription,
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
window.MISTRAL_API_KEY = MISTRAL_API_KEY;
window.MISTRAL_API_URL = MISTRAL_API_URL;
window.DPAI_CONTEXT = DPAI_CONTEXT;
