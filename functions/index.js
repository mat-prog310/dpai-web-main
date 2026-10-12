/**
 * Firebase Cloud Functions pour DPAI Web
 * Gère l'IA locale, la gestion des utilisateurs, et les services premium
 * 
 * CORRIGÉ : Ajout du middleware CORS et intégration IA locale
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors')({origin: true});

// Initialiser Firebase Admin
if (!admin.apps.length) {
    admin.initializeApp();
}

const db = admin.firestore();

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
        name: 'Conseiller IA',
        baseTokens: -1,
        hasAI: true,
        hasAdvisor: true,
        price: 499,
        isPremium: true
    }
};

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
            const plan = userData.subscription?.plan || userData.plan || userData.tokenState?.plan || 'free';
            const expiryDate = userData.subscription?.expiresAt;
            const isExpired = expiryDate ? new Date(expiryDate) < new Date() : false;
            
            if (plan !== 'advisor' || isExpired) {
                res.status(403).json({
                    success: false,
                    error: 'Accès réservé aux abonnés Conseiller IA (499 €/mois). Votre abonnement est expiré ou non actif.'
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
