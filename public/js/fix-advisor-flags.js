/**
 * Script de correction pour les flags advisor
 * Ce script peut être inclus dans une page pour corriger les flags de l'utilisateur connecté
 * ou être exécuté via la console du navigateur.
 */

// Fonction pour corriger les flags de l'utilisateur actuel
async function fixCurrentUserAdvisorFlags() {
  try {
    const user = firebase.auth().currentUser;
    if (!user) {
      console.log('❌ Aucun utilisateur connecté');
      return { success: false, message: 'Aucun utilisateur connecté' };
    }
    
    const db = firebase.firestore();
    const userRef = db.collection('users').doc(user.uid);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      console.log('❌ Utilisateur non trouvé dans Firestore');
      return { success: false, message: 'Utilisateur non trouvé' };
    }
    
    const userData = userDoc.data();
    const plan = userData.subscription?.plan || userData.plan || 'free';
    
    console.log(`🔍 Vérification utilisateur ${user.uid} - Plan: ${plan}`);
    
    // Si ce n'est pas advisor, on ne fait rien
    if (plan !== 'advisor') {
      console.log(`ℹ️ Utilisateur a le plan "${plan}", pas advisor. Aucune correction nécessaire.`);
      return { success: true, message: `Plan est ${plan}, pas advisor` };
    }
    
    // Vérifier ce qui doit être corrigé
    const needsFix = {
      hasAccessToAPI: userData.hasAccessToAPI !== true,
      hasAccessToAdvancedAnalytics: userData.hasAccessToAdvancedAnalytics !== true,
      hasAccessToPremiumSuggestions: userData.hasAccessToPremiumSuggestions !== true,
      tokenStatePlan: !userData.tokenState || userData.tokenState.plan !== 'advisor'
    };
    
    console.log('📋 Champs à corriger:', needsFix);
    
    if (!Object.values(needsFix).some(v => v)) {
      console.log('✅ Tous les flags sont déjà corrects!');
      return { success: true, message: 'Tous les flags sont déjà corrects' };
    }
    
    // Préparer les mises à jour
    const updates = {
      hasAccessToAPI: true,
      hasAccessToAdvancedAnalytics: true,
      hasAccessToPremiumSuggestions: true,
      plan: 'advisor',
      isPremium: true
    };
    
    // Mettre à jour tokenState si nécessaire
    if (needsFix.tokenStatePlan) {
      const currentTokenState = userData.tokenState || {};
      updates.tokenState = {
        ...currentTokenState,
        userId: user.uid,
        plan: 'advisor',
        baseTokens: -1,
        bonusTokens: 0,
        totalTokens: -1,
        availableTokens: -1,
        usedTokens: userData.tokensUsed || currentTokenState.usedTokens || 0,
        lastTokenUpdate: firebase.firestore.FieldValue.serverTimestamp(),
        firstAnalysisDone: userData.firstAnalysisDone || currentTokenState.firstAnalysisDone || false,
        monthlyTokensUsed: userData.monthlyTokensUsed || currentTokenState.monthlyTokensUsed || 0,
        lastMonthlyReset: userData.lastMonthlyReset || currentTokenState.lastMonthlyReset || firebase.firestore.FieldValue.serverTimestamp(),
        expiresAt: userData.subscription?.expiresAt || currentTokenState.expiresAt || null,
        isExpired: false,
        hasAccessToAPI: true,
        hasAccessToAdvancedAnalytics: true,
        hasAccessToPremiumSuggestions: true
      };
    }
    
    // Appliquer les mises à jour
    await userRef.update(updates);
    
    console.log('✅ Mise à jour réussie!');
    console.log('Nouveaux flags:', {
      hasAccessToAPI: true,
      hasAccessToAdvancedAnalytics: true,
      hasAccessToPremiumSuggestions: true
    });
    
    // Recharger les données
    if (typeof TokenManager !== 'undefined') {
      const userDocUpdated = await userRef.get();
      if (userDocUpdated.exists) {
        TokenManager.init(userDocUpdated.data());
        console.log('✅ TokenManager rechargé avec les nouvelles valeurs');
      }
    }
    
    return { 
      success: true, 
      message: '✅ Flags advisor corrigés avec succès!',
      updates: Object.keys(updates)
    };
  } catch (error) {
    console.error('❌ Erreur lors de la correction:', error);
    return { success: false, message: error.message };
  }
}

// Fonction pour vérifier l'état actuel
async function checkCurrentUserAdvisorStatus() {
  const user = firebase.auth().currentUser;
  if (!user) {
    console.log('❌ Aucun utilisateur connecté');
    return null;
  }
  
  const db = firebase.firestore();
  const userDoc = await db.collection('users').doc(user.uid).get();
  
  if (!userDoc.exists) {
    console.log('❌ Utilisateur non trouvé');
    return null;
  }
  
  const userData = userDoc.data();
  const plan = userData.subscription?.plan || userData.plan || 'free';
  
  console.log('📊 Statut utilisateur actuel:');
  console.log('  Plan:', plan);
  console.log('  hasAccessToAPI:', userData.hasAccessToAPI);
  console.log('  hasAccessToAdvancedAnalytics:', userData.hasAccessToAdvancedAnalytics);
  console.log('  hasAccessToPremiumSuggestions:', userData.hasAccessToPremiumSuggestions);
  console.log('  tokenState.plan:', userData.tokenState?.plan);
  console.log('  isPremium:', userData.isPremium);
  
  if (typeof TokenManager !== 'undefined' && TokenManager.tokenState) {
    console.log('  TokenManager.plan:', TokenManager.tokenState.plan);
    console.log('  TokenManager.isAdvisorAllowed():', TokenManager.isAdvisorAllowed ? TokenManager.isAdvisorAllowed() : 'N/A');
  }
  
  return userData;
}

// Exposer les fonctions globalement pour usage via console
if (typeof window !== 'undefined') {
  window.fixCurrentUserAdvisorFlags = fixCurrentUserAdvisorFlags;
  window.checkCurrentUserAdvisorStatus = checkCurrentUserAdvisorStatus;
}

// Si ce script est inclus dans une page, auto-vérifier après chargement
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', async () => {
    // Attendre que Firebase soit prêt
    await new Promise(resolve => {
      if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length > 0) {
        resolve();
      } else {
        const interval = setInterval(() => {
          if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length > 0) {
            clearInterval(interval);
            resolve();
          }
        }, 100);
        setTimeout(() => clearInterval(interval), 5000);
      }
    });
    
    // Attendre l'authentification
    await new Promise(resolve => {
      const user = firebase.auth().currentUser;
      if (user) {
        resolve();
      } else {
        firebase.auth().onAuthStateChanged((user) => {
          if (user) resolve();
        });
      }
    });
    
    // Exécuter la correction automatique pour les utilisateurs advisor
    try {
      const user = firebase.auth().currentUser;
//      if (user) {
//        const userDoc = await firebase.firestore().collection('users').doc(user.uid).get();
//        if (userDoc.exists) {
//          const userData = userDoc.data();
//          const plan = userData.subscription?.plan || userData.plan || 'free';
//          
//          if (plan === 'advisor') {
//            console.log('🔧 Correction automatique des flags advisor...');
//            const result = await fixCurrentUserAdvisorFlags();
//            if (result.success) {
//              console.log('✅ Correction terminée!');
//              // Forcer le rechargement de la page pour appliquer les changements
//              setTimeout(() => {
//                if (confirm('✅ Vos accès Conseiller IA ont été corrigés! Voulez-vous recharger la page pour appliquer les changements?')) {
//                  window.location.reload();
//                }
//              }, 2000);
//            }
//          }
//        }
//      }
//    } catch (error) {
//      console.error('Erreur lors de la correction automatique:', error);
//    }
//  });
//}
