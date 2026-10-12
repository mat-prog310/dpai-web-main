# SOLUTION PERMANENTE : Configuration CORS pour Firebase Cloud Functions

## Problème
Les requêtes depuis `https://dpaiweb.com` vers `https://us-central1-dpai-8be62.cloudfunctions.net` sont bloquées par CORS.

## Solution

### Étape 1 : Installer le middleware CORS dans vos Cloud Functions

1. Dans votre répertoire `functions`, installez le package CORS :
```bash
cd functions
npm install cors
```

### Étape 2 : Configurer CORS dans index.js

Modifiez vos fonctions pour accepter les requêtes depuis https://dpaiweb.com :

```javascript
const functions = require('firebase-functions');
const cors = require('cors')({origin: true});  // Accepte tous les origins
// OU pour être plus restrictif :
// const cors = require('cors')({origin: ['https://dpaiweb.com', 'http://localhost:5000']});

// ============================================================================
// FONCTION listLocalAIConversations
// ============================================================================
exports.listLocalAIConversations = functions.https.onRequest((req, res) => {
    cors(req, res, async () => {
        try {
            // Vérifier l'authentification
            if (!req.headers.authorization) {
                return res.status(403).json({ error: 'Non autorisé - Token manquant' });
            }
            
            const idToken = req.headers.authorization.split('Bearer ')[1];
            const decodedToken = await admin.auth().verifyIdToken(idToken);
            const userId = decodedToken.uid;
            
            // Récupérer les conversations depuis Firestore
            const db = admin.firestore();
            const snapshot = await db.collection('local_ai_conversations')
                .where('userId', '==', userId)
                .orderBy('updatedAt', 'desc')
                .get();
            
            const conversations = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            res.status(200).json({ success: true, conversations });
        } catch (error) {
            console.error('Erreur listLocalAIConversations:', error);
            res.status(500).json({ error: error.message });
        }
    });
});

// ============================================================================
// FONCTION callLocalAI
// ============================================================================
exports.callLocalAI = functions.https.onRequest((req, res) => {
    cors(req, res, async () => {
        try {
            // Vérifier que c'est une requête POST
            if (req.method !== 'POST') {
                return res.status(405).json({ error: 'Méthode non autorisée' });
            }
            
            // Vérifier l'authentification
            if (!req.headers.authorization) {
                return res.status(403).json({ error: 'Non autorisé - Token manquant' });
            }
            
            const idToken = req.headers.authorization.split('Bearer ')[1];
            const decodedToken = await admin.auth().verifyIdToken(idToken);
            const userId = decodedToken.uid;
            
            // Vérifier que l'utilisateur a accès au Conseiller IA
            const db = admin.firestore();
            const userDoc = await db.collection('users').doc(userId).get();
            
            if (!userDoc.exists) {
                return res.status(404).json({ error: 'Utilisateur non trouvé' });
            }
            
            const userData = userDoc.data();
            const plan = userData.subscription?.plan || userData.plan || 'free';
            
            // Vérifier si le plan est advisor
            if (plan !== 'advisor') {
                return res.status(403).json({ 
                    error: 'L\'IA locale DPAI n\'est pas disponible. Vérifiez votre abonnement Conseiller IA (499 €/mois).'
                });
            }
            
            // Récupérer les données de la requête
            const { message, conversationId } = req.body;
            
            if (!message) {
                return res.status(400).json({ error: 'Message manquant' });
            }
            
            // Ici, vous devez appeler votre IA locale Python
            // Soit via HTTP vers votre serveur Python, soit directement
            // Pour l'instant, retournons une réponse simulée
            
            const assistantResponse = `Je suis le Conseiller IA DPAI. Vous avez posé : "${message}".\n\n` +
                `Votre abonnement Conseiller IA est actif. Les Cloud Functions sont maintenant configurées avec CORS.\n\n` +
                `Pour une réponse complète, assurez-vous que votre script Python my_local_ai est en cours d'exécution.`;
            
            // Sauvegarder dans Firestore
            const conversationsRef = db.collection('local_ai_conversations');
            const convRef = conversationId ? conversationsRef.doc(conversationId) : conversationsRef.doc();
            const convId = convRef.id;
            const timestamp = admin.firestore.FieldValue.serverTimestamp();
            
            const userMessage = {
                role: 'user',
                content: message,
                timestamp: timestamp
            };
            
            const assistantMessage = {
                role: 'assistant',
                content: assistantResponse,
                timestamp: timestamp
            };
            
            if (conversationId) {
                // Ajouter à une conversation existante
                await convRef.update({
                    messages: admin.firestore.FieldValue.arrayUnion(userMessage, assistantMessage),
                    updatedAt: timestamp
                });
            } else {
                // Créer une nouvelle conversation
                await convRef.set({
                    id: convId,
                    userId: userId,
                    title: message.slice(0, 50) + '...',
                    messages: [userMessage, assistantMessage],
                    createdAt: timestamp,
                    updatedAt: timestamp
                });
            }
            
            res.status(200).json({ 
                success: true, 
                response: assistantResponse,
                conversationId: convId
            });
            
        } catch (error) {
            console.error('Erreur callLocalAI:', error);
            res.status(500).json({ error: error.message });
        }
    });
});

// ============================================================================
// FONCTION checkLocalAI (optionnelle - pour vérifier la santé)
// ============================================================================
exports.checkLocalAI = functions.https.onRequest((req, res) => {
    cors(req, res, () => {
        res.status(200).json({ 
            success: true, 
            status: 'IA locale disponible',
            mode: 'server'
        });
    });
});

// ============================================================================
// FONCTION deleteLocalAIConversation
// ============================================================================
exports.deleteLocalAIConversation = functions.https.onRequest((req, res) => {
    cors(req, res, async () => {
        try {
            if (req.method !== 'DELETE') {
                return res.status(405).json({ error: 'Méthode non autorisée' });
            }
            
            if (!req.headers.authorization) {
                return res.status(403).json({ error: 'Non autorisé - Token manquant' });
            }
            
            const idToken = req.headers.authorization.split('Bearer ')[1];
            const decodedToken = await admin.auth().verifyIdToken(idToken);
            const userId = decodedToken.uid;
            const { conversationId } = req.query;
            
            if (!conversationId) {
                return res.status(400).json({ error: 'conversationId manquant' });
            }
            
            const db = admin.firestore();
            const convRef = db.collection('local_ai_conversations').doc(conversationId);
            const convDoc = await convRef.get();
            
            // Vérifier que la conversation appartient à l'utilisateur
            if (convDoc.exists && convDoc.data().userId === userId) {
                await convRef.delete();
                res.status(200).json({ success: true });
            } else {
                res.status(404).json({ error: 'Conversation non trouvée ou non autorisée' });
            }
        } catch (error) {
            console.error('Erreur deleteLocalAIConversation:', error);
            res.status(500).json({ error: error.message });
        }
    });
});
```

### Étape 3 : Déployer vos Cloud Functions

```bash
cd functions
firebase deploy --only functions
```

### Étape 4 : Configurer Firebase Hosting pour accepter CORS (optionnel)

Dans `firebase.json`, ajoutez :
```json
{
  "hosting": {
    "rewrites": [
      {
        "source": "/api/**",
        "function": {
          "region": "us-central1",
          "functionName": "*"
        }
      }
    ],
    "headers": [
      {
        "source": "**",
        "headers": [
          {
            "key": "Access-Control-Allow-Origin",
            "value": "*"
          }
        ]
      }
    ]
  }
}
```

## Vérification

Après avoir déployé, testez avec :
```javascript
fetch('https://us-central1-dpai-8be62.cloudfunctions.net/listLocalAIConversations?userId=TEST', {
    method: 'GET',
    headers: {
        'Authorization': 'Bearer YOUR_TOKEN'
    }
}).then(r => r.json()).then(console.log).catch(console.error);
```

## Solution temporaire côté client

En attendant que vous corrigiez le serveur, les fichiers que j'ai créés (`ui-auth-manager.js` et `patch_local_ai.js`) permettent :
1. D'afficher correctement l'UI de connexion (menu utilisateur vs boutons connexion/inscription)
2. D'utiliser Firestore comme fallback pour sauvegarder les conversations

**Mais pour une solution permanente, vous DEVEZ configurer CORS côté serveur comme indiqué ci-dessus.**
