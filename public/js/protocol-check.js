// =============================================================================
// VÉRIFICATION PROTOCOLE - Firebase Auth ne fonctionne pas avec file://
// =============================================================================

console.log('%c[Protocol-Check] Vérification du protocole...', 'color: #F44336; font-weight: bold;');

if (window.location.protocol === 'file:') {
    // Mode démo : Firebase ne fonctionnera pas, mais le site affichera des données par défaut
    console.warn('%c⚠️ [PROTOCOLE] file:// détecté - Firebase ne fonctionnera pas, mais le mode démo est activé', 'color: #FF9800; font-size: 14px;');
    
    // Afficher une notification discrète
    const noticeDiv = document.createElement('div');
    noticeDiv.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: #FF9800;
        color: #333;
        padding: 15px 20px;
        border-radius: 8px;
        font-family: Arial, sans-serif;
        font-size: 14px;
        z-index: 9999;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        max-width: 400px;
    `;
    
    noticeDiv.innerHTML = `
        <strong>⚠️ Mode démo</strong><br>
        Firebase ne fonctionne pas avec file://. <a href="#" onclick="this.parentElement.parentElement.remove();" style="color:#333;text-decoration:underline;">Fermer</a><br>
        <small>Utilisez un serveur local (python -m http.server 8000)</small>
    `;
    
    setTimeout(() => {
        document.body.appendChild(noticeDiv);
    }, 1000);
    
    // Définir une variable globale pour indiquer le mode démo
    window.FIREBASE_DEMO_MODE = true;
}
