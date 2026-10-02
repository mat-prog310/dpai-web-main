// =============================================================================
// INDEX.JS - Firebase Cloud Functions pour DPAI
// Conseiller IA et Analyses utilisent l'API Mistral avec vos prompts DPAI personnalisés
// =============================================================================

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors')({ origin: true });

// Initialiser Firebase Admin
if (admin.apps.length === 0) {
    admin.initializeApp();
}

// Importer les prompts DPAI
const { DPAI_CONTEXT, SWOT_PROMPT, PORTER_PROMPT, ADVISOR_PROMPT, SECTOR_DATA, 
        getSectorGrowth, getSectorMultiple, getSectorCompetitors, 
        getSectorCompetitorCount, getSectorBarriers, getCustomerPower, getSupplierPower } = require('./src/prompt/dpai-prompts');

// =============================================================================
// CONFIGURATION MISTRAL (POUR TOUT : Conseiller IA + Analyses)
// =============================================================================
const MISTRAL_API_KEY = functions.config().mistral?.key || "mstrl_OUgXuc71KYyO2QoWZ8h0okTn14wCYUnG_20gLSU";
const MISTRAL_API_URL = "https://api.mistral.ai/v1/chat/completions";

// Coûts en tokens DPAI
const AI_ANALYSIS_COSTS = {
    swot: 80,
    porter: 100,
    pestel: 90,
    due_diligence: 150,
    valuation: 200,
    recommendation: 50,
    advisor_chat: 50  // Coût par message Conseiller IA
};

// =============================================================================
// FONCTIONS UTILITAIRES
// =============================================================================

// Wrapper pour gérer CORS
function corsHandler(req, res, handler) {
    cors(req, res, handler);
}

// Appel à l'API Mistral (POUR TOUT : Conseiller IA + Analyses)
async function callMistral(prompt, model = "mistral-large") {
    try {
        const response = await fetch(MISTRAL_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${MISTRAL_API_KEY}`
            },
            body: JSON.stringify({
                model: model,
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.3,
                max_tokens: 2000
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Erreur Mistral API');
        }

        const data = await response.json();
        if (!data.choices || !data.choices[0]) {
            throw new Error('Pas de réponse de Mistral');
        }
        return data.choices[0].message.content;
    } catch (error) {
        console.error('❌ Erreur Mistral:', error);
        throw error;
    }
}

// Appel au Conseiller IA via API Mistral (avec vos prompts DPAI personnalisés)
async function callAdvisor(prompt, conversationContext = null) {
    // Formater le prompt avec vos templates DPAI
    const advisorPrompt = ADVISOR_PROMPT(prompt, conversationContext);
    
    // Appeler Mistral avec le prompt personnalisé
    return await callMistral(advisorPrompt, "mistral-large");
}

// Vérifier l'accès à l'IA
async function checkAIAccess(userId) {
    const userDoc = await admin.firestore().collection('users').doc(userId).get();
    if (!userDoc.exists) throw new Error('Utilisateur non trouvé');

    const userData = userDoc.data();
    const plan = userData.subscription?.plan || 'free';
    const tokenState = userData.tokenState || {};

    // Le plan 'free' a accès avec tokens limités (500 tokens gratuits)
    // Les plans 'api_monthly' et 'advisor' ont aussi accès
    if (plan === 'free' || plan === 'api_monthly' || plan === 'advisor') {
        // advisor a des tokens illimités, free et api_monthly ont des tokens limités
        const isUnlimited = plan === 'advisor' || tokenState.baseTokens === -1;
        return { hasAccess: true, plan: plan, isUnlimited: isUnlimited };
    }
    return { hasAccess: false, plan: plan, isUnlimited: false };
}

// Vérifier l'accès au Conseiller IA
async function checkAdvisorAccess(userId) {
    const userDoc = await admin.firestore().collection('users').doc(userId).get();
    if (!userDoc.exists) throw new Error('Utilisateur non trouvé');

    const userData = userDoc.data();
    const plan = userData.subscription?.plan || 'free';

    return plan === 'advisor';
}

// Déduire les tokens pour une analyse IA
async function deductAITokens(userId, type) {
    const tokenCost = AI_ANALYSIS_COSTS[type] || 100;
    await admin.firestore().collection('users').doc(userId).update({
        'tokenState.availableTokens': admin.firestore.FieldValue.increment(-tokenCost),
        'tokenState.usedTokens': admin.firestore.FieldValue.increment(tokenCost),
        lastTokenUpdate: admin.firestore.FieldValue.serverTimestamp()
    });
}

// Récupérer le contexte d'une conversation
async function getConversationContext(userId, conversationId) {
    if (!conversationId) return null;
    const convDoc = await admin.firestore().collection('advisor_conversations').doc(conversationId).get();
    if (convDoc.exists) {
        const messages = convDoc.data().messages || [];
        return messages.slice(-5).map(msg => `${msg.role === 'user' ? 'Utilisateur' : 'Conseiller'} : ${msg.content}`).join('\n');
    }
    return null;
}

// Sauvegarder une conversation
async function saveConversation(userId, userMessage, aiResponse, conversationId) {
    const newConversationId = conversationId || admin.firestore().collection('advisor_conversations').doc().id;
    const conversationRef = admin.firestore().collection('advisor_conversations').doc(newConversationId);

    let existingConversation = {};
    if (conversationId) {
        const doc = await conversationRef.get();
        if (doc.exists) {
            existingConversation = doc.data();
        }
    }

    const messages = [
        ...(existingConversation.messages || []),
        { role: 'user', content: userMessage, timestamp: admin.firestore.FieldValue.serverTimestamp() },
        { role: 'assistant', content: aiResponse, timestamp: admin.firestore.FieldValue.serverTimestamp() }
    ];

    await conversationRef.set({
        userId: userId,
        messages: messages,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: existingConversation.createdAt || admin.firestore.FieldValue.serverTimestamp()
    });

    return newConversationId;
}

// =============================================================================
// ENDPOINTS POUR LES ANALYSES (UTILISENT MISTRAL)
// =============================================================================

// 1. Endpoint pour les analyses IA (SWOT, Porter, etc.) - UTILISE MISTRAL
exports.analyzeWithAI = functions.https.onRequest(async (req, res) => {
    corsHandler(req, res, async () => {
        if (req.method !== 'POST') {
            return res.status(405).json({ error: 'Method Not Allowed' });
        }

        try {
            const { userId, type, data } = req.body;

            // 1. Vérifier l'utilisateur
            const access = await checkAIAccess(userId);
            if (!access.hasAccess) {
                return res.status(403).json({
                    error: 'Accès IA non autorisé',
                    requiredPlan: 'api_monthly ou advisor (199 € ou 499 €/mois)',
                    pricingUrl: '/pricing.html'
                });
            }

            // 2. Générer le prompt
            let prompt;
            switch (type) {
                case 'swot':
                    prompt = SWOT_PROMPT(data);
                    break;
                case 'porter':
                    prompt = PORTER_PROMPT(data);
                    break;
                case 'pestel':
                    prompt = `${DPAI_CONTEXT}\n\n**Mission:** Analyse PESTEL pour ${data.sector || 'cette entreprise'}\n**Données:**\n- Secteur: ${data.sector || 'Non spécifié'}\n- CA: ${data.revenue || 'Non spécifié'}\n- Marché: ${data.market || 'France'}\n\n**Format attendu:**\n## 📊 Analyse PESTEL pour [Nom] (Secteur: [Secteur])\n...`;
                    break;
                case 'valuation':
                    prompt = `${DPAI_CONTEXT}\n\n**Mission:** Estimer la valorisation de ${data.name || 'cette entreprise'}\n**Données:**\n- CA: ${data.revenue || 'Non spécifié'}\n- EBITDA: ${data.ebitda || 'Non spécifié'}\n- Secteur: ${data.sector || 'Non spécifié'}\n\n**Format attendu:**\n## 📊 Valorisation pour [Nom]\n...`;
                    break;
                default:
                    return res.status(400).json({ error: 'Type d\'analyse inconnu' });
            }

            // 3. Appeler Mistral (pour les analyses)
            const response = await callMistral(prompt);

            // 4. Déduire les tokens si l'utilisateur n'a pas des tokens illimités
            if (!access.isUnlimited) {
                await deductAITokens(userId, type);
            }

            res.json({
                success: true,
                result: response,
                tokensUsed: access.isUnlimited ? 0 : AI_ANALYSIS_COSTS[type],
                plan: access.plan,
                model: 'mistral-api'  // Indique que c'est l'API Mistral
            });

        } catch (error) {
            console.error('❌ Erreur analyzeWithAI:', error);
            console.error('Stack trace:', error.stack);
            
            // Retourner une erreur plus détaillée
            let errorMessage = error.message || 'Erreur serveur';
            if (error.message && error.message.includes('Mistral')) {
                errorMessage = 'Erreur API Mistral: ' + error.message;
            } else if (error.message && error.message.includes('Firestore')) {
                errorMessage = 'Erreur Firestore: ' + error.message;
            } else if (error.code) {
                errorMessage = 'Erreur: ' + error.code + ' - ' + error.message;
            }
            
            res.status(500).json({
                error: errorMessage,
                details: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });
        }
    });
});

// =============================================================================
// ENDPOINT POUR LE CONSEILLER IA (UTILISE API MISTRAL + PROMPTS DPAI)
// =============================================================================

// Endpoint pour le Conseiller IA (utilise API Mistral avec prompts DPAI personnalisés)
exports.advisorChat = functions.https.onRequest(async (req, res) => {
    corsHandler(req, res, async () => {
        if (req.method !== 'POST') {
            return res.status(405).json({ error: 'Method Not Allowed' });
        }

        try {
            const { userId, message, conversationId } = req.body;

            // 1. Vérifier l'accès au Conseiller IA
            const access = await checkAIAccess(userId);
            if (!access.hasAccess) {
                return res.status(403).json({
                    error: 'Abonnement Conseiller IA requis (499 €/mois)',
                    pricingUrl: '/pricing.html#advisor'
                });
            }

            // 2. Récupérer le contexte de la conversation
            const context = await getConversationContext(userId, conversationId);

            // 3. Appeler le Conseiller IA via Mistral avec vos prompts personnalisés
            const response = await callAdvisor(message, context);

            // 4. Sauvegarder la conversation
            const newConversationId = await saveConversation(userId, message, response, conversationId);

            // 5. Déduire les tokens si l'utilisateur n'a pas des tokens illimités
            if (!access.isUnlimited) {
                await deductAITokens(userId, 'advisor_chat');
            }

            res.json({
                success: true,
                response: response,
                conversationId: newConversationId,
                model: 'mistral-api',  // Indique que c'est l'API Mistral avec prompts DPAI
                tokensUsed: access.isUnlimited ? 0 : AI_ANALYSIS_COSTS.advisor_chat
            });

        } catch (error) {
            console.error('❌ Erreur advisorChat:', error);
            res.status(500).json({ 
                error: error.message || 'Erreur serveur',
                model: 'mistral-api'
            });
        }
    });
});

// =============================================================================
// ENDPOINTS EXISTANTS (À CONSERVER)
// =============================================================================

// Endpoint pour lister les conversations d'un utilisateur
exports.listAdvisorConversations = functions.https.onRequest(async (req, res) => {
    corsHandler(req, res, async () => {
        if (req.method !== 'GET') {
            return res.status(405).json({ error: 'Method Not Allowed' });
        }

        try {
            const { userId } = req.query;
            if (!userId) {
                return res.status(400).json({ error: 'userId requis' });
            }

            const hasAccess = await checkAdvisorAccess(userId);
            if (!hasAccess) {
                return res.status(403).json({ error: 'Abonnement Conseiller IA requis' });
            }

            const conversationsSnapshot = await admin.firestore()
                .collection('advisor_conversations')
                .where('userId', '==', userId)
                .orderBy('updatedAt', 'desc')
                .limit(20)
                .get();

            const conversations = [];
            conversationsSnapshot.forEach(doc => {
                conversations.push({
                    id: doc.id,
                    ...doc.data(),
                    updatedAt: doc.data().updatedAt?.toDate()
                });
            });

            res.json({ success: true, conversations });
        } catch (error) {
            console.error('❌ Erreur listAdvisorConversations:', error);
            res.status(500).json({ error: error.message });
        }
    });
});

// Endpoint pour supprimer une conversation
exports.deleteAdvisorConversation = functions.https.onRequest(async (req, res) => {
    corsHandler(req, res, async () => {
        if (req.method !== 'DELETE') {
            return res.status(405).json({ error: 'Method Not Allowed' });
        }

        try {
            const { userId, conversationId } = req.query;
            if (!userId || !conversationId) {
                return res.status(400).json({ error: 'userId et conversationId requis' });
            }

            const hasAccess = await checkAdvisorAccess(userId);
            if (!hasAccess) {
                return res.status(403).json({ error: 'Abonnement Conseiller IA requis' });
            }

            // Vérifier que la conversation appartient à l'utilisateur
            const convDoc = await admin.firestore().collection('advisor_conversations').doc(conversationId).get();
            if (!convDoc.exists || convDoc.data().userId !== userId) {
                return res.status(404).json({ error: 'Conversation non trouvée' });
            }

            await admin.firestore().collection('advisor_conversations').doc(conversationId).delete();
            res.json({ success: true, message: 'Conversation supprimée' });
        } catch (error) {
            console.error('❌ Erreur deleteAdvisorConversation:', error);
            res.status(500).json({ error: error.message });
        }
    });
});

// Endpoint pour changer de plan
exports.setUserPlan = functions.https.onRequest(async (req, res) => {
    corsHandler(req, res, async () => {
        if (req.method !== 'POST') {
            return res.status(405).json({ error: 'Method Not Allowed' });
        }

        try {
            const { userId, plan } = req.body;
            const validPlans = ['free', 'api_monthly', 'advisor'];

            if (!validPlans.includes(plan)) {
                return res.status(400).json({ error: 'Plan invalide. Plans valides: free, api_monthly, advisor' });
            }

            // Mettre à jour le plan et les tokens
            const updates = {
                'subscription.plan': plan,
                'subscription.advisorAccess': plan === 'advisor',
                'subscription.lastPlanChange': admin.firestore.FieldValue.serverTimestamp()
            };

            // Calculer la date d'expiration (30 jours)
            const expiryDate = new Date();
            expiryDate.setDate(expiryDate.getDate() + 30);

            if (plan === 'free') {
                updates['tokenState.plan'] = 'free';
                updates['tokenState.baseTokens'] = 500;
                updates['tokenState.availableTokens'] = 500;
                updates['tokenState.usedTokens'] = 0;
                updates['tokenState.totalTokens'] = 500;
                updates['tokenState.expiresAt'] = null;
                updates['subscription.expiresAt'] = admin.firestore.FieldValue.delete();
            } else if (plan === 'advisor') {
                // Conseiller IA: tokens illimités + IA illimitée
                updates['tokenState.plan'] = plan;
                updates['tokenState.baseTokens'] = -1; // -1 = illimité
                updates['tokenState.availableTokens'] = -1;
                updates['tokenState.totalTokens'] = -1;
                updates['tokenState.expiresAt'] = expiryDate;
                updates['subscription.expiresAt'] = expiryDate;
            } else if (plan === 'api_monthly') {
                // API Monthly: 1000 tokens + IA intégrée (pas illimité)
                updates['tokenState.plan'] = plan;
                updates['tokenState.baseTokens'] = 1000;
                updates['tokenState.availableTokens'] = 1000;
                updates['tokenState.usedTokens'] = 0;
                updates['tokenState.totalTokens'] = 1000;
                updates['tokenState.expiresAt'] = expiryDate;
                updates['subscription.expiresAt'] = expiryDate;
            }

            await admin.firestore().collection('users').doc(userId).update(updates);

            res.json({ 
                success: true, 
                plan: plan,
                expiresAt: plan !== 'free' ? expiryDate.toISOString() : null,
                message: `Plan mis à jour vers ${plan} avec succès`
            });
        } catch (error) {
            console.error('❌ Erreur setUserPlan:', error);
            res.status(500).json({ error: error.message });
        }
    });
});

// Endpoint pour activer un abonnement après paiement
exports.activateSubscription = functions.https.onRequest(async (req, res) => {
    corsHandler(req, res, async () => {
        if (req.method !== 'POST') {
            return res.status(405).json({ error: 'Method Not Allowed' });
        }

        try {
            const { userId, plan, paymentMethod = 'virement', transactionId } = req.body;
            const validPlans = ['api_monthly', 'advisor'];

            if (!validPlans.includes(plan)) {
                return res.status(400).json({ 
                    error: 'Plan invalide. Utilisez api_monthly ou advisor.',
                    validPlans: validPlans
                });
            }

            // Calculer la date d'expiration (30 jours)
            const expiryDate = new Date();
            expiryDate.setDate(expiryDate.getDate() + 30);

            let tokenStateUpdates;
            if (plan === 'api_monthly') {
                tokenStateUpdates = {
                    plan: plan,
                    baseTokens: 1000,
                    totalTokens: 1000,
                    availableTokens: 1000,
                    usedTokens: 0,
                    expiresAt: expiryDate.toISOString(),
                    isExpired: false
                };
            } else if (plan === 'advisor') {
                tokenStateUpdates = {
                    plan: plan,
                    baseTokens: -1,
                    totalTokens: -1,
                    availableTokens: -1,
                    usedTokens: 0,
                    expiresAt: expiryDate.toISOString(),
                    isExpired: false
                };
            }

            // Mettre à jour dans Firestore
            const updates = {
                tokenState: tokenStateUpdates,
                'subscription.plan': plan,
                'subscription.status': 'active',
                'subscription.expiresAt': expiryDate,
                'subscription.paymentMethod': paymentMethod,
                'subscription.transactionId': transactionId,
                'subscription.lastPaymentDate': admin.firestore.FieldValue.serverTimestamp(),
                'subscription.paymentReceived': true,
                'subscription.lastActivationDate': admin.firestore.FieldValue.serverTimestamp()
            };

            await admin.firestore().collection('users').doc(userId).update(updates);

            res.json({ 
                success: true, 
                plan: plan,
                userId: userId,
                expiresAt: expiryDate.toISOString(),
                message: `Abonnement ${plan} activé avec succès pour l'utilisateur ${userId}`
            });
        } catch (error) {
            console.error('❌ Erreur activateSubscription:', error);
            res.status(500).json({ error: error.message });
        }
    });
});

// =============================================================================
// EXPORT DEFAULT
// =============================================================================
module.exports = {
    analyzeWithAI: exports.analyzeWithAI,
    advisorChat: exports.advisorChat,
    setUserPlan: exports.setUserPlan,
    listAdvisorConversations: exports.listAdvisorConversations,
    deleteAdvisorConversation: exports.deleteAdvisorConversation,
    activateSubscription: exports.activateSubscription
};
