# Intégration de l'IA Locale DPAI sur dpaiweb.com

## 🎯 Résumé

Ce guide explique comment intégrer votre IA locale DPAI sur le site dpaiweb.com avec :
- Une belle interface cohérente avec le reste du site
- Un système de paiement via Firebase pour débloquer l'accès aux utilisateurs qui paient
- L'utilisation des cas d'école DPAI pour enrichir les réponses

## 📁 Structure créée

### Pages Web
- `public/conseiller-dpai.html` - Interface complète du Conseiller IA DPAI
- `public/js/local-ai-client.js` - Client JavaScript pour communiquer avec l'IA locale

### Backend Firebase Functions
- `functions/index.js` - Mis à jour avec de nouveaux endpoints :
  - `callLocalAI` - Endpoint principal pour discuter avec l'IA locale
  - `listLocalAIConversations` - Lister les conversations de l'IA locale
  - `deleteLocalAIConversation` - Supprimer une conversation

### IA Locale
- `my_local_ai/api_server.py` - Serveur API pour l'IA locale (optionnel pour développement local)
- Les fichiers existants dans `my_local_ai/` sont utilisés pour entraîner le modèle

## 🚀 Mise en place

### 1. Configuration Firebase

#### a. Activer l'option IA dans Firebase

Dans votre projet Firebase (`dpai-8be62`), assurez-vous que :

1. **Firestore** est activé
2. **Authentication** est configuré (email/mot de passe)
3. **Cloud Functions** est activé

#### b. Configurer les règles Firestore

Ajoutez ces règles à votre `firestore.rules` :

```javascript
// Pour les conversations IA locale
match /local_ai_conversations/{conversationId} {
  allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
  allow delete: if request.auth != null && request.auth.uid == resource.data.userId;
}
```

#### c. Déployer les Firebase Functions

```bash
cd functions
npm install
firebase deploy --only functions
```

### 2. Déploiement du site web

Copiez les nouveaux fichiers sur votre serveur :
- `public/conseiller-dpai.html`
- `public/js/local-ai-client.js`

### 3. Configuration de l'accès payant

#### a. Mettre à jour les abonnements utilisateurs

Pour débloquer l'accès à l'IA locale, l'utilisateur doit avoir le plan `advisor` (499 €/mois).

Dans Firebase, dans la collection `users`, chaque utilisateur doit avoir :

```json
{
  "id": "user_uid",
  "email": "user@email.com",
  "subscription": {
    "plan": "advisor",
    "status": "active",
    "expiresAt": "2026-11-08T00:00:00.000Z",
    "paymentReceived": true
  },
  "tokenState": {
    "plan": "advisor",
    "baseTokens": -1,
    "availableTokens": -1,
    "isExpired": false
  }
}
```

#### b. Manuellement activer un abonnement

Vous pouvez utiliser la fonction `setUserPlan` pour changer le plan d'un utilisateur :

```javascript
// Appeler depuis le navigateur ou un script admin
fetch('https://us-central1-dpai-8be62.cloudfunctions.net/setUserPlan', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    userId: 'UID_DE_L_UTILISATEUR',
    plan: 'advisor'
  })
});
```

### 4. (Optionnel) Configuration de l'IA locale en développement

Pour tester l'IA locale en développement :

#### a. Installer les dépendances Python

```bash
cd my_local_ai
pip install -r requirements.txt
```

#### b. Démarrer le serveur API local

```bash
python api_server.py
```

Le serveur sera disponible sur `http://localhost:5002`

#### c. Tester localement

Ouvrez `http://localhost:3000/conseiller-dpai.html` (ou le port de votre serveur web local)

#### d. Basculer vers le mode local

Dans `public/js/local-ai-client.js`, changez :

```javascript
function getAPIMode() {
    return 'local'; // Au lieu de 'server'
}
```

### 5. Déploiement en production

En production, utilisez toujours le mode `server` pour que l'IA locale soit appelée via Firebase Functions.

## 📊 Intégration des Cas d'École DPAI

Votre IA locale est déjà entraînée avec :

1. **10 cas d'école** complets (CASE-001 à CASE-010)
2. **Données sectorielles** (benchmark, analyses)
3. **Méthodologie DPAI** (SWOT, Porter, Due Diligence, etc.)
4. **Bonnes pratiques M&A**

### Exemples de questions qui fonctionnent avec les cas d'école :

- "Raconte-moi le cas CASE-001 TechFlow"
- "Quelles sont les leçons du cas IndusAlliance ?"
- "Comment DPAI a sauvé TechFlow d'une mauvaise acquisition ?"
- "Explique-moi la méthodologie utilisée dans le cas RetailMax"
- "Quels outils DPAI ont été utilisés dans le cas BioHealth ?"

### Structure des données chargées

L'API serveur charge automatiquement :
- `dpai_ecole_cases.json` - Cas d'école structurés
- `dpai_cases.json` - Cas pratiques DPAI
- `training_data.json` - Données d'entraînement principales
- `m_and_a_knowledge.json` - Connaissances M&A
- `due_diligence_checklists.json` - Checklists de Due Diligence
- Et bien d'autres fichiers...

## 🔐 Système de Sécurité

### 1. Vérification de l'authentification

Toutes les requêtes API nécessitent :
- Un utilisateur Firebase connecté
- Un abonnement `advisor` actif (499 €/mois)
- Une vérification côté serveur

### 2. Gestion des tokens

- Les abonnés `advisor` ont des tokens illimités (`baseTokens: -1`)
- Les tokens sont vérifiés avant chaque appel à l'IA
- Les conversations sont sauvegardées dans Firestore

### 3. Protection des données

- Chaque utilisateur ne peut accéder qu'à ses propres conversations
- Les messages sont associés à l'ID utilisateur
- Chiffrement HTTPS obligatoire

## 🎨 Interface Utilisateur

### Fonctionnalités de l'interface :

1. **Design cohérent** - Même style que le reste du site DPAI
2. **Chat moderne** - Interface de conversation intuitive
3. **Historique** - Liste des conversations précédentes
4. **Exemples** - Questions prédéfinies pour inspirer
5. **Responsive** - Adapté mobile et desktop
6. **Animations** - Indicateur de chargement, feedback visuel

### Personnalisation possible :

- Modifier les couleurs dans `style.css`
- Changer les questions exemples dans `conseiller-dpai.html`
- Ajouter des sections supplémentaires
- Personnaliser les messages de bienvenue

## 💡 Utilisation

### Pour l'utilisateur final :

1. Se connecter sur dpaiweb.com
2. Souscrire au plan Conseiller IA (499 €/mois) via email à duprey.conseil@gmail.com
3. Une fois l'abonnement activé, accéder à `/conseiller-dpai.html`
4. Poser des questions sur la croissance externe, M&A, valorisation, etc.

### Pour l'administrateur :

1. **Activer un abonnement** : Utiliser Firebase Console ou l'API `setUserPlan`
2. **Entraîner l'IA** : Ajouter des données dans `my_local_ai/data/` et réentraîner
3. **Surveillance** : Vérifier les logs Firebase Functions
4. **Sauvegarde** : Sauvegarder régulièrement la base Firestore

## 🔄 Entraînement de l'IA

### Ajouter de nouveaux cas :

1. Créer un nouveau fichier dans `my_local_ai/data/`
2. Suivre le format existant (voir `dpai_ecole_cases.json`)
3. Redémarrer le serveur API : `python api_server.py`

### Entraîner manuellement :

```bash
cd my_local_ai
python train.py --train
```

## 🛠️ Résolution des problèmes

### "Accès non autorisé"
- **Cause** : L'utilisateur n'a pas le plan `advisor`
- **Solution** : Mettre à jour l'abonnement de l'utilisateur

### "IA locale non disponible"
- **Cause** : Le serveur API local n'est pas en cours d'exécution ou Firebase Functions n'est pas déployé
- **Solution** : 
  - En développement : Démarrer le serveur avec `python api_server.py`
  - En production : Déployer les functions avec `firebase deploy --only functions`

### "Réponses non pertinentes"
- **Cause** : L'IA locale n'a pas assez de données d'entraînement
- **Solution** : Ajouter plus de cas d'école ou de données d'entraînement

### "Erreur 403"
- **Cause** : Problème d'authentification Firebase
- **Solution** : Vérifier que l'utilisateur est bien connecté et a un token valide

## 📈 Prochaines étapes

### 1. Tester en local
- Démarrer le serveur API Python
- Ouvrir la page `conseiller-dpai.html` dans votre navigateur
- Vérifier que l'interface fonctionne

### 2. Tester les cas d'école
- Poser des questions sur les cas d'école
- Vérifier que les réponses sont pertinentes
- Ajouter plus de cas si nécessaire

### 3. Déployer en production
- Déployer Firebase Functions
- Copier les fichiers web sur votre serveur
- Tester avec un utilisateur ayant l'abonnement `advisor`

### 4. Marketing
- Mettre à jour la page `pricing.html` pour mentionner le Conseiller IA
- Ajouter un lien vers `/conseiller-dpai.html` dans la navigation
- Créer une campagne email pour informer les utilisateurs existants

## 📞 Support

Pour toute question ou problème :
- Vérifier les logs Firebase : `firebase functions:log`
- Vérifier les logs du serveur API Python
- Contacter via duprey.conseil@gmail.com

## 🎯 Fonctionnalités avancées à implémenter

1. **WebSocket** - Chat en temps réel avec l'IA locale
2. **Recherche avancée** - Filtrer les conversations par tag ou date
3. **Export PDF** - Exporter les conversations au format PDF
4. **Intégration Stripe** - Paiement en ligne automatique (au lieu de manuel)
5. **API publique** - Permettre l'accès via API pour les intégrations
6. **Webhooks** - Notifications par email pour les nouvelles conversations
7. **Analyse des conversations** - Dashboard d'analyse des questions posées
8. **Amélioration continue** - Permettre aux utilisateurs de noter les réponses

---

**Documentation créée pour DPAI** - Votre Conseiller IA locale est prêt à être déployé ! 🚀

*Dernière mise à jour : 2026-10-08*
