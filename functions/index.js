/**
 * Firebase Cloud Functions pour DPAI Web
 * Gère les appels à l'API Mistral, la gestion des utilisateurs, et les services premium
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');

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

/**
 * Cloud Function pour changer le plan d'un utilisateur
 * Méthode: POST
 * URL: /changeUserPlan
 * Body: { userId: string, newPlan: string, force?: boolean }
 * ou { email: string, newPlan: string, force?: boolean }
 */
exports.changeUserPlan = functions.https.onRequest(async (req, res) => {
    // CORS headers
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    // Handle preflight
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }
    
    // Only allow POST
    if (req.method !== 'POST') {
        res.status(405).json({ 
            success: false, 
            error: 'Method not allowed. Use POST.' 
        });
        return;
    }
    
    try {
        const body = req.body;
        const { userId, email, newPlan, force = false } = body;
        
        if (!newPlan) {
            res.status(400).json({ 
                success: false, 
                error: 'newPlan is required' 
            });
            return;
        }
        
        const planConfig = PLAN_CONFIGS[newPlan];
        if (!planConfig) {
            res.status(400).json({ 
                success: false, 
                error: `Invalid plan: ${newPlan}. Valid plans: ${Object.keys(PLAN_CONFIGS).join(', ')}` 
            });
            return;
        }
        
        // Find user by ID or email
        let targetUserId;
        if (userId) {
            targetUserId = userId;
        } else if (email) {
            const usersSnapshot = await db.collection('users').where('email', '==', email).limit(1).get();
            if (usersSnapshot.empty) {
                res.status(404).json({ 
                    success: false, 
                    error: `User with email ${email} not found` 
                });
                return;
            }
            targetUserId = usersSnapshot.docs[0].id;
        } else {
            res.status(400).json({ success: false, error: 'Either userId or email must be provided' });
            return;
        }
        
        const userDoc = await db.collection('users').doc(targetUserId).get();
        
        if (!userDoc.exists) {
            res.status(404).json({ 
                success: false, 
                error: `User ${targetUserId} not found` 
            });
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
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * Cloud Function pour lister tous les utilisateurs avec leur plan
 * Méthode: GET
 * URL: /listUsers
 * Note: Réservé aux administrateurs
 */
exports.listUsers = functions.https.onRequest(async (req, res) => {
    // CORS headers
    res.set('Access-Control-Allow-Origin', '*');
    
    if (req.method !== 'GET') {
        res.status(405).json({ success: false, error: 'Method not allowed' });
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
        
        res.status(200).json({ 
            success: true,
            total: users.length,
            users: users
        });
        
    } catch (error) {
        console.error('Error listing users:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// =============================================================================
// FONCTIONS POUR LE CONSEILLER IA LOCALE
// =============================================================================

/**
 * Cloud Function pour appeler l'IA locale
 * Méthode: POST
 * URL: /callLocalAI
 * Body: { userId: string, message: string, conversationId?: string }
 */
exports.callLocalAI = functions.https.onRequest(async (req, res) => {
    // CORS headers
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    // Handle preflight
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }
    
    if (req.method !== 'POST') {
        res.status(405).json({ success: false, error: 'Method not allowed' });
        return;
    }
    
    try {
        const body = req.body;
        const { userId, message, conversationId } = body;
        
        if (!userId || !message) {
            res.status(400).json({ 
                success: false, 
                error: 'userId and message are required' 
            });
            return;
        }
        
        // Vérifier que l'utilisateur a accès au Conseiller IA
        const userDoc = await db.collection('users').doc(userId).get();
        if (!userDoc.exists) {
            res.status(404).json({ success: false, error: 'User not found' });
            return;
        }
        
        const userData = userDoc.data();
        const plan = userData.subscription?.plan || userData.plan || 'free';
        const expiryDate = userData.subscription?.expiresAt;
        const isExpired = expiryDate ? new Date(expiryDate) < new Date() : false;
        
        if (plan !== 'advisor' || isExpired) {
            res.status(403).json({ 
                success: false, 
                error: 'Acces reserve aux abonnes Conseiller IA (499 Euro/mois)' 
            });
            return;
        }
        
        // Créer ou mettre à jour la conversation
        let convId = conversationId;
        const conversationsRef = db.collection('local_ai_conversations');
        
        if (!convId) {
            // Nouvelle conversation
            const newConv = {
                userId: userId,
                messages: [
                    {
                        role: 'user',
                        content: message,
                        timestamp: admin.firestore.FieldValue.serverTimestamp()
                    }
                ],
                title: message.slice(0, 50) + (message.length > 50 ? '...' : ''),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            };
            
            const convRef = await conversationsRef.add(newConv);
            convId = convRef.id;
        }
        
        // Ajouter le message utilisateur à la conversation existante
        if (convId && conversationId) {
            await conversationsRef.doc(convId).update({
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                messages: admin.firestore.FieldValue.arrayUnion({
                    role: 'user',
                    content: message,
                    timestamp: admin.firestore.FieldValue.serverTimestamp()
                })
            });
        }
        
        // TODO: Ici, appeler l'IA locale Python pour générer la réponse
        // Pour l'instant, retourner une réponse simulée
        const assistantResponse = "Desole, l'IA locale n'est pas encore connectee. Veuillez lancer le serveur Python local avec: python my_local_ai/api_server.py ou contactez le support pour activer votre acces Conseiller IA.";
        
        // Mettre à jour avec la réponse de l'IA
        await conversationsRef.doc(convId).update({
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            messages: admin.firestore.FieldValue.arrayUnion({
                role: 'assistant',
                content: assistantResponse,
                timestamp: admin.firestore.FieldValue.serverTimestamp()
            })
        });
        
        res.status(200).json({ 
            success: true,
            response: assistantResponse,
            conversationId: convId
        });
        
    } catch (error) {
        console.error('Error in callLocalAI:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * Cloud Function pour lister les conversations d'un utilisateur
 * Méthode: GET
 * URL: /listLocalAIConversations?userId=string
 */
exports.listLocalAIConversations = functions.https.onRequest(async (req, res) => {
    // CORS headers
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    // Handle preflight
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }
    
    if (req.method !== 'GET') {
        res.status(405).json({ success: false, error: 'Method not allowed' });
        return;
    }
    
    try {
        const userId = req.query.userId;
        
        if (!userId) {
            res.status(400).json({ success: false, error: 'userId is required' });
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
        
        res.status(200).json({ 
            success: true,
            conversations: conversations
        });
        
    } catch (error) {
        console.error('Error in listLocalAIConversations:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * Cloud Function pour supprimer une conversation
 * Méthode: DELETE
 * URL: /deleteLocalAIConversation?userId=string&conversationId=string
 */
exports.deleteLocalAIConversation = functions.https.onRequest(async (req, res) => {
    // CORS headers
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'DELETE, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    // Handle preflight
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }
    
    if (req.method !== 'DELETE') {
        res.status(405).json({ success: false, error: 'Method not allowed' });
        return;
    }
    
    try {
        const userId = req.query.userId;
        const conversationId = req.query.conversationId;
        
        if (!userId || !conversationId) {
            res.status(400).json({ success: false, error: 'userId and conversationId are required' });
            return;
        }
        
        // Vérifier que la conversation appartient à l'utilisateur
        const convDoc = await db.collection('local_ai_conversations').doc(conversationId).get();
        if (!convDoc.exists || convDoc.data().userId !== userId) {
            res.status(403).json({ success: false, error: 'Unauthorized' });
            return;
        }
        
        await db.collection('local_ai_conversations').doc(conversationId).delete();
        
        res.status(200).json({ success: true });
        
    } catch (error) {
        console.error('Error in deleteLocalAIConversation:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Exporter les fonctions existantes si elles existent
try {
    const existingExports = require('./existing-functions');
    Object.assign(exports, existingExports);
} catch (e) {
    // Ignorer si le fichier n'existe pas
}
