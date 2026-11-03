/**
 * Firebase Cloud Functions pour DPAI Web
 * Gère l'IA locale, la gestion des utilisateurs, et les services premium
 * 
 * CORRIGÉ : Ajout du middleware CORS et intégration IA locale
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors')({origin: true});
const {defineSecret} = require('firebase-functions/params');
const stripeSecretKey = defineSecret('STRIPE_SECRET_KEY');
const stripeWebhookSecret = defineSecret('STRIPE_WEBHOOK_SECRET');

// Initialiser Firebase Admin
if (!admin.apps.length) {
    admin.initializeApp();
}

const db = admin.firestore();
const {runAIAnalysis, advisorChat} = require('./src/ai-integration');

// Configuration des plans
const PLAN_CONFIGS = {
    free: {
        name: 'Gratuit',
        baseTokens: 500,
        hasAI: false,
        hasAdvisor: false,
        price: 0,
        isPremium: false
    },
    api_monthly: {
        name: 'API Mensuel',
        baseTokens: 1000,
        hasAI: true,
        hasAdvisor: false,
        price: 199,
        isPremium: true
    },
    advisor: {
        name: 'DPAI Premium',
        baseTokens: -1,
        hasAI: true,
        hasAdvisor: true,
        price: 199,
        isPremium: true
    }
};

const TRIAL_DAYS = 7;
const PREMIUM_PLAN = 'advisor';
const PREMIUM_PRICE_EUR = 199;

function getStripe() {
    const secretKey = process.env.STRIPE_SECRET_KEY || stripeSecretKey.value();
    if (!secretKey) {
        throw new Error('Stripe n’est pas configuré.');
    }
    const Stripe = require('stripe');
    return new Stripe(secretKey);
}

function getAuthenticatedUserId(req) {
    const authorization = req.headers.authorization || '';
    const idToken = authorization.startsWith('Bearer ') ? authorization.slice(7) : null;
    if (!idToken) {
        throw new Error('Token Firebase manquant.');
    }
    return admin.auth().verifyIdToken(idToken).then(decodedToken => decodedToken.uid);
}

function getSubscriptionAccess(userData) {
    const subscription = userData.subscription || {};
    const expiry = subscription.expiresAt || subscription.trialEndsAt;
    const expiryDate = expiry?.toDate ? expiry.toDate() : (expiry ? new Date(expiry) : null);
    const active = ['active', 'trialing'].includes(subscription.status);
    return active && (!expiryDate || expiryDate > new Date());
}

exports.validateAIEntitlement = functions.https.onRequest((req, res) => {
    cors(req, res, async () => {
        if (req.method !== 'POST') {
            res.status(405).json({success: false, error: 'Method not allowed'});
            return;
        }
        try {
            const userId = await getAuthenticatedUserId(req);
            const userDoc = await db.collection('users').doc(userId).get();
            if (!userDoc.exists || !getSubscriptionAccess(userDoc.data())) {
                res.status(403).json({success: false, error: 'Votre période de démonstration est terminée ou votre abonnement est inactif.'});
                return;
            }
            res.status(200).json({success: true, userId});
        } catch (error) {
            res.status(401).json({success: false, error: error.message});
        }
    });
});

exports.analyzeWithAI = functions.https.onRequest((req, res) => {
    cors(req, res, async () => {
        if (req.method !== 'POST') {
            res.status(405).json({success: false, error: 'Method not allowed'});
            return;
        }

        try {
            const userId = await getAuthenticatedUserId(req);
            const {type, data} = req.body || {};
            if (!type || !data) {
                res.status(400).json({success: false, error: 'Type et données requis.'});
                return;
            }
            res.status(200).json(await runAIAnalysis(userId, type, data));
        } catch (error) {
            console.error('Error running AI analysis:', error);
            const status = error.message.includes('Token Firebase') ? 401 : 403;
            res.status(status).json({success: false, error: error.message});
        }
    });
});

exports.advisorChat = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Connexion requise.');
    }
    if (typeof data?.message !== 'string' || !data.message.trim()) {
        throw new functions.https.HttpsError('invalid-argument', 'Message requis.');
    }

    try {
        return await advisorChat(context.auth.uid, data.message.trim(), data.conversationId || null);
    } catch (error) {
        const code = error.message.includes('période de démonstration') ? 'permission-denied' : 'internal';
        throw new functions.https.HttpsError(code, error.message);
    }
});

exports.listAdvisorConversations = functions.https.onRequest((req, res) => {
    cors(req, res, async () => {
        if (req.method !== 'GET') {
            res.status(405).json({success: false, error: 'Method not allowed'});
            return;
        }
        try {
            const userId = await getAuthenticatedUserId(req);
            const snapshot = await db.collection('advisor_conversations')
                .where('userId', '==', userId)
                .limit(50)
                .get();
            res.status(200).json({
                conversations: snapshot.docs.map(doc => ({id: doc.id, ...doc.data()}))
            });
        } catch (error) {
            res.status(401).json({success: false, error: error.message});
        }
    });
});

exports.deleteAdvisorConversation = functions.https.onRequest((req, res) => {
    cors(req, res, async () => {
        if (req.method !== 'DELETE') {
            res.status(405).json({success: false, error: 'Method not allowed'});
            return;
        }
        try {
            const userId = await getAuthenticatedUserId(req);
            const conversationId = req.query.conversationId;
            if (!conversationId) {
                res.status(400).json({success: false, error: 'Conversation requise.'});
                return;
            }
            const conversationRef = db.collection('advisor_conversations').doc(conversationId);
            const conversation = await conversationRef.get();
            if (!conversation.exists || conversation.data().userId !== userId) {
                res.status(404).json({success: false, error: 'Conversation non trouvée.'});
                return;
            }
            await conversationRef.delete();
            res.status(200).json({success: true});
        } catch (error) {
            res.status(401).json({success: false, error: error.message});
        }
    });
});

async function updateSubscriptionFromStripe(stripeSubscription, fallbackUserId) {
    const userId = stripeSubscription.metadata?.userId || fallbackUserId;
    if (!userId) return;

    const active = ['active', 'trialing'].includes(stripeSubscription.status);
    const periodEnd = stripeSubscription.current_period_end
        ? new Date(stripeSubscription.current_period_end * 1000).toISOString()
        : null;
    const plan = active ? PREMIUM_PLAN : 'free';
    const tokenState = active ? {
        plan: PREMIUM_PLAN,
        baseTokens: -1,
        totalTokens: -1,
        availableTokens: -1,
        usedTokens: 0,
        expiresAt: periodEnd,
        isExpired: false
    } : {
        plan: 'free',
        baseTokens: 0,
        totalTokens: 0,
        availableTokens: 0,
        usedTokens: 0,
        expiresAt: periodEnd,
        isExpired: true
    };

    await db.collection('users').doc(userId).update({
        plan,
        isPremium: active,
        hasAccessToAPI: active,
        hasAccessToAdvancedAnalytics: active,
        hasAccessToPremiumSuggestions: active,
        tokenState,
        availableTokens: tokenState.availableTokens,
        totalTokens: tokenState.totalTokens,
        'subscription.plan': plan,
        'subscription.status': stripeSubscription.status,
        'subscription.expiresAt': periodEnd,
        'subscription.currentPeriodEnd': periodEnd,
        'subscription.cancelAtPeriodEnd': Boolean(stripeSubscription.cancel_at_period_end),
        'subscription.price': PREMIUM_PRICE_EUR,
        'subscription.currency': stripeSubscription.items?.data?.[0]?.price?.currency?.toUpperCase() || 'EUR',
        'subscription.interval': stripeSubscription.items?.data?.[0]?.price?.recurring?.interval || 'month',
        'subscription.stripeCustomerId': stripeSubscription.customer,
        'subscription.stripeSubscriptionId': stripeSubscription.id
    });
}

async function updateBillingInvoice(invoice, eventType) {
    if (!invoice.customer) return;
    const users = await db.collection('users')
        .where('subscription.stripeCustomerId', '==', invoice.customer)
        .limit(10)
        .get();
    if (users.empty) return;

    const invoiceDate = invoice.created ? new Date(invoice.created * 1000).toISOString() : new Date().toISOString();
    const amount = (invoice.amount_due ?? invoice.amount_paid ?? 0) / 100;
    const currency = (invoice.currency || 'eur').toUpperCase();
    const update = {
        'subscription.lastInvoiceId': invoice.id,
        'subscription.lastInvoiceAmount': amount,
        'subscription.lastInvoiceCurrency': currency,
        'subscription.lastInvoiceAt': invoiceDate
    };

    if (eventType === 'invoice.paid') {
        update['subscription.lastInvoiceStatus'] = 'paid';
        update['subscription.lastInvoicePaidAt'] = invoice.status_transitions?.paid_at
            ? new Date(invoice.status_transitions.paid_at * 1000).toISOString()
            : invoiceDate;
    } else if (eventType === 'invoice.payment_failed') {
        update['subscription.lastInvoiceStatus'] = 'payment_failed';
        update['subscription.lastInvoiceFailedAt'] = invoiceDate;
    } else {
        update['subscription.lastInvoiceStatus'] = 'upcoming';
        const dueTimestamp = invoice.next_payment_attempt || invoice.due_date;
        update['subscription.nextInvoiceDueAt'] = dueTimestamp
            ? new Date(dueTimestamp * 1000).toISOString()
            : null;
        update['subscription.nextInvoiceAmount'] = amount;
        update['subscription.nextInvoiceCurrency'] = currency;
    }

    const batch = db.batch();
    users.docs.forEach(userDoc => batch.update(userDoc.ref, update));
    await batch.commit();
}

exports.getBillingMetrics = functions.https.onRequest((req, res) => {
    cors(req, res, async () => {
        if (req.method !== 'GET') {
            res.status(405).json({success: false, error: 'Method not allowed'});
            return;
        }
        try {
            const authorization = req.headers.authorization || '';
            const idToken = authorization.startsWith('Bearer ') ? authorization.slice(7) : null;
            if (!idToken) {
                res.status(401).json({success: false, error: 'Authentification requise.'});
                return;
            }
            const decodedToken = await admin.auth().verifyIdToken(idToken);
            if (decodedToken.admin !== true) {
                res.status(403).json({success: false, error: 'Accès réservé à l’administration.'});
                return;
            }

            const snapshot = await db.collection('users').get();
            const now = new Date();
            const metrics = {
                monthlyRecurringRevenue: 0,
                projectedMrr30: 0,
                projectedMrr90: 0,
                trialingMrr: 0,
                activeSubscriptions: 0,
                trials: 0,
                pastDue: 0,
                cancelled: 0,
                invoiceFailures: 0
            };

            snapshot.docs.forEach(userDoc => {
                const subscription = userDoc.data().subscription || {};
                const expiry = subscription.currentPeriodEnd || subscription.expiresAt;
                const expiryDate = expiry?.toDate ? expiry.toDate() : (expiry ? new Date(expiry) : null);
                const inPeriod = !expiryDate || expiryDate > now;

                if (subscription.status === 'trialing' && inPeriod) metrics.trials++;
                if (subscription.status === 'past_due') metrics.pastDue++;
                if (subscription.status === 'canceled') metrics.cancelled++;
                if (subscription.lastInvoiceStatus === 'payment_failed') metrics.invoiceFailures++;

                const price = Number(subscription.price ?? PREMIUM_PRICE_EUR) || PREMIUM_PRICE_EUR;
                const interval = subscription.interval || 'month';
                const normalizedPrice = interval === 'year' ? price / 12 : price;

                if (subscription.status === 'active' && inPeriod) {
                    metrics.activeSubscriptions++;
                    metrics.monthlyRecurringRevenue += normalizedPrice;
                    metrics.projectedMrr30 += normalizedPrice;
                    metrics.projectedMrr90 += normalizedPrice;
                }

                // Scénario : essais convertis au prix affiché, leur échéance tombe avant la fenêtre de projection.
                if (subscription.status === 'trialing' && inPeriod) {
                    metrics.trialingMrr += normalizedPrice;
                }
            });

            metrics.projectedMrr30 += metrics.trialingMrr;
            metrics.projectedMrr90 += metrics.trialingMrr;

            metrics.monthlyRecurringRevenue = Math.round(metrics.monthlyRecurringRevenue * 100) / 100;
            metrics.projectedMrr30 = Math.round(metrics.projectedMrr30 * 100) / 100;
            metrics.projectedMrr90 = Math.round(metrics.projectedMrr90 * 100) / 100;
            metrics.trialingMrr = Math.round(metrics.trialingMrr * 100) / 100;
            metrics.generatedAt = now.toISOString();
            res.status(200).json({success: true, metrics, generatedAt: now.toISOString()});
        } catch (error) {
            console.error('Error loading admin billing metrics:', error);
            res.status(401).json({success: false, error: 'Impossible de vérifier l’accès administrateur.'});
        }
    });
});

exports.startTrial = functions.https.onRequest((req, res) => {
    cors(req, res, async () => {
        if (req.method !== 'POST') {
            res.status(405).json({success: false, error: 'Method not allowed'});
            return;
        }

        try {
            const userId = await getAuthenticatedUserId(req);
            const body = req.body || {};
            const userRef = db.collection('users').doc(userId);
            const result = await db.runTransaction(async transaction => {
                const userDoc = await transaction.get(userRef);
                const userData = userDoc.exists ? userDoc.data() : {};
                const subscription = userData.subscription || {};

                if (subscription.trialStartedAt || subscription.status === 'active') {
                    return {subscription, plan: userData.plan || subscription.plan || 'free'};
                }

                // Résoudre le parrain si un code valide est fourni (champ referralCode du parrain).
                let sponsorData = null;
                const referralCode = String(body.referralCode || '').trim().toUpperCase();
                if (referralCode) {
                    const sponsors = await transaction.get(
                        db.collection('users').where('referralInfo.referralCode', '==', referralCode).limit(1)
                    );
                    if (!sponsors.empty && sponsors.docs[0].id !== userId) {
                        sponsorData = {id: sponsors.docs[0].id, ...sponsors.docs[0].data()};
                    }
                }

                // Générer le propre code de parrainage du nouvel utilisateur.
                const cleanName = String(body.name || userData.name || 'DPAI').replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 8) || 'DPAI';
                const ownReferralCode = `${cleanName}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

                const TRIAL_LENGTH_DAYS = sponsorData ? 14 : TRIAL_DAYS;
                const now = new Date();
                const trialEndsAt = new Date(now.getTime() + TRIAL_LENGTH_DAYS * 24 * 60 * 60 * 1000);
                const trialSubscription = {
                    plan: PREMIUM_PLAN,
                    status: 'trialing',
                    trialStartedAt: now.toISOString(),
                    trialEndsAt: trialEndsAt.toISOString(),
                    expiresAt: trialEndsAt.toISOString(),
                    price: PREMIUM_PRICE_EUR
                };
                const tokenState = {
                    userId,
                    plan: PREMIUM_PLAN,
                    baseTokens: -1,
                    totalTokens: -1,
                    availableTokens: -1,
                    usedTokens: 0,
                    expiresAt: trialEndsAt.toISOString(),
                    isExpired: false
                };

                transaction.set(userRef, {
                    id: userId,
                    email: userData.email || body.email || '',
                    name: userData.name || body.name || 'Utilisateur',
                    createdAt: userData.createdAt || admin.firestore.FieldValue.serverTimestamp(),
                    totalAnalyses: userData.totalAnalyses || 0,
                    monthlyAnalyses: userData.monthlyAnalyses || 0,
                    loyaltyInfo: userData.loyaltyInfo || {
                        userId,
                        totalAnalyses: 0,
                        monthlyAnalyses: 0,
                        monthlyLoyaltyTokens: 0,
                        lastAnalysisDate: null,
                        lastMonthlyReset: now.toISOString()
                    },
                    ...(sponsorData ? {referredBy: sponsorData.id} : {}),
                    referralInfo: {
                        referralCode: ownReferralCode,
                        ...(sponsorData ? {
                            sponsorId: sponsorData.id,
                            sponsorName: sponsorData.name || '',
                            sponsorEmail: sponsorData.email || '',
                            status: 'validated',
                            validatedAt: now.toISOString()
                        } : {status: 'pending'}),
                        rewardedAt: null
                    },
                    ...userData,
                    plan: PREMIUM_PLAN,
                    isPremium: true,
                    availableTokens: -1,
                    totalTokens: -1,
                    hasAccessToAPI: true,
                    hasAccessToAdvancedAnalytics: true,
                    hasAccessToPremiumSuggestions: true,
                    tokenState,
                    subscription: trialSubscription
                }, {merge: true});

                // Créditer le parrain d'un mois offert (compteur de filleuls validés).
                if (sponsorData) {
                    transaction.update(db.collection('users').doc(sponsorData.id), {
                        'referralInfo.rewardedFilleuls': admin.firestore.FieldValue.increment(1),
                        'referralInfo.lastReferralAt': now.toISOString()
                    });
                }

                return {subscription: trialSubscription, plan: PREMIUM_PLAN, referralCode: ownReferralCode, trialDays: TRIAL_LENGTH_DAYS};
            });

            res.status(200).json({success: true, ...result});
        } catch (error) {
            console.error('Error starting trial:', error);
            res.status(401).json({success: false, error: error.message});
        }
    });
});

exports.createCheckoutSession = functions.runWith({secrets: [stripeSecretKey]}).https.onRequest((req, res) => {
    cors(req, res, async () => {
        if (req.method !== 'POST') {
            res.status(405).json({success: false, error: 'Method not allowed'});
            return;
        }

        try {
            const userId = await getAuthenticatedUserId(req);
            const userDoc = await db.collection('users').doc(userId).get();
            const userData = userDoc.exists ? userDoc.data() : {};
            if (getSubscriptionAccess(userData) && userData.subscription?.stripeSubscriptionId) {
                res.status(409).json({success: false, error: 'Un abonnement est déjà actif. Gérez-le depuis votre espace client.'});
                return;
            }
            const userRecord = await admin.auth().getUser(userId);
            const stripe = getStripe();
            const isLocal = ['localhost', '127.0.0.1'].includes(req.hostname);
            const siteUrl = isLocal ? `http://${req.hostname}:5000` : 'https://dpai-strategy.com';
            const session = await stripe.checkout.sessions.create({
                mode: 'subscription',
                ...(userData.subscription?.stripeCustomerId
                    ? {customer: userData.subscription.stripeCustomerId}
                    : {customer_email: userRecord.email}),
                client_reference_id: userId,
                metadata: {userId},
                subscription_data: {metadata: {userId}},
                line_items: [{
                    quantity: 1,
                    price_data: {
                        currency: 'eur',
                        unit_amount: PREMIUM_PRICE_EUR * 100,
                        recurring: {interval: 'month'},
                        product_data: {name: 'DPAI Premium'}
                    }
                }],
                success_url: `${siteUrl}/pricing.html?subscription=success`,
                cancel_url: `${siteUrl}/pricing.html?subscription=cancelled`
            });

            res.status(200).json({success: true, url: session.url});
        } catch (error) {
            console.error('Error creating checkout session:', error);
            res.status(400).json({success: false, error: error.message});
        }
    });
});

exports.createBillingPortalSession = functions.runWith({secrets: [stripeSecretKey]}).https.onRequest((req, res) => {
    cors(req, res, async () => {
        if (req.method !== 'POST') {
            res.status(405).json({success: false, error: 'Method not allowed'});
            return;
        }
        try {
            const userId = await getAuthenticatedUserId(req);
            const userDoc = await db.collection('users').doc(userId).get();
            const customerId = userDoc.data()?.subscription?.stripeCustomerId;
            if (!customerId) {
                res.status(404).json({success: false, error: 'Aucun abonnement Stripe à gérer.'});
                return;
            }
            const stripe = getStripe();
            const session = await stripe.billingPortal.sessions.create({
                customer: customerId,
                return_url: 'https://dpai-strategy.com/pricing.html'
            });
            res.status(200).json({success: true, url: session.url});
        } catch (error) {
            console.error('Error creating billing portal session:', error);
            res.status(400).json({success: false, error: error.message});
        }
    });
});

exports.stripeWebhook = functions.runWith({secrets: [stripeSecretKey, stripeWebhookSecret]}).https.onRequest(async (req, res) => {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || stripeWebhookSecret.value();
    if (!webhookSecret) {
        res.status(503).send('Stripe webhook is not configured.');
        return;
    }

    let event;
    try {
        const stripe = getStripe();
        event = stripe.webhooks.constructEvent(req.rawBody, req.headers['stripe-signature'], webhookSecret);
    } catch (error) {
        res.status(400).send(`Webhook Error: ${error.message}`);
        return;
    }

    try {
        if (['customer.subscription.created', 'customer.subscription.updated', 'customer.subscription.deleted'].includes(event.type)) {
            await updateSubscriptionFromStripe(event.data.object);
        } else if (event.type === 'checkout.session.completed') {
            const session = event.data.object;
            if (session.subscription && session.metadata?.userId) {
                const stripe = getStripe();
                const subscription = await stripe.subscriptions.retrieve(session.subscription);
                await updateSubscriptionFromStripe(subscription, session.metadata.userId);
            }
        } else if (['invoice.upcoming', 'invoice.paid', 'invoice.payment_failed'].includes(event.type)) {
            await updateBillingInvoice(event.data.object, event.type);
        }
        res.status(200).json({received: true});
    } catch (error) {
        console.error('Error processing Stripe webhook:', error);
        res.status(500).send('Webhook processing failed.');
    }
});

// ============================================================================
// FONCTIONS ADMIN (avec CORS)
// ============================================================================

exports.changeUserPlan = functions.https.onRequest((req, res) => {
    cors(req, res, async () => {
        if (req.method !== 'POST') {
            res.status(405).json({success: false, error: 'Method not allowed. Use POST.'});
            return;
        }
        
        try {
            const body = req.body;
            const {userId, email, newPlan, force = false} = body;
            
            if (!newPlan) {
                res.status(400).json({success: false, error: 'newPlan is required'});
                return;
            }
            
            const planConfig = PLAN_CONFIGS[newPlan];
            if (!planConfig) {
                res.status(400).json({success: false, error: `Invalid plan: ${newPlan}`});
                return;
            }
            
            let targetUserId;
            if (userId) {
                targetUserId = userId;
            } else if (email) {
                const usersSnapshot = await db.collection('users').where('email', '==', email).limit(1).get();
                if (usersSnapshot.empty) {
                    res.status(404).json({success: false, error: `User with email ${email} not found`});
                    return;
                }
                targetUserId = usersSnapshot.docs[0].id;
            } else {
                res.status(400).json({success: false, error: 'Either userId or email must be provided'});
                return;
            }
            
            const userDoc = await db.collection('users').doc(targetUserId).get();
            
            if (!userDoc.exists) {
                res.status(404).json({success: false, error: `User ${targetUserId} not found`});
                return;
            }
            
            const userData = userDoc.data();
            const plan = userData.subscription?.plan || userData.plan || userData.tokenState?.plan || 'free';
            
            res.status(200).json({
                success: true,
                userId: targetUserId,
                email: userData.email,
                plan: plan,
                tokenState: userData.tokenState,
                isPremium: userData.isPremium || false,
                hasAccessToAPI: userData.hasAccessToAPI || false,
                hasAccessToAdvisor: userData.hasAccessToPremiumSuggestions || false,
                createdAt: userData.createdAt,
                lastLogin: userData.lastLoginAt
            });
            
        } catch (error) {
            console.error('Error getting user info:', error);
            res.status(500).json({success: false, error: error.message});
        }
    });
});

exports.listUsers = functions.https.onRequest((req, res) => {
    cors(req, res, async () => {
        if (req.method !== 'GET') {
            res.status(405).json({success: false, error: 'Method not allowed'});
            return;
        }
        
        try {
            const snapshot = await db.collection('users').get();
            
            const users = snapshot.docs.map(doc => {
                const data = doc.data();
                const plan = data.subscription?.plan || data.plan || data.tokenState?.plan || 'free';
                return {
                    userId: doc.id,
                    email: data.email,
                    displayName: data.displayName,
                    plan: plan,
                    isPremium: data.isPremium || plan !== 'free',
                    createdAt: data.createdAt,
                    lastLogin: data.lastLoginAt
                };
            });
            
            res.status(200).json({success: true, total: users.length, users: users});
            
        } catch (error) {
            console.error('Error listing users:', error);
            res.status(500).json({success: false, error: error.message});
        }
    });
});

// ============================================================================
// FONCTIONS CONSEILLER IA LOCALE (CORRIGÉES AVEC CORS)
// ============================================================================

/**
 * Appel à l'IA locale avec vérification advisor
 */
exports.callLocalAI = functions.https.onRequest((req, res) => {
    cors(req, res, async () => {
        try {
            if (req.method !== 'POST') {
                res.status(405).json({success: false, error: 'POST seulement'});
                return;
            }
            
            // Vérifier l'authentification Firebase
            if (!req.headers.authorization) {
                res.status(403).json({success: false, error: 'Token manquant'});
                return;
            }
            
            const idToken = req.headers.authorization.split('Bearer ')[1];
            let decodedToken;
            try {
                decodedToken = await admin.auth().verifyIdToken(idToken);
            } catch (error) {
                res.status(403).json({success: false, error: 'Token invalide ou expiré'});
                return;
            }
            
            const userId = decodedToken.uid;
            const {message, conversationId} = req.body;
            
            if (!message) {
                res.status(400).json({success: false, error: 'Message vide'});
                return;
            }
            
            // Vérifier que l'utilisateur existe et a le plan advisor
            const userDoc = await db.collection('users').doc(userId).get();
            if (!userDoc.exists) {
                res.status(404).json({success: false, error: 'Utilisateur non trouvé'});
                return;
            }
            
            const userData = userDoc.data();
            const plan = userData.subscription?.plan || 'free';

            if (plan !== PREMIUM_PLAN || !getSubscriptionAccess(userData)) {
                res.status(403).json({
                    success: false,
                    error: 'Votre période de démonstration est terminée. Passez à DPAI Premium (199 €/mois) pour continuer.'
                });
                return;
            }
            
            // Créer ou mettre à jour la conversation
            const conversationsRef = db.collection('local_ai_conversations');
            let convId = conversationId;
            const timestamp = admin.firestore.FieldValue.serverTimestamp();
            
            // Message utilisateur
            const userMessage = {
                role: 'user',
                content: message,
                timestamp: timestamp
            };
            
            if (!convId) {
                // Nouvelle conversation
                const newConv = {
                    userId: userId,
                    messages: [userMessage],
                    title: message.slice(0, 50) + (message.length > 50 ? '...' : ''),
                    createdAt: timestamp,
                    updatedAt: timestamp
                };
                const convRef = await conversationsRef.add(newConv);
                convId = convRef.id;
            } else {
                // Conversation existante
                await conversationsRef.doc(convId).update({
                    updatedAt: timestamp,
                    messages: admin.firestore.FieldValue.arrayUnion(userMessage)
                });
            }
            
            // **APPELER L'IA LOCALE PYTHON**
            //Essayer d'appeler le serveur Python local d'abord
            let aiResponse;
            try {
                // URL du serveur Python (à adapter selon votre configuration)
                const pythonServerUrl = 'http://localhost:5002/api/chat';
                
                // Appel HTTP au serveur Python
                const fetch = require('node-fetch');
                const pythonResponse = await fetch(pythonServerUrl, {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({
                        userId: userId,
                        message: message,
                        conversationId: convId
                    }),
                    timeout: 30000 // 30 secondes
                });
                
                if (pythonResponse.ok) {
                    const pythonData = await pythonResponse.json();
                    aiResponse = pythonData.response || pythonData.answer || "Réponse de l'IA locale";
                    console.log('[callLocalAI] Réponse Python:', aiResponse.slice(0, 100));
                } else {
                    throw new Error('Python server error');
                }
            } catch (pythonError) {
                console.warn('[callLocalAI] Python server non disponible, utilisation fallback:', pythonError.message);
                // Fallback: générer une réponse basique
                aiResponse = generateFallbackResponse(message, userId);
            }
            
            // Ajouter la réponse de l'IA à la conversation
            const assistantMessage = {
                role: 'assistant',
                content: aiResponse,
                timestamp: timestamp
            };
            
            await conversationsRef.doc(convId).update({
                updatedAt: timestamp,
                messages: admin.firestore.FieldValue.arrayUnion(assistantMessage)
            });
            
            res.status(200).json({
                success: true,
                response: aiResponse,
                conversationId: convId
            });
            
        } catch (error) {
            console.error('[callLocalAI] Erreur:', error);
            res.status(500).json({success: false, error: error.message});
        }
    });
});

/**
 * Lister les conversations IA locale d'un utilisateur
 */
exports.listLocalAIConversations = functions.https.onRequest((req, res) => {
    cors(req, res, async () => {
        try {
            if (req.method !== 'GET') {
                res.status(405).json({success: false, error: 'GET seulement'});
                return;
            }
            
            // Vérifier l'authentification
            if (!req.headers.authorization) {
                res.status(403).json({success: false, error: 'Token manquant'});
                return;
            }
            
            const idToken = req.headers.authorization.split('Bearer ')[1];
            const decodedToken = await admin.auth().verifyIdToken(idToken);
            const userId = req.query.userId || decodedToken.uid;
            
            if (!userId) {
                res.status(400).json({success: false, error: 'userId manquant'});
                return;
            }
            
            const snapshot = await db.collection('local_ai_conversations')
                .where('userId', '==', userId)
                .orderBy('updatedAt', 'desc')
                .get();
            
            const conversations = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            res.status(200).json({success: true, conversations: conversations});
            
        } catch (error) {
            console.error('[listLocalAIConversations] Erreur:', error);
            res.status(500).json({success: false, error: error.message});
        }
    });
});

/**
 * Supprimer une conversation IA locale
 */
exports.deleteLocalAIConversation = functions.https.onRequest((req, res) => {
    cors(req, res, async () => {
        try {
            if (req.method !== 'DELETE') {
                res.status(405).json({success: false, error: 'DELETE seulement'});
                return;
            }
            
            // Vérifier l'authentification
            if (!req.headers.authorization) {
                res.status(403).json({success: false, error: 'Token manquant'});
                return;
            }
            
            const idToken = req.headers.authorization.split('Bearer ')[1];
            const decodedToken = await admin.auth().verifyIdToken(idToken);
            const userId = decodedToken.uid;
            const {conversationId} = req.query;
            
            if (!conversationId) {
                res.status(400).json({success: false, error: 'conversationId manquant'});
                return;
            }
            
            // Vérifier que la conversation appartient à l'utilisateur
            const convDoc = await db.collection('local_ai_conversations').doc(conversationId).get();
            if (!convDoc.exists || convDoc.data().userId !== userId) {
                res.status(403).json({success: false, error: 'Non autorisé'});
                return;
            }
            
            await db.collection('local_ai_conversations').doc(conversationId).delete();
            res.status(200).json({success: true});
            
        } catch (error) {
            console.error('[deleteLocalAIConversation] Erreur:', error);
            res.status(500).json({success: false, error: error.message});
        }
    });
});

// ============================================================================
// FONCTIONS UTILITAIRES
// ============================================================================

/**
 * Générer une réponse de fallback si Python n'est pas disponible
 */
function generateFallbackResponse(message, userId) {
    return `Réponse du Conseiller IA DPAI (mode temporaire) :

Votre question : "${message.slice(0, 200)}"

**Pour activer l'IA locale complète :**

1. Lancez votre serveur Python local :
   python my_local_ai/api_server.py

2. Assurez-vous qu'il écoute sur : http://localhost:5002

3. Redéployez les Cloud Functions :
   firebase deploy --only functions

**Vos messages sont bien sauvegardés dans Firestore.**

En attendant, voici une réponse basée sur notre expertise DPAI :

${getGenericResponse(message)}`;
}

/**
 * Réponses génériques basées sur les mots-clés
 */
function getGenericResponse(message) {
    const lowerMsg = message.toLowerCase();
    
    if (lowerMsg.includes('valorisation') || lowerMsg.includes('ebitda') || lowerMsg.includes('dcf')) {
        return '\n\n**Valorisation :**\n- Multiples sectoriels : Tech 8-12x, Industrie 5-8x, Retail 4-6x\n- Méthode DCF pour cash-flows prévisibles\n- Benchmark avec transactions comparables';
    }
    
    if (lowerMsg.includes('due diligence') || lowerMsg.includes('audit')) {
        return '\n\n**Due Diligence :**\n- Financière : 3-5 ans d\'états financiers\n- Juridique : contrats, litiges, PI\n- Stratégique : positionnement marché, synergies\n- Piège : ne pas négliger les engagements hors bilan';
    }
    
    if (lowerMsg.includes('lbo') || lowerMsg.includes('financement') || lowerMsg.includes('dette')) {
        return '\n\n**Structure LBO :**\n- Capital : 30-40%\n- Dette senior : 50-60%\n- Dette mezzanine : 10-20%\n- Leverage Ratio cible : 3-4x EBITDA\n- IRR cible : 20-25%';
    }
    
    if (lowerMsg.includes('fusion') || lowerMsg.includes('synergie') || lowerMsg.includes('rachat')) {
        return '\n\n**Synergies :**\n- Coûts : économies d\'échelle 10-20%\n- Revenus : cross-selling, nouveaux marchés\n- Financières : optimisation fiscale, meilleure notation\n- Cas DPAI : CASE-001 TechFlow = 15% coûts + 25% revenus';
    }
    
    return '\n\n**Conseil DPAI :** Contactez-nous pour une analyse personnalisée. Votre abonnement Conseiller IA vous donne accès à l\'expertise complète.';
}

// Exporter les fonctions existantes si elles existent
try {
    const existingExports = require('./existing-functions');
    Object.assign(exports, existingExports);
} catch (e) {
    // Ignorer si le fichier n'existe pas
}
