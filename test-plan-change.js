#!/usr/bin/env node

/**
 * Script de test pour vérifier que le changement de plan fonctionne
 */

const admin = require('firebase-admin');

// Initialiser Firebase Admin
if (admin.apps.length === 0) {
    admin.initializeApp();
}

const db = admin.firestore();

// Configuration des plans (doit correspondre à tokens.js)
const PLAN_CONFIGS = {
    free: {
        name: 'Gratuit',
        baseTokens: 500,
        hasAI: false,
        hasAdvisor: false,
        price: 0
    },
    api_monthly: {
        name: 'API Mensuel',
        baseTokens: 1000,
        hasAI: true,
        hasAdvisor: false,
        price: 199
    },
    advisor: {
        name: 'Conseiller IA',
        baseTokens: -1,
        hasAI: true,
        hasAdvisor: true,
        price: 499
    }
};

async function createTestUser(email) {
    const userId = `test_${Date.now()}`;
    
    const testUser = {
        id: userId,
        email: email,
        displayName: 'Test User',
        plan: 'free',
        isPremium: false,
        hasAccessToAPI: false,
        hasAccessToAdvancedAnalytics: false,
        hasAccessToPremiumSuggestions: false,
        availableTokens: 500,
        tokensUsed: 0,
        totalTokens: 500,
        tokenState: {
            userId: userId,
            plan: 'free',
            baseTokens: 500,
            totalTokens: 500,
            availableTokens: 500,
            usedTokens: 0,
            isExpired: false
        },
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        lastLoginAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    await db.collection('users').doc(userId).set(testUser);
    
    console.log(`✅ Utilisateur test créé: ${userId}`);
    return userId;
}

async function verifyUserPlan(userId, expectedPlan) {
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
        console.error(`❌ Utilisateur ${userId} non trouvé`);
        return false;
    }
    
    const userData = userDoc.data();
    const plan = userData.subscription?.plan || userData.plan || userData.tokenState?.plan || 'free';
    const hasAdvisor = userData.hasAccessToPremiumSuggestions || false;
    const tokenStatePlan = userData.tokenState?.plan || 'none';
    const availableTokens = userData.tokenState?.availableTokens || userData.availableTokens || 0;
    
    const planConfig = PLAN_CONFIGS[expectedPlan];
    const expectedTokens = planConfig.baseTokens;
    const expectedHasAdvisor = planConfig.hasAdvisor;
    
    console.log(`\n🔍 Vérification utilisateur ${userId}:`);
    console.log(`   Plan attendu: ${expectedPlan}`);
    console.log(`   Plan actuel: ${plan}`);
    console.log(`   tokenState.plan: ${tokenStatePlan}`);
    console.log(`   Accès Advisor: ${hasAdvisor} (attendu: ${expectedHasAdvisor})`);
    console.log(`   Tokens disponibles: ${availableTokens} (attendu: ${expectedTokens === -1 ? 'Illimités' : expectedTokens})`);
    
    const isCorrect = 
        plan === expectedPlan &&
        tokenStatePlan === expectedPlan &&
        hasAdvisor === expectedHasAdvisor &&
        (expectedTokens === -1 ? availableTokens === -1 : availableTokens >= expectedTokens - 10);
    
    if (isCorrect) {
        console.log(`   ✅ TOUT EST CORRECT !`);
    } else {
        console.log(`   ❌ INCOHÉRENCES DÉTECTÉES !`);
    }
    
    return isCorrect;
}

async function runTests() {
    console.log('='.repeat(60));
    console.log('🚀 TESTS DE CHANGEMENT DE PLAN');
    console.log('='.repeat(60));
    
    try {
        // Test 1: Créer un utilisateur test
        console.log(`\n📝 Test 1: Création utilisateur test...`);
        const testUserEmail = `testplan_${Date.now()}@example.com`;
        const testUserId = await createTestUser(testUserEmail);
        
        // Vérifier que l'utilisateur est en plan free
        const test1 = await verifyUserPlan(testUserId, 'free');
        
        // Test 2: Changer vers advisor
        console.log(`\n📝 Test 2: Changement vers advisor...`);
        const changeScript = require('./functions/change-user-plan');
        await changeScript.changeUserPlan(testUserId, 'advisor');
        
        const test2 = await verifyUserPlan(testUserId, 'advisor');
        
        // Test 3: Changer vers api_monthly
        console.log(`\n📝 Test 3: Changement vers api_monthly...`);
        await changeScript.changeUserPlan(testUserId, 'api_monthly');
        
        const test3 = await verifyUserPlan(testUserId, 'api_monthly');
        
        // Test 4: Retour à free
        console.log(`\n📝 Test 4: Retour à free...`);
        await changeScript.changeUserPlan(testUserId, 'free');
        
        const test4 = await verifyUserPlan(testUserId, 'free');
        
        // Nettoyage
        console.log(`\n🧹 Nettoyage...`);
        await db.collection('users').doc(testUserId).delete();
        console.log(`   ✅ Utilisateur test supprimé`);
        
        // Résumé
        console.log('\n' + '='.repeat(60));
        console.log('📊 RÉSULTATS:');
        console.log('='.repeat(60));
        console.log(`   Test 1 (Création): ${test1 ? '✅ PASS' : '❌ FAIL'}`);
        console.log(`   Test 2 (Vers advisor): ${test2 ? '✅ PASS' : '❌ FAIL'}`);
        console.log(`   Test 3 (Vers api_monthly): ${test3 ? '✅ PASS' : '❌ FAIL'}`);
        console.log(`   Test 4 (Vers free): ${test4 ? '✅ PASS' : '❌ FAIL'}`);
        
        const allPassed = test1 && test2 && test3 && test4;
        console.log(`\n   ${allPassed ? '✅ TOUS LES TESTS ONT RÉUSSI !' : '❌ QUELQUES TESTS ONT ÉCHOUÉ'}`);
        console.log('='.repeat(60));
        
        return allPassed;
        
    } catch (error) {
        console.error(`\n❌ Erreur lors des tests:`, error);
        return false;
    }
}

// Exécution
runTests().then(success => {
    process.exit(success ? 0 : 1);
}).catch(() => {
    process.exit(1);
});
