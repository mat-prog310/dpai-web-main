@echo off
chcp 65001 >nul
echo ========================================
echo    DPAI LOCAL AI - Démarrage Rapide
echo ========================================
echo.
echo 1. Installation des dépendances...
pip install -r requirements.txt
echo.
echo 2. Chargement des données DPAI...
python train.py --all
echo.
echo 3. Lancement du chat...
echo.
echo Tapez '/quit' pour quitter
echo Tapez '/help' pour l'aide
echo.
python chat.py
echo.
echo ========================================
echo        Fin du démarrage rapide
echo ========================================
pause
