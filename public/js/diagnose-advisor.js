/**
 * Script de diagnostic pour le problème d'accès Conseiller IA
 * 
 * Ce script permet de :
 * 1. Vérifier si l'utilisateur actuel a bien accès au plan advisor
 * 2. Identifier exactement quels champs sont manquants ou incorrects
 * 3. Appliquer une correction automatique
 * 
 * Utilisation :
 *   - Inclure ce script dans conseiller-dpai.html OU
 *   - Exécuter les fonctions directement dans la console du navigateur
 */

// =============================================================================
// FONCTIONS DE DIAGNOSTIC
// =============================================================================

/**
 * Vérifier complètement l'accès advisor pour l'utilisateur connecté
 * Retourne un objet détaillé avec toutes les vérifications
 */
async function diagnoseAdvisorAccess() {
    const result = {
        timestamp: new Date().toISOString(),
        userId: null,
        userEmail: null,
        checks: {},
        issues: [],
        hasAccess: false,
        recommendations: []
    };

    try {
        // Attendre que Firebase et l'utilisateur soient prêts
        await waitForFirebaseReady();
        
        const user = firebase.auth().currentUser;
        if (!user) {
            result.issues.push('❌ AUCUN UTILISATEUR CONNECTÉ');
            return result;
        }

        result.userId = user.uid;
        result.userEmail = user.email;

        const db = firebase.firestore();
        const userDoc = await db.collection('users').doc(user.uid).get();
        
        if (!userDoc.exists) {
            result.issues.push('❌ UTILISATEUR NON TROUVÉ DANS FIRESTORE');
            return result;
        }

        const userData = userDoc.data();
        const now = new Date();

        // ===== VÉRIIFICATION 1: Plan principal =====
        const mainPlan = userData.subscription?.plan || userData.plan || 'free';
        result.checks.mainPlan = {
            expected: 'advisor',
            actual: mainPlan,
            passed: mainPlan === 'advisor',
            field: 'subscription.plan || plan'
        };
        if (!result.checks.mainPlan.passed) {
            result.issues.push(`❌ Plan principal incorrect: "${mainPlan}" (attendu: "advisor")`);
        }

        // ===== VÉRIIFICATION 2: TokenState plan =====
        const tokenStatePlan = userData.tokenState?.plan || 'non défini';
        result.checks.tokenStatePlan = {
            expected: 'advisor',
            actual: tokenStatePlan,
            passed: tokenStatePlan === 'advisor',
            field: 'tokenState.plan'
        };
        if (!result.checks.tokenStatePlan.passed) {
            result.issues.push(`❌ tokenState.plan incorrect: "${tokenStatePlan}" (attendu: "advisor")`);
        }

        // ===== VÉRIIFICATION 3: isPremium =====
        const isPremium = userData.isPremium || false;
        result.checks.isPremium = {
            expected: true,
            actual: isPremium,
            passed: isPremium === true,
            field: 'isPremium'
        };
        if (!result.checks.isPremium.passed) {
            result.issues.push('❌ isPremium est false (attendu: true)');
        }

        // ===== VÉRIIFICATION 4: hasAccessToPremiumSuggestions =====
        const hasPremiumSuggestions = userData.hasAccessToPremiumSuggestions;
        result.checks.hasPremiumSuggestions = {
            expected: true,
            actual: hasPremiumSuggestions,
            passed: hasPremiumSuggestions === true,
            field: 'hasAccessToPremiumSuggestions'
        };
        if (!result.checks.hasPremiumSuggestions.passed) {
            result.issues.push('❌ hasAccessToPremiumSuggestions est false/manquant (attendu: true)');
        }

        // ===== VÉRIIFICATION 5: hasAccessToAdvancedAnalytics =====
        const hasAdvancedAnalytics = userData.hasAccessToAdvancedAnalytics;
        result.checks.hasAdvancedAnalytics = {
            expected: true,
            actual: hasAdvancedAnalytics,
            passed: hasAdvancedAnalytics === true,
            field: 'hasAccessToAdvancedAnalytics'
        };
        if (!result.checks.hasAdvancedAnalytics.passed) {
            result.issues.push('❌ hasAccessToAdvancedAnalytics est false/manquant (attendu: true)');
        }

        // ===== VÉRIIFICATION 6: hasAccessToAPI =====
        const hasAPI = userData.hasAccessToAPI;
        result.checks.hasAPI = {
            expected: true,
            actual: hasAPI,
            passed: hasAPI === true,
            field: 'hasAccessToAPI'
        };
        if (!result.checks.hasAPI.passed) {
            result.issues.push('❌ hasAccessToAPI est false/manquant (attendu: true)');
        }

        // ===== VÉRIIFICATION 7: TokenState hasAccessToPremiumSuggestions =====
        const tokenStateHasPremium = userData.tokenState?.hasAccessToPremiumSuggestions;
        result.checks.tokenStateHasPremium = {
            expected: true,
            actual: tokenStateHasPremium,
            passed: tokenStateHasPremium === true,
            field: 'tokenState.hasAccessToPremiumSuggestions'
        };
        if (!result.checks.tokenStateHasPremium.passed) {
            result.issues.push('❌ tokenState.hasAccessToPremiumSuggestions est false/manquant');
        }

        // ===== VÉRIIFICATION 8: TokenState hasAccessToAdvancedAnalytics =====
        const tokenStateHasAdvanced = userData.tokenState?.hasAccessToAdvancedAnalytics;
        result.checks.tokenStateHasAdvanced = {
            expected: true,
            actual: tokenStateHasAdvanced,
            passed: tokenStateHasAdvanced === true,
            field: 'tokenState.hasAccessToAdvancedAnalytics'
        };
        if (!result.checks.tokenStateHasAdvanced.passed) {
            result.issues.push('❌ tokenState.hasAccessToAdvancedAnalytics est false/manquant');
        }

        // ===== VÉRIIFICATION 9: Tokens illimités =====
        const baseTokens = userData.tokenState?.baseTokens || userData.baseTokens || 0;
        const totalTokens = userData.tokenState?.totalTokens || userData.totalTokens || 0;
        const availableTokens = userData.tokenState?.availableTokens || userData.availableTokens || 0;
        
        result.checks.unlimitedTokens = {
            expected: -1,
            actual: { baseTokens, totalTokens, availableTokens },
            passed: baseTokens === -1 && totalTokens === -1 && availableTokens === -1,
            field: 'baseTokens, totalTokens, availableTokens'
        };
        if (!result.checks.unlimitedTokens.passed) {
            result.issues.push(`❌ Tokens non illimités: base=${baseTokens}, total=${totalTokens}, available=${availableTokens} (attendu: -1 pour tous)`);
        }

        // ===== VÉRIIFICATION 10: Expiration =====
        let isExpired = false;
        if (userData.subscription?.expiresAt) {
            const expiryDate = new Date(userData.subscription.expiresAt);
            if (expiryDate < now) {
                isExpired = true;
                result.checks.expiration = {
                    expected: 'non expiré',
                    actual: 'EXPIRÉ',
                    passed: false,
                    field: 'subscription.expiresAt',
                    expiryDate: expiryDate.toLocaleString('fr-FR')
                };
                result.issues.push(`❌ ABONNEMENT EXPIRÉ depuis le ${expiryDate.toLocaleDateString('fr-FR')}`);
            } else {
                result.checks.expiration = {
                    expected: 'non expiré',
                    actual: 'valide',
                    passed: true,
                    field: 'subscription.expiresAt',
                    expiryDate: expiryDate.toLocaleString('fr-FR')
                };
            }
        } else {
            result.checks.expiration = {
                expected: 'non expiré',
                actual: 'pas de date',
                passed: true,
                field: 'subscription.expiresAt'
            };
        }

        // ===== VÉRIIFICATION 11: TokenManager (si initialisé) =====
        if (typeof TokenManager !== 'undefined' && TokenManager.tokenState) {
            result.checks.tokenManager = {
                plan: TokenManager.tokenState.plan,
                hasPremiumSuggestions: TokenManager.tokenState.hasAccessToPremiumSuggestions,
                hasAdvancedAnalytics: TokenManager.tokenState.hasAccessToAdvancedAnalytics,
                isAdvisorAllowed: TokenManager.isAdvisorAllowed ? TokenManager.isAdvisorAllowed() : 'N/A'
            };
            
            if (TokenManager.tokenState.plan !== 'advisor') {
                result.issues.push(`❌ TokenManager.tokenState.plan = "${TokenManager.tokenState.plan}" (attendu: "advisor")`);
            }
            if (TokenManager.tokenState.hasAccessToPremiumSuggestions !== true) {
                result.issues.push('❌ TokenManager.tokenState.hasAccessToPremiumSuggestions est false');
            }
        } else {
            result.checks.tokenManager = { status: 'non initialisé' };
            result.issues.push('⚠️ TokenManager non initialisé');
        }

        // ===== DÉTERMINER SI L'UTILISATEUR A ACCÈS =====
        // L'utilisateur a accès si :
        // 1. Le plan est 'advisor' (dans subscription OU tokenState OU plan racine)
        // 2. Pas d'expiration
        // 3. Au moins un des flags d'accès est true
        const hasPlanAdvisor = mainPlan === 'advisor' || tokenStatePlan === 'advisor';
        const hasAnyAccessFlag = hasPremiumSuggestions === true || hasAdvancedAnalytics === true || tokenStateHasPremium === true || tokenStateHasAdvanced === true;
        const hasTokensUnlimited = baseTokens === -1 && totalTokens === -1;
        
        result.hasAccess = hasPlanAdvisor && !isExpired && (hasAnyAccessFlag || hasTokensUnlimited);

        if (!result.hasAccess) {
            if (!hasPlanAdvisor) {
                result.recommendations.push('✅ CHANGER LE PLAN: Mettez à jour subscription.plan ET tokenState.plan à "advisor" dans Firestore');
            }
            if (!hasAnyAccessFlag) {
                result.recommendations.push('✅ CORRIGER LES FLAGS: Exécutez fixCurrentUserAdvisorFlags() dans la console');
            }
            if (isExpired) {
                result.recommendations.push('✅ RENOUVELER: Mettez à jour subscription.expiresAt à une date future + 30 jours');
            }
            if (!hasTokensUnlimited) {
                result.recommendations.push('✅ TOKENS: Mettez baseTokens, totalTokens, availableTokens à -1');
            }
        } else {
            result.recommendations.push('✅ ACCÈS CONFIRMÉ: Vous devriez avoir accès. Essayez de recharger la page (Ctrl+F5)');
            result.recommendations.push('✅ Si toujours bloqué: Videz le cache du navigateur ou essayez en navigation privée');
        }

        return result;

    } catch (error) {
        result.issues.push(`❌ ERREUR: ${error.message}`);
        console.error('Diagnostic error:', error);
        return result;
    }
}

/**
 * Afficher le diagnostic dans un format lisible
 */
async function displayDiagnosis() {
    const diagnosis = await diagnoseAdvisorAccess();
    
    console.log('\n' + '='.repeat(80));
    console.log('🔍 DIAGNOSTIC D\'ACCÈS CONSEILLER IA');
    console.log('='.repeat(80));
    console.log(`Utilisateur: ${diagnosis.userEmail || diagnosis.userId || 'Non connecté'}`);
    console.log(`Date: ${diagnosis.timestamp}`);
    console.log('');

    if (diagnosis.issues.length === 0) {
        console.log('%c✅ AUCUN PROBLÈME DÉTECTÉ!', 'color: green; font-weight: bold; font-size: 16px;');
        console.log('');
        console.log('Statut: ACCÈS AUTORISÉ ✅');
    } else {
        console.log('%c❌ PROBLÈMES DÉTECTÉS:', 'color: red; font-weight: bold; font-size: 16px;');
        console.log('');
        diagnosis.issues.forEach(issue => console.log(`  ${issue}`));
        console.log('');
    }

    console.log('📋 VÉRIIFICATIONS:');
    console.log('-'.repeat(80));
    Object.entries(diagnosis.checks).forEach(([key, check]) => {
        const status = check.passed !== undefined && check.passed ? '✅' : check.passed !== undefined ? '❌' : 'ℹ️';
        const color = check.passed !== undefined && check.passed ? 'green' : check.passed !== undefined ? 'red' : 'blue';
        console.log(`  ${status} ${key}: %c${JSON.stringify(check.actual)}%c (attendu: ${JSON.stringify(check.expected)})`, `color: ${color}`, 'color: inherit');
    });
    console.log('');

    if (diagnosis.recommendations.length > 0) {
        console.log('%c💡 RECOMMANDATIONS:', 'color: #FF9800; font-weight: bold; font-size: 16px;');
        console.log('');
        diagnosis.recommendations.forEach((rec, index) => {
            console.log(`  ${index + 1}. ${rec}`);
        });
        console.log('');
    }

    console.log('📊 STATUT FINAL:');
    console.log(`  Accès au Conseiller IA: %c${diagnosis.hasAccess ? '✅ OUI' : '❌ NON'}%c`, diagnosis.hasAccess ? 'color: green; font-weight: bold;' : 'color: red; font-weight: bold;', 'color: inherit');
    console.log('');
    console.log('='.repeat(80) + '\n');

    return diagnosis;
}

// =============================================================================
// FONCTIONS DE CORRECTION
// =============================================================================

/**
 * Correction complète pour l'utilisateur actuel
 */
async function fixMyAdvisorAccess() {
    const diagnosis = await diagnoseAdvisorAccess();
    
    if (diagnosis.issues.length === 0) {
        console.log('%c✅ Aucune correction nécessaire!', 'color: green; font-weight: bold;');
        return { success: true, message: 'Accès déjà correctement configuré' };
    }

    const user = firebase.auth().currentUser;
    if (!user) {
        return { success: false, message: 'Aucun utilisateur connecté' };
    }

    const db = firebase.firestore();
    const userRef = db.collection('users').doc(user.uid);
    
    // Calculer la date d'expiration (30 jours à partir de maintenant)
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30);
    const now = new Date();

    // Mise à jour complète avec tous les champs nécessaires
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
            userId: user.uid,
            plan: 'advisor',
            baseTokens: -1,
            bonusTokens: 0,
            totalTokens: -1,
            availableTokens: -1,
            usedTokens: 0,
            lastTokenUpdate: now.toISOString(),
            firstAnalysisDone: false,
            monthlyTokensUsed: 0,
            lastMonthlyReset: now.toISOString(),
            expiresAt: expiryDate.toISOString(),
            isExpired: false,
            hasAccessToAPI: true,
            hasAccessToAdvancedAnalytics: true,
            hasAccessToPremiumSuggestions: true
        }
    };

    try {
        console.log('🔧 Application des corrections...');
        await userRef.update(updates);
        
        console.log('%c✅ CORRECTION RÉUSSIE!', 'color: green; font-weight: bold;');
        console.log('');
        console.log('Champs mis à jour:');
        console.log('  ✓ subscription.plan = advisor');
        console.log('  ✓ tokenState.plan = advisor');
        console.log('  ✓ hasAccessToAPI = true');
        console.log('  ✓ hasAccessToAdvancedAnalytics = true');
        console.log('  ✓ hasAccessToPremiumSuggestions = true');
        console.log('  ✓ Tokens: illimités (-1)');
        console.log('  ✓ Expiration: +30 jours');
        console.log('');
        console.log('🔄 RECHARGEZ LA PAGE (Ctrl+F5) pour appliquer les changements!');
        
        // Recharger TokenManager si possible
        if (typeof TokenManager !== 'undefined') {
            const userDoc = await userRef.get();
            if (userDoc.exists) {
                TokenManager.init(userDoc.data());
                console.log('✅ TokenManager rechargé');
            }
        }

        return { 
            success: true, 
            message: '✅ Tous les champs advisor ont été corrigés! Rechargez la page.',
            updates: Object.keys(updates)
        };

    } catch (error) {
        console.error('%c❌ ERREUR lors de la correction:', 'color: red; font-weight: bold;', error);
        return { 
            success: false, 
            message: `Erreur: ${error.message}`,
            error: error
        };
    }
}

/**
 * Vérification rapide: ai-je accès?
 */
async function quickCheck() {
    const diagnosis = await diagnoseAdvisorAccess();
    const status = diagnosis.hasAccess ? '✅ OUI - Vous avez accès!' : '❌ NON - Accès refusé';
    const color = diagnosis.hasAccess ? 'green' : 'red';
    console.log(`%c🎯 Accès Conseiller IA: ${status}`, `color: ${color}; font-weight: bold; font-size: 16px;`);
    return diagnosis.hasAccess;
}

// =============================================================================
// FONCTION UTILITAIRE
// =============================================================================

function waitForFirebaseReady() {
    return new Promise((resolve) => {
        const check = () => {
            if (typeof firebase !== 'undefined' && 
                firebase.auth && 
                firebase.firestore && 
                firebase.auth().currentUser) {
                resolve();
            } else {
                setTimeout(check, 100);
            }
        };
        check();
        setTimeout(resolve, 10000); // Timeout après 10 secondes
    });
}

// =============================================================================
// EXPORT POUR LA CONSOLE
// =============================================================================

if (typeof window !== 'undefined') {
    // Exposer les fonctions globalement
    window.diagnoseAdvisorAccess = diagnoseAdvisorAccess;
    window.displayDiagnosis = displayDiagnosis;
    window.fixMyAdvisorAccess = fixMyAdvisorAccess;
    window.quickCheck = quickCheck;

    // Ajouter un message utile
    console.log('%c🔧 [Diagnose Advisor] Script chargé!', 'color: #2196F3; font-weight: bold;');
    console.log('%c📋 Pour diagnostiquer: executez displayDiagnosis()', 'color: #4CAF50;');
    console.log('%c🔧 Pour corriger: executez fixMyAdvisorAccess()', 'color: #FF9800;');
    console.log('%c⚡ Vérification rapide: quickCheck()', 'color: #9C27B0;');
}
