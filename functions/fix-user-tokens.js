#!/usr/bin/env node

/**
 * Script pour corriger le tokenState incohérent des utilisateurs
 * 
 * Usage:
 *   node fix-user-tokens.js <email>
 *   ou
 *   node fix-user-tokens.js <userId>
 * 
 * Exemple:
 *   node fix-user-tokens.js matthias.duprey1@gmail.com
 */

const admin = require('firebase-admin');

// Initialiser Firebase Admin
if (admin.apps.length === 0) {
    admin.initializeApp();
}

const db = admin.firestore();

/**
 * Corriger le tokenState d'un utilisateur
 */
async function fixTokenState(userId, email) {
    try {
        console.log(`\n🔍 Recherche de l'utilisateur...`);
        
        let userDoc;
        if (userId) {
            userDoc = await db.collection('users').doc(userId).get();
        } else if (email) {
            const snapshot = await db.collection('users').where('email', '==', email).limit(1).get();
            if (snapshot.empty) {
                console.log(`❌ Utilisateur non trouvé avec email: ${email}`);
                return null;
            }
            userDoc = snapshot.docs[0];
            userId = userDoc.id;
        }
        
        if (!userDoc.exists) {
            console.log(`❌ Utilisateur non trouvé: ${userId || email}`);
            return null;
        }
        
        const userData = userDoc.data();
        const tokenState = userData.tokenState || {};
        const subscription = userData.subscription || {};
        const plan = subscription.plan || 'free';
        
        console.log(`\n📋 Utilisateur trouvé: ${userId}`);
        console.log(`   Email: ${userData.email || 'Non défini'}`);
        console.log(`   Plan: ${plan}`);
        console.log(`   TokenState actuel:`);
        console.log(`     - totalTokens: ${tokenState.totalTokens || 0}`);
        console.log(`     - usedTokens: ${tokenState.usedTokens || 0}`);
        console.log(`     - availableTokens: ${tokenState.availableTokens || 0}`);
        
        // Déterminer le total correct selon le plan
        let correctTotalTokens;
        if (plan === 'advisor') {
            correctTotalTokens = -1; // Illimité
        } else if (plan === 'api_monthly') {
            correctTotalTokens = 1000;
        } else {
            correctTotalTokens = 500; // Plan gratuit
        }
        
        // Calculer les valeurs correctes
        const usedTokens = Math.min(
            tokenState.usedTokens || 0,
            correctTotalTokens === -1 ? Infinity : correctTotalTokens
        );
        const availableTokens = correctTotalTokens === -1 ? -1 : correctTotalTokens - usedTokens;
        
        // Vérifier si correction nécessaire
        const needsFix = 
            tokenState.availableTokens !== availableTokens ||
            tokenState.totalTokens !== correctTotalTokens ||
            (tokenState.totalTokens !== -1 && tokenState.availableTokens + tokenState.usedTokens !== tokenState.totalTokens);
        
        if (!needsFix) {
            console.log(`\n✅ TokenState déjà correct pour cet utilisateur.`);
            return userId;
        }
        
        console.log(`\n⚠️  TokenState incohérent détecté!`);
        console.log(`   Correction nécessaire:`);
        console.log(`     - totalTokens: ${tokenState.totalTokens || 0} → ${correctTotalTokens}`);
        console.log(`     - usedTokens: ${tokenState.usedTokens || 0} → ${usedTokens}`);
        console.log(`     - availableTokens: ${tokenState.availableTokens || 0} → ${availableTokens}`);
        
        // Créeer le tokenState corrigé
        const correctedTokenState = {
            ...tokenState,
            userId: userId,
            plan: plan,
            baseTokens: correctTotalTokens,
            totalTokens: correctTotalTokens,
            usedTokens: usedTokens,
            availableTokens: availableTokens,
            lastTokenUpdate: admin.firestore.FieldValue.serverTimestamp(),
            firstAnalysisDone: (tokenState.firstAnalysisDone || (tokenState.usedTokens || 0) > 0),
            isExpired: false,
            expiresAt: subscription.expiresAt || null
        };
        
        // Mettre à jour dans Firestore
        console.log(`\n🔧 Mise à jour du tokenState...`);
        await db.collection('users').doc(userId).update({
            tokenState: correctedTokenState,
            availableTokens: availableTokens,
            tokensUsed: usedTokens,
            totalTokens: correctTotalTokens
        });
        
        console.log(`\n✅ TokenState corrigé avec succès!`);
        console.log(`   Nouveaux valeurs:`);
        console.log(`     - totalTokens: ${correctedTokenState.totalTokens}`);
        console.log(`     - usedTokens: ${correctedTokenState.usedTokens}`);
        console.log(`     - availableTokens: ${correctedTokenState.availableTokens}`);
        
        return userId;
        
    } catch (error) {
        console.error(`\n❌ Erreur lors de la correction du tokenState:`, error);
        return null;
    }
}

/**
 * Corriger tous les utilisateurs avec tokenState incohérent
 */
async function fixAllUsers() {
    console.log(`\n🔍 Recherche de tous les utilisateurs à corriger...`);
    
    const snapshot = await db.collection('users').get();
    let fixedCount = 0;
    let errorCount = 0;
    
    for (const doc of snapshot.docs) {
        try {
            const userId = doc.id;
            const userData = doc.data();
            const tokenState = userData.tokenState || {};
            
            // Vérifier si incohérent
            if (tokenState.totalTokens && tokenState.usedTokens !== undefined) {
                const expectedAvailable = tokenState.totalTokens === -1 ? -1 : tokenState.totalTokens - tokenState.usedTokens;
                if (tokenState.availableTokens !== expectedAvailable) {
                    console.log(`\n⚠️  Incohérence trouvée pour: ${userId}`);
                    await fixTokenState(userId, null);
                    fixedCount++;
                }
            }
        } catch (error) {
            console.error(`\n❌ Erreur pour utilisateur ${doc.id}:`, error.message);
            errorCount++;
        }
    }
    
    console.log(`\n📊 Résumé:`);
    console.log(`   Utilisateurs corrigés: ${fixedCount}`);
    console.log(`   Erreurs: ${errorCount}`);
}

// Exécution principale
async function main() {
    const args = process.argv.slice(2);
    
    console.log('='.repeat(60));
    console.log('🚀 SCRIPT DE CORRECTION DES TOKENS');
    console.log('='.repeat(60));
    
    if (args.length === 0) {
        console.log(`\n📖 Usage:`);
        console.log(`   node fix-user-tokens.js <email>`);
        console.log(`   node fix-user-tokens.js <userId>`);
        console.log(`   node fix-user-tokens.js --all`);
        console.log(`\n📝 Exemples:`);
        console.log(`   node fix-user-tokens.js matthias.duprey1@gmail.com`);
        console.log(`   node fix-user-tokens.js someUserId123`);
        console.log(`   node fix-user-tokens.js --all`);
        process.exit(1);
    }
    
    const arg = args[0];
    
    if (arg === '--all') {
        await fixAllUsers();
    } else {
        // Essayer de traiter comme email d'abord, puis comme userId
        await fixTokenState(null, arg);
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ Script terminé');
    console.log('='.repeat(60) + '\n');
    process.exit(0);
}

main().catch(error => {
    console.error('\n❌ Erreur fatale:', error);
    process.exit(1);
});
