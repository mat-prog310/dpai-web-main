@echo off
REM Script pour lancer un serveur local pour DPAI
REM Firebase Auth/Firestore NE FONCTIONNE PAS avec file://
REM Utilisez ce script pour tester localement

echo ==================================
Echo Lancement du serveur local DPAI
echo ==================================
echo.
echo IMPORTANT: Firebase ne fonctionne PAS avec file://
echo Ce serveur permet de tester avec http://localhost:8000
echo.

REM Essayer python3 d'abord
python3 -m http.server 8000 --directory public 2>nul
IF %ERRORLEVEL% EQU 0 (
    echo Utilisation de python3...
    cd public
    python3 -m http.server 8000
    goto :eof
)

REM Essayer python
python -m http.server 8000 --directory public 2>nul
IF %ERRORLEVEL% EQU 0 (
    echo Utilisation de python...
    cd public
    python -m http.server 8000
    goto :eof
)

REM Essayer npx
npx serve public -l 8000 2>nul
IF %ERRORLEVEL% EQU 0 (
    echo Utilisation de npx serve...
    npx serve public -l 8000
    goto :eof
)

REM Aucun serveur trouvé
echo ERREUR: Aucun serveur local disponible
echo.
echo Options pour installer un serveur:
echo 1. Python: https://www.python.org/downloads/
echo 2. Node.js (pour npx): https://nodejs.org/
echo.
echo Vous pouvez aussi utiliser:
echo   php -S localhost:8000 -t public
echo   ruby -run -e httpd public -p 8000
pause
