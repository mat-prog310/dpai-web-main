# 🔐 Guide : Comment débloquer le Conseiller IA manuellement via Firebase

## 🎯 Objectif

Seul **vous** pouvez débloquer l'accès au Conseiller IA pour un utilisateur en mettant à jour son abonnement dans Firebase.

**Condition** : L'utilisateur doit avoir le plan `advisor` (499 €/mois)

---

## 🔧 Méthodes de Débloquage

### Méthode 1 : Via Firebase Console (Recommandé - Interface Graphique)

1. **Se connecter à Firebase Console**
   - Allez sur : https://console.firebase.google.com/
   - Sélectionnez votre projet : `dpai-8be62`

2. **Aller dans Firestore Database**
   - Dans le menu de gauche, cliquez sur **Firestore Database**

3. **Trouver l'utilisateur**
   - Allez dans la collection : `users`
   - Cherchez le document avec l'ID de l'utilisateur (UID Firebase)
   - *Astuce* : Vous pouvez filtrer par email dans la collection

4. **Mettre à jour l'abonnement**
   - Cliquez sur le document de l'utilisateur
   - Modifiez les champs suivants :
     ```json
     {
       "subscription": {
         "plan": "advisor",
         "status": "active",
         "expiresAt": "2026-12-08T00:00:00.000Z",
         "paymentReceived": true,
         "lastPaymentDate": "2026-10-08T10:00:00.000Z"
       },
       "tokenState": {
         "plan": "advisor",
         "baseTokens": -1,
         "totalTokens": -1,
         "availableTokens": -1,
         "usedTokens": 0,
         "isExpired": false,
         "expiresAt": "2026-12-08T00:00:00.000Z"
       }
     }
     ```

5. **Sauvegarder**
   - Cliquez sur **"Save"** ou **"Publier"**
   - L'utilisateur aura immédiatement accès au Conseiller IA

---

### Méthode 2 : Via Firebase CLI (Commande)

1. **Installer Firebase CLI** (si ce n'est pas déjà fait)
   ```bash
   npm install -g firebase-tools
   ```

2. **Se connecter**
   ```bash
   firebase login
   ```

3. **Mettre à jour l'utilisateur**
   ```bash
   # Remplacer USER_UID par l'ID Firebase de l'utilisateur
   firebase firestore:update /users/USER_UID \
     --data '{"subscription": {"plan": "advisor", "status": "active", "expiresAt": "2026-12-08T00:00:00.000Z", "paymentReceived": true}, "tokenState": {"plan": "advisor", "baseTokens": -1, "availableTokens": -1, "isExpired": false}}'
   ```

---

### Méthode 3 : Via l'API setUserPlan (Endpoint existant)

Vous pouvez utiliser l'endpoint Firebase Functions déjà existant :

```bash
# Appeler depuis le navigateur ou un script
fetch('https://us-central1-dpai-8be62.cloudfunctions.net/setUserPlan', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    userId: 'UID_DE_L_UTILISATEUR',
    plan: 'advisor'
  })
})
.then(response => response.json())
.then(data => console.log('Abonnement mis à jour:', data))
.catch(error => console.error('Erreur:', error));
```

**Version cURL** :
```bash
curl -X POST \
  https://us-central1-dpai-8be62.cloudfunctions.net/setUserPlan \
  -H 'Content-Type: application/json' \
  -d '{"userId": "UID_DE_L_UTILISATEUR", "plan": "advisor"}'
```

---

## 📋 Template de Données Complètes

Pour un utilisateur complet avec accès Conseiller IA :

```json
{
  "id": "USER_UID",
  "email": "user@example.com",
  "displayName": "Nom Utilisateur",
  "subscription": {
    "plan": "advisor",
    "status": "active",
    "expiresAt": "2026-12-08T00:00:00.000Z",
    "paymentReceived": true,
    "lastPaymentDate": "2026-10-08T10:00:00.000Z",
    "startDate": "2026-10-08T10:00:00.000Z",
    "autoRenew": true
  },
  "tokenState": {
    "userId": "USER_UID",
    "plan": "advisor",
    "baseTokens": -1,
    "totalTokens": -1,
    "availableTokens": -1,
    "usedTokens": 0,
    "bonusTokens": 0,
    "firstAnalysisDone": true,
    "monthlyTokensUsed": 0,
    "lastTokenUpdate": "2026-10-08T10:00:00.000Z",
    "lastMonthlyReset": "2026-10-01T00:00:00.000Z",
    "expiresAt": "2026-12-08T00:00:00.000Z",
    "isExpired": false
  },
  "availableTokens": -1,
  "tokensUsed": 0,
  "totalTokens": -1,
  "createdAt": "2026-10-08T10:00:00.000Z",
  "lastLoginAt": "2026-10-08T10:00:00.000Z"
}
```

---

## 🔍 Comment Trouver l'UID d'un Utilisateur

### Via Firebase Console
1. Allez dans **Authentication** → **Users**
2. Cherchez l'utilisateur par email
3. Copiez l'UID (colonne "User UID")

### Via Firebase CLI
```bash
# Lister tous les utilisateurs
firebase auth:list-users
```

### Via Firestore
```javascript
// Dans votre code ou console Firebase
const usersRef = admin.firestore().collection('users');
const snapshot = await usersRef.get();
snapshot.forEach(doc => {
  console.log('UID:', doc.id, 'Email:', doc.data().email);
});
```

---

## ⏰ Gestion de l'Expiration

Pour renouveler un abonnement après expiration :

1. **Mettre à jour la date d'expiration** :
   ```json
   {
     "subscription.expiresAt": "2027-10-08T00:00:00.000Z",
     "tokenState.expiresAt": "2027-10-08T00:00:00.000Z",
     "tokenState.isExpired": false
   }
   ```

2. **Ou utiliser la fonction renewSubscription** (déjà dans tokens.js) :
   ```javascript
   // Depuis le navigateur (pour un utilisateur connecté)
   TokenManager.renewSubscription(30); // Prolonge de 30 jours
   ```

---

## 📊 Vérification

Pour vérifier qu'un utilisateur a bien accès :

1. **Depuis Firebase Console** :
   - Vérifiez que `subscription.plan === 'advisor'`
   - Vérifiez que `tokenState.plan === 'advisor'`

2. **Depuis le site** :
   - L'utilisateur se connecte
   - Il va sur `/conseiller-dpai.html`
   - Si le cadenas a disparu → **Accès autorisé** ✅
   - Si le cadenas est présent → **Accès refusé** ❌

3. **Depuis les logs** :
   ```bash
   firebase functions:log
   ```
   - Cherchez des erreurs d'accès ou des appels à `checkAdvisorAccess`

---

## 🛡️ Sécurité

### ⚠️ Important :
- **Ne jamais** partager vos identifiants Firebase Console
- **Ne jamais** donner accès à la collection `users` à d'autres personnes
- **Toujours** vérifier que vous êtes connecté avec le bon compte Google

### Bonnes pratiques :
1. **Utiliser des comptes séparés** : Un compte admin pour Firebase, un autre pour le développement
2. **Activer la 2FA** : Sur votre compte Google
3. **Limiter les permissions** : Dans Firebase Console, configurez les rôles IAM
4. **Audit régulier** : Vérifiez régulièrement qui a accès à votre projet

---

## 📞 Support

Si vous avez des problèmes pour débloquer un utilisateur :

1. **Vérifiez l'UID** : Assurez-vous d'utiliser le bon identifiant
2. **Vérifiez les champs** : `subscription.plan` ET `tokenState.plan` doivent être `advisor`
3. **Vérifiez la connexion** : L'utilisateur doit être connecté pour voir les changements
4. **Videz le cache** : Parfois nécessaire après une mise à jour

Pour toute question : **duprey.conseil@gmail.com**

---

## 🎯 Résumé des Conditions d'Accès

| Plan | Accès Conseiller IA | Accès API Monthly | Tokens | IA |
|------|---------------------|-------------------|--------|-----|
| Gratuit | ❌ Non | ❌ Non | 500 | ❌ Non |
| API Monthly | ❌ Non | ✅ Oui | 1000 | ✅ Mistral |
| Conseiller IA | ✅ **OUI** | ✅ Oui | Illimités | ✅ IA Locale + Mistral |

---

**Seul vous pouvez modifier ces plans via Firebase Console.**

*Document créé pour DPAI Strategy*
*Date : 2026-10-08*
