/**
 * Script de correction pour les utilisateurs avec le plan advisor
 * Ce script met à jour les flags hasAccessToAPI, hasAccessToAdvancedAnalytics, etc.
 * pour les utilisateurs qui ont le plan advisor mais dont les flags ne sont pas synchronisés.
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Initialiser Firebase Admin si ce n'est pas déjà fait
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * Fonction pour corriger les flags d'accès pour un utilisateur spécifique
 * @param {string} userId - L'ID de l'utilisateur à corriger
 * @returns {Promise<{success: boolean, message: string}>}
 */
async function fixUserAdvisorAccess(userId) {
  try {
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      return { success: false, message: `Utilisateur ${userId} non trouvé` };
    }
    
    const userData = userDoc.data();
    const plan = userData.subscription?.plan || userData.plan || 'free';
    
    // Si ce n'est pas un utilisateur advisor, on ne fait rien
    if (plan !== 'advisor') {
      return { 
        success: true, 
        message: `Utilisateur ${userId} a le plan ${plan}, pas advisor. Aucune correction nécessaire.` 
      };
    }
    
    // Déterminer les valeurs correctes pour les flags
    const updates = {
      hasAccessToAPI: true,
      hasAccessToAdvancedAnalytics: true,
      hasAccessToPremiumSuggestions: true,
      plan: 'advisor',
      isPremium: true
      'subscription.plan': 'advisor',
    };
    
    // Si tokenState existe, le mettre à jour aussi
    if (userData.tokenState) {
      updates.tokenState = {
        ...userData.tokenState,
        plan: 'advisor',
        hasAccessToAPI: true,
        hasAccessToAdvancedAnalytics: true,
        hasAccessToPremiumSuggestions: true
      };
    } else {
      // Créer un tokenState complet pour advisor
      updates.tokenState = {
        userId: userId,
        plan: 'advisor',
        baseTokens: -1,
        bonusTokens: 0,
        totalTokens: -1,
        availableTokens: -1,
        usedTokens: userData.tokensUsed || 0,
        lastTokenUpdate: admin.firestore.FieldValue.serverTimestamp(),
        firstAnalysisDone: userData.firstAnalysisDone || false,
        monthlyTokensUsed: userData.monthlyTokensUsed || 0,
        lastMonthlyReset: userData.lastMonthlyReset || admin.firestore.FieldValue.serverTimestamp(),
        expiresAt: userData.subscription?.expiresAt || null,
        isExpired: false,
        hasAccessToAPI: true,
        hasAccessToAdvancedAnalytics: true,
        hasAccessToPremiumSuggestions: true
      };
    }
    
    // Appliquer les mises à jour
    await userRef.update(updates);
    
    return { 
      success: true, 
      message: `✅ Utilisateur ${userId} corrigé avec succès!` 
    };
  } catch (error) {
    console.error(`Erreur lors de la correction de l'utilisateur ${userId}:`, error);
    return { 
      success: false, 
      message: `Erreur: ${error.message}` 
    };
  }
}

/**
 * Fonction pour corriger TOUS les utilisateurs avec le plan advisor
 * @returns {Promise<{total: number, updated: number, errors: Array}>}
 */
async function fixAllAdvisorUsers() {
  try {
    const usersRef = db.collection('users');
    const snapshot = await usersRef.get();
    
    const results = {
      total: snapshot.size,
      updated: 0,
      errors: []
    };
    
    for (const doc of snapshot.docs) {
      const userId = doc.id;
      const userData = doc.data();
      const plan = userData.subscription?.plan || userData.plan || 'free';
      
      if (plan === 'advisor') {
        // Vérifier si l'utilisateur a besoin d'être corrigé
        const needsFix = 
          userData.hasAccessToAPI !== true ||
          userData.hasAccessToAdvancedAnalytics !== true ||
          userData.hasAccessToPremiumSuggestions !== true ||
          !userData.tokenState ||
          userData.tokenState.plan !== 'advisor';
        
        if (needsFix) {
          try {
            await fixUserAdvisorAccess(userId);
            results.updated++;
            console.log(`✅ Corrigé: ${userId}`);
          } catch (error) {
            results.errors.push({ userId, error: error.message });
            console.error(`❌ Erreur pour ${userId}:`, error.message);
          }
        }
      }
    }
    
    return results;
  } catch (error) {
    console.error('Erreur lors de la récupération des utilisateurs:', error);
    return { total: 0, updated: 0, errors: [{ error: error.message }] };
  }
}

/**
 * Cloud Function pour corriger un utilisateur spécifique via HTTP
 */
exports.fixAdvisorUser = functions.https.onRequest(async (req, res) => {
  // Autoriser uniquement GET pour éviter les attaques
  if (req.method !== 'GET') {
    res.status(405).send('Method Not Allowed');
    return;
  }
  
  const userId = req.query.userId;
  
  if (!userId) {
    res.status(400).send('Paramètre userId manquant');
    return;
  }
  
  try {
    const result = await fixUserAdvisorAccess(userId);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * Cloud Function pour corriger TOUS les utilisateurs advisor via HTTP
 */
exports.fixAllAdvisorUsers = functions.https.onRequest(async (req, res) => {
  // Autoriser uniquement GET
  if (req.method !== 'GET') {
    res.status(405).send('Method Not Allowed');
    return;
  }
  
  try {
    const result = await fixAllAdvisorUsers();
    res.status(200).json({
      success: true,
      message: `Correction terminée: ${result.updated}/${result.total} utilisateurs advisor corrigés`,
      ...result
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * Fonction locale pour exécuter la correction (pour usage via Firebase Console)
 * Appeler cette fonction depuis le Cloud Shell ou l'émulateur
 */
async function runLocalFix() {
  console.log('🔍 Recherche des utilisateurs advisor à corriger...');
  const result = await fixAllAdvisorUsers();
  console.log(`✅ Correction terminée!`);
  console.log(`Total utilisateurs: ${result.total}`);
  console.log(`Utilisateurs advisor corrigés: ${result.updated}`);
  if (result.errors.length > 0) {
    console.log(`⚠️  Erreurs: ${result.errors.length}`);
    result.errors.forEach(err => console.error(`  - ${err.userId}: ${err.error}`));
  }
  return result;
}

// Exporter pour usage local
module.exports = {
  fixUserAdvisorAccess,
  fixAllAdvisorUsers,
  runLocalFix
};

// Si ce fichier est exécuté directement (dans Cloud Shell par exemple)
if (typeof require !== 'undefined' && require.main === module) {
  runLocalFix().then(() => process.exit(0)).catch(() => process.exit(1));
}
