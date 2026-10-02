# Guide de Test pour DPAI Web

## ⚠️ PROBLÈME CRITIQUE : Firebase ne fonctionne PAS avec file://

Si vous ouvrez directement les fichiers HTML depuis votre explorateur (ex: `file:///Users/.../index.html`), **Firebase Auth et Firestore NE FONCTIONNERONT PAS** à cause des restrictions CORS du navigateur.

---

## ✅ SOLUTION : Utiliser un serveur local

### Option 1: Utiliser le script fourni

#### Sur Mac/Linux:
```bash
chmod +x run-local-server.sh
./run-local-server.sh
```

#### Sur Windows:
Double-cliquez sur `run-local-server.bat`

---

### Option 2: Lancer manuellement

#### Avec Python (recommandé):
```bash
cd public
python -m http.server 8000
# Ou sur Python 3:
python3 -m http.server 8000
```

#### Avec Node.js (npx):
```bash
npx serve public -l 8000
```

#### Avec PHP:
```bash
php -S localhost:8000 -t public
```

#### Avec Ruby:
```bash
ruby -run -e httpd public -p 8000
```

---

## 🌐 Accéder à l'application

Une fois le serveur lancé, ouvrez votre navigateur et allez sur :

**http://localhost:8000**

⚠️ **NE PAS utiliser** `file:///.../public/index.html` - cela ne fonctionnera PAS avec Firebase.

---

## 🔥 Déploiement des Cloud Functions

Si vous voyez l'erreur `Failed to load resource: the server responded with a status of 404 (analyzeWithAI)`, vous devez déployer les fonctions Firebase.

### Étape 1: Supprimer les fonctions obsolètes

```bash
cd /Users/fabienduprey/Desktop/dpai-web-main

# Supprimer chaque fonction obsolète
firebase functions:delete claimFreeSubscription --region us-central1 --force
firebase functions:delete claimFreeTokenPack --region us-central1 --force
firebase functions:delete confirmStripeSubscription --region us-central1 --force
firebase functions:delete confirmTokenPurchase --region us-central1 --force
firebase functions:delete initSubscription --region us-central1 --force
firebase functions:delete initTokenPurchase --region us-central1 --force
firebase functions:delete stripeWebhook --region us-central1 --force
```

### Étape 2: Déployer les nouvelles fonctions

```bash
firebase deploy --only functions
```

---

## 📝 Résumé des corrections déjà déployées

| Problème | Statut | Solution |
|----------|--------|----------|
| TokenManager is not defined | ✅ Corrigé | Ajout de tokens.js + initialisation |
| Erreur CORS 404 | ✅ Corrigé | Utilisation de /functions/ |
| SyntaxError non-JSON | ✅ Corrigé | Gestion des erreurs |
| Body is disturbed | ✅ Corrigé | Lecture unique du body |

---

## 💡 Dépannage

### Si vous voyez toujours des erreurs CORS Firestore:
1. Vérifiez que vous utilisez `http://localhost:8000` et PAS `file://`
2. Vérifiez que Firebase est initialisé (regardez la console pour "Firebase Initialisé")
3. Essayez de vider le cache du navigateur (Ctrl+Shift+R)

### Si vous voyez "Error: Erreur serveur" pour analyzeWithAI:
1. Déployez les Cloud Functions (voir ci-dessus)
2. Vérifiez que les fonctions sont bien déployées avec `firebase functions:list`
3. Attendez 1-2 minutes après le déploiement pour que les fonctions soient disponibles

---

## 🎯 Checklist avant de tester

- [ ] J'utilise `http://localhost:8000` et PAS `file://`
- [ ] J'ai lancé un serveur local (Python, npx, etc.)
- [ ] J'ai supprimé les fonctions obsolètes (si déploiement nécessaire)
- [ ] J'ai déployé les nouvelles fonctions (si nécessaire)
- [ ] J'ai vidé le cache du navigateur

---

## 📞 Support

Si vous avez toujours des problèmes, contactez : duprey.conseil@gmail.com
