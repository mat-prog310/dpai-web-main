# 🚀 Guide de Déploiement - Conseiller IA DPAI avec API Mistral

## ✅ Ce qui a été fait

Votre Conseiller IA utilise maintenant **uniquement l'API Mistral** avec **vos prompts DPAI personnalisés**. 

### 📁 Fichiers modifiés
| Fichier | Changement |
|--------|------------|
| `functions/index.js` | Simplifié pour utiliser Mistral API partout |
| `public/advisor.html` | Nettoyé et simplifié |
| `public/js/advisor-simple.js` | **Nouveau** - Logique simplifiée |

### 🗑️ Fichiers supprimés (inutiles maintenant)
- `functions/src/local-ai/` (dossier)
- `functions/config/` (dossier)
- `START_LOCAL_AI.sh`
- `DEPLOY_LOCAL_MODEL.sh`
- `setup-local-model.sh`
- `download-gguf-model.py`
- `simple-llm-advisor.py`

---

## 🎯 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND (advisor.html)                     │
├─────────────────────────────────────────────────────────────┤
│  - Interface utilisateur simplifiée                           │
│  - Messages clairs : "Powered by Mistral API + Expertise DPAI" │
└─────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │                                 │
                    ▼                                 ▼
┌─────────────────────────────┐   ┌─────────────────────────┐
│   /advisorChat               │   │   /analyzeWithAI          │
│   - API Mistral              │   │   - API Mistral          │
│   - + Prompts DPAI           │   │   - + Prompts DPAI       │
│   - Personnalisé !           │   │   - Personnalisé !         │
└─────────────────────────────┘   └─────────────────────────┘
                    │                                 │
                    ▼                                 ▼
┌─────────────────────────────────────────────────────────────┐
│                        API MISTRAL (api.mistral.ai)             │
│  - Modèle: mistral-large (ou autre selon votre config)        │
│  - Coût: ~0.25€ par 1K tokens                                  │
└─────────────────────────────────────────────────────────────┘
```

---

## 📝 Ce qui est personnalisé

✅ **Toutes vos réponses sont personnalisées grâce à :**

1. **Vos prompts DPAI** : Chaque requête inclut votre contexte expert
2. **Vos templates** : SWOT, Porter, Valorisation, etc. avec votre méthodologie
3. **Votre style** : Format, structure, vocabulaire DPAI
4. **Vos données sectorielles** : Benchmarks, multiples, croissance par secteur

**Exemple de prompt Conseiller IA :**
```
Tu es un expert DPAI en croissance externe avec 15 ans d'expérience.
Spécialisé dans : valorisation, fusions, acquisitions, due diligence.
Utilise nos méthodes : DCF, multiples sectoriels, LBO, synergies.
Format : ## 📊 Titre
**Contexte:** ...
**Analyse:** ...
**Recommandations DPAI:** ...
```

---

## 🚀 Déploiement

### 1. Installer les dépendances
```bash
cd /Users/fabienduprey/Desktop/dpai-web-main
npm install
cd functions
npm install
cd ..
```

### 2. Déployer sur Firebase
```bash
# Déployer uniquement les fonctions
firebase deploy --only functions

# Ou déployer tout (recommandé)
firebase deploy
```

### 3. Tester
Ouvrez dans votre navigateur : **https://votre-projet.firebaseapp.com/advisor.html**

---

## 🧪 Test local

### Avec Firebase Emulator
```bash
# Démarrer l'emulator
firebase emulators:start --only functions

# Ouvrir l'interface
# http://localhost:5000/advisor.html
```

---

## 💡 Fonctionnement

### Conseiller IA
- **Technologie** : API Mistral (`mistral-large`)
- **Personnalisation** : Vos prompts DPAI
- **Coût** : ~50 tokens par message (selon la longueur)
- **Latence** : 1-3 secondes

### Analyses (SWOT, Porter, etc.)
- **Technologie** : API Mistral
- **Personnalisation** : Vos templates DPAI
- **Coût** : 80-200 tokens par analyse

---

## 🔧 Configuration

### Clé API Mistral
Dans `functions/index.js` :
```javascript
const MISTRAL_API_KEY = functions.config().mistral?.key || "votre_clé_api";
```

**Pour configurer votre clé :**
```bash
# Définir la clé dans Firebase
firebase functions:config:set mistral.key="votre_clé_api_mistral"
```

Ou modifier directement dans le code (moins sécurisé).

### Modèle Mistral
Par défaut, le code utilise `mistral-large`. Vous pouvez changer :
```javascript
# Dans functions/index.js
const response = await callMistral(prompt, "mistral-large");
# Changer en :
const response = await callMistral(prompt, "mistral-medium"); // Plus rapide, moins cher
```

---

## 📊 Coûts estimés

| Service | Tokens/mois | Coût/mois (0.25€/1K tokens) |
|---------|-------------|------------------------------|
| Conseiller IA (50 msg/jour) | ~15K | ~3.75€ |
| Analyses (10/jour) | ~15K | ~3.75€ |
| **Total** | **~30K** | **~7.50€** |

**Note** : Les abonnés Conseiller IA (499€/mois) ont des tokens illimités.

---

## ✅ Vérification

### 1. Le Conseiller IA fonctionne
- [ ] Posez une question
- [ ] Vous obtenez une réponse formatée DPAI
- [ ] Les conversations sont sauvegardées

### 2. Les analyses fonctionnent
- [ ] Testez une analyse SWOT
- [ ] Testez une analyse Porter
- [ ] Les résultats sont formatés correctement

### 3. La personnalisation est là
- [ ] Les réponses mentionnent "DPAI"
- [ ] Les réponses suivent votre format
- [ ] Les réponses incluent votre expertise

---

## 🛠️ Dépannage

### Problème : "Erreur Mistral API"
**Solutions :**
1. Vérifiez votre clé API : `firebase functions:config:get`
2. Vérifiez votre solde Mistral : https://console.mistral.ai/
3. Testez la clé manuellement :
   ```bash
   curl -X POST https://api.mistral.ai/v1/chat/completions \
     -H "Authorization: Bearer VOTRE_CLÉ" \
     -H "Content-Type: application/json" \
     -d '{"model": "mistral-large", "messages": [{"role": "user", "content": "Test"}]}'
   ```

### Problème : "Accès non autorisé"
**Solutions :**
1. Vérifiez que l'utilisateur a un abonnement `advisor`
2. Vérifiez dans Firestore : `/users/{uid}/subscription/plan`
3. Testez avec un utilisateur admin

### Problème : Les conversations ne se sauvegardent pas
**Solutions :**
1. Vérifiez les règles Firestore
2. Vérifiez que l'utilisateur est authentifié
3. Vérifiez dans Firestore : `/advisor_conversations/`

---

## 📚 Documentation utile

- [Documentation Mistral API](https://docs.mistral.ai/)
- [Firebase Functions](https://firebase.google.com/docs/functions)
- [Votre code DPAI](https://github.com/votre-projet)

---

## 🎉 C'est prêt !

Votre Conseiller IA DPAI fonctionne maintenant avec :
- ✅ **L'API Mistral** pour la puissance
- ✅ **Vos prompts personnalisés** pour l'expertise DPAI
- ✅ **Une interface simplifiée** et professionnelle
- ✅ **Un déploiement facile**

**Prochaine étape :** `firebase deploy`
