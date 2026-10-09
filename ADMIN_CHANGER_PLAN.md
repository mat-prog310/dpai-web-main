# Guide Administrateur : Changer le Plan d'un Utilisateur

Ce guide explique comment changer manuellement le plan d'un utilisateur dans Firestore pour qu'il passe à `free`, `api_monthly` ou `advisor` sans blocage.

## 📋 Problème Identifié

Quand vous changez manuellement le champ `plan` ou `subscription.plan` dans Firestore, le système ne synchronise pas automatiquement :
- `tokenState.plan`
- `tokenState.availableTokens` (doit être -1 pour advisor)
- `tokenState.totalTokens` (doit être -1 pour advisor)
- `hasAccessToAPI`
- `hasAccessToAdvancedAnalytics`
- `hasAccessToPremiumSuggestions`

Cela cause un blocage, surtout pour le plan **advisor**.

---

## ✅ Solutions Disponibles

### 1️⃣ **Script Node.js (Recommandé pour usage local)**

Utilisez le script `functions/change-user-plan.js` pour changer le plan directement depuis votre terminal.

#### Installation
```bash
cd functions
npm install firebase-admin
```

#### Usage
```bash
# Changer le plan d'un utilisateur par email
node change-user-plan.js matthias.duprey1@gmail.com advisor

# Changer le plan d'un utilisateur par userId
node change-user-plan.js user123456 advisor

# Forcer le changement même si le plan est déjà le bon
node change-user-plan.js matthias.duprey1@gmail.com advisor --force

# Lister tous les utilisateurs
node change-user-plan.js --list
```

#### Plans Disponibles
- `free` - Gratuit (500 tokens, pas d'IA)
- `api_monthly` - API Mensuel (1000 tokens, accès IA, 199€/mois)
- `advisor` - Conseiller IA (tokens illimités, accès complet, 499€/mois)

---

### 2️⃣ **Cloud Function (Pour usage via HTTP)**

Déployez la fonction `changeUserPlan` dans `functions/index.js`.

#### Déploiement
```bash
# Déployer toutes les fonctions
firebase deploy --only functions

# Ou juste cette fonction
firebase deploy --only functions:changeUserPlan
```

#### Appel HTTP
```bash
# POST request
curl -X POST \
  https://YOUR-REGION-YOUR-PROJECT.cloudfunctions.net/changeUserPlan \
  -H 'Content-Type: application/json' \
  -d '{"email": "matthias.duprey1@gmail.com", "newPlan": "advisor"}'

# Avec userId
curl -X POST \
  https://YOUR-REGION-YOUR-PROJECT.cloudfunctions.net/changeUserPlan \
  -H 'Content-Type: application/json' \
  -d '{"userId": "user123456", "newPlan": "advisor"}'

# Forcer le changement
curl -X POST \
  https://YOUR-REGION-YOUR-PROJECT.cloudfunctions.net/changeUserPlan \
  -H 'Content-Type: application/json' \
  -d '{"email": "matthias.duprey1@gmail.com", "newPlan": "advisor", "force": true}'
```

#### Réponse
```json
{
  "success": true,
  "message": "User plan changed from free to advisor",
  "userId": "abc123",
  "oldPlan": "free",
  "newPlan": "advisor",
  "tokens": "Unlimited",
  "hasAI": true,
  "hasAdvisor": true
}
```

---

### 3️⃣ **Depuis Firebase Console (Manuel)**

Si vous devez changer le plan manuellement dans Firebase Console :

#### Étapes à Suivre

1. **Aller à Firestore Database** > Collection `users` > Document de l'utilisateur

2. **Mettre à jour ces champs** (TOUS EN MÊME TEMPS) :

```json
{
  "plan": "advisor",
  "isPremium": true,
  "hasAccessToAPI": true,
  "hasAccessToAdvancedAnalytics": true,
  "hasAccessToPremiumSuggestions": true,
  "subscription": {
    "plan": "advisor",
    "status": "active",
    "price": 499,
    "expiresAt": "2026-11-09T00:00:00.000Z",
    "lastPaymentDate": "2026-10-09T00:00:00.000Z",
    "paymentReceived": true
  },
  "tokenState": {
    "userId": "USER_ID_ICI",
    "plan": "advisor",
    "baseTokens": -1,
    "bonusTokens": 0,
    "totalTokens": -1,
    "availableTokens": -1,
    "usedTokens": 0,
    "lastTokenUpdate": "2026-10-09T00:00:00.000Z",
    "firstAnalysisDone": false,
    "monthlyTokensUsed": 0,
    "lastMonthlyReset": "2026-10-09T00:00:00.000Z",
    "expiresAt": "2026-11-09T00:00:00.000Z",
    "isExpired": false,
    "hasAccessToAPI": true,
    "hasAccessToAdvancedAnalytics": true,
    "hasAccessToPremiumSuggestions": true
  },
  "availableTokens": -1,
  "tokensUsed": 0,
  "totalTokens": -1
}
```

> ⚠️ **IMPORTANT** : Si vous ne mettez à jour qu'un seul champ (par exemple juste `plan`), le système va réécrire les autres champs et créer des incohérences !

---

### 4️⃣ **Depuis le Code Client (Pour les Admins)**

Si vous êtes connecté en tant qu'admin, vous pouvez utiliser la méthode `TokenManager.adminChangePlan()` :

```javascript
// Exemple : Changer le plan de l'utilisateur actuel
const userId = firebase.auth().currentUser.uid;
TokenManager.adminChangePlan(userId, 'advisor')
  .then(result => {
    console.log('Succès:', result);
    // Rafraîchir les données
    TokenManager.loadUserTokenData(userId);
  })
  .catch(error => {
    console.error('Erreur:', error);
  });

// Exemple : Changer le plan d'un autre utilisateur (nécessite droits admin)
TokenManager.adminChangePlan('otherUserId123', 'api_monthly')
  .then(result => {
    console.log('Succès:', result);
  });
```

---

## 🔍 Vérification

Pour vérifier que le changement a bien été effectué :

### 1. Vérifiez dans Firestore
- `users/{userId}/plan` doit être `advisor`
- `users/{userId}/subscription/plan` doit être `advisor`
- `users/{userId}/tokenState/plan` doit être `advisor`
- `users/{userId}/tokenState/availableTokens` doit être `-1`

### 2. Vérifiez via l'API
```bash
curl https://YOUR-REGION-YOUR-PROJECT.cloudfunctions.net/getUserInfo?email=matthias.duprey1@gmail.com
```

### 3. Testez dans l'application
- Déconnectez-vous et reconnectez-vous
- Allez sur `conseiller-dpai.html` - l'accès doit être débloqué
- Dans le dashboard, vérifiez que le bouton "Conseiller IA" n'a pas de cadenas

---

## 🛠️ Scripts de Correction

### Corriger tous les utilisateurs advisor

Si plusieurs utilisateurs ont des incohérences avec le plan advisor :

```bash
# Exécuter le script de correction
node functions/fix-advisor-access.js

# Ou via Cloud Function
curl https://YOUR-REGION-YOUR-PROJECT.cloudfunctions.net/fixAllAdvisorUsers
```

### Corriger les tokens incohérents

```bash
# Corriger un utilisateur spécifique
node functions/fix-user-tokens.js matthias.duprey1@gmail.com

# Corriger tous les utilisateurs
node functions/fix-user-tokens.js --all
```

---

## 💡 Bonnes Pratiques

1. **Toujours utiliser les scripts** plutôt que de modifier manuellement Firestore
2. **Vérifiez les logs** dans Firebase Console > Functions > Logs
3. **Testez avec un compte test** avant de modifier un utilisateur en production
4. **Faites des sauvegardes** avant les changements en masse

---

## ❓ Problèmes Courants et Solutions

### "L'utilisateur a le plan advisor mais voit toujours le cadenas"
**Solution** : Exécutez :
```bash
node functions/fix-advisor-access.js USER_EMAIL_OR_ID
```

### "Le tokenState.plan n'est pas synchronisé avec plan"
**Solution** : Le script `change-user-plan.js` corrige ça automatiquement.

### "Je veux tester sans payer"
**Solution** : Utilisez le script pour changer un compte test :
```bash
node functions/change-user-plan.js test@example.com advisor
```

---

## 📞 Support

Si vous rencontrez des problèmes :

1. Vérifiez les logs dans Firebase Console
2. Vérifiez que Firebase Admin est correctement initialisé
3. Vérifiez les permissions Firestore (vous devez avoir les droits admin)

Pour les erreurs de permissions, assurez-vous que :
- Votre compte a les droits `Firebase Admin` dans Google Cloud Console
- Les règles Firestore autorisent les modifications par les administrateurs

---

**Dernière mise à jour** : 2026-10-09
