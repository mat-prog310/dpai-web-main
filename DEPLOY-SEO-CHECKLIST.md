# Checklist de Déploiement SEO - DPAI Strategy

## ⚡ Actions Immédiates (À faire AVANT le déploiement)

### 1. Créer les Images Open Graph
- [ ] Créer `og-image.jpg` (1200x630px) pour l'accueil
- [ ] Créer `services-og.jpg` pour la page services
- [ ] Créer `pricing-og.jpg` pour la page tarifs
- [ ] Créer `register-og.jpg` pour la page inscription
- [ ] Créer `tokens-og.jpg` pour la page achat tokens
- [ ] Créer `login-og.jpg` pour la page connexion
- [ ] **Format**: JPG ou PNG optimisé (< 200KB)
- [ ] **Contenu**: Logo DPAI + texte accrocheur + CTA
- [ ] **Emplacement**: `/public/images/`

### 2. Créer les Favicons
- [ ] Créer `favicon.ico` (32x32 et 48x48)
- [ ] Créer `favicon-16x16.png`
- [ ] Créer `favicon-32x32.png`
- [ ] Créer `apple-touch-icon.png` (180x180)
- [ ] **Emplacement**: `/public/`
- [ ] **Test**: Vérifier l'affichage dans le navigateur

---

## 🚀 Déploiement

### 3. Déployer sur Firebase
```bash
# Depuis la racine du projet
firebase deploy --only hosting
```

### 4. Vérifier le Déploiement
- [ ] Visiter https://dpai-strategy.com
- [ ] Vérifier que toutes les pages s'affichent correctement
- [ ] Tester les liens internes
- [ ] Vérifier les redirections (www, HTTPS)

---

## 🔍 Vérifications Post-Déploiement

### 5. Vérification Technique
- [ ] **Google PageSpeed Insights**: https://pagespeed.web.dev
  - Tester l'URL: https://dpai-strategy.com
  - Objectif: Score > 85/100 (mobile et desktop)
  - Corriger les problèmes identifiés

- [ ] **Mobile-Friendly Test**: https://search.google.com/test/mobile-friendly
  - Tester l'URL: https://dpai-strategy.com
  - Objectif: 100% mobile-friendly

- [ ] **Rich Results Test**: https://search.google.com/test/rich-results
  - Tester chaque page principale
  - Vérifier que les Rich Snippets s'affichent

### 6. Configuration Google
- [ ] **Google Search Console**: https://search.google.com/search-console
  1. Ajouter la propriété: https://dpai-strategy.com
  2. Choisir la méthode de vérification: **Fichier HTML**
  3. Télécharger le fichier de vérification
  4. Placer le fichier dans `/public/`
  5. Redéployer: `firebase deploy --only hosting`
  6. Cliquer sur "Vérifier" dans GSC

- [ ] **Soumettre le Sitemap**
  1. Dans GSC, aller dans "Sitemaps"
  2. Ajouter: `sitemap.xml`
  3. Soumettre

- [ ] **Google Analytics**
  1. Créer une propriété GA4
  2. Ajouter le code de suivi dans le `<head>` de toutes les pages
  3. Configurer les événements de conversion:
     - Inscription (register.html)
     - Connexion (login.html)
     - Clic sur "Acheter des tokens" (plus-de-tokens.html)

### 7. Vérification de l'Indexation
- [ ] **Vérifier dans Google Search Console**
  - Attendre 24-48h après le déploiement
  - Vérifier dans "Couverture" que les pages sont indexées
  - Corriger les erreurs d'indexation

- [ ] **Test manuel**
  - Rechercher sur Google: `site:dpai-strategy.com`
  - Vérifier que les pages principales apparaissent

- [ ] **Vérifier robots.txt**
  - Accéder à: https://dpai-strategy.com/robots.txt
  - Vérifier que le contenu est correct

- [ ] **Vérifier sitemap.xml**
  - Accéder à: https://dpai-strategy.com/sitemap.xml
  - Vérifier que toutes les pages sont listées

---

## 📊 Optimisations Supplémentaires

### 8. Optimisation des Images
- [ ] Compresser toutes les images existantes
  - Utiliser: https://tinypng.com ou https://squoosh.app
  - Format recommandé: WebP
- [ ] Ajouter des attributs `alt` à toutes les images
  - Exemple: `alt="DPAI Strategy - 500 tokens gratuits d'une valeur de 125 euros"`

### 9. Vérification des Liens
- [ ] **Liens internes**
  - Vérifier que tous les liens pointent vers les bonnes pages
  - Corriger les liens brisés
- [ ] **Liens externes**
  - Vérifier que tous les liens vers Firebase, Font Awesome, etc. fonctionnent
  - Utiliser `rel="noopener noreferrer"` pour les liens externes

### 10. Test Utilisateur
- [ ] Tester sur différents navigateurs (Chrome, Firefox, Safari, Edge)
- [ ] Tester sur différents appareils (mobile, tablette, desktop)
- [ ] Tester les formulaires (inscription, connexion)
- [ ] Vérifier l'affichage des Rich Snippets dans les résultats de recherche

---

## 📈 Suivi et Maintenance

### 11. Configuration du Suivi
- [ ] **Google Search Console**
  - Configurer les alertes par email
  - Vérifier régulièrement les erreurs de crawl
  - Analyser les requêtes de recherche

- [ ] **Google Analytics**
  - Configurer les rapports automatiques
  - Vérifier le trafic quotidien
  - Analyser le comportement des utilisateurs

### 12. Audit Mensuel
- [ ] Vérifier l'indexation des nouvelles pages
- [ ] Analyser les positions des mots-clés
- [ ] Mettre à jour le sitemap.xml si nécessaire
- [ ] Vérifier les backlinks (via Ahrefs ou SEMrush)

---

## 🎯 Priorités par Jour

### Jour 1 (Déploiement)
- [ ] Créer les images Open Graph
- [ ] Créer les favicons
- [ ] Déployer sur Firebase
- [ ] Vérifier le bon fonctionnement du site

### Jour 2 (Configuration Google)
- [ ] Configurer Google Search Console
- [ ] Soumettre le sitemap
- [ ] Configurer Google Analytics
- [ ] Vérifier l'indexation

### Jour 3 (Optimisation)
- [ ] Compresser les images
- [ ] Ajouter les attributs alt
- [ ] Tester sur différents appareils
- [ ] Corriger les problèmes identifiés

### Semaine 1 (Analyse)
- [ ] Vérifier les positions dans Google
- [ ] Analyser le trafic dans Google Analytics
- [ ] Corriger les erreurs de crawl
- [ ] Optimiser les pages sous-performantes

### Mois 1 (Stratégie)
- [ ] Lancer la stratégie de backlinks
- [ ] Créer du contenu frais (blog, témoignages)
- [ ] Analyser les performances
- [ ] Planifier les améliorations

---

## 🚨 Problèmes Courants et Solutions

### Problème: Les pages ne s'indexent pas
**Solutions:**
- [ ] Vérifier que `robots.txt` n'est pas bloquant
- [ ] Vérifier les balises `<meta name="robots">`
- [ ] Vérifier dans Google Search Console les erreurs de crawl
- [ ] Soumettre manuellement les URLs à l'indexation

### Problème: Les Rich Snippets ne s'affichent pas
**Solutions:**
- [ ] Vérifier le JSON-LD avec Rich Results Test
- [ ] Corriger les erreurs de syntaxe
- [ ] Attendre 1-2 semaines (Google met du temps à mettre à jour)

### Problème: Le site est lent
**Solutions:**
- [ ] Compresser les images
- [ ] Activer la compression GZIP
- [ ] Utiliser le cache navigateur
- [ ] Minifier CSS et JS
- [ ] Utiliser un CDN pour les assets statiques

### Problème: Le mobile n'affiche pas correctement
**Solutions:**
- [ ] Vérifier le viewport: `<meta name="viewport" content="width=device-width, initial-scale=1.0">`
- [ ] Tester avec Mobile-Friendly Test
- [ ] Corriger les problèmes CSS
- [ ] Utiliser les media queries

---

## ✅ Checklist Complète

### Avant le Déploiement
- [ ] Images Open Graph créées
- [ ] Favicons créés
- [ ] Tous les fichiers modifiés sont sauvegardés
- [ ] Git commit des changements

### Déploiement
- [ ] `firebase deploy --only hosting` exécuté
- [ ] Site accessible à https://dpai-strategy.com
- [ ] Toutes les pages fonctionnent

### Post-Déploiement
- [ ] Google Search Console configuré
- [ ] Sitemap soumis
- [ ] Google Analytics configuré
- [ ] Images compressées
- [ ] Attributs alt ajoutés
- [ ] Liens vérifiés

### Vérifications
- [ ] PageSpeed Insights: Score > 85
- [ ] Mobile-Friendly: 100%
- [ ] Rich Results Test: Pas d'erreurs
- [ ] Indexation: Toutes les pages indexées

---

## 📞 Support

### Ressources Utiles
- **Google Search Console**: https://search.google.com/search-console
- **Google PageSpeed Insights**: https://pagespeed.web.dev
- **Rich Results Test**: https://search.google.com/test/rich-results
- **Mobile-Friendly Test**: https://search.google.com/test/mobile-friendly

### Documentation
- **SEO-GUIDE.md**: Guide complet de la stratégie SEO
- **SEO-IMPLEMENTATION-SUMMARY.md**: Résumé des changements

---

**Date cible de déploiement**: 2026-10-02  
**Responsable**: Équipe DPAI Strategy  
**Objectif**: Première page Google en 3-6 mois