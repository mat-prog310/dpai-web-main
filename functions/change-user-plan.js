#!/usr/bin/env node

/**
 * Script pour changer le plan d'un utilisateur dans Firestore
 * 
 * Usage:
 *   node change-user-plan.js <email|userId> <newPlan> [--force]
 * 
 * Exemples:
 *   node change-user-plan.js matthias.duprey1@gmail.com advisor
 *   node change-user-plan.js user123 free
 *   node change-user-plan.js matthias.duprey1@gmail.com api_monthly --force
 * 
 * Plans disponibles: free, api_monthly, advisor
 */

const admin = require('firebase-admin');

// Initialiser Firebase Admin
if (admin.apps.length === 0) {
    admin.initializeApp();
}

const db = admin.firestore();

// Configuration des plans
const PLAN_CONFIGS = {
    free: {
        name: 'Gratuit',
        baseTokens: 500,
        tokenLimit: 500,
        hasAI: false,
        hasAdvisor: false,
        price: 0,
        isPremium: false
    },
    api_monthly: {
        name: 'API Mensuel',
        baseTokens: 1000,
        tokenLimit: 1000,
        hasAI: true,
        hasAdvisor: false,
        price: 199,
        isPremium: true
    },
    advisor: {
        name: 'Conseiller IA',
        baseTokens: -1,  // Illimité
        tokenLimit: -1,
        hasAI: true,
        hasAdvisor: true,
        price: 499,
        isPremium: true
    }
};

/**
 * Trouver un utilisateur par email ou userId
 */
async function findUser(emailOrId) {
    // D'abord essayer comme userId
    const userById = await db.collection('users').doc(emailOrId).get();
    if (userById.exists) {
        return { doc: userById, id: userById.id };
    }
    
    // Sinon essayer comme email
    const usersByEmail = await db.collection('users').where('email', '==', emailOrId).limit(1).get();
    if (!usersByEmail.empty) {
        return { doc: usersByEmail.docs[0], id: usersByEmail.docs[0].id };
    }
    
    return null;
}

/**
 * Changer le plan d'un utilisateur
 */
async function changeUserPlan(userId, newPlan, force = false) {
    const planConfig = PLAN_CONFIGS[newPlan];
    
    if (!planConfig) {
        throw new Error(`Plan invalide: ${newPlan}. Plans valides: ${Object.keys(PLAN_CONFIGS).join(', ')}`);
    }
    
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
        throw new Error(`Utilisateur non trouvé: ${userId}`);
    }
    
    const userData = userDoc.data();
    const currentPlan = userData.subscription?.plan || userData.plan || userData.tokenState?.plan || 'free';
    
    console.log(`\n📋 Utilisateur: ${userId}`);
    console.log(`   Email: ${userData.email || 'Non défini'}`);
    console.log(`   Plan actuel: ${currentPlan}`);
    console.log(`   Nouveau plan: ${newPlan}`);
    
    if (currentPlan === newPlan && !force) {
        console.log(`   ⚠️  L'utilisateur a déjà le plan "${newPlan}". Utilisez --force pour forcer la mise à jour.`);
        return { success: false, message: 'Pas de changement nécessaire' };
    }
    
    // Calculer la date d'expiration (30 jours à partir de maintenant pour les plans payants)
    let expiryDate = null;
    let subscriptionStatus = 'active';
    
    if (newPlan !== 'free') {
        expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 30);
    }
    
    // Créer le tokenState mis à jour
    const totalTokens = planConfig.baseTokens;
    const usedTokens = Math.min(
        userData.tokenState?.usedTokens || userData.tokensUsed || 0,
        totalTokens === -1 ? Infinity : totalTokens
    );
    const availableTokens = totalTokens === -1 ? -1 : totalTokens - usedTokens;
    
    const now = admin.firestore.FieldValue.serverTimestamp();
    
    const newTokenState = {
        userId: userId,
        plan: newPlan,
        baseTokens: totalTokens,
        bonusTokens: 0,
        totalTokens: totalTokens,
        availableTokens: availableTokens,
        usedTokens: usedTokens,
        lastTokenUpdate: now,
        firstAnalysisDone: userData.tokenState?.firstAnalysisDone || userData.firstAnalysisDone || false,
        monthlyTokensUsed: userData.tokenState?.monthlyTokensUsed || userData.monthlyTokensUsed || 0,
        lastMonthlyReset: now,
        expiresAt: expiryDate?.toISOString() || null,
        isExpired: false,
        hasAccessToAPI: planConfig.hasAI,
        hasAccessToAdvancedAnalytics: planConfig.hasAdvisor,
        hasAccessToPremiumSuggestions: planConfig.hasAdvisor
    };
    
    // Préparer les données de mise à jour
    const updateData = {
        plan: newPlan,
        isPremium: planConfig.isPremium,
        hasAccessToAPI: planConfig.hasAI,
        hasAccessToAdvancedAnalytics: planConfig.hasAdvisor,
        hasAccessToPremiumSuggestions: planConfig.hasAdvisor,
        availableTokens: availableTokens,
        tokensUsed: usedTokens,
        totalTokens: totalTokens,
        tokenState: newTokenState,
        'subscription.plan': newPlan,
        'subscription.status': subscriptionStatus,
        'subscription.price': planConfig.price,
        subscription: {
            plan: newPlan,
            status: subscriptionStatus,
            price: planConfig.price,
            expiresAt: expiryDate?.toISOString() || null,
            lastPaymentDate: now,
            lastRenewalDate: now,
            paymentReceived: true
        }
    };
    
    // Appliquer la mise à jour
    console.log(`\n🔧 Mise à jour du plan...`);
    await userRef.update(updateData);
    
    console.log(`✅ Plan changé avec succès de "${currentPlan}" à "${newPlan}"`);
    console.log(`   Tokens: ${totalTokens === -1 ? 'Illimités' : totalTokens}`);
    console.log(`   Accès IA: ${planConfig.hasAI ? 'Oui' : 'Non'}`);
    console.log(`   Accès Advisor: ${planConfig.hasAdvisor ? 'Oui' : 'Non'}`);
    
    return { 
        success: true, 
        message: `Plan changé de ${currentPlan} à ${newPlan}`,
        userId: userId,
        oldPlan: currentPlan,
        newPlan: newPlan
    };
}

/**
 * Lister tous les utilisateurs avec leur plan actuel
 */
async function listAllUsers() {
    const snapshot = await db.collection('users').get();
    
    console.log(`\n📊 Liste de tous les utilisateurs (${snapshot.size}):`);
    console.log('='.repeat(80));
    console.log('ID'.padEnd(40) + 'Email'.padEnd(40) + 'Plan'.padEnd(20) + 'Premium');
    console.log('='.repeat(80));
    
    snapshot.forEach(doc => {
        const data = doc.data();
        const plan = data.subscription?.plan || data.plan || data.tokenState?.plan || 'free';
        const isPremium = data.isPremium || plan !== 'free';
        const email = data.email || 'N/A';
        const userId = doc.id.substring(0, 35) + (doc.id.length > 35 ? '...' : '');
        
        console.log(
            userId.padEnd(40) + 
            email.substring(0, 40).padEnd(40) + 
            plan.padEnd(20) + 
            (isPremium ? 'Oui' : 'Non')
        );
    });
    
    return snapshot.size;
}

// Exécution principale
async function main() {
    const args = process.argv.slice(2);
    
    console.log('='.repeat(80));
    console.log('🚀 SCRIPT DE CHANGEMENT DE PLAN UTILISATEUR');
    console.log('='.repeat(80));
    
    if (args.length === 0) {
        console.log(`\n📖 Usage:`);
        console.log(`   node change-user-plan.js <email|userId> <newPlan> [--force]`);
        console.log(`\n📝 Exemples:`);
        console.log(`   node change-user-plan.js matthias.duprey1@gmail.com advisor`);
        console.log(`   node change-user-plan.js user123 free`);
        console.log(`   node change-user-plan.js matthias.duprey1@gmail.com api_monthly --force`);
        console.log(`\n📋 Plans disponibles:`);
        Object.entries(PLAN_CONFIGS).forEach(([plan, config]) => {
            console.log(`   - ${plan}: ${config.name} (${config.price}€) - Tokens: ${config.baseTokens === -1 ? 'Illimités' : config.baseTokens}`);
        });
        console.log(`\n📊 Pour lister tous les utilisateurs:`);
        console.log(`   node change-user-plan.js --list`);
        process.exit(1);
    }
    
    const arg = args[0];
    
    if (arg === '--list') {
        const count = await listAllUsers();
        console.log(`\n✅ ${count} utilisateurs listés`);
        process.exit(0);
    }
    
    if (args.length < 2) {
        console.error(`\n❌ Erreur: Il faut spécifier le nouvel utilisateur et le plan`);
        console.log(`   Usage: node change-user-plan.js <email|userId> <newPlan>`);
        process.exit(1);
    }
    
    const userIdOrEmail = arg;
    const newPlan = args[1];
    const force = args.includes('--force');
    
    try {
        console.log(`\n🔍 Recherche de l'utilisateur: ${userIdOrEmail}`);
        const user = await findUser(userIdOrEmail);
        
        if (!user) {
            console.error(`❌ Utilisateur non trouvé: ${userIdOrEmail}`);
            process.exit(1);
        }
        
        const result = await changeUserPlan(user.id, newPlan, force);
        
        if (result.success) {
            console.log(`\n✅ Succès: ${result.message}`);
        } else {
            console.log(`\n⚠️  ${result.message}`);
        }
        
    } catch (error) {
        console.error(`\n❌ Erreur: ${error.message}`);
        process.exit(1);
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('✅ Script terminé');
    console.log('='.repeat(80) + '\n');
    process.exit(0);
}

main().catch(error => {
    console.error('\n❌ Erreur fatale:', error);
    process.exit(1);
});
