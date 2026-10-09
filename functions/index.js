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
            res.status(400).json({ 
                success: false, 
                error: 'Either userId or email must be provided' 
            });
            return;
        }
        
        // Get current user data
        const userRef = db.collection('users').doc(targetUserId);
        const userDoc = await userRef.get();
        
        if (!userDoc.exists) {
            res.status(404).json({ 
                success: false, 
                error: `User ${targetUserId} not found` 
            });
            return;
        }
        
        const userData = userDoc.data();
        const currentPlan = userData.subscription?.plan || userData.plan || userData.tokenState?.plan || 'free';
        
        if (currentPlan === newPlan && !force) {
            res.status(200).json({ 
                success: true, 
                message: 'User already has this plan',
                userId: targetUserId,
                currentPlan: currentPlan
            });
            return;
        }
        
        // Calculate expiry date (30 days from now for paid plans)
        let expiryDate = null;
        let subscriptionStatus = 'active';
        
        if (newPlan !== 'free') {
            expiryDate = new Date();
            expiryDate.setDate(expiryDate.getDate() + 30);
        }
        
        // Create updated tokenState
        const totalTokens = planConfig.baseTokens;
        const usedTokens = Math.min(
            userData.tokenState?.usedTokens || userData.tokensUsed || 0,
            totalTokens === -1 ? Infinity : totalTokens
        );
        const availableTokens = totalTokens === -1 ? -1 : totalTokens - usedTokens;
        
        const now = admin.firestore.FieldValue.serverTimestamp();
        
        const newTokenState = {
            userId: targetUserId,
            plan: newPlan,
            baseTokens: totalTokens,
            bonusTokens: 0,
            totalTokens: totalTokens,
            availableTokens: availableTokens,
            usedTokens: usedTokens,
            lastTokenUpdate: now,
            firstAnalysisDone: userData.tokenState?.firstAnalysisDone || userData.firstAnalysisDone || false,
            monthlyTokensUsed: userData.tokenState?.monthlyTokensUsed || userData.monthlyTokensUsed || 0,
            lastMonthlyReset: now,
            expiresAt: expiryDate?.toISOString() || null,
            isExpired: false,
            hasAccessToAPI: planConfig.hasAI,
            hasAccessToAdvancedAnalytics: planConfig.hasAdvisor,
            hasAccessToPremiumSuggestions: planConfig.hasAdvisor
        };
        
        // Prepare update data
        const updateData = {
            plan: newPlan,
            isPremium: planConfig.isPremium,
            hasAccessToAPI: planConfig.hasAI,
            hasAccessToAdvancedAnalytics: planConfig.hasAdvisor,
            hasAccessToPremiumSuggestions: planConfig.hasAdvisor,
            availableTokens: availableTokens,
            tokensUsed: usedTokens,
            totalTokens: totalTokens,
            tokenState: newTokenState,
            'subscription.plan': newPlan,
            'subscription.status': subscriptionStatus,
            'subscription.price': planConfig.price,
            subscription: {
                plan: newPlan,
                status: subscriptionStatus,
                price: planConfig.price,
                expiresAt: expiryDate?.toISOString() || null,
                lastPaymentDate: now,
                lastRenewalDate: now,
                paymentReceived: true
            }
        };
        
        // Apply update
        await userRef.update(updateData);
        
        res.status(200).json({ 
            success: true, 
            message: `User plan changed from ${currentPlan} to ${newPlan}`,
            userId: targetUserId,
            oldPlan: currentPlan,
            newPlan: newPlan,
            tokens: totalTokens === -1 ? 'Unlimited' : totalTokens,
            hasAI: planConfig.hasAI,
            hasAdvisor: planConfig.hasAdvisor
        });
        
    } catch (error) {
        console.error('Error changing user plan:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message || 'Internal server error' 
        });
    }
});

/**
 * Cloud Function pour obtenir les informations d'un utilisateur
 * Méthode: GET
 * URL: /getUserInfo?userId=... ou ?email=...
 */
exports.getUserInfo = functions.https.onRequest(async (req, res) => {
    // CORS headers
    res.set('Access-Control-Allow-Origin', '*');
    
    if (req.method !== 'GET') {
        res.status(405).json({ success: false, error: 'Method not allowed' });
        return;
    }
    
    try {
        const { userId, email } = req.query;
        
        let targetUserId;
        if (userId) {
            targetUserId = userId;
        } else if (email) {
            const usersSnapshot = await db.collection('users').where('email', '==', email).limit(1).get();
            if (usersSnapshot.empty) {
                res.status(404).json({ success: false, error: `User with email ${email} not found` });
                return;
            }
            targetUserId = usersSnapshot.docs[0].id;
        } else {
            res.status(400).json({ success: false, error: 'Either userId or email must be provided' });
            return;
        }
        
        const userDoc = await db.collection('users').doc(targetUserId).get();
        
        if (!userDoc.exists) {
            res.status(404).json({ success: false, error: `User ${targetUserId} not found` });
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

// Exporter les fonctions existantes si elles existent
try {
    const existingExports = require('./existing-functions');
    Object.assign(exports, existingExports);
} catch (e) {
    // Ignorer si le fichier n'existe pas
}
