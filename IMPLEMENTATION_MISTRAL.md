# 🚀 Intégration Mistral AI dans DPAI - Implémentation Complète

## 📋 Résumé des Modifications

Ce document décrit toutes les modifications apportées à votre plateforme DPAI pour intégrer l'IA Mistral, avec :
- **Analyses IA** (SWOT, Porter, etc.) pour les abonnés API Monthly (199 €/mois)
- **Conseiller IA** (chat illimité) pour les abonnés Conseiller IA (499 €/mois)
- **Tests locaux** avec Ollama
- **Fine-tuning** avec vos données DPAI

---

## 📁 Fichiers Modifiés

### 1️⃣ `/public/js/tokens.js` - Gestion des tokens + IA

**Ajouts :**
- Configuration Mistral (`MISTRAL_API_KEY`, `MISTRAL_API_URL`)
- `DPAI_CONTEXT` - Contexte pour les prompts
- Configuration des plans `PLAN_CONFIG` (free, api_monthly, advisor)
- Coûts IA dans `AnalysisCosts` (ai_swot: 80, ai_porter: 100, etc.)
- Méthodes TokenManager :
  - `isUnlimited()` - Vérifie si tokens illimités
  - `getPlanConfig()` - Récupère la config du plan
  - `isAIAllowed()` - Vérifie accès à l'IA
  - `isAdvisorAllowed()` - Vérifie accès au Conseiller IA
  - `callMistral()` - Appel à l'API Mistral
  - `runAIAnalysis()` - Exécute une analyse avec IA
- Export global de `DPAI_CONTEXT`

**Fonctionnement :**
- Les utilisateurs **free** ont 500 tokens, **pas d'accès IA**
- Les utilisateurs **api_monthly** ont tokens illimités + **accès IA pour les analyses**
- Les utilisateurs **advisor** ont tokens illimités + **IA illimitée + Conseiller IA**

---

### 2️⃣ `/functions/src/prompt/dpai-prompts.js` - Prompts DPAI

**Ajouts :**
- Export de toutes les fonctions utilitaires :
  - `getSectorGrowth()`
  - `getSectorMultiple()`
  - `getSectorCompetitors()`
  - `getSectorCompetitorCount()`
  - `getSectorBarriers()`
  - `getCustomerPower()`
  - `getSupplierPower()`
- Export de `SECTOR_DATA`

**À noter :** Les prompts existants (`SWOT_PROMPT`, `PORTER_PROMPT`, `ADVISOR_PROMPT`) sont déjà parfaitement configurés.

---

### 3️⃣ `/public/pricing.html` - Page Tarifs

**Ajouts :**
- **Carte "Abonnement API Mensuel"** (199 €/mois)
  - Tokens illimités
  - Tous les services (Phases 1-4)
  - IA intégrée pour les analyses
  - Support prioritaire 24h
  - Bouton "Nous contacter" → email à duprey.conseil@gmail.com

- **Carte "Conseiller IA"** (499 €/mois)
  - Tokens illimités
  - Tous les services (Phases 1-4)
  - IA illimitée pour toutes les analyses
  - Conseiller IA personnel par chat
  - Recherches approfondies
  - Historiques des conversations
  - Support prioritaire 2h
  - Bouton "Nous contacter" → email à duprey.conseil@gmail.com

---

### 4️⃣ `/public/css/components.css` - Styles

**Ajouts :**
- Styles pour `.pricing-cards-grid` (grille responsive)
- Styles pour `.pricing-card.premium` (carte API Monthly)
- Styles pour `.pricing-card.advisor` (carte Conseiller IA)
- Styles pour les badges `.pro-badge` et `.advisor-badge`
- Styles pour les icônes IA (infinity, robot)
- Styles pour les boutons `.btn-secondary` et `.btn-advisor`
- Styles pour `.btn-xl` (boutons larges)
- Media queries pour responsive

---

## 🆕 Fichiers Créés

### 1️⃣ `/functions/index.js` - Backend Firebase Functions

**Endpoints créés :**
- `analyzeWithAI` - Exécute une analyse (SWOT, Porter, etc.) avec Mistral
- `advisorChat` - Gère le chat avec le Conseiller IA
- `setUserPlan` - Change le plan d'un utilisateur (free → api_monthly → advisor)
- `testAI` - Test de l'intégration Mistral
- `listAdvisorConversations` - Liste les conversations du Conseiller IA
- `deleteAdvisorConversation` - Supprime une conversation

**Configuration :**
- Utilise `functions.config().mistral.key` pour la clé API (recommandé)
- Fallback sur `mstrl_OUgXuc71KYyO2QoWZ8h0okTn14wCYUnG_20gLSU` si non configuré
- Gestion CORS intégrée
- Vérification des accès avant chaque appel IA

### 2️⃣ `/functions/src/ai-integration.js` - Intégration Mistral

**Fonctions :**
- `callMistral()` - Appel basique à l'API Mistral
- `analyzeWithAI()` - Analyse avec IA (utilise les prompts DPAI)
- `advisorChat()` - Chat avec le Conseiller IA
- `getConversationContext()` - Récupère le contexte d'une conversation
- `saveConversation()` - Sauvegarde une conversation
- `checkAIAccess()` - Vérifie l'accès à l'IA
- `checkAdvisorAccess()` - Vérifie l'accès au Conseiller IA
- `deductAITokens()` - Déduit les tokens pour une analyse IA

### 3️⃣ `/functions/src/training-data.js` - Données d'entraînement

**Contenu :**
- 6 exemples d'analyses DPAI (SWOT, Porter 5 Forces, etc.)
- Format prêt pour le fine-tuning Mistral
- Exemples basés sur des cas réels DPAI

**À faire :**
- Ajoutez vos propres exemples pour personnaliser le modèle
- Minimum 50-100 exemples recommandés pour un bon fine-tuning

### 4️⃣ `/public/js/ai-client.js` - Client Frontend IA

**Fonctions :**
- `initAIClient()` - Initialise le client IA
- `analyzeWithAI()` - Appel frontend pour les analyses IA
- `startAdvisorChat()` - Démarre une conversation avec le Conseiller IA
- `continueAdvisorChat()` - Continue une conversation existante
- `listAdvisorConversations()` - Liste les conversations
- `deleteConversation()` - Supprime une conversation

**Utilisation :**
```javascript
// Exécuter une analyse IA
const result = await AIClient.analyzeWithAI('swot', {
    name: 'TechCorp',
    sector: 'EdTech',
    revenue: '5M€',
    ebitda: '1M€'
});

// Démarrer un chat avec le Conseiller IA
const conversationId = await AIClient.startAdvisorChat('Comment valoriser mon entreprise ?');
```

### 5️⃣ `/public/advisor.html` - Page Conseiller IA

**Fonctionnalités :**
- Interface de chat complète avec le Conseiller IA
- Historique des conversations
- Accès contrôlé (abonnés advisor uniquement)
- Design responsive
- Intégration avec Firebase Auth

### 6️⃣ `/backend/ollama-test.js` - Tests Locaux

**Fonctionnalités :**
- Tests de Mistral en local avec Ollama
- Pas besoin de clé API
- Parfait pour le développement

**Utilisation :**
```bash
# Installer Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Télécharger Mistral
ollama pull mistral

# Exécuter les tests
node backend/ollama-test.js
```

### 7️⃣ `/backend/train-model.py` - Fine-Tuning

**Fonctionnalités :**
- Fine-tuning d'un modèle Mistral avec vos données
- Utilisation de PEFT (LoRA) pour économiser la mémoire
- Génération du fichier de données pour Mistral API
- Support pour les modèles 7B

**Prérequis :**
```bash
pip install transformers peft datasets torch accelerate bitsandbytes
```

**Utilisation :**
```bash
python backend/train-model.py
```

---

## 🔧 Configuration Requise

### 1️⃣ Clé API Mistral

**Recommandé (Firebase Functions) :**
```bash
firebase functions:config:set mistral.key="votre_clé_mistral_ici"
```

**Alternative (fichier .env) :**
```bash
echo "MISTRAL_API_KEY=votre_clé_mistral_ici" > .env
echo ".env" >> .gitignore
```

**À noter :** La clé par défaut (`mstrl_OUgXuc71KYyO2QoWZ8h0okTn14wCYUnG_20gLSU`) est déjà configurée en fallback.

### 2️⃣ Déploiement Firebase

```bash
# Installer Firebase CLI
npm install -g firebase-tools

# Se connecter
firebase login

# Déployer les fonctions
firebase deploy --only functions
```

### 3️⃣ Activation Manuelle des Abonnements

**Pour activer un abonnement API Monthly (199 €) :**
```javascript
// À exécuter dans Firebase Console ou via un script admin
await admin.firestore().collection('users').doc('USER_UID').update({
    'subscription.plan': 'api_monthly',
    'subscription.status': 'active',
    'subscription.startDate': admin.firestore.FieldValue.serverTimestamp(),
    'subscription.endDate': new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    'tokenState.plan': 'api_monthly',
    'tokenState.baseTokens': -1,
    'tokenState.availableTokens': -1,
    'tokenState.totalTokens': -1
});
```

**Pour activer un abonnement Conseiller IA (499 €) :**
```javascript
// À exécuter dans Firebase Console ou via un script admin
await admin.firestore().collection('users').doc('USER_UID').update({
    'subscription.plan': 'advisor',
    'subscription.status': 'active',
    'subscription.advisorAccess': true,
    'subscription.startDate': admin.firestore.FieldValue.serverTimestamp(),
    'subscription.endDate': new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    'tokenState.plan': 'advisor',
    'tokenState.baseTokens': -1,
    'tokenState.availableTokens': -1,
    'tokenState.totalTokens': -1
});
```

**Pour désactiver un abonnement :**
```javascript
// À exécuter chaque mois pour les abonnements non renouvelés
await admin.firestore().collection('users').doc('USER_UID').update({
    'subscription.plan': 'free',
    'subscription.status': 'expired',
    'tokenState.plan': 'free',
    'tokenState.baseTokens': 500,
    'tokenState.availableTokens': 500,
    'tokenState.totalTokens': 500,
    'tokenState.usedTokens': 0
});
```

---

## 📊 Fonctionnement Final

### Pour l'utilisateur (Free - Gratuit)
✅ 500 tokens gratuits  
✅ Accès aux analyses classiques (SWOT, Porter, etc.)  
❌ **Pas d'accès à l'IA**  
❌ **Pas d'accès aux Phases 3 & 4**  

### Pour l'utilisateur (API Monthly - 199 €/mois)
✅ Tokens illimités  
✅ Tous les services (Phases 1-4)  
✅ **IA intégrée** pour les analyses (SWOT, Porter, PESTEL, etc.)  
✅ Accès complet à l'API DPAI  
✅ Support prioritaire 24h  
❌ Pas de Conseiller IA personnel  

### Pour l'utilisateur (Conseiller IA - 499 €/mois)
✅ Tokens illimités  
✅ Tous les services (Phases 1-4)  
✅ **IA illimitée** pour toutes les analyses  
✅ **Conseiller IA personnel** par chat  
✅ Recherches approfondies sur demande  
✅ Historiques des conversations IA  
✅ Support prioritaire 2h  

---

## 🧪 Tests

### Test 1 : Vérifier l'intégration frontend
1. Ouvrez `pricing.html` dans un navigateur
2. Vérifiez que les cartes API Monthly et Conseiller IA s'affichent
3. Cliquez sur les boutons "Nous contacter" → doit ouvrir l'email

### Test 2 : Tester avec Ollama (local)
```bash
cd backend
node ollama-test.js
```

### Test 3 : Tester avec Mistral API
```bash
cd functions/src
node test-mistral.js
```

### Test 4 : Déployer et tester en production
```bash
firebase deploy --only functions
```

---

## 📞 Support

Pour toute question ou problème :
- **Email** : duprey.conseil@gmail.com
- **Documentation** : https://docs.mistral.ai/
- **Firebase** : https://firebase.google.com/docs

---

## 🎯 Prochaines Étapes Recommandées

1. **Tester en local** avec Ollama : `node backend/ollama-test.js`
2. **Déployer le backend** : `firebase deploy --only functions`
3. **Fine-tuner le modèle** (optionnel) : `python backend/train-model.py`
4. **Ajouter plus d'exemples** dans `/functions/src/training-data.js` (50-100+ pour un meilleur modèle)
5. **Configurer la clé API** : `firebase functions:config:set mistral.key="votre_clé"`

---

## ⚠️ Sécurité

- **Ne jamais commiter la clé API** dans Git
- Utilisez `functions.config()` pour Firebase
- Utilisez `.env` pour le développement local
- La clé par défaut est déjà configurée mais peut être désactivée

---

## 📝 Changelog

### Version 1.0 (2026-10-01)
- ✅ Intégration complète de Mistral AI
- ✅ Création des plans api_monthly et advisor
- ✅ Backend Firebase Functions
- ✅ Frontend complet (pricing.html, advisor.html)
- ✅ Tests locaux avec Ollama
- ✅ Fine-tuning avec Python
