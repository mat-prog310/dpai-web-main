// =============================================================================
// VÉRIFICATION PROTOCOLE - Firebase Auth ne fonctionne pas avec file://
// =============================================================================

console.log('%c[Protocol-Check] Vérification du protocole...', 'color: #F44336; font-weight: bold;');

if (window.location.protocol === 'file:') {
    // Firebase ne fonctionnera PAS avec file://
    console.error('%c❌ [PROTOCOLE] file:// détecté - Firebase ne fonctionnera PAS!', 'color: #F44336; font-weight: bold; font-size: 14px;');
    window.FIREBASE_DEMO_MODE = true;
    
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
