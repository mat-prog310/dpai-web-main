// =============================================================================
// TOKENS.JS - Système de gestion des tokens
// =============================================================================

// Configuration des plans (TOUS LES UTILISATEURS ONT UN PLAN GRATUIT AVEC 500 TOKENS)
// Pour plus de tokens: envoyer un email à duprey.conseil@gmail.com
const TokenConfig = {
  baseTokenLimits: {
    free: 490,    // 490 + 10 (bonus) + 0 (welcome) = 500 tokens
    pro: 490,     // Plus utilisé - tous en free
    enterprise: 490
  },
  
  tokenBonuses: {
    free: 0.0204,  // 490 * 0.0204 = ~10 tokens de bonus
    pro: 0.0204,
    enterprise: 0.0204
  },
  
  planPrices: {
    free: 0.0,
    pro: 0.0,     // Plus utilisé
    enterprise: 0.0
  },
  
  welcomeBonus: 0,    // Désactivé pour avoir exactement 500
  firstAnalysisBonus: 0,
  
  referralBonusSponsor: 20,
  referralBonusReferral: 10,
  
  loyaltyBonusPerAnalysis: 1,
  maxMonthlyLoyaltyBonus: {
    free: 10,
    pro: 50,
    enterprise: 100
  },
  
  companyDiscountRate: 0.20,
  lowTokenThreshold: 0.20,
  tokenResetDays: 30
};

// Coûts des analyses par type - COÛTS FIXES ET ÉLEVÉS
// Phases 1 & 2 : Tous les services sont GRATUITS (coût en tokens déduit du solde)
// Phases 3 & 4 : BLOQUÉES (contact par mail)
// Email: duprey.conseil@gmail.com
const AnalysisCosts = {
  // PHASE 1 & 2 : Toutes les analyses sont GRATUITES (mais déduisent des tokens)
  swot: { free: 10, pro: 10, enterprise: 10 },
  porter: { free: 30, pro: 30, enterprise: 30 },
  pestel: { free: 20, pro: 20, enterprise: 20 },
  competitive: { free: 30, pro: 30, enterprise: 30 },
  basic: { free: 10, pro: 10, enterprise: 10 },
  advanced: { free: 20, pro: 20, enterprise: 20 },
  detailed_report: { free: 40, pro: 40, enterprise: 40 },
  synergy: { free: 50, pro: 50, enterprise: 50 },
  modeling: { free: 60, pro: 60, enterprise: 60 },
  benchmark: { free: 40, pro: 40, enterprise: 40 },
  due_diligence: { free: 70, pro: 70, enterprise: 70 },
  valuation: { free: 80, pro: 80, enterprise: 80 },
  mergers_acquisitions: { free: 100, pro: 100, enterprise: 100 },
  strategic_audit: { free: 60, pro: 60, enterprise: 60 },
  risk_assessment: { free: 50, pro: 50, enterprise: 50 },
  
  // PHASE 3 : NÉGOCIATION & SIGNATURE - BLOQUÉ (Contact par mail)
  loi_generation: { free: 999999, pro: 999999, enterprise: 999999 },
  negotiation_simulator: { free: 999999, pro: 999999, enterprise: 999999 },
  
  // PHASE 4 : INTÉGRATION & SUIVI - BLOQUÉ (Contact par mail)
  action_plan_100: { free: 999999, pro: 999999, enterprise: 999999 },
  post_acquisition_dashboard: { free: 999999, pro: 999999, enterprise: 999999 }
};

// Tous les services sont gratuits - Plus de packs de tokens
// Pour plus de tokens: contacter duprey.conseil@gmail.com

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
      TokenConfig.maxMonthlyLoyaltyBonus[loyaltyInfo.plan || 'free']
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
    
    // Vérifier si le tokenState existe et correspond au plan actuel
    // Si le plan a changé ou si tokenState est invalide, le recréer
    const expectedBaseTokens = TokenConfig.baseTokenLimits[userData.plan] || TokenConfig.baseTokenLimits.free;
    const hasValidTokenState = userData.tokenState && 
                                userData.tokenState.plan === userData.plan &&
                                userData.tokenState.baseTokens === expectedBaseTokens;
    
    if (hasValidTokenState) {
      this.tokenState = userData.tokenState;
    } else {
      // Re créer le tokenState avec le bon plan, en conservant l'historique d'utilisation
      console.log('[TokenManager] Recalcul du tokenState pour le plan:', userData.plan);
      this.tokenState = this.createTokenState(userData.id, userData.plan, userData.tokenState);
    }
    
    this.loyaltyInfo = userData.loyaltyInfo || LoyaltySystem.create(userData.id);
    this.referralInfo = userData.referralInfo;
    this.hasCompanyDiscount = userData.hasCompanyDiscount || false;
  }

  static createTokenState(userId, plan, existingTokenState = null) {
    const baseTokens = TokenConfig.baseTokenLimits[plan] || TokenConfig.baseTokenLimits.free;
    const bonusTokens = Math.floor(baseTokens * (TokenConfig.tokenBonuses[plan] || 0));
    
    const totalTokens = baseTokens + bonusTokens + TokenConfig.welcomeBonus;
    const usedTokens = existingTokenState?.usedTokens || 0;
    const monthlyTokensUsed = existingTokenState?.monthlyTokensUsed || 0;
    const firstAnalysisDone = existingTokenState?.firstAnalysisDone || false;
    
    return {
      userId: userId,
      plan: plan,
      baseTokens: baseTokens,
      bonusTokens: bonusTokens,
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
    const plan = this.userData.plan || 'free';
    const baseTokens = TokenConfig.baseTokenLimits[plan];
    const bonusTokens = Math.floor(baseTokens * (TokenConfig.tokenBonuses[plan] || 0));
    
    const newState = {
      ...this.tokenState,
      availableTokens: baseTokens + bonusTokens + (this.userData.isPremium ? TokenConfig.welcomeBonus : 0),
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
    return AnalysisCosts[analysisType]?.[plan || 'free'] || AnalysisCosts.basic?.free || 0;
  }

  static canPerformAnalysis(analysisType, plan) {
    const cost = this.getCost(analysisType, plan);
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
    return ['pro', 'enterprise'].includes(plan);
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
