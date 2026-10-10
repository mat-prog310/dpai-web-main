/**
 * Script Node.js pour vérifier et corriger l'accès advisor d'un utilisateur spécifique
 * 
 * Usage:
 *   node verify-advisor-access.js <email|userId>
 *   node verify-advisor-access.js matthias.duprey1@gmail.com
 *   node verify-advisor-access.js USER_UID --fix
 */

const admin = require('firebase-admin');

// Initialiser Firebase Admin
if (admin.apps.length === 0) {
    const serviceAccount = require('./serviceAccountKey.json');
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: "https://dpai-8be62.firebaseio.com"
    });
}

const db = admin.firestore();

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
 * Vérifier si un utilisateur a accès à advisor
 */
function checkAdvisorAccess(userData) {
    const checks = {
        mainPlan: null,
        tokenStatePlan: null,
        isPremium: null,
        hasAccessToPremiumSuggestions: null,
        hasAccessToAdvancedAnalytics: null,
        hasAccessToAPI: null,
        tokensUnlimited: null,
        notExpired: null
    };
    
    const issues = [];
    const now = new Date();
    
    // Vérifier le plan principal
    const mainPlan = userData.subscription?.plan || userData.plan || 'free';
    checks.mainPlan = mainPlan;
    if (mainPlan !== 'advisor') {
        issues.push(`Plan principal: "${mainPlan}" (attendu: "advisor")`);
    }
    
    // Vérifier tokenState.plan
    const tokenStatePlan = userData.tokenState?.plan || 'non défini';
    checks.tokenStatePlan = tokenStatePlan;
    if (tokenStatePlan !== 'advisor') {
        issues.push(`tokenState.plan: "${tokenStatePlan}" (attendu: "advisor")`);
    }
    
    // Vérifier isPremium
    const isPremium = userData.isPremium || false;
    checks.isPremium = isPremium;
    if (!isPremium) {
        issues.push('isPremium: false (attendu: true)');
    }
    
    // Vérifier les flags d'accès
    checks.hasAccessToPremiumSuggestions = userData.hasAccessToPremiumSuggestions;
    if (userData.hasAccessToPremiumSuggestions !== true) {
        issues.push('hasAccessToPremiumSuggestions: false/manquant (attendu: true)');
    }
    
    checks.hasAccessToAdvancedAnalytics = userData.hasAccessToAdvancedAnalytics;
    if (userData.hasAccessToAdvancedAnalytics !== true) {
        issues.push('hasAccessToAdvancedAnalytics: false/manquant (attendu: true)');
    }
    
    checks.hasAccessToAPI = userData.hasAccessToAPI;
    if (userData.hasAccessToAPI !== true) {
        issues.push('hasAccessToAPI: false/manquant (attendu: true)');
    }
    
    // Vérifier les tokens illimités
    const baseTokens = userData.tokenState?.baseTokens || userData.baseTokens || 0;
    const totalTokens = userData.tokenState?.totalTokens || userData.totalTokens || 0;
    const availableTokens = userData.tokenState?.availableTokens || userData.availableTokens || 0;
    checks.tokensUnlimited = { baseTokens, totalTokens, availableTokens };
    if (!(baseTokens === -1 && totalTokens === -1 && availableTokens === -1)) {
        issues.push(`Tokens non illimités: base=${baseTokens}, total=${totalTokens}, available=${availableTokens}`);
    }
    
    // Vérifier l'expiration
    let isExpired = false;
    if (userData.subscription?.expiresAt) {
        const expiryDate = new Date(userData.subscription.expiresAt);
        if (expiryDate < now) {
            isExpired = true;
            checks.notExpired = false;
            issues.push(`Abonnement expiré: ${expiryDate.toLocaleDateString('fr-FR')}`);
        } else {
            checks.notExpired = true;
        }
    } else {
        checks.notExpired = true; // Pas de date = pas expiré
    }
    
    // A accès si : plan advisor + pas d'expiration + flags corrects
    const hasCorrectPlan = mainPlan === 'advisor' || tokenStatePlan === 'advisor';
    const hasAccessFlags = userData.hasAccessToPremiumSuggestions === true || 
                          userData.hasAccessToAdvancedAnalytics === true ||
                          userData.tokenState?.hasAccessToPremiumSuggestions === true;
    const hasTokens = baseTokens === -1 && totalTokens === -1;
    
    const hasAccess = hasCorrectPlan && !isExpired && (hasAccessFlags || hasTokens);
    
    return {
        hasAccess,
        checks,
        issues,
        isExpired,
        plan: mainPlan,
        tokenStatePlan,
        expiryDate: userData.subscription?.expiresAt
    };
}

/**
 * Corriger l'accès advisor pour un utilisateur
 */
async function fixAdvisorAccess(userId, userData) {
    const now = new Date();
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30);
    
    const updates = {
        // Champs principaux
        plan: 'advisor',
        isPremium: true,
        
        // Flags d'accès
        hasAccessToAPI: true,
        hasAccessToAdvancedAnalytics: true,
        hasAccessToPremiumSuggestions: true,
        
        // Subscription
        'subscription.plan': 'advisor',
        'subscription.status': 'active',
        'subscription.price': 499,
        'subscription.expiresAt': expiryDate.toISOString(),
        'subscription.lastPaymentDate': now.toISOString(),
        'subscription.paymentReceived': true,
        'subscription.lastRenewalDate': now.toISOString(),
        subscription: {
            plan: 'advisor',
            status: 'active',
            price: 499,
            expiresAt: expiryDate.toISOString(),
            lastPaymentDate: now.toISOString(),
            paymentReceived: true,
            lastRenewalDate: now.toISOString()
        },
        
        // Tokens
        availableTokens: -1,
        tokensUsed: 0,
        totalTokens: -1,
        baseTokens: -1,
        
        // TokenState complet
        tokenState: {
            userId: userId,
            plan: 'advisor',
            baseTokens: -1,
            bonusTokens: 0,
            totalTokens: -1,
            availableTokens: -1,
            usedTokens: 0,
            lastTokenUpdate: now.toISOString(),
            firstAnalysisDone: userData.tokenState?.firstAnalysisDone || false,
            monthlyTokensUsed: 0,
            lastMonthlyReset: now.toISOString(),
            expiresAt: expiryDate.toISOString(),
            isExpired: false,
            hasAccessToAPI: true,
            hasAccessToAdvancedAnalytics: true,
            hasAccessToPremiumSuggestions: true
        }
    };
    
    await db.collection('users').doc(userId).update(updates);
    return updates;
}

/**
 * Vérifier un utilisateur spécifique
 */
async function verifyUser(emailOrId, fix = false) {
    console.log('\n' + '='.repeat(80));
    console.log('🔍 VÉRIFICATION D\'ACCÈS CONSEILLER IA');
    console.log('='.repeat(80));
    
    const user = await findUser(emailOrId);
    
    if (!user) {
        console.log(`❌ Utilisateur non trouvé: ${emailOrId}`);
        console.log('='.repeat(80) + '\n');
        return null;
    }
    
    const userData = user.doc.data();
    const userId = user.id;
    
    console.log(`👤 Utilisateur: ${userId}`);
    console.log(`📧 Email: ${userData.email || 'Non défini'}`);
    console.log('');
    
    const checkResult = checkAdvisorAccess(userData);
    
    console.log('📋 VÉRIFICATIONS:');
    console.log('-'.repeat(80));
    console.log(`  Plan principal: ${checkResult.checks.mainPlan}`);
    console.log(`  tokenState.plan: ${checkResult.checks.tokenStatePlan}`);
    console.log(`  isPremium: ${checkResult.checks.isPremium}`);
    console.log(`  hasAccessToPremiumSuggestions: ${checkResult.checks.hasAccessToPremiumSuggestions}`);
    console.log(`  hasAccessToAdvancedAnalytics: ${checkResult.checks.hasAccessToAdvancedAnalytics}`);
    console.log(`  hasAccessToAPI: ${checkResult.checks.hasAccessToAPI}`);
    console.log(`  Tokens: base=${checkResult.checks.tokensUnlimited.baseTokens}, total=${checkResult.checks.tokensUnlimited.totalTokens}, available=${checkResult.checks.tokensUnlimited.availableTokens}`);
    console.log(`  Expiration: ${checkResult.isExpired ? 'EXPIRÉ' : 'Valide'}`);
    if (checkResult.expiryDate) {
        console.log(`  Date expiration: ${new Date(checkResult.expiryDate).toLocaleDateString('fr-FR')}`);
    }
    console.log('');
    
    if (checkResult.issues.length > 0) {
        console.log('❌ PROBLÈMES DÉTECTÉS:');
        checkResult.issues.forEach(issue => console.log(`  • ${issue}`));
        console.log('');
    } else {
        console.log('✅ AUCUN PROBLÈME DÉTECTÉ!');
        console.log('');
    }
    
    console.log(`🎯 ACCÈS CONSEILLER IA: ${checkResult.hasAccess ? '✅ OUI' : '❌ NON'}`);
    console.log('');
    
    if (fix && !checkResult.hasAccess) {
        console.log('🔧 APPLICATION DES CORRECTIONS...');
        try {
            await fixAdvisorAccess(userId, userData);
            console.log('✅ Correction réussie!');
            console.log('');
            
            // Re-vérifier
            const fixedUserDoc = await db.collection('users').doc(userId).get();
            const fixedUserData = fixedUserDoc.data();
            const fixedResult = checkAdvisorAccess(fixedUserData);
            
            console.log(`🎯 NOUVEAU STATUT: ${fixedResult.hasAccess ? '✅ ACCÈS AUTORISÉ' : '❌ TOUJOURS BLOQUÉ'}`);
            if (!fixedResult.hasAccess) {
                console.log('');
                console.log('⚠️  Il reste des problèmes:');
                fixedResult.issues.forEach(issue => console.log(`  • ${issue}`));
            }
        } catch (error) {
            console.error('❌ Erreur lors de la correction:', error.message);
        }
    } else if (fix) {
        console.log('✅ Aucune correction nécessaire, accès déjà autorisé!');
    }
    
    console.log('='.repeat(80) + '\n');
    
    return {
        userId,
        email: userData.email,
        hasAccess: checkResult.hasAccess,
        issues: checkResult.issues,
        fixed: fix && !checkResult.hasAccess
    };
}

/**
 * Lister tous les utilisateurs avec accès advisor
 */
async function listAdvisorUsers() {
    const snapshot = await db.collection('users').get();
    const advisorUsers = [];
    const problematicUsers = [];
    
    for (const doc of snapshot.docs) {
        const userData = doc.data();
        const plan = userData.subscription?.plan || userData.plan || 'free';
        
        if (plan === 'advisor') {
            const checkResult = checkAdvisorAccess(userData);
            
            if (checkResult.hasAccess) {
                advisorUsers.push({
                    userId: doc.id,
                    email: userData.email,
                    status: '✅ OK'
                });
            } else {
                problematicUsers.push({
                    userId: doc.id,
                    email: userData.email,
                    issues: checkResult.issues,
                    isExpired: checkResult.isExpired
                });
            }
        }
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('📊 LISTE DES UTILISATEURS CONSEILLER IA');
    console.log('='.repeat(80));
    console.log(`\n✅ Utilisateurs avec accès correct: ${advisorUsers.length}`);
    if (advisorUsers.length <= 20) {
        advisorUsers.forEach(u => console.log(`  • ${u.userId} (${u.email}) - ${u.status}`));
    }
    
    console.log(`\n❌ Utilisateurs avec problèmes: ${problematicUsers.length}`);
    if (problematicUsers.length > 0) {
        problematicUsers.forEach(u => {
            console.log(`\n  👤 ${u.userId} (${u.email})`);
            console.log(`     Problèmes: ${u.issues.join(', ')}`);
            if (u.isExpired) {
                console.log(`     ⚠️  ABONNEMENT EXPIRÉ`);
            }
        });
    }
    console.log('\n' + '='.repeat(80) + '\n');
    
    return { advisorUsers, problematicUsers };
}

// Exécution principale
async function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.log('\n📖 USAGE:');
        console.log('  node verify-advisor-access.js <email|userId> [--fix]');
        console.log('  node verify-advisor-access.js matthias.duprey1@gmail.com');
        console.log('  node verify-advisor-access.js USER_UID --fix');
        console.log('\n📊 Pour lister tous les utilisateurs advisor:');
        console.log('  node verify-advisor-access.js --list');
        console.log('\n🔧 Pour corriger tous les utilisateurs advisor:');
        console.log('  node verify-advisor-access.js --list --fix-all');
        process.exit(1);
    }
    
    const arg = args[0];
    const fix = args.includes('--fix');
    const list = arg === '--list';
    const fixAll = args.includes('--fix-all');
    
    if (list) {
        if (fixAll) {
            console.log('🔧 CORRECTION DE TOUS LES UTILISATEURS ADVISOR...');
            const { advisorUsers, problematicUsers } = await listAdvisorUsers();
            
            if (problematicUsers.length > 0) {
                console.log(`\n🔧 Correction de ${problematicUsers.length} utilisateurs...`);
                for (const user of problematicUsers) {
                    console.log(`  Correction de ${user.userId}...`);
                    try {
                        await fixAdvisorAccess(user.userId, await db.collection('users').doc(user.userId).get().then(d => d.data()));
                        console.log(`  ✅ ${user.userId} corrigé`);
                    } catch (error) {
                        console.log(`  ❌ ${user.userId}: ${error.message}`);
                    }
                }
                console.log('\n✅ Correction complète terminée!');
            } else {
                console.log('✅ Tous les utilisateurs advisor sont déjà correctement configurés!');
            }
        } else {
            await listAdvisorUsers();
        }
        process.exit(0);
    }
    
    const result = await verifyUser(arg, fix);
    
    if (result) {
        console.log(`\n📌 Résumé:`);
        console.log(`  Utilisateur: ${result.email || result.userId}`);
        console.log(`  Accès: ${result.hasAccess ? '✅ OUI' : '❌ NON'}`);
        console.log(`  Corrigé: ${result.fixed ? '✅ OUI' : '❌ NON'}`);
        
        if (result.issues.length > 0 && !result.fixed) {
            console.log(`\n⚠️  Pour corriger: relancez avec --fix`);
            console.log(`   node verify-advisor-access.js ${arg} --fix`);
        }
    }
    
    process.exit(result && result.hasAccess ? 0 : 1);
}

main().catch(error => {
    console.error('\n❌ Erreur fatale:', error);
    process.exit(1);
});
