/**
 * SCRIPT DE VÉRIFICATION ET DÉSACTIVATION DES ABONNEMENTS EXPIRÉS
 * 
 * Ce script permet de :
 * 1. Vérifier quels abonnements sont expirés
 * 2. Désactiver les abonnements expirés (retour au plan gratuit)
 * 3. Envoyer une notification (optionnel)
 * 
 * Utilisation :
 *   node backend/check-expiry.js
 * 
 * Pour une exécution automatique quotidienne, configurez un cron job :
 *   0 0 * * * node /chemin/vers/backend/check-expiry.js
 */

const admin = require('firebase-admin');

// Initialiser Firebase Admin
if (!admin.apps.length) {
    const serviceAccount = require('./serviceAccountKey.json'); // À créer
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: "https://votre-projet.firebaseio.com"
    });
}

const db = admin.firestore();

// Nombre de jours de validité d'un abonnement
const SUBSCRIPTION_VALIDITY_DAYS = 30;

/**
 * Vérifier si un abonnement est expiré
 */
function isExpired(userData) {
    const now = new Date();
    
    // Vérifier l'expiration du tokenState
    if (userData.tokenState?.expiresAt) {
        const tokenExpiry = new Date(userData.tokenState.expiresAt);
        if (tokenExpiry < now) {
            return { expired: true, expiryDate: tokenExpiry, source: 'tokenState' };
        }
    }
    
    // Vérifier l'expiration de l'abonnement
    if (userData.subscription?.expiresAt) {
        const subExpiry = new Date(userData.subscription.expiresAt);
        if (subExpiry < now) {
            return { expired: true, expiryDate: subExpiry, source: 'subscription' };
        }
    }
    
    return { expired: false };
}

/**
 * Désactiver un abonnement expiré (retour au plan gratuit)
 */
async function deactivateExpiredSubscription(doc) {
    const userId = doc.id;
    const userData = doc.data();
    
    console.log(`🔍 Vérification de ${userId} (${userData.email || 'pas d\'email'})...`);
    
    const expiryCheck = isExpired(userData);
    
    if (!expiryCheck.expired) {
        console.log(`✅ ${userId}: Abonnement valide`);
        return null;
    }
    
    console.log(`⚠️  ${userId}: Abonnement EXPIRÉ (${expiryCheck.source}) - expiré le ${expiryCheck.expiryDate.toLocaleDateString('fr-FR')}`);
    
    // Préparer la mise à jour : retour au plan gratuit
    const updates = {
        'subscription.status': 'expired',
        'subscription.plan': 'free',
        'subscription.advisorAccess': false,
        'tokenState.plan': 'free',
        'tokenState.baseTokens': 500,
        'tokenState.totalTokens': 500,
        'tokenState.availableTokens': 500,
        'tokenState.usedTokens': 0,
        'tokenState.expiresAt': admin.firestore.FieldValue.delete(),
        'subscription.expiresAt': admin.firestore.FieldValue.delete(),
        'subscription.lastExpiryDate': new Date().toISOString(),
        lastAnalysisAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    await doc.ref.update(updates);
    
    return {
        userId: userId,
        email: userData.email,
        oldPlan: userData.subscription?.plan || userData.tokenState?.plan,
        expiredAt: expiryCheck.expiryDate.toISOString(),
        action: 'désactivé'
    };
}

/**
 * Fonction principale
 */
async function main() {
    console.log('🚀 Démarrage de la vérification des abonnements expirés...');
    console.log(`📅 Date actuelle: ${new Date().toLocaleString('fr-FR')}`);
    console.log('');
    
    try {
        // Récupérer tous les utilisateurs
        const usersSnapshot = await db.collection('users').get();
        console.log(`📊 Nombre total d'utilisateurs: ${usersSnapshot.docs.length}`);
        console.log('');
        
        const expiredUsers = [];
        const activeUsers = [];
        
        // Traiter chaque utilisateur
        for (const doc of usersSnapshot.docs) {
            const userData = doc.data();
            const userId = doc.id;
            
            // On ne vérifie que les utilisateurs avec un plan payant
            const plan = userData.subscription?.plan || userData.tokenState?.plan || 'free';
            if (plan === 'free') {
                continue; // Les utilisateurs gratuits n'ont pas d'expiration
            }
            
            const result = await deactivateExpiredSubscription(doc);
            
            if (result) {
                expiredUsers.push(result);
            } else {
                activeUsers.push({
                    userId: userId,
                    email: userData.email,
                    plan: plan
                });
            }
        }
        
        console.log('');
        console.log('='.repeat(80));
        console.log('📋 RÉSULTATS');
        console.log('='.repeat(80));
        console.log(`✅ Abonnements ACTIFS: ${activeUsers.length}`);
        console.log(`❌ Abonnements EXPIRÉS et désactivés: ${expiredUsers.length}`);
        console.log('');
        
        if (expiredUsers.length > 0) {
            console.log('📝 Utilisateurs désactivés:');
            console.log('-'.repeat(80));
            expiredUsers.forEach(user => {
                console.log(`  • ${user.userId} (${user.email || 'pas d\'email'})`);
                console.log(`    Ancien plan: ${user.oldPlan}`);
                console.log(`    Expiré le: ${new Date(user.expiredAt).toLocaleDateString('fr-FR')}`);
            });
        }
        
        if (activeUsers.length > 0 && activeUsers.length <= 10) {
            console.log('');
            console.log('✅ Abonnements actifs:');
            console.log('-'.repeat(80));
            activeUsers.forEach(user => {
                console.log(`  • ${user.userId} (${user.email || 'pas d\'email'}) - Plan: ${user.plan}`);
            });
        }
        
        console.log('');
        console.log('✅ Vérification terminée avec succès !');
        
    } catch (error) {
        console.error('❌ Erreur:', error);
        process.exit(1);
    }
}

// Exécuter si ce fichier est lancé directement
if (require.main === module) {
    main();
}

module.exports = { main, isExpired, deactivateExpiredSubscription };
