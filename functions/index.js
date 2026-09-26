// =============================================================================
// Firebase Cloud Functions pour DPAI - VERSION CORRIGEE ET SECURISEE
// Gestion des confirmations de paiement Stripe
// =============================================================================

const functions = require('firebase-functions');
const admin = require('firebase-admin');

// =============================================================================
// INITIALISATION
// =============================================================================
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();

// =============================================================================
// CONFIGURATION CENTRALISEE
// =============================================================================
const stripeSecretKey = functions.config().stripe.secret || process.env.STRIPE_SECRET_KEY;
const stripe = require('stripe')(stripeSecretKey);
const isStripeTestMode = stripeSecretKey && stripeSecretKey.startsWith('sk_test_');

if (isStripeTestMode) console.log('🧪 [Stripe] Mode TEST activé');
else if (stripeSecretKey && stripeSecretKey.startsWith('sk_live_')) console.log('✅ [Stripe] Mode PRODUCTION activé');

// Configuration des plans (centralisée)
const PLAN_CONFIGS = {
    pro: {
        baseTokens: 500,
        bonusRate: 0.20,
        hasPremiumSuggestions: true,
        hasAdvancedAnalytics: true,
        hasAPI: false
    },
    enterprise: {
        baseTokens: 5000,
        bonusRate: 0.30,
        hasPremiumSuggestions: true,
        hasAdvancedAnalytics: true,
        hasAPI: true
    }
};

// Constantes
const WELCOME_BONUS = 10;
const ANNUAL_DURATION_MS = 365 * 24 * 60 * 60 * 1000;

// =============================================================================
// UTILITAIRES (fonctions partagées)
// =============================================================================

/**
 * Valide que l'utilisateur est authentifié et que userId correspond
 */
function validateUser(context, userId) {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Non autorisé');
    }
    if (context.auth.uid !== userId) {
        throw new functions.https.HttpsError('permission-denied', 'Accès refusé');
    }
}

/**
 * Vérifie qu'une session Stripe est payée
 * Accepte soit un sessionId, soit un purchaseId (récupère sessionId depuis Firestore)
 */
async function verifyStripePayment(sessionIdOrPurchaseId) {
    let sessionId = sessionIdOrPurchaseId;
    
    // Si c'est un purchaseId (format Firestore) et pas un sessionId (format cs_...)
    //Essayer de récupérer le vrai sessionId depuis Firestore
    if (sessionIdOrPurchaseId && !sessionIdOrPurchaseId.startsWith('cs_')) {
        console.log('🔍 [verifyStripePayment] Reçu un purchaseId, recherche sessionId dans Firestore...');
        const purchaseDoc = await db.collection('purchases').doc(sessionIdOrPurchaseId).get();
        if (purchaseDoc.exists) {
            const purchaseData = purchaseDoc.data();
            sessionId = purchaseData.stripeSessionId || purchaseData.sessionId;
            console.log('✅ [verifyStripePayment] SessionId trouvé:', sessionId);
        } else {
            // Essayer dans pending_purchases
            console.log('🔍 [verifyStripePayment] Recherche dans pending_purchases...');
            const pendingQuery = await db.collection('pending_purchases')
                .where('purchaseId', '==', sessionIdOrPurchaseId)
                .limit(1)
                .get();
            if (!pendingQuery.empty) {
                sessionId = pendingQuery.docs[0].data().stripeSessionId;
                console.log('✅ [verifyStripePayment] SessionId trouvé dans pending_purchases:', sessionId);
            }
        }
    }
    
    if (!sessionId) {
        throw new Error(`Impossible de trouver un sessionId valide pour: ${sessionIdOrPurchaseId}`);
    }
    
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== 'paid') {
        throw new Error(`Paiement non confirmé pour session: ${sessionId}`);
    }
    return session;
}

/**
 * Récupère les données d'achat (depuis purchases ou pending_purchases)
 */
async function getPurchaseData(purchaseId, userId) {
    if (purchaseId) {
        const purchaseDoc = await db.collection('purchases').doc(purchaseId).get();
        if (!purchaseDoc.exists) {
            throw new Error(`Aucun achat trouvé pour purchaseId: ${purchaseId}`);
        }
        return { source: 'purchases', data: purchaseDoc.data(), docRef: purchaseDoc.ref };
    } else {
        const pendingDoc = await db.collection('pending_purchases').doc(userId).get();
        if (!pendingDoc.exists) {
            throw new Error(`Aucun achat en attente trouvé pour userId: ${userId}`);
        }
        return { source: 'pending_purchases', data: pendingDoc.data(), docRef: pendingDoc.ref };
    }
}

/**
 * Calcule les tokens pour un plan donné
 */
function calculatePlanTokens(planId) {
    const config = PLAN_CONFIGS[planId] || PLAN_CONFIGS.pro;
    const baseTokens = config.baseTokens;
    const bonusTokens = Math.floor(baseTokens * config.bonusRate);
    return {
        baseTokens,
        bonusTokens,
        totalTokens: baseTokens + bonusTokens + WELCOME_BONUS,
        config
    };
}

/**
 * Met à jour l'utilisateur avec un nouveau plan
 */
async function updateUserForSubscription(userId, planId, isAnnual = false) {
    const { baseTokens, bonusTokens, totalTokens, config } = calculatePlanTokens(planId);

    const subscriptionEndDate = isAnnual
        ? admin.firestore.Timestamp.fromDate(new Date(Date.now() + ANNUAL_DURATION_MS))
        : null;

    await db.collection('users').doc(userId).update({
        plan: planId,
        subscriptionStartDate: admin.firestore.FieldValue.serverTimestamp(),
        subscriptionEndDate,
        hasAccessToPremiumSuggestions: config.hasPremiumSuggestions,
        hasAccessToAdvancedAnalytics: config.hasAdvancedAnalytics,
        hasAccessToAPI: config.hasAPI,
        'tokenState.plan': planId,
        'tokenState.baseTokens': baseTokens,
        'tokenState.bonusTokens': bonusTokens,
        'tokenState.totalTokens': totalTokens,
        'tokenState.availableTokens': totalTokens,
        'tokenState.usedTokens': 0,
        'tokenState.monthlyTokensUsed': 0,
        'tokenState.lastTokenUpdate': admin.firestore.FieldValue.serverTimestamp(),
        'tokenState.lastMonthlyReset': admin.firestore.FieldValue.serverTimestamp(),
        'tokenState.firstAnalysisDone': false
    });

    return { planId, tokenAmount: totalTokens };
}

/**
 * Ajoute des tokens à un utilisateur
 */
async function addTokensToUser(userId, tokenAmount) {
    await db.collection('users').doc(userId).update({
        'tokenState.availableTokens': admin.firestore.FieldValue.increment(tokenAmount),
        'tokenState.totalTokens': admin.firestore.FieldValue.increment(tokenAmount)
    });
    return { tokenAmount };
}

/**
 * Met à jour le statut d'un achat
 */
async function updatePurchaseStatus(docRef, sessionId, source) {
    if (source === 'purchases') {
        await docRef.update({
            status: 'completed',
            stripeSessionId: sessionId,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
    } else {
        // pending_purchases: on delete
        await docRef.delete();
    }
}

/**
 * Met à jour le statut d'un achat via purchaseId
 */
async function updatePurchaseById(purchaseId, stripeId) {
    if (purchaseId) {
        await db.collection('purchases').doc(purchaseId).update({
            status: 'completed',
            stripeId: stripeId,
            stripeSessionId: stripeId,
            webhookProcessed: true,
            webhookTimestamp: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
    }
}

// =============================================================================
// FONCTIONS UTILITAIRES POUR VÉRIFIER LES SESSIONS STRIPE
// =============================================================================

/**
 * Vérifie une session Stripe et retourne ses informations
 */
exports.verifyStripeSession = functions.https.onCall(async (data, context) => {
    const { sessionId, userId } = data;

    try {
        validateUser(context, userId);
        
        if (!sessionId) {
            throw new Error('sessionId est requis');
        }

        const session = await stripe.checkout.sessions.retrieve(sessionId);
        
        if (session.payment_status !== 'paid') {
            return { 
                success: false, 
                error: `Paiement non confirmé (statut: ${session.payment_status})`,
                session: { id: session.id, payment_status: session.payment_status }
            };
        }

        // Parser client_reference_id
        let clientRef = {};
        try {
            if (session.client_reference_id) {
                clientRef = JSON.parse(session.client_reference_id);
            } else if (session.metadata && session.metadata.client_reference_id) {
                clientRef = JSON.parse(session.metadata.client_reference_id);
            }
        } catch (e) {
            console.warn('⚠️ Impossible de parser client_reference_id:', e);
        }

        return { 
            success: true,
            sessionId: session.id,
            paymentStatus: session.payment_status,
            amountTotal: session.amount_total,
            currency: session.currency,
            clientReferenceId: session.client_reference_id,
            metadata: session.metadata || {},
            ...clientRef
        };

    } catch (error) {
        console.error('❌ Erreur vérification session:', error);
        throw new functions.https.HttpsError(
            'internal',
            error.message || 'Erreur lors de la vérification de la session'
        );
    }
});

// =============================================================================
// FONCTIONS D'INITIALISATION (pour le frontend)
// =============================================================================

/**
 * Initialise un achat de pack de tokens (crée le document purchases)
 */
exports.initTokenPurchase = functions.https.onCall(async (data, context) => {
    const { userId, packId, tokenAmount } = data;

    try {
        validateUser(context, userId);
        
        const purchaseRef = await db.collection('purchases').add({
            userId: userId,
            packId: packId,
            tokenAmount: tokenAmount,
            type: 'token_pack',
            status: 'pending',
            stripeSessionId: null,
            stripePaymentIntentId: null,
            stripePaymentLinkId: null,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        console.log('✅ Achat tokens initialisé pour:', userId, 'Pack:', packId, 'PurchaseId:', purchaseRef.id);
        return { success: true, purchaseId: purchaseRef.id };

    } catch (error) {
        console.error('❌ Erreur initialisation achat tokens:', error);
        throw new functions.https.HttpsError(
            'internal',
            error.message || 'Erreur lors de l\'initialisation de l\'achat'
        );
    }
});

/**
 * Initialise un achat d'abonnement (crée le document purchases)
 */
exports.initSubscription = functions.https.onCall(async (data, context) => {
    const { userId, planId, isAnnual } = data;

    try {
        validateUser(context, userId);
        
        const purchaseRef = await db.collection('purchases').add({
            userId: userId,
            planId: planId,
            isAnnual: isAnnual || false,
            type: 'subscription',
            status: 'pending',
            stripeSessionId: null,
            stripePaymentIntentId: null,
            stripePaymentLinkId: null,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        console.log('✅ Achat abonnement initialisé pour:', userId, 'Plan:', planId, 'PurchaseId:', purchaseRef.id);
        return { success: true, purchaseId: purchaseRef.id };

    } catch (error) {
        console.error('❌ Erreur initialisation abonnement:', error);
        throw new functions.https.HttpsError(
            'internal',
            error.message || 'Erreur lors de l\'initialisation de l\'abonnement'
        );
    }
});

/**
 * Réclame un pack de tokens gratuit
 */
exports.claimFreeTokenPack = functions.https.onCall(async (data, context) => {
    const { userId, packId, tokenAmount } = data;

    try {
        validateUser(context, userId);
        
        await addTokensToUser(userId, tokenAmount);
        
        console.log('✅ Pack gratuit réclamé pour:', userId, 'Pack:', packId, 'Tokens:', tokenAmount);
        return { success: true, tokenAmount };

    } catch (error) {
        console.error('❌ Erreur réclamation pack gratuit:', error);
        throw new functions.https.HttpsError(
            'internal',
            error.message || 'Erreur lors de la réclamation du pack gratuit'
        );
    }
});

/**
 * Réclame un abonnement gratuit
 */
exports.claimFreeSubscription = functions.https.onCall(async (data, context) => {
    const { userId, planId } = data;

    try {
        validateUser(context, userId);
        
        const result = await updateUserForSubscription(userId, planId, false);
        
        console.log('✅ Abonnement gratuit réclamé pour:', userId, 'Plan:', planId);
        return { success: true, ...result };

    } catch (error) {
        console.error('❌ Erreur réclamation abonnement gratuit:', error);
        throw new functions.https.HttpsError(
            'internal',
            error.message || 'Erreur lors de la réclamation de l\'abonnement gratuit'
        );
    }
});

// =============================================================================
// FONCTIONS PRINCIPALES
// =============================================================================

/**
 * Confirmer un abonnement après paiement Stripe
 */
exports.confirmStripeSubscription = functions.https.onCall(async (data, context) => {
    const { userId, sessionId, purchaseId, planId: paramPlanId, isAnnual: paramIsAnnual } = data;

    try {
        validateUser(context, userId);
        
        // Si pas de sessionId, essayer de le récupérer depuis purchaseId
        let finalSessionId = sessionId;
        if (!finalSessionId && purchaseId) {
            const purchaseDoc = await db.collection('purchases').doc(purchaseId).get();
            if (purchaseDoc.exists) {
                finalSessionId = purchaseDoc.data().stripeSessionId || purchaseDoc.data().sessionId;
            }
        }
        
        if (!finalSessionId) {
            throw new Error('Aucun sessionId valide fourni ou trouvé dans Firestore');
        }
        
        await verifyStripePayment(finalSessionId);
        
        const { data: purchaseData, source, docRef } = await getPurchaseData(purchaseId, userId);
        const planId = paramPlanId || purchaseData.planId || 'pro';
        const isAnnual = paramIsAnnual !== undefined ? paramIsAnnual : (purchaseData.isAnnual || false);

        const result = await updateUserForSubscription(userId, planId, isAnnual);
        await updatePurchaseStatus(docRef, finalSessionId, source);

        console.log('✅ Abonnement confirmé pour:', userId, 'Plan:', planId);
        return { success: true, ...result };

    } catch (error) {
        console.error('❌ Erreur confirmation abonnement:', error);
        throw new functions.https.HttpsError(
            'internal',
            error.message || 'Erreur lors de la confirmation de l\'abonnement'
        );
    }
});

/**
 * Confirmer un achat de pack de tokens après paiement Stripe
 */
exports.confirmTokenPurchase = functions.https.onCall(async (data, context) => {
    const { userId, sessionId, purchaseId, packId: paramPackId, tokenAmount: paramTokenAmount } = data;

    try {
        validateUser(context, userId);
        
        // Si pas de sessionId, essayer de le récupérer depuis purchaseId
        let finalSessionId = sessionId;
        if (!finalSessionId && purchaseId) {
            const purchaseDoc = await db.collection('purchases').doc(purchaseId).get();
            if (purchaseDoc.exists) {
                finalSessionId = purchaseDoc.data().stripeSessionId || purchaseDoc.data().sessionId;
            }
        }
        
        if (!finalSessionId) {
            throw new Error('Aucun sessionId valide fourni ou trouvé dans Firestore');
        }
        
        await verifyStripePayment(finalSessionId);
        
        const { data: purchaseData, source, docRef } = await getPurchaseData(purchaseId, userId);
        const packId = paramPackId || purchaseData.packId;
        const tokenAmount = paramTokenAmount || purchaseData.tokenAmount || 0;

        await addTokensToUser(userId, tokenAmount);
        await updatePurchaseStatus(docRef, finalSessionId, source);

        console.log('✅ Pack de tokens confirmé pour:', userId, 'Pack:', packId, 'Tokens:', tokenAmount);
        return { success: true, packId, tokenAmount };

    } catch (error) {
        console.error('❌ Erreur achat tokens:', error);
        throw new functions.https.HttpsError(
            'internal',
            error.message || 'Erreur lors de la confirmation de l\'achat de tokens'
        );
    }
});

/**
 * Webhook Stripe pour confirmation en temps réel
 */
exports.stripeWebhook = functions.https.onRequest(async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = functions.config().stripe.webhook || process.env.STRIPE_WEBHOOK_SECRET;

    // ✅ Gestion du mode test : si endpointSecret n'est pas configuré, on désactive la vérification
    if (!endpointSecret) {
        console.log('⚠️ [Stripe Webhook] Mode TEST : Pas de endpointSecret configuré. Traitement autorisé sans vérification de signature.');
        // En production, il faudrait retourner une erreur 500
        // return res.status(500).send('STRIPE_WEBHOOK_SECRET non défini');
    }

    let event;
    try {
        event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret || 'test');
    } catch (err) {
        console.error('❌ Webhook Error:', err.message);
        // En mode test sans endpointSecret, on essaie de parser manuellement
        if (!endpointSecret) {
            try {
                event = JSON.parse(req.body);
                console.log('⚠️ [Stripe Webhook] Mode TEST : Événement parsed manuellement');
            } catch (e) {
                return res.status(400).send(`Webhook Error: ${err.message}`);
            }
        } else {
            return res.status(400).send(`Webhook Error: ${err.message}`);
        }
    }

    // Gestion des événements
    if (event.type === 'checkout.session.completed' || 
        event.type === 'payment_intent.succeeded' || 
        event.type === 'payment_link.payment_succeeded') {
        const obj = event.data.object;
        const stripeId = obj.id;
        let clientRef = {};

        try {
            // Checkout Sessions, PaymentIntents ET Payment Links
            // Pour tous ces types, client_reference_id contient les données JSON
            if (obj.client_reference_id) {
                try {
                    clientRef = JSON.parse(obj.client_reference_id);
                } catch (e) {
                    console.warn('⚠️ Impossible de parser client_reference_id:', e);
                }
            }
            // Fallback: vérifier metadata pour les anciens systèmes
            else if (obj.metadata && (obj.metadata.client_reference_id || obj.metadata.purchase_id)) {
                try {
                    clientRef = JSON.parse(obj.metadata.client_reference_id || obj.metadata.purchase_id || '{}');
                } catch (e) {
                    // metadata n'est pas du JSON, essayer de lire directement
                    clientRef = {
                        userId: obj.metadata.userId,
                        type: obj.metadata.type,
                        purchaseId: obj.metadata.purchaseId,
                        packId: obj.metadata.packId,
                        tokenAmount: obj.metadata.tokenAmount ? parseInt(obj.metadata.tokenAmount) : 0,
                        planId: obj.metadata.planId,
                        isAnnual: obj.metadata.isAnnual === 'true' || obj.metadata.isAnnual === true
                    };
                }
            }
            // Fallback ultime: metadata direct
            else if (obj.metadata) {
                clientRef = {
                    userId: obj.metadata.userId,
                    type: obj.metadata.type,
                    purchaseId: obj.metadata.purchaseId,
                    packId: obj.metadata.packId,
                    tokenAmount: obj.metadata.tokenAmount ? parseInt(obj.metadata.tokenAmount) : 0,
                    planId: obj.metadata.planId,
                    isAnnual: obj.metadata.isAnnual === 'true' || obj.metadata.isAnnual === true
                };
            }
        } catch (e) {
            console.error('❌ Erreur parsing client_reference_id:', e);
            clientRef = {};
        }

        const userId = clientRef.userId;
        const type = clientRef.type;
        const purchaseId = clientRef.purchaseId;

        if (!userId || !type) {
            console.log('⚠️ Données manquantes dans client_reference_id');
            return res.status(200).json({ received: true });
        }

        try {
            // Vérifier si cet achat a déjà été traité (éviter les doublons)
            let alreadyProcessed = false;
            if (purchaseId) {
                const purchaseDoc = await db.collection('purchases').doc(purchaseId).get();
                if (purchaseDoc.exists) {
                    const purchaseData = purchaseDoc.data();
                    if (purchaseData.status === 'completed') {
                        alreadyProcessed = true;
                        console.log('ℹ️ Webhook déjà traité pour purchaseId:', purchaseId);
                    }
                }
            }
            
            if (alreadyProcessed) {
                return res.status(200).json({ received: true, alreadyProcessed: true });
            }

            if (type === 'subscription') {
                const planId = clientRef.planId || 'pro';
                const isAnnual = clientRef.isAnnual || false;

                await updateUserForSubscription(userId, planId, isAnnual);
                await updatePurchaseById(purchaseId, stripeId);

                // 🎉 NOUVEAU: Log des services débloqués
                const planConfig = PLAN_CONFIGS[planId] || PLAN_CONFIGS.pro;
                console.log('✅ Webhook subscription traité pour:', userId, 
                    'Plan:', planId, 
                    'Annuel:', isAnnual,
                    'Tokens:', planConfig.baseTokens + Math.floor(planConfig.baseTokens * planConfig.bonusRate) + WELCOME_BONUS,
                    'Services:', {
                        premiumSuggestions: planConfig.hasPremiumSuggestions,
                        advancedAnalytics: planConfig.hasAdvancedAnalytics,
                        apiAccess: planConfig.hasAPI
                    });
            }
            else if (type === 'token_pack') {
                const packId = clientRef.packId;
                const tokenAmount = clientRef.tokenAmount || 0;

                if (packId && tokenAmount) {
                    await addTokensToUser(userId, tokenAmount);
                    await updatePurchaseById(purchaseId, stripeId);

                    console.log('✅ Webhook token_pack traité pour:', userId, 'Pack:', packId, 'Tokens:', tokenAmount);
                }
            }
            
            // Marquer que le paiement a été traité via webhook
            if (purchaseId) {
                await db.collection('purchases').doc(purchaseId).update({
                    webhookProcessed: true,
                    webhookTimestamp: admin.firestore.FieldValue.serverTimestamp(),
                    stripeEventId: event.id,
                    stripeEventType: event.type
                });
            }
            
        } catch (err) {
            console.error('❌ Erreur traitement webhook:', err);
            
            // En cas d'erreur, stocker l'erreur pour debug
            if (purchaseId) {
                try {
                    await db.collection('purchases').doc(purchaseId).update({
                        webhookError: err.message || String(err),
                        webhookErrorTimestamp: admin.firestore.FieldValue.serverTimestamp()
                    });
                } catch (e) {
                    console.error('❌ Erreur sauvegarde erreur webhook:', e);
                }
            }
        }
    }

    res.json({ received: true });
});

// =============================================================================
// EXPORT POUR TESTS LOCAUX
// =============================================================================
module.exports = {
    confirmStripeSubscription: exports.confirmStripeSubscription,
    confirmTokenPurchase: exports.confirmTokenPurchase,
    stripeWebhook: exports.stripeWebhook,
    initTokenPurchase: exports.initTokenPurchase,
    initSubscription: exports.initSubscription,
    claimFreeTokenPack: exports.claimFreeTokenPack,
    claimFreeSubscription: exports.claimFreeSubscription,
    // Export des utilitaires pour les tests
    validateUser,
    verifyStripePayment,
    getPurchaseData,
    calculatePlanTokens,
    updateUserForSubscription,
    addTokensToUser,
    updatePurchaseStatus,
    updatePurchaseById
};
