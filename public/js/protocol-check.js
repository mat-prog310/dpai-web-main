// =============================================================================
// VÉRIFICATION PROTOCOLE - Firebase Auth ne fonctionne pas avec file://
// =============================================================================

console.log('%c[Protocol-Check] Vérification du protocole...', 'color: #F44336; font-weight: bold;');

if (window.location.protocol === 'file:') {
    // Afficher une alerte VISIBLE dans la page
    const alertDiv = document.createElement('div');
    alertDiv.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: #F44336;
        color: white;
        padding: 20px;
        font-family: Arial, sans-serif;
        font-size: 18px;
        text-align: center;
        z-index: 999999;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
    `;
    
    alertDiv.innerHTML = `
        <h1 style="font-size: 28px; margin-bottom: 20px;">⚠️ ERREUR: Firebase ne fonctionne pas !</h1>
        <p style="font-size: 18px; margin-bottom: 20px;">
            Vous avez ouvert ce fichier directement depuis votre ordinateur (file://).
        </p>
        <p style="font-size: 18px; margin-bottom: 20px;">
            <strong>Firebase Auth REQUIERT un serveur web.</strong>
        </p>
        <div style="font-size: 16px; text-align: left; margin-bottom: 20px;">
            <p><strong>SOLUTION 1 (Python):</strong></p>
            <pre style="background: #333; padding: 10px; border-radius: 5px; text-align: left;">cd /Users/fabienduprey/Desktop/dpai-web-main/public
python -m http.server 8000</pre>
            <p>Puis ouvrez: <a href="http://localhost:8000" style="color: #FFEB3B; text-decoration: underline;">http://localhost:8000</a></p>
            <br>
            <p><strong>SOLUTION 2 (VS Code):</strong></p>
            <p>Installez l'extension "Live Server" et cliquez sur "Go Live"</p>
            <p>Puis ouvrez: <a href="http://localhost:5500" style="color: #FFEB3B; text-decoration: underline;">http://localhost:5500</a></p>
        </div>
        <p style="font-size: 14px; color: #FFEB3B;">
            Ce site ne fonctionnera PAS tant que vous n'utiliserez pas un serveur web local.
        </p>
    `;
    
    document.body.prepend(alertDiv);
    
    // Empêcher toute interaction
    document.body.style.pointerEvents = 'none';
    
    console.error('%c❌❌❌ [PROTOCOLE] file:// DÉTECTÉ - Firebase Auth NE FONCTIONNERA PAS !', 'color: #F44336; font-size: 20px; font-weight: bold;');
    console.error('%c❌ Utilisez: http://localhost:8000 ou http://localhost:5500', 'color: #F44336; font-size: 20px; font-weight: bold;');
}
