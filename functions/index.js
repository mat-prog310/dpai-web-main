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
 */
async function verifyStripePayment(sessionId) {
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
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
    }
}

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
        await verifyStripePayment(sessionId);
        
        const { data: purchaseData, source, docRef } = await getPurchaseData(purchaseId, userId);
        const planId = paramPlanId || purchaseData.planId || 'pro';
        const isAnnual = paramIsAnnual !== undefined ? paramIsAnnual : (purchaseData.isAnnual || false);

        const result = await updateUserForSubscription(userId, planId, isAnnual);
        await updatePurchaseStatus(docRef, sessionId, source);

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
        await verifyStripePayment(sessionId);
        
        const { data: purchaseData, source, docRef } = await getPurchaseData(purchaseId, userId);
        const packId = paramPackId || purchaseData.packId;
        const tokenAmount = paramTokenAmount || purchaseData.tokenAmount || 0;

        await addTokensToUser(userId, tokenAmount);
        await updatePurchaseStatus(docRef, sessionId, source);

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

    if (!endpointSecret) {
        console.error('❌ [Stripe Webhook] Secret non configuré');
        return res.status(500).send('STRIPE_WEBHOOK_SECRET non défini');
    }

    let event;
    try {
        event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
        console.error('❌ Webhook Error:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Gestion des événements
    if (event.type === 'checkout.session.completed' || 
        event.type === 'payment_intent.succeeded' || 
        event.type === 'payment_link.payment_succeeded') {
        const obj = event.data.object;
        const stripeId = obj.id;
        let clientRef = {};

        try {
            // Checkout Sessions et PaymentIntents
            if (event.type === 'checkout.session.completed' || event.type === 'payment_intent.succeeded') {
                if (obj.client_reference_id) {
                    clientRef = JSON.parse(obj.client_reference_id);
                } else if (obj.metadata && (obj.metadata.client_reference_id || obj.metadata.purchase_id)) {
                    clientRef = JSON.parse(obj.metadata.client_reference_id || obj.metadata.purchase_id || '{}');
                }
            }
            // Payment Links
            else if (event.type === 'payment_link.payment_succeeded') {
                const metadata = obj.metadata || {};
                clientRef = {
                    userId: metadata.userId,
                    type: metadata.type,
                    purchaseId: metadata.purchaseId,
                    packId: metadata.packId,
                    tokenAmount: metadata.tokenAmount ? parseInt(metadata.tokenAmount) : 0,
                    planId: metadata.planId,
                    isAnnual: metadata.isAnnual === 'true' || metadata.isAnnual === true
                };
            }
        } catch (e) {
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
            if (type === 'subscription') {
                const planId = clientRef.planId || 'pro';
                const isAnnual = clientRef.isAnnual || false;

                await updateUserForSubscription(userId, planId, isAnnual);
                await updatePurchaseById(purchaseId, stripeId);

                console.log('✅ Webhook subscription traité pour:', userId, 'Plan:', planId);
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
        } catch (err) {
            console.error('❌ Erreur traitement webhook:', err);
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
