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

// Polyfill pour fetch dans Firebase Functions
// Node.js 18+ a fetch natif, mais dans certaines configurations il peut manquer
if (typeof global.fetch === 'undefined') {
    // Utiliser node-fetch@2.x qui est disponible comme dépendance transitive
    const nodeFetch = require('node-fetch');
    global.fetch = nodeFetch;
    global.Request = nodeFetch.Request;
    global.Response = nodeFetch.Response;
    global.Headers = nodeFetch.Headers;
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

// Parser pour transformer la réponse texte de Mistral en JSON structuré
function parseMistralResponse(textResponse, analysisType, companyData) {
    const result = {};
    
    // Extraire le résumé/évaluation globale si présent
    const summaryMatch = textResponse.match(/^##\s*[📈📊]?\s*([^\n]+)/m);
    if (summaryMatch) {
        result.summary = summaryMatch[1].trim();
    }
    
    // Extraire le contexte si présent
    const contextMatch = textResponse.match(/^\*\*Contexte\*\*\s*:\s*([^\n]+)/m);
    if (contextMatch) {
        result.context = contextMatch[1].trim();
    }
    
    switch (analysisType) {
        case 'swot':
            result.strengths = extractSectionItems(textResponse, ['Forces', 'Strengths']);
            result.weaknesses = extractSectionItems(textResponse, ['Faiblesses', 'Weaknesses']);
            result.opportunities = extractSectionItems(textResponse, ['Opportunités', 'Opportunities']);
            result.threats = extractSectionItems(textResponse, ['Menaces', 'Threats']);
            result.recommendations = extractSectionItems(textResponse, ['Recommandations', 'Recommendations']);
            
            // Extraire les insights stratégiques
            const insightsMatch = extractSection(textResponse, ['Recommandations Stratégiques', 'Strategic Insights']);
            if (insightsMatch) {
                result.strategicInsights = insightsMatch;
            }
            
            // Si on n'a pas trouvé assez d'items, utiliser le texte brut
            if ((result.strengths.length + result.weaknesses.length + result.opportunities.length + result.threats.length) < 3) {
                const fallbackResult = parseGenericSWOT(textResponse);
                Object.assign(result, fallbackResult);
            }
            break;
            
        case 'porter':
            result.supplierPower = extractForce(textResponse, 'Pouvoir des fournisseurs');
            result.supplierPowerScore = extractScore(textResponse, 'Pouvoir des fournisseurs');
            result.buyerPower = extractForce(textResponse, 'Pouvoir des clients');
            result.buyerPowerScore = extractScore(textResponse, 'Pouvoir des clients');
            result.newEntrants = extractForce(textResponse, 'Menace des nouveaux entrants');
            result.newEntrantsScore = extractScore(textResponse, 'Menace des nouveaux entrants');
            result.substitutes = extractForce(textResponse, 'Menace des substituts');
            result.substitutesScore = extractScore(textResponse, 'Menace des substituts');
            result.rivalry = extractForce(textResponse, 'Intensité de la rivalité');
            result.rivalryScore = extractScore(textResponse, 'Intensité de la rivalité');
            result.overallAssessment = extractSection(textResponse, ['Évaluation Globale', 'Overall Assessment']);
            result.recommendations = extractSectionItems(textResponse, ['Recommandations']);
            break;
            
        case 'pestel':
            result.political = extractFactor(textResponse, 'Politique');
            result.economic = extractFactor(textResponse, 'Économique');
            result.social = extractFactor(textResponse, 'Socioculturel');
            result.technological = extractFactor(textResponse, 'Technologique');
            result.environmental = extractFactor(textResponse, 'Environnemental');
            result.legal = extractFactor(textResponse, 'Légal');
            result.overallAssessment = extractSection(textResponse, ['Évaluation Globale', 'Overall Assessment']);
            result.recommendations = extractSectionItems(textResponse, ['Recommandations']);
            break;
            
        case 'competitive':
            result.overallScore = extractScore(textResponse, 'Score global');
            result.competitiveAdvantage = extractTextAfter(textResponse, 'Avantage concurrentiel');
            result.competitors = extractCompetitors(textResponse);
            result.recommendations = extractSectionItems(textResponse, ['Recommandations']);
            break;
            
        default:
            // Pour les autres types, retourner le texte complet
            result.rawResponse = textResponse;
            result.overallAssessment = extractSection(textResponse, ['Évaluation', 'Assessment', 'Résumé', 'Summary']);
            result.recommendations = extractSectionItems(textResponse, ['Recommandations', 'Recommendations']);
    }
    
    // Ajouter des métadonnées
    result.companyName = companyData.name || companyData.companyName || 'Analyse';
    result.sector = companyData.sector || 'Non spécifié';
    result.rawText = textResponse;
    
    return result;
}

// Extraire les items d'une section (liste numérotée ou à puces)
function extractSectionItems(text, sectionTitles) {
    const items = [];
    
    for (const title of sectionTitles) {
        const startRegex = new RegExp(`###?\\s*${title}:?\\s*[\\n]*`, 'i');
        const startMatch = text.match(startRegex);
        
        if (startMatch) {
            const startIndex = startMatch.index + startMatch[0].length;
            let endIndex = text.length;
            
            // Trouver la fin de la section (prochaine section de niveau 2 ou 3)
            const nextSectionMatch = text.substring(startIndex).match(/\n###?\\s*[A-Z]/i);
            if (nextSectionMatch) {
                endIndex = startIndex + nextSectionMatch.index;
            }
            
            const sectionText = text.substring(startIndex, endIndex);
            
            // Extraire les items (listes numérotées ou à puces)
            const lines = sectionText.split('\n');
            for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed === '') continue;
                
                // Match liste numérotée (1., 2., etc.) ou à puces (-, *, •)
                const numberedMatch = trimmed.match(/^(\d+)\.\s+(.+)/);
                const bulletMatch = trimmed.match(/^[-\*•]\s+(.+)/);
                
                if (numberedMatch) {
                    items.push(numberedMatch[2].trim());
                } else if (bulletMatch) {
                    items.push(bulletMatch[1].trim());
                } else if (trimmed && !trimmed.match(/^###?\s*[A-Z]/i)) {
                    // Si ce n'est pas un titre, l'ajouter
                    items.push(trimmed);
                }
            }
            break; // On prend la première section trouvée
        }
    }
    
    return items;
}

// Extraire une section complète (texte)
function extractSection(text, sectionTitles) {
    for (const title of sectionTitles) {
        const startRegex = new RegExp(`###?\\s*${title}:?\\s*[\\n]*`, 'i');
        const startMatch = text.match(startRegex);
        
        if (startMatch) {
            const startIndex = startMatch.index + startMatch[0].length;
            let endIndex = text.length;
            
            const nextSectionMatch = text.substring(startIndex).match(/\n###?\\s*[A-Z]/i);
            if (nextSectionMatch) {
                endIndex = startIndex + nextSectionMatch.index;
            }
            
            const sectionText = text.substring(startIndex, endIndex).trim();
            return sectionText || null;
        }
    }
    return null;
}

// Extraire une force/menace de Porter
function extractForce(text, forceName) {
    const startRegex = new RegExp(`###?\\s*${forceName}:?\\s*[\\n]*`, 'i');
    const startMatch = text.match(startRegex);
    if (startMatch) {
        const startIndex = startMatch.index + startMatch[0].length;
        const nextSection = text.substring(startIndex).match(/\n###?\\s*/);
        const endIndex = nextSection ? startIndex + nextSection.index : text.length;
        const forceText = text.substring(startIndex, endIndex).trim();
        const firstLine = forceText.split('\n')[0].trim();
        return firstLine || 'Non disponible';
    }
    return 'Non disponible';
}

// Extraire un score (nombre entre 0 et 100)
function extractScore(text, forceName) {
    const pattern = new RegExp(`${forceName}[^\\d]*(\\d{1,3})[^\\d]*[/]?\\s*100`);
    const match = text.match(pattern);
    if (match) {
        const score = parseInt(match[1], 10);
        return Math.min(100, Math.max(0, score));
    }
    
    // Chercher juste un nombre suivi de /100
    const scorePattern = /(\d{1,3})\/100/;
    const scoreMatch = text.match(scorePattern);
    if (scoreMatch) {
        return parseInt(scoreMatch[1], 10);
    }
    
    return 0;
}

// Extraire un facteur PESTEL
function extractFactor(text, factorName) {
    const startRegex = new RegExp(`###?\\s*${factorName}:?\\s*[\\n]*`, 'i');
    const startMatch = text.match(startRegex);
    if (startMatch) {
        const startIndex = startMatch.index + startMatch[0].length;
        const nextSection = text.substring(startIndex).match(/\n###?\\s*/);
        const endIndex = nextSection ? startIndex + nextSection.index : text.length;
        const factorText = text.substring(startIndex, endIndex).trim();
        const firstLine = factorText.split('\n')[0].trim();
        return firstLine || 'Non disponible';
    }
    return 'Non disponible';
}

// Extraire les concurrents
function extractCompetitors(text) {
    const competitors = [];
    const pattern = /(Concurrent|Competitor)\s*[\d]*:?\s*([^\n]+)/gi;
    let match;
    while ((match = pattern.exec(text)) !== null) {
        competitors.push({ name: match[2].trim(), overallScore: 0 });
    }
    return competitors.length > 0 ? competitors : null;
}

// Extraire du texte après un label
function extractTextAfter(text, label) {
    const pattern = new RegExp(`${label}[:\\s]*([^\\n]+)`, 'i');
    const match = text.match(pattern);
    return match ? match[1].trim() : 'Non évalué';
}

// Parser SWOT générique (fallback)
function parseGenericSWOT(text) {
    const result = {
        strengths: [],
        weaknesses: [],
        opportunities: [],
        threats: []
    };
    
    const sections = {
        'strengths': ['Forces', 'Strengths'],
        'weaknesses': ['Faiblesses', 'Weaknesses'],
        'opportunities': ['Opportunités', 'Opportunities'],
        'threats': ['Menaces', 'Threats']
    };
    
    for (const [key, titles] of Object.entries(sections)) {
        for (const title of titles) {
            const regex = new RegExp(`###?\\s*${title}:?\\s*[\\n]*([\\s\\S]*?)(?=\\n###?|$)`);
            const match = text.match(regex);
            if (match) {
                const sectionText = match[1];
                const lines = sectionText.split('\n');
                for (const line of lines) {
                    const trimmed = line.trim();
                    if (trimmed && !trimmed.match(/^[##]/)) {
                        const numberedMatch = trimmed.match(/^(\d+)\.\s+(.+)/);
                        const bulletMatch = trimmed.match(/^[-\*•]\s+(.+)/);
                        
                        if (numberedMatch) {
                            result[key].push(numberedMatch[2].trim());
                        } else if (bulletMatch) {
                            result[key].push(bulletMatch[1].trim());
                        } else if (trimmed) {
                            result[key].push(trimmed);
                        }
                    }
                }
                break;
            }
        }
    }
    
    return result;
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
            const mistralResponse = await callMistral(prompt);

            // 4. Parser la réponse pour obtenir une structure JSON
            const structuredResult = parseMistralResponse(mistralResponse, type, data);

            // 5. Déduire les tokens si l'utilisateur n'a pas des tokens illimités
            if (!access.isUnlimited) {
                await deductAITokens(userId, type);
            }

            // 6. Récupérer les tokens mis à jour
            const userDoc = await admin.firestore().collection('users').doc(userId).get();
            const userData = userDoc.exists ? userDoc.data() : {};

            res.json({
                success: true,
                result: structuredResult,
                tokensUsed: access.isUnlimited ? 0 : AI_ANALYSIS_COSTS[type],
                plan: access.plan,
                model: 'mistral-api',
                availableTokens: userData.tokenState?.availableTokens || 0,
                type: type
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
// ENDPOINT POUR DÉDUIRE LES TOKENS D'ANALYSE
// =============================================================================

// Endpoint pour déduire les tokens après une analyse locale
exports.deductAnalysisTokens = functions.https.onRequest(async (req, res) => {
    corsHandler(req, res, async () => {
        if (req.method !== 'POST') {
            return res.status(405).json({ error: 'Method Not Allowed' });
        }

        try {
            const { userId, analysisType } = req.body;
            
            if (!userId || !analysisType) {
                return res.status(400).json({ 
                    error: 'userId et analysisType sont requis'
                });
            }

            // Vérifier l'utilisateur
            const userDoc = await admin.firestore().collection('users').doc(userId).get();
            if (!userDoc.exists) {
                return res.status(404).json({ error: 'Utilisateur non trouvé' });
            }

            const userData = userDoc.data();
            const tokenState = userData.tokenState || {};
            const plan = userData.subscription?.plan || 'free';

            // Vérifier si l'utilisateur a des tokens illimités (plan advisor)
            const isUnlimited = tokenState.baseTokens === -1 || plan === 'advisor';
            
            if (isUnlimited) {
                // Tokens illimités, ne rien déduire
                return res.json({
                    success: true,
                    tokensUsed: 0,
                    availableTokens: -1,
                    message: 'Tokens illimités - Aucune déduction'
                });
            }

            // Vérifier si l'utilisateur a assez de tokens
            const analysisCost = AI_ANALYSIS_COSTS[analysisType] || 100;
            const availableTokens = tokenState.availableTokens || 0;
            
            if (availableTokens < analysisCost) {
                return res.status(403).json({
                    error: 'Solde de tokens insuffisant',
                    availableTokens: availableTokens,
                    required: analysisCost,
                    message: `Vous avez besoin de ${analysisCost - availableTokens} tokens supplémentaires`
                });
            }

            // Déduire les tokens
            await admin.firestore().collection('users').doc(userId).update({
                'tokenState.availableTokens': admin.firestore.FieldValue.increment(-analysisCost),
                'tokenState.usedTokens': admin.firestore.FieldValue.increment(analysisCost),
                lastTokenUpdate: admin.firestore.FieldValue.serverTimestamp()
            });

            // Récupérer les tokens mis à jour
            const updatedUserDoc = await admin.firestore().collection('users').doc(userId).get();
            const updatedTokenState = updatedUserDoc.data().tokenState || {};

            res.json({
                success: true,
                tokensUsed: analysisCost,
                availableTokens: updatedTokenState.availableTokens || 0,
                usedTokens: updatedTokenState.usedTokens || 0,
                totalTokens: updatedTokenState.totalTokens || 0,
                analysisType: analysisType,
                message: `Tokens déduits avec succès: -${analysisCost}`
            });

        } catch (error) {
            console.error('❌ Erreur deductAnalysisTokens:', error);
            res.status(500).json({ 
                error: error.message || 'Erreur serveur'
            });
        }
    });
});

// =============================================================================
// EXPORT DEFAULT
// =============================================================================
module.exports = {
    analyzeWithAI: exports.analyzeWithAI,
    advisorChat: exports.advisorChat,
    deductAnalysisTokens: exports.deductAnalysisTokens,
    setUserPlan: exports.setUserPlan,
    listAdvisorConversations: exports.listAdvisorConversations,
    deleteAdvisorConversation: exports.deleteAdvisorConversation,
    activateSubscription: exports.activateSubscription
};
