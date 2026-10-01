# 🕒 Système d'Expiration des Abonnements et Tokens

Ce dossier contient les outils pour gérer l'expiration automatique des abonnements et tokens après 30 jours.

---

## 📌 Fonctionnement

### Durée de validité
- **Tous les abonnements payants** (api_monthly, advisor) : **30 jours**
- Après expiration, l'utilisateur revient automatiquement au **plan gratuit** (500 tokens)
- Les tokens et services sont **désactivés** jusqu'au renouvellement

---

## 📁 Fichiers

### 1️⃣ `/backend/check-expiry.js`
Script Node.js pour vérifier et désactiver les abonnements expirés.

**Utilisation :**
```bash
node backend/check-expiry.js
```

**Fonctionnalités :**
- Vérifie tous les utilisateurs
- Identifie les abonnements expirés
- Désactive les abonnements expirés (retour au plan gratuit)
- Affiche un rapport détaillé

**Exemple de sortie :**
```
🚀 Démarrage de la vérification des abonnements expirés...
📅 Date actuelle: 01/10/2026 10:00:00

📊 Nombre total d'utilisateurs: 150

🔍 Vérification de user123 (user@example.com)...
✅ user123: Abonnement valide

🔍 Vérification de user456 (user2@example.com)...
⚠️  user456: Abonnement EXPIRÉ (subscription) - expiré le 30/09/2026

================================================================================
📋 RÉSULTATS
================================================================================
✅ Abonnements ACTIFS: 148
❌ Abonnements EXPIRÉS et désactivés: 2

📝 Utilisateurs désactivés:
--------------------------------------------------------------------------------
  • user456 (user2@example.com)
    Ancien plan: api_monthly
    Expiré le: 30/09/2026
  • user789 (user3@example.com)
    Ancien plan: advisor
    Expiré le: 28/09/2026

✅ Vérification terminée avec succès !
```

---

## 🔄 Automatisation avec Cron

### Option 1 : Cron Job (Linux/Mac)

Ouvrez le crontab :
```bash
crontab -e
```

Ajoutez cette ligne pour exécuter tous les jours à minuit :
```bash
0 0 * * * cd /chemin/vers/dpai-web-main && node backend/check-expiry.js >> /var/log/dpai-expiry.log 2>&1
```

### Option 2 : Firebase Functions (recommandé)

Utilisez l'endpoint `expireSubscriptions` déjà créé dans `/functions/index.js` :

**Méthode 1 : Appel manuel**
```bash
curl -X POST https://votre-projet.cloudfunctions.net/expireSubscriptions \
  -H "Content-Type: application/json"
```

**Méthode 2 : Planification Firebase**
Dans `firebase.json`, ajoutez :
```json
{
  "functions": {
    "predeploy": ["npm --prefix "$RESOURCE_DIR" run lint"],
    "schedule": {
      "expireSubscriptions": {
        "schedule": "0 0 * * *",
        "timeZone": "Europe/Paris"
      }
    }
  }
}
```

Puis deployez :
```bash
firebase deploy --only functions,schedule
```

---

## 📡 Endpoints API

Tous les endpoints sont dans `/functions/index.js`

### 1️⃣ `activateSubscription`
**URL :** `POST /activateSubscription`

**Utilisation :** Activer un abonnement après réception d'un paiement

**Paramètres :**
```json
{
  "userId": "USER_UID",
  "plan": "api_monthly" | "advisor",
  "paymentMethod": "virement" | "paypal" | "carte",
  "transactionId": "REF_TRANSACTION"
}
```

**Exemple :**
```javascript
fetch('/activateSubscription', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'abc123',
    plan: 'api_monthly',
    paymentMethod: 'virement',
    transactionId: 'TRANS_001'
  })
});
```

**Réponse :**
```json
{
  "success": true,
  "plan": "api_monthly",
  "userId": "abc123",
  "expiresAt": "2026-11-01T10:00:00.000Z",
  "message": "Abonnement api_monthly activé avec succès pour l'utilisateur abc123"
}
```

---

### 2️⃣ `renewSubscription`
**URL :** `POST /renewSubscription`

**Utilisation :** Renouveler un abonnement existant

**Paramètres :**
```json
{
  "userId": "USER_UID",
  "days": 30
}
```

**Exemple :**
```javascript
fetch('/renewSubscription', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'abc123',
    days: 30
  })
});
```

**Réponse :**
```json
{
  "success": true,
  "userId": "abc123",
  "plan": "api_monthly",
  "newExpiresAt": "2026-11-01T10:00:00.000Z",
  "message": "Abonnement renouvelé avec succès jusqu'au 01/11/2026"
}
```

---

### 3️⃣ `checkExpiry`
**URL :** `GET /checkExpiry?userId=USER_UID` ou `POST /checkExpiry`

**Utilisation :** Vérifier si un abonnement est expiré

**Paramètres :**
```json
{
  "userId": "USER_UID"
}
```

**Réponse :**
```json
{
  "userId": "abc123",
  "isExpired": false,
  "tokenStateExpired": false,
  "subscriptionExpired": false,
  "tokenStateExpiry": "2026-11-01T10:00:00.000Z",
  "subscriptionExpiry": "2026-11-01T10:00:00.000Z",
  "currentPlan": "api_monthly"
}
```

---

### 4️⃣ `expireSubscriptions`
**URL :** `POST /expireSubscriptions`

**Utilisation :** Désactiver tous les abonnements expirés (à exécuter manuellement ou via cron)

**Réponse :**
```json
{
  "success": true,
  "expiredCount": 5,
  "expiredUsers": [
    {
      "userId": "user1",
      "email": "user1@example.com",
      "oldPlan": "api_monthly",
      "expiredAt": "2026-09-30T10:00:00.000Z"
    }
  ],
  "message": "5 abonnements désactivés"
}
```

---

## 📋 Workflow Complet

### 1️⃣ **Utilisateur souscrit à un plan payant**

**Action :** L'utilisateur contacte par email pour souscrire

**Votre action :**
1. Vérifiez le paiement (virement reçu, PayPal confirmé, etc.)
2. Appelez l'endpoint `activateSubscription` :

```javascript
// Exemple avec fetch
const response = await fetch('/activateSubscription', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'USER_UID',
    plan: 'api_monthly', // ou 'advisor'
    paymentMethod: 'virement',
    transactionId: 'VOTRE_REFERENCE'
  })
});

const result = await response.json();
console.log(result); // { success: true, expiresAt: "...", ... }
```

**Résultat :** L'utilisateur a maintenant accès pendant 30 jours.

---

### 2️⃣ **Utilisateur utilise les services**

- Les tokens sont déduits normalement
- L'IA est disponible pour les abonnés payants
- Tout fonctionne pendant 30 jours

---

### 3️⃣ **Abonnement expire après 30 jours**

**Action automatique (via cron ou Firebase Schedule) :**
- Le script `check-expiry.js` ou l'endpoint `expireSubscriptions` s'exécute
- Les abonnements expirés sont désactivés
- L'utilisateur revient au plan gratuit (500 tokens)

**Résultat :** L'utilisateur perd l'accès aux services payants.

---

### 4️⃣ **Utilisateur renouvèle son abonnement**

**Action :** L'utilisateur contacte à nouveau pour renouveler

**Votre action :**
1. Vérifiez le paiement
2. Appelez `renewSubscription` ou `activateSubscription` :

```javascript
// Option 1: Utiliser renewSubscription (prolonger de 30 jours)
await fetch('/renewSubscription', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'USER_UID',
    days: 30
  })
});

// Option 2: Utiliser activateSubscription (réactiver avec nouveau plan)
await fetch('/activateSubscription', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'USER_UID',
    plan: 'api_monthly',
    paymentMethod: 'virement',
    transactionId: 'RENOUVELLEMENT_001'
  })
});
```

**Résultat :** L'abonnement est prolongé de 30 jours.

---

## 🎯 Configuration Recommandée

### Pour un site en production :

1. **Configurer Firebase Schedule** (recommandé)
   - Exécute `expireSubscriptions` tous les jours à minuit
   - Pas besoin de serveur supplémentaire

2. **Configurer un Cron Job** (alternative)
   - Exécute `node backend/check-expiry.js` tous les jours
   - Nécessite un serveur

3. **Configurer serviceAccountKey.json**
   - Téléchargez depuis Firebase Console :
     - Projet > Paramètres du projet > Comptes de service > Générer une nouvelle clé privée
   - Placez le fichier dans `/backend/serviceAccountKey.json`

---

## ⚠️ Sécurité

1. **Protégez vos endpoints** avec une vérification d'authentification
2. **Ne partagez pas** `serviceAccountKey.json` publiquement
3. **Ajoutez à .gitignore** :
   ```
   /backend/serviceAccountKey.json
   ```

---

## 📞 Support

Pour toute question ou problème :
- **Email :** duprey.conseil@gmail.com
- **Documentation Firebase :** https://firebase.google.com/docs

---

## 🔍 Dépannage

### Problème : Le script ne trouve pas Firebase
**Solution :** Vérifiez que `serviceAccountKey.json` existe et est valide.

### Problème : Les abonnements ne sont pas désactivés
**Solution :** 
1. Vérifiez que le cron job s'exécute
2. Consultez les logs : `cat /var/log/dpai-expiry.log`
3. Testez manuellement : `node backend/check-expiry.js`

### Problème : Les utilisateurs ne peuvent plus accéder aux services
**Solution :** Vérifiez avec `checkExpiry` que leur abonnement n'est pas expiré.

---

## ✅ Checklist

- [ ] Fichier `serviceAccountKey.json` créé
- [ ] `serviceAccountKey.json` ajouté à `.gitignore`
- [ ] Cron job configuré ou Firebase Schedule activé
- [ ] Endpoints déployés : `firebase deploy --only functions`
- [ ] Test manuel : `node backend/check-expiry.js`
- [ ] Vérification d'un utilisateur : `curl /checkExpiry?userId=TEST_USER`

---

## 📝 Journal des Changements

### Version 1.0 (2026-10-01)
- ✅ Système d'expiration complet
- ✅ Script check-expiry.js
- ✅ Endpoints API (activateSubscription, renewSubscription, checkExpiry, expireSubscriptions)
- ✅ Documentation complète
