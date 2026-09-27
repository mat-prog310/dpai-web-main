// =============================================================================
// CONFIRMATION.JS - Page de bienvenue simplifiée
// Tous les utilisateurs ont un accès gratuit avec 500 tokens
// Pour plus de tokens: envoyer un email à duprey.conseil@gmail.com
// =============================================================================

console.log('%c💳 [confirmation.js] Page de bienvenue chargée', 'color: #28a745; font-weight: bold;');

// Attendre que Firebase et authService soient prêts
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔍 [confirmation.js] DOM chargé, attente de Firebase...');
    
    const initInterval = setInterval(() => {
        if (typeof firebase !== 'undefined' && firebase && typeof db !== 'undefined' && db) {
            // Initialiser authService si pas déjà fait
            if (typeof authService !== 'undefined' && authService && typeof authService.init === 'function') {
                console.log('🔐 [confirmation.js] Initialisation de authService...');
                authService.init();
            }
            
            clearInterval(initInterval);
            console.log('✅ [confirmation.js] Firebase et Firestore prêts');
            
            // Mettre à jour l'interface avec les tokens
            updateTokenDisplay();
        }
    }, 200);
    
    // Timeout de sécurité
    setTimeout(() => {
        clearInterval(initInterval);
        console.log('⚠️ [confirmation.js] Timeout atteint');
        updateTokenDisplay();
    }, 5000);
});

/**
 * Met à jour l'affichage des tokens
 */
function updateTokenDisplay() {
    if (typeof TokenManager !== 'undefined' && TokenManager.tokenState) {
        const tokenAmountEl = document.getElementById('tokenAmount');
        if (tokenAmountEl) {
            const available = TokenManager.tokenState.availableTokens;
            const total = TokenManager.tokenState.totalTokens;
            tokenAmountEl.textContent = available;
            const infoEl = tokenAmountEl.parentElement.querySelector('p:last-child');
            if (infoEl) {
                infoEl.textContent = `tokens (total: ${total})`;
            }
        }
    }
}

// Exposer pour utilisation depuis console
window.updateTokenDisplay = updateTokenDisplay;
