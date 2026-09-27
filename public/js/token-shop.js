// =============================================================================
// TOKEN-SHOP.JS - Désactivé
// Tous les services sont maintenant gratuits avec 500 tokens
// Pour plus d'informations : voir pricing.html
// =============================================================================

console.log('%c💰 [Token Shop] Désactivé - Tous les services sont gratuits', 'color: #6c757d;');

// Redirection automatique vers pricing.html
if (window.location.pathname.includes('token-shop.html')) {
    window.location.href = '/pricing.html';
}

// Fonctions vides pour compatibilité
function openTokenShopModal() {
    window.location.href = '/pricing.html';
}

function purchaseTokenPack() {
    window.location.href = '/pricing.html';
}
