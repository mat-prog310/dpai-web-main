#!/bin/bash

# Script pour lancer un serveur local pour DPAI
# Firebase Auth/Firestore NE FONCTIONNE PAS avec file://
# Utilisez ce script pour tester localement

echo "=================================="
echo "Lancement du serveur local DPAI"
echo "=================================="
echo ""
echo "IMPORTANT: Firebase ne fonctionne PAS avec file://"
echo "Ce serveur permet de tester avec http://localhost:8000"
echo ""

# Vérifier si python3 est disponible
if command -v python3 &> /dev/null; then
    echo "Utilisation de python3..."
    cd public
    python3 -m http.server 8000
elif command -v python &> /dev/null; then
    echo "Utilisation de python..."
    cd public
    python -m http.server 8000
elif command -v npx &> /dev/null; then
    echo "Utilisation de npx serve..."
    npx serve public -l 8000
else
    echo "ERREUR: Aucun serveur local disponible"
    echo ""
    echo "Options pour installer un serveur:"
    echo "1. Python: https://www.python.org/downloads/"
    echo "2. Node.js (pour npx): https://nodejs.org/"
    echo ""
    echo "Vous pouvez aussi utiliser:"
    echo "  php -S localhost:8000 -t public"
    echo "  ruby -run -e httpd public -p 8000"
    exit 1
fi
