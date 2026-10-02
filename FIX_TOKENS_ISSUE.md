# Correction du problème de tokens

## Problème identifié

L'utilisateur Matthias Duprey (matthias.duprey1@gmail.com) rencontre une erreur 403 avec le message :
```
Solde de tokens insuffisant - availableTokens: 50, required: 80
```

L'erreur vient d'une **incohérence entre les coûts d'analyse côté client et côté serveur**.

## Causes

1. **Incohérence des coûts** : 
   - Les Cloud Functions déployées utilisaient des anciens coûts (pestel: 80 tokens)
   - Le code client utilisait des nouveaux coûts (pestel: 55 tokens)
   
2. **TokenState incohérent** : 
   - L'utilisateur a `usedTokens: 500`, `totalTokens: 500` mais `availableTokens: 50`
   - Cela donne `totalTokens - usedTokens = 0`, mais `availableTokens = 50` (incohérent)

## Corrections apportées

### 1. Fichier `public/js/tokens.js`
Aligné les coûts `AnalysisCosts` avec ceux du serveur :
- swot: 40 → 50
- porter: 120 → 60
- pestel: 80 → 55
- competitive: 120 → 45
- etc.

### 2. Fichier `public/js/dashboard.js`
Corrigé les coûts affichés dans les actions rapides :
- swot: 40 → 50
- porter: 120 → 60
- pestel: 80 → 55
- etc.

### 3. Fichier `public/analysis-form.html`
Modifié pour utiliser `window.AnalysisCosts` au lieu d'un objet local.

## Actions requises

### 1. Redéployer les Cloud Functions

```bash
# Aller dans le dossier functions
cd /Users/fabienduprey/Desktop/dpai-web-main/functions

# Redéployer toutes les fonctions
firebase deploy --only functions
```

**Important** : Assurez-vous que :
- Vous êtes connecté à Firebase (`firebase login`)
- Vous avez sélectionné le bon projet (`firebase use dpai-8be62`)
- Le fichier `index.js` dans /functions contient bien les coûts mis à jour

### 2. Corriger le tokenState de l'utilisateur

L'utilisateur `matthias.duprey1@gmail.com` (ou son userId Firebase) a un tokenState incohérent.

**Option A : Script Node.js (à exécuter localement)**

Créez un fichier `fix-tokens.js` dans le dossier /functions :

```javascript
const admin = require('firebase-admin');

// Initialiser Firebase Admin
if (admin.apps.length === 0) {
    admin.initializeApp();
}

async function fixUserTokenState(userId) {
    const db = admin.firestore();
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
        console.log('Utilisateur non trouvé:', userId);
        return;
    }
    
    const userData = userDoc.data();
    const tokenState = userData.tokenState || {};
    const plan = userData.subscription?.plan || 'free';
    
    // Calculer les valeurs correctes
    const totalTokens = tokenState.totalTokens || (plan === 'free' ? 500 : plan === 'api_monthly' ? 1000 : -1);
    const usedTokens = tokenState.usedTokens || 0;
    const availableTokens = totalTokens === -1 ? -1 : totalTokens - usedTokens;
    
    console.log('Anciennes valeurs:', {
        usedTokens: tokenState.usedTokens,
        totalTokens: tokenState.totalTokens,
        availableTokens: tokenState.availableTokens
    });
    
    // Corriger le tokenState
    const correctedTokenState = {
        ...tokenState,
        totalTokens: totalTokens,
        usedTokens: usedTokens,
        availableTokens: availableTokens,
        baseTokens: totalTokens === -1 ? -1 : totalTokens,
        lastTokenUpdate: admin.firestore.FieldValue.serverTimestamp(),
        isExpired: false
    };
    
    await db.collection('users').doc(userId).update({
        tokenState: correctedTokenState,
        availableTokens: availableTokens,
        tokensUsed: usedTokens,
        totalTokens: totalTokens
    });
    
    console.log('Nouveaux valeurs:', {
        usedTokens: correctedTokenState.usedTokens,
        totalTokens: correctedTokenState.totalTokens,
        availableTokens: correctedTokenState.availableTokens
    });
    
    console.log('✅ TokenState corrigé pour', userId);
}

// Trouver l'userId de matthias.duprey1@gmail.com
async function findAndFixUser() {
    const db = admin.firestore();
    const usersSnapshot = await db.collection('users').where('email', '==', 'matthias.duprey1@gmail.com').get();
    
    if (usersSnapshot.empty) {
        console.log('Utilisateur non trouvé avec cet email');
        return;
    }
    
    usersSnapshot.forEach(doc => {
        console.log('Correction du tokenState pour userId:', doc.id);
        fixUserTokenState(doc.id);
    });
}

// Exécuter
findAndFixUser().catch(console.error);
```

Puis exécutez :
```bash
cd /Users/fabienduprey/Desktop/dpai-web-main/functions
node fix-tokens.js
```

**Option B : Correction manuelle via Firebase Console**

1. Allez sur https://console.firebase.google.com/
2. Sélectionnez le projet `dpai-8be62`
3. Allez dans Firestore Database
4. Trouvez le document de l'utilisateur dans la collection `users`
5. Trouvez le champ `tokenState` et corrigez :
   ```json
   {
     "totalTokens": 500,
     "usedTokens": 450,  // 500 - 50 = 450
     "availableTokens": 50,
     "baseTokens": 500
   }
   ```

### 3. Réinitialiser les tokens de l'utilisateur (optionnel)

Si l'utilisateur devrait avoir 450 tokens disponibles (comme il le pense) :

```javascript
// Dans le script fix-tokens.js, ajoutez :
const correctedTokenState = {
    ...tokenState,
    totalTokens: 500,
    usedTokens: 50,   // 500 - 450 = 50 utilisés
    availableTokens: 450,
    baseTokens: 500,
    lastTokenUpdate: admin.firestore.FieldValue.serverTimestamp(),
    isExpired: false
};
```

## Vérification

Après les corrections :
1. L'utilisateur devrait voir 450 tokens disponibles dans son dashboard
2. Les analyses devraient fonctionner sans erreur 403
3. Les coûts affichés dans le dashboard et les confirmations devraient correspondre

## Résumé des coûts corrigés

| Analyse | Ancien coût | Nouveau coût |
|---------|-------------|--------------|
| SWOT | 40 | 50 |
| Porter 5 Forces | 120 | 60 |
| PESTEL | 80 | 55 |
| Analyse Concurrentielle | 120 | 45 |
| Rapports Détaillés | 160 | 100 |
| Benchmarking | 160 | 40 |
| Modélisation | 240 | 70 |
| Due Diligence | 280 | 80 |
| Valorisation | 320 | 100 |
| Synergies | 200 | 60 |
| Secteur idéal | 35 | 40 |
| Score de maturité | 50 | 25 |
