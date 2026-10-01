// =============================================================================
// AI-INTEGRATION.JS - Intégration complète de Mistral pour DPAI
// Ce fichier contient les fonctions utilitaires pour l'IA
// =============================================================================

const axios = require('axios');
const admin = require('firebase-admin');

// Importer les prompts DPAI
const {
    DPAI_CONTEXT,
    SWOT_PROMPT,
    PORTER_PROMPT,
    ADVISOR_PROMPT,
    SECTOR_DATA,
    getSectorGrowth,
    getSectorMultiple,
    getSectorCompetitors,
    getSectorCompetitorCount,
    getSectorBarriers,
    getCustomerPower,
    getSupplierPower
} = require('./prompt/dpai-prompts');

// =============================================================================
// CONFIGURATION
// =============================================================================

// Récupérer la clé Mistral depuis les variables d'environnement
const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY || 
    (typeof functions !== 'undefined' ? functions.config().mistral?.key : null) ||
    "mstrl_OUgXuc71KYyO2QoWZ8h0okTn14wCYUnG_20gLSU";

const MISTRAL_API_URL = "https://api.mistral.ai/v1/chat/completions";

// Coûts des analyses IA en tokens DPAI
const AI_ANALYSIS_COSTS = {
    swot: 80,
    porter: 100,
    pestel: 90,
    due_diligence: 150,
    valuation: 200,
    recommendation: 50
};

// =============================================================================
// FONCTIONS D'APPEL À MISTRAL
// =============================================================================

/**
 * Appelle l'API Mistral avec un prompt
 * @param {string} prompt - Le prompt à envoyer
 * @param {string} model - Le modèle à utiliser (default: mistral-large)
 * @returns {Promise<string>} La réponse de Mistral
 */
async function callMistral(prompt, model = "mistral-large") {
    try {
        // Si on est dans Firebase Functions, utiliser fetch
        if (typeof fetch !== 'undefined') {
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
        }
        // Sinon, utiliser axios (pour les tests locaux)
        else {
            const response = await axios.post(MISTRAL_API_URL, {
                model: model,
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.3,
                max_tokens: 2000
            }, {
                headers: {
                    'Authorization': `Bearer ${MISTRAL_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.data.choices || !response.data.choices[0]) {
                throw new Error('Pas de réponse de Mistral');
            }
            return response.data.choices[0].message.content;
        }
    } catch (error) {
        console.error('❌ Erreur Mistral:', error.response?.data || error.message);
        throw new Error('Erreur avec l\'API Mistral: ' + (error.response?.data?.error || error.message));
    }
}

/**
 * Exécute une analyse avec IA (SWOT, Porter, etc.)
 * @param {string} userId - ID de l'utilisateur
 * @param {string} type - Type d'analyse (swot, porter, etc.)
 * @param {Object} data - Données pour l'analyse
 * @returns {Promise<{success: boolean, result: string, tokensUsed: number}>}
 */
async function runAIAnalysis(userId, type, data) {
    const db = admin.firestore();

    // 1. Vérifier l'utilisateur
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
        throw new Error('Utilisateur non trouvé');
    }

    const userData = userDoc.data();
    const plan = userData.subscription?.plan || 'free';

    // 2. Vérifier l'accès à l'IA
    if (plan !== 'api_monthly' && plan !== 'advisor') {
        throw new Error('Accès IA non autorisé. Abonnement API Monthly ou Conseiller IA requis.');
    }

    // 3. Générer le prompt
    let prompt;
    switch (type) {
        case 'swot':
            prompt = SWOT_PROMPT(data);
            break;
        case 'porter':
            prompt = PORTER_PROMPT(data);
            break;
        case 'pestel':
            prompt = generatePestelPrompt(data);
            break;
        case 'valuation':
            prompt = generateValuationPrompt(data);
            break;
        case 'recommendation':
            prompt = generateRecommendationPrompt(data);
            break;
        default:
            throw new Error('Type d\'analyse inconnu');
    }

    // 4. Appeler Mistral
    const response = await callMistral(prompt);

    // 5. Déduire les tokens si l'utilisateur n'est pas en advisor
    if (plan !== 'advisor') {
        const tokenCost = AI_ANALYSIS_COSTS[type] || 100;
        await db.collection('users').doc(userId).update({
            'tokenState.availableTokens': admin.firestore.FieldValue.increment(-tokenCost),
            'tokenState.usedTokens': admin.firestore.FieldValue.increment(tokenCost),
            lastTokenUpdate: admin.firestore.FieldValue.serverTimestamp()
        });
    }

    return {
        success: true,
        result: response,
        tokensUsed: plan === 'advisor' ? 0 : AI_ANALYSIS_COSTS[type]
    };
}

/**
 * Gère une conversation avec le Conseiller IA
 * @param {string} userId - ID de l'utilisateur
 * @param {string} message - Message de l'utilisateur
 * @param {string|null} conversationId - ID de la conversation (null pour nouvelle)
 * @returns {Promise<{success: boolean, response: string, conversationId: string}>}
 */
async function advisorChat(userId, message, conversationId = null) {
    const db = admin.firestore();

    // 1. Vérifier l'utilisateur
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
        throw new Error('Utilisateur non trouvé');
    }

    const userData = userDoc.data();
    const plan = userData.subscription?.plan || 'free';

    // 2. Vérifier l'accès au Conseiller IA
    if (plan !== 'advisor') {
        throw new Error('Abonnement Conseiller IA requis (499 €/mois)');
    }

    // 3. Récupérer le contexte de la conversation
    let context = null;
    if (conversationId) {
        const convDoc = await db.collection('advisor_conversations').doc(conversationId).get();
        if (convDoc.exists) {
            const messages = convDoc.data().messages || [];
            context = messages.slice(-5).map(msg => `${msg.role === 'user' ? 'Utilisateur' : 'Conseiller'} : ${msg.content}`).join('\n');
        }
    }

    // 4. Générer le prompt
    const prompt = ADVISOR_PROMPT(message, context);

    // 5. Appeler Mistral
    const response = await callMistral(prompt);

    // 6. Sauvegarder la conversation
    const newConversationId = conversationId || db.collection('advisor_conversations').doc().id;
    const conversationRef = db.collection('advisor_conversations').doc(newConversationId);

    let existingConversation = {};
    if (conversationId) {
        const doc = await conversationRef.get();
        if (doc.exists) {
            existingConversation = doc.data();
        }
    }

    const messages = [
        ...(existingConversation.messages || []),
        { role: 'user', content: message, timestamp: admin.firestore.FieldValue.serverTimestamp() },
        { role: 'assistant', content: response, timestamp: admin.firestore.FieldValue.serverTimestamp() }
    ];

    await conversationRef.set({
        userId: userId,
        messages: messages,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: existingConversation.createdAt || admin.firestore.FieldValue.serverTimestamp()
    });

    return {
        success: true,
        response: response,
        conversationId: newConversationId
    };
}

// =============================================================================
// FONCTIONS UTILITAIRES POUR LES PROMPTS MANQUANTS
// =============================================================================

/**
 * Génère un prompt PESTEL
 */
function generatePestelPrompt(companyData) {
    return `${DPAI_CONTEXT}

**Mission :**
Réalise une **analyse PESTEL ultra-personnalisée** pour cette entreprise, en utilisant **uniquement** les données fournies et notre méthodologie DPAI.

**Données de l'entreprise :**
- **Nom** : ${companyData.name || 'Non spécifié'}
- **Secteur** : ${companyData.sector || 'Non spécifié'}
- **Chiffre d'affaires** : ${companyData.revenue || 'Non spécifié'} €
- **Marché cible** : ${companyData.targetMarket || 'Non spécifié'}
- **Pays** : ${companyData.country || 'France'}

**Données marché (secteur : ${companyData.sector || 'Inconnu'}) :**
- Croissance annuelle moyenne : **${getSectorGrowth(companyData.sector) || '3-5%'}**
- Principaux concurrents : ${getSectorCompetitors(companyData.sector) || 'Non renseignés'}

**Format attendu :**
## 📊 Analyse PESTEL pour [Nom] (Secteur : [Secteur])

### 🌍 **Politique**
- **Facteurs** : [Liste des facteurs politiques impactant le secteur]
- **Impact** : [Analyse de l'impact sur l'entreprise]
- **Recommandation DPAI** : [Solution]

### 💰 **Économique**
- **Facteurs** : [Liste des facteurs économiques]
- **Impact** : [Analyse]
- **Recommandation DPAI** : [Solution]

### 👥 **Socioculturel**
- **Facteurs** : [Liste]
- **Impact** : [Analyse]
- **Recommandation DPAI** : [Solution]

### 🧪 **Technologique**
- **Facteurs** : [Liste]
- **Impact** : [Analyse]
- **Recommandation DPAI** : [Solution]

### 📜 **Environnemental**
- **Facteurs** : [Liste]
- **Impact** : [Analyse]
- **Recommandation DPAI** : [Solution]

### ⚖️ **Légal**
- **Facteurs** : [Liste]
- **Impact** : [Analyse]
- **Recommandation DPAI** : [Solution]

**Synthèse :**
- **Principales opportunités** : [Top 3]
- **Principaux risques** : [Top 3]

**Prochaines étapes :**
- [Étape 1]
- [Étape 2]

**⚠️ Important :**
- **Ne pas utiliser de placeholders**
- **Toujours inclure des exemples concrets**
- **Proposer des solutions DPAI**`;
}

/**
 * Génère un prompt de valorisation
 */
function generateValuationPrompt(companyData) {
    return `${DPAI_CONTEXT}

**Mission :**
Estimer la **valorisation** de cette entreprise en utilisant **notre méthodologie DPAI** et des **chiffres concrets**.

**Données de l'entreprise :**
- **Nom** : ${companyData.name || 'Non spécifié'}
- **Secteur** : ${companyData.sector || 'Non spécifié'}
- **Chiffre d'affaires** : ${companyData.revenue || 'Non spécifié'} €
- **EBITDA** : ${companyData.ebitda || 'Non spécifié'} €
- **Marge brute** : ${companyData.grossMargin || 'Non spécifié'}%
- **Croissance CA** : ${companyData.revenueGrowth || 'Non spécifié'}%
- **Nombre d'employés** : ${companyData.employees || 'Non spécifié'}

**Données marché (secteur : ${companyData.sector || 'Inconnu'}) :**
- Croissance annuelle moyenne : **${getSectorGrowth(companyData.sector) || '3-5%'}**
- Multiple d'EBITDA moyen : **${getSectorMultiple(companyData.sector) || '8-12x'}**

**Format attendu :**
## 📊 Valorisation pour [Nom] (Secteur : [Secteur])

**Contexte :**
[1 phrase résumant la situation]

### 💰 **Méthodologie DPAI**
1. **Approche des multiples** :
   - Multiple de base : [Calcul basé sur le secteur]
   - Ajustements : [Liste des ajustements avec explications]
   - Résultat : **X M€ - Y M€**

2. **Approche DCF** (si données disponibles) :
   - Flux de trésorerie estimés : [Calculs]
   - Taux d'actualisation : [Valeur]
   - Résultat : **Z M€**

3. **Approche des actifs nets** (si applicable) :
   - Valeur des actifs : [Calcul]
   - Résultat : **W M€**

### 🎯 **Valorisation Estimée**
- **Fourchette recommandée** : **X M€ - Y M€**
- **Valeur médiane** : **Z M€**
- **Justification** : [Explication détaillée]

### ⚙️ **Paramètres Clés**
- Multiple final utilisé : **[Valeur]x EBITDA**
- Croissance intégrée : **[Valeur]%**
- Risque pris en compte : **[Description]**

### 💡 **Recommandations DPAI**
1. **Stratégie de négociation** : [Conseils]
2. **Points à vérifier** : [Liste]
3. **Pièges à éviter** : [Liste]

**Prochaines étapes :**
- [Étape 1]
- [Étape 2]

**⚠️ Important :**
- **Toujours inclure des chiffres concrets**
- **Citer des cas similaires traités par DPAI**
- **Proposer des solutions actionnables**`;
}

/**
 * Génère un prompt de recommandation
 */
function generateRecommendationPrompt(data) {
    return `${DPAI_CONTEXT}

**Mission :**
Proposer des **recommandations stratégiques actionnables** pour cette situation, en utilisant **notre expertise DPAI**.

**Contexte :**
${data.context || 'Non spécifié'}

**Objectifs :**
${data.goals ? data.goals.map(g => `- ${g}`).join('\n') : 'Non spécifiés'}

**Contraintes :**
${data.constraints ? data.constraints.map(c => `- ${c}`).join('\n') : 'Aucune'}

**Format attendu :**
## 💡 Recommandations Stratégiques DPAI

**Contexte :**
[1-2 phrases résumant la situation]

### 📊 **Analyse**
1. [Point clé 1] → **Impact** : [Explication]
2. [Point clé 2] → **Impact** : [Explication]
3. [Point clé 3] → **Impact** : [Explication]

### 🎯 **Recommandations** (3-5 actions prioritaires)
1. **Recommandation 1**
   - **Action** : [Étapes concrètes]
   - **Budget** : [Estimation]
   - **Délai** : [Estimation]
   - **ROI estimé** : [Chiffre si possible]

2. **Recommandation 2**
   - **Action** : [Étapes concrètes]
   - **Budget** : [Estimation]
   - **Délai** : [Estimation]
   - **ROI estimé** : [Chiffre si possible]

3. **Recommandation 3**
   - **Action** : [Étapes concrètes]
   - **Budget** : [Estimation]
   - **Délai** : [Estimation]
   - **ROI estimé** : [Chiffre si possible]

### ⚡ **Priorités**
1. [Recommandation la plus urgente]
2. [Recommandation secondaire]
3. [Recommandation tertiaire]

**Prochaines étapes :**
- [Étape 1]
- [Étape 2]

**⚠️ Important :**
- **Être ultra-spécifique**
- **Donner des exemples concrets**
- **Proposer des KPIs pour mesurer le succès**`;
}

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = {
    callMistral,
    runAIAnalysis,
    advisorChat,
    AI_ANALYSIS_COSTS,
    generatePestelPrompt,
    generateValuationPrompt,
    generateRecommendationPrompt,
    getConversationContext: async (userId, conversationId) => {
        if (!conversationId) return null;
        const db = admin.firestore();
        const convDoc = await db.collection('advisor_conversations').doc(conversationId).get();
        if (convDoc.exists) {
            const messages = convDoc.data().messages || [];
            return messages.slice(-5).map(msg => `${msg.role === 'user' ? 'Utilisateur' : 'Conseiller'} : ${msg.content}`).join('\n');
        }
        return null;
    },
    saveConversation: async (userId, userMessage, aiResponse, conversationId) => {
        const db = admin.firestore();
        const newConversationId = conversationId || db.collection('advisor_conversations').doc().id;
        const conversationRef = db.collection('advisor_conversations').doc(newConversationId);

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
};
