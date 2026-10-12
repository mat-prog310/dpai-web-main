#!/bin/bash

echo "=========================================="
echo "DEPLOY CLOUD FUNCTIONS - CORS FIX"
echo "=========================================="
echo ""

# Étape 1 : Aller dans le dossier functions
cd functions || { echo "Erreur: dossier functions non trouvé"; exit 1; }

echo "✓ Dans le dossier functions/"
echo ""

# Étape 2 : Installer les dépendances
echo "Étape 2/3 : Installation des dépendances..."
npm install
echo "✓ Dépendances installées"
echo ""

# Étape 3 : Déployer
echo "Étape 3/3 : Déploiement des Cloud Functions..."
firebase deploy --only functions
echo ""

echo "=========================================="
echo "✅ DEPLOIEMENT TERMINÉ"
echo "=========================================="
echo ""
echo "Vos Cloud Functions sont maintenant configurées avec CORS."
echo "Testez : https://dpaiweb.com/conseiller-dpai.html"
echo ""
