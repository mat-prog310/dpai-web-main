// =============================================================================
// TOKENS.JS - Système de gestion des tokens
// =============================================================================

// Configuration des plans (TOUS LES UTILISATEURS ONT UN PLAN GRATUIT AVEC 500 TOKENS)
// Pour plus de tokens ou accéder aux Phases 3 & 4: envoyer un email à contact@dpai-strategy.com
const TokenConfig = {
  baseTokenLimits: {
    free: 500    // 500 tokens gratuits pour tous les utilisateurs
  },
  
  tokenBonuses: {
    free: 0.0  // Pas de bonus supplémentaire
  },
  
  planPrices: {
    free: 0.0
  },
  
  welcomeBonus: 0,
  firstAnalysisBonus: 0,
  
  referralBonusSponsor: 20,
  referralBonusReferral: 10,
  
  loyaltyBonusPerAnalysis: 1,
  maxMonthlyLoyaltyBonus: {
    free: 10
  },
  
  companyDiscountRate: 0.20,
  lowTokenThreshold: 0.20,
  tokenResetDays: 30
};

// Coûts des analyses par type - TOUS LES UTILISATEURS ONT ACCÈS AUX PHASES 1 & 2
// Email: contact@dpai-strategy.com pour Phases 3 & 4
// Les coûts ont été multipliés par 4 pour équilibrer avec les 500 tokens gratuits
const AnalysisCosts = {
  // PHASE 1 & 2 : Coûts en tokens (x4 par rapport à la version précédente)
  swot: 40,
  porter: 120,
  pestel: 80,
  competitive: 120,
  basic: 40,
  advanced: 80,
  detailed_report: 160,
  synergy: 200,
  modeling: 240,
  benchmark: 160,
  due_diligence: 280,
  valuation: 320,
  mergers_acquisitions: 400,
  strategic_audit: 240,
  risk_assessment: 200,
  
  // PHASE 3 : NÉGOCIATION & SIGNATURE - BLOQUÉ (Contact par mail)
  loi_generation: 999999,
  negotiation_simulator: 999999,
  
  // PHASE 4 : INTÉGRATION & SUIVI - BLOQUÉ (Contact par mail)
  action_plan_100: 999999,
  post_acquisition_dashboard: 999999
};

// Tous les services sont gratuits - Plus de packs de tokens
// Pour plus de tokens: contacter contact@dpai-strategy.com

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
    
    // Vérifier si le tokenState existe et est valide
    // Tous les utilisateurs ont le plan 'free' avec 500 tokens
    const expectedBaseTokens = TokenConfig.baseTokenLimits.free;
    const hasValidTokenState = userData.tokenState && 
                                userData.tokenState.baseTokens === expectedBaseTokens;
    
    if (hasValidTokenState) {
      this.tokenState = userData.tokenState;
    } else {
      // Re créer le tokenState avec le plan free, en conservant l'historique d'utilisation
      console.log('[TokenManager] Recalcul du tokenState');
      this.tokenState = this.createTokenState(userData.id, 'free', userData.tokenState);
    }
    
    this.loyaltyInfo = userData.loyaltyInfo || LoyaltySystem.create(userData.id);
    this.referralInfo = userData.referralInfo;
    this.hasCompanyDiscount = userData.hasCompanyDiscount || false;
  }

  static createTokenState(userId, plan = 'free', existingTokenState = null) {
    const totalTokens = TokenConfig.baseTokenLimits.free; // 500 tokens
    const usedTokens = existingTokenState?.usedTokens || 0;
    const monthlyTokensUsed = existingTokenState?.monthlyTokensUsed || 0;
    const firstAnalysisDone = existingTokenState?.firstAnalysisDone || false;
    
    return {
      userId: userId,
      plan: 'free',
      baseTokens: totalTokens,
      bonusTokens: 0,
      totalTokens: totalTokens,
      usedTokens: Math.min(usedTokens, totalTokens), // Ne pas dépasser le total
      availableTokens: totalTokens - usedTokens,
      lastTokenUpdate: new Date().toISOString(),
      firstAnalysisDone: firstAnalysisDone,
      monthlyTokensUsed: monthlyTokensUsed,
      lastMonthlyReset: existingTokenState?.lastMonthlyReset || new Date().toISOString()
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
    // Vérifier si c'est un service qui nécessite un contact mail (bloqué à 999999 tokens)
    if (amount === 999999) {
      throw new Error('CONTACT_PAR_MAIL');
    }
    
    if (this.availableTokens < amount) {
      throw new Error('Pas assez de tokens');
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
    
    // Sauvegarder dans Firestore
    await db.collection('users').doc(this.userData.id).update({
      tokenState: newState,
      loyaltyInfo: this.loyaltyInfo
    });

    this.tokenState = newState;
    return true;
  }

  static async addTokens(amount, reason = 'achat') {
    const newState = { ...this.tokenState };
    newState.availableTokens += amount;
    newState.totalTokens += amount;
    
    // Sauvegarder dans Firestore
    await db.collection('users').doc(this.userData.id).update({
      tokenState: newState
    });

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
    
    await db.collection('users').doc(this.userData.id).update({
      tokenState: newState,
      loyaltyInfo: this.loyaltyInfo
    });

    this.tokenState = newState;
  }

  static async changePlan(newPlan) {
    const newState = this.createTokenState(this.userData.id, newPlan);
    
    // Transférer les tokens non utilisés (optionnel)
    const unusedTokens = this.tokenState.totalTokens - this.tokenState.usedTokens;
    newState.availableTokens += Math.min(unusedTokens, newState.baseTokens);
    
    await db.collection('users').doc(this.userData.id).update({
      tokenState: newState,
      plan: newPlan
    });

    this.tokenState = newState;
  }

  static async applyReferralSponsorBonus() {
    if (!this.referralInfo || this.referralInfo.status !== 'validated') {
      return false;
    }

    const newState = { ...this.tokenState };
    newState.availableTokens += TokenConfig.referralBonusSponsor;
    newState.totalTokens += TokenConfig.referralBonusSponsor;
    
    await db.collection('users').doc(this.userData.id).update({
      tokenState: newState,
      'referralInfo.status': 'rewarded',
      'referralInfo.rewardedAt': new Date().toISOString()
    });

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
    const userDoc = await db.collection('users').doc(userId).get();
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
