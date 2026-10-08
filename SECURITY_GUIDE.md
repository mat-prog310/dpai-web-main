# 🔒 Guide de Sécurité - DPAI Strategy

## 📋 Sommaire
1. [Problèmes de sécurité corrigés](#-problèmes-de-sécurité-corrigés)
2. [Configuration Railway](#-configuration-railway)
3. [Sécurité côté serveur](#-sécurité-côté-serveur)
4. [Sécurité côté client](#-sécurité-côté-client)
5. [Chiffrement des données](#-chiffrement-des-données)
6. [Bonnes pratiques de sécurité](#-bonnes-pratiques-de-sécurité)
7. [Checklist de déploiement](#-checklist-de-déploiement)

---

## 🔧 Problèmes de sécurité corrigés

### ❌ Problèmes identifiés et corrigés

| Problème | Fichier concerné | Solution appliquée | Niveau de gravité |
|----------|------------------|---------------------|------------------|
| **Clé API Firebase en dur** | `/public/js/firebase-config.js` | Configuration déplacée côté serveur + API sécurisée | 🔴 **CRITIQUE** |
| **Clé API Mistral en dur** | `/public/js/tokens.js`, `/public/js/analyses.js` | Configuration déplacée côté serveur + route proxy | 🔴 **CRITIQUE** |
| **Pas de protection HTTP** | `server.js` | Ajout de Helmet, CSP, Rate Limiting, CORS | 🟡 **HAUT** |
| **Pas de chiffrement côté client** | - | Ajout de utilities de chiffrement avec Web Crypto API | 🟡 **MOYEN** |
| **Pas de gestion des secrets** | - | Ajout de .env.example et documentation Railway | 🟡 **MOYEN** |

---

## 🚀 Configuration Railway

### 1️⃣ Variables d'environnement nécessaires

Dans votre tableau de bord Railway, allez dans **"Variables"** et ajoutez ces variables :

#### Variables Firebase (obligatoires)
```
FIREBASE_API_KEY=AIzaSyDowkBbuxpYbpkMqdXyrxXGgk7FHxy7m68
FIREBASE_AUTH_DOMAIN=dpai-8be62.firebaseapp.com
FIREBASE_PROJECT_ID=dpai-8be62
FIREBASE_STORAGE_BUCKET=dpai-8be62.firebasestorage.app
FIREBASE_MESSAGING_SENDER_ID=829160806332
FIREBASE_APP_ID=1:829160806332:web:125fd1c706ca97a0fcbdb9
FIREBASE_MEASUREMENT_ID=G-R3QVVF35GB
```

> ⚠️ **IMPORTANT**: Marquez toutes ces variables comme **"Hidden"** dans Railway !

#### Variables Mistral (si vous utilisez l'API IA)
```
MISTRAL_API_KEY=mstrl_OUgXuc71KYyO2QoWZ8h0okTn14wCYUnG_20gLSU
```

> ⚠️ **IMPORTANT**: Cette variable doit aussi être marquée comme **"Hidden"** !

#### Variables Stripe (si applicable)
```
STRIPE_SECRET_KEY=sk_test_your_secret_key
STRIPE_PUBLIC_KEY=pk_test_your_public_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
```

---

### 2️⃣ Configuration CORS

Les origines autorisées par défaut sont :
- `https://dpai-strategy.com`
- `https://www.dpai-strategy.com`
- `http://localhost:8080`
- `http://localhost:3000`

Pour ajouter d'autres origines, modifiez `server.js` :
```javascript
const corsOptions = {
    origin: [
        'https://dpai-strategy.com',
        'https://www.dpai-strategy.com',
        'http://localhost:8080',
        'https://votre-autre-domaine.com'  // Ajoutez ici
    ],
    // ...
};
```

---

## 🛡️ Sécurité côté serveur

### Protéctions implémentées dans `server.js`

#### 1. **Helmet** 🛡️
- Active plusieurs headers de sécurité HTTP
- Protection contre XSS, clickjacking, MIME sniffing
- Masque les informations du serveur

#### 2. **Content Security Policy (CSP)** 🔒
```javascript
app.use(helmet.contentSecurityPolicy({
    directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://www.gstatic.com", "https://cdnjs.cloudflare.com"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "https://dpai-8be62.firebaseio.com", "wss://*.firebaseio.com"]
    }
}));
```

#### 3. **Rate Limiting** ⏳
- Limite globale: 1000 requêtes/15 minutes par IP
- Limite API: 100 requêtes/15 minutes par IP pour les routes sensibles
- Protège contre les attaques par force brute

#### 4. **CORS sécurisé** 🌐
- Seules les origines explicitement autorisées peuvent faire des requêtes
- Méthodes autorisées: GET, POST, OPTIONS

#### 5. **Routes API sécurisées** 🔐
- `/api/firebase-config` - Retourne la configuration Firebase **sans les clés API**
- `/api/mistral-key` - Retourne la clé Mistral (⚠️ à utiliser avec précaution)
- `/api/mistral-proxy` - **Recommandé**: Proxy pour appeler Mistral sans exposer la clé
- `/health` - Vérification de santé du serveur

---

## 💻 Sécurité côté client

### 1. **Chiffrement côté client** (`security-utils.js`)

Nouveau fichier ajouté avec des fonctions de chiffrement :

```javascript
// Utilisation des utilities de chiffrement
const encrypted = await window.securityUtils.encrypt(data, password);
const decrypted = await window.securityUtils.decrypt(encrypted, password);

// Hachage SHA-256
const hash = await window.securityUtils.hash('votre_valeur');

// Génération de tokens sécurisés
const token = window.securityUtils.generateToken(32);

// Validation de mot de passe
window.securityUtils.isValidPassword('MonMotDePasse123!'); // true
```

#### Fonctionnalités disponibles :
- ✅ Chiffrement/déchiffrement AES-GCM
- ✅ Dérivation de clé à partir de mot de passe (PBKDF2)
- ✅ Hachage SHA-256
- ✅ Génération de tokens sécurisés
- ✅ Validation d'email et de mot de passe
- ✅ Nettoyage des entrées utilisateur (anti-XSS)

---

### 2. **Configuration Firebase sécurisée**

Le fichier `firebase-config.js` a été modifié pour :
- Supprimer les clés API en dur
- Récupérer la configuration depuis une API serveur
- Utiliser des valeurs par défaut si le serveur n'est pas disponible

---

## 🔐 Chiffrement des données

### Chiffrement côté client

Pour chiffrer des données sensibles dans le navigateur :

```javascript
// Chiffrer des données
const userData = { email: 'user@example.com', plan: 'premium' };
const password = 'mon_mot_de_passe_secret';

const encrypted = await window.securityUtils.encrypt(userData, password);
// Sauvegarder encrypted dans localStorage
localStorage.setItem('userData', JSON.stringify(encrypted));

// Déchiffrer les données
const decrypted = await window.securityUtils.decrypt(encrypted, password);
console.log(decrypted); // { email: 'user@example.com', plan: 'premium' }
```

### Chiffrement côté serveur

Pour Railway, stockez les données sensibles chiffrées dans la base de données.

---

## ✅ Bonnes pratiques de sécurité

### 1. **Gestion des secrets**
- ❌ **Jamais** committer de clés API dans le code
- ✅ Utiliser les variables d'environnement de Railway
- ✅ Marquer les variables sensibles comme "Hidden"
- ✅ Utiliser `.env` pour le développement local (dans `.gitignore`)

### 2. **Authentification**
- ✅ Firebase Auth est correctement configuré
- ✅ Règles Firestore vérifient l'authentification et la propriété
- ✅ Persistance des sessions configurée

### 3. **Communication client-serveur**
- ✅ Utiliser HTTPS en production
- ✅ Valider toutes les entrées utilisateur
- ✅ Implémenter le Rate Limiting
- ✅ Configurer CORS de manière restrictive

### 4. **Stockage des données**
- ✅ Utiliser Firestore avec des règles de sécurité appropriées
- ✅ Chiffrer les données sensibles avant stockage
- ✅ Ne jamais stocker de mots de passe en clair

---

## 📝 Checklist de déploiement

### Avant le déploiement sur Railway :

- [ ] ✅ Configurer toutes les variables d'environnement dans Railway
- [ ] ✅ Marquer les variables sensibles comme "Hidden"
- [ ] ✅ Vérifier que `.env` n'est pas commité (doit être dans `.gitignore`)
- [ ] ✅ Tester en local avec `npm start`

### Après le déploiement :

- [ ] ✅ Tester l'authentification Firebase
- [ ] ✅ Tester les appels à l'API Mistral (si applicable)
- [ ] ✅ Vérifier que les headers de sécurité sont présents
- [ ] ✅ Tester les limites de taux (Rate Limiting)

### Vérification de la sécurité :

1. **Headers HTTP** :
   ```bash
   curl -I https://votre-site-railway.app
   ```
   Vérifiez la présence de :
   - `X-Frame-Options: DENY`
   - `X-Content-Type-Options: nosniff`
   - `Content-Security-Policy`
   - `X-XSS-Protection`

2. **Variables d'environnement** :
   ```bash
   # Dans Railway, vérifiez que ces variables sont cachées
   echo "Vérifier dans le tableau de bord Railway"
   ```

3. **Absence de clés API dans le code** :
   ```bash
   grep -r "AIzaSy\|mstrl_" public/
   # Doit retourner vide ou seulement des références sûres
   ```

---

## 🆘 Dépannage

### Problème : "Firebase non initialisé"

**Solution** :
1. Vérifiez que `/api/firebase-config` retourne une réponse valide
2. Vérifiez que les variables Firebase sont configurées dans Railway
3. Vérifiez la console du navigateur pour les erreurs

### Problème : "Clé Mistral API non trouvée"

**Solution** :
1. Vérifiez que `MISTRAL_API_KEY` est configurée dans Railway
2. Utilisez la route proxy `/api/mistral-proxy` au lieu d'appeler directement Mistral
3. Vérifiez que la variable est marquée comme "Hidden"

### Problème : "Trop de requêtes"

**Solution** :
1. Attendez 15 minutes (limite de taux)
2. Si c'est un environnement de production, ajustez les limites dans `server.js`

---

## 📞 Support

Pour toute question de sécurité, contactez :
- **Email** : duprey.conseil@gmail.com
- **Site** : https://dpai-strategy.com

---

## 🔗 Ressources

- [Documentation Firebase Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Helmet.js Documentation](https://helmetjs.github.io/)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [CSP Generator](https://report-uri.com/home/generate)

---

*Dernière mise à jour : 04 Octobre 2026*