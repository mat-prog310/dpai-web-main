@echo off
chcp 65001 >nul
echo ==========================================
echo DEPLOY CLOUD FUNCTIONS - CORS FIX
echo ==========================================
echo.

cd functions
if errorlevel 1 (
    echo Erreur: dossier functions non trouvé
    pause
    exit /b 1
)

echo ✓ Dans le dossier functions/
echo.

echo Étape 2/3 : Installation des dépendances...
npm install
if errorlevel 1 (
    echo Erreur lors de l'installation
    pause
    exit /b 1
)
echo ✓ Dépendances installées
echo.

echo Étape 3/3 : Déploiement des Cloud Functions...
firebase deploy --only functions
if errorlevel 1 (
    echo Erreur lors du déploiement
    pause
    exit /b 1
)
echo.

echo ==========================================
echo ✅ DEPLOIEMENT TERMINÉ
echo ==========================================
echo.
echo Vos Cloud Functions sont maintenant configurées avec CORS.
echo Testez : https://dpaiweb.com/conseiller-dpai.html
echo.
pause
