// =============================================================================
// ANALYTICS.JS - Google Analytics et gestion des cookies
// =============================================================================

// ID de mesure Google Analytics
const GA_ID = 'G-R3QVVF35GB';

// =============================================================================
// GOOGLE ANALYTICS
// =============================================================================

// Charger le script gtag.js asynchrone
function loadGoogleAnalytics() {
    const script = document.createElement('script');
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
    script.async = true;
    document.head.appendChild(script);
    
    // Initialiser dataLayer
    window.dataLayer = window.dataLayer || [];
    function gtag() {
        dataLayer.push(arguments);
    }
    gtag('js', new Date());
    gtag('config', GA_ID);
    
    // Stocker gtag globalement
    window.gtag = gtag;
}

// =============================================================================
// COOKIE CONSENT
// =============================================================================

// Clés de stockage
const COOKIE_CONSENT_KEY = 'cookieConsent';
const COOKIE_CHOICE_ACCEPT = 'accepted';
const COOKIE_CHOICE_REFUSE = 'refused';

// Vérifier si le consentement a déjà été donné
function hasCookieConsent() {
    return localStorage.getItem(COOKIE_CONSENT_KEY) !== null;
}

// Sauvegarder le consentement
function saveCookieConsent(choice) {
    localStorage.setItem(COOKIE_CONSENT_KEY, choice);
    
    // Si accepté, activer Google Analytics
    if (choice === COOKIE_CHOICE_ACCEPT) {
        loadGoogleAnalytics();
    }
}

// Créer la bannière cookies
function createCookieBanner() {
    const banner = document.createElement('div');
    banner.className = 'cookie-banner';
    banner.id = 'cookieConsentBanner';
    
    banner.innerHTML = `
        <div class="cookie-content">
            <h4><i class="fas fa-cookie-bite"></i> Nous collectons des données</h4>
            <p>Ce site utilise des cookies et des services de suivi pour améliorer votre expérience et analyser le trafic.</p>
        </div>
        <div class="cookie-actions">
            <button id="refuseCookies" class="btn btn-outline">
                <i class="fas fa-times"></i> Refuser
            </button>
            <button id="acceptCookies" class="btn btn-primary">
                <i class="fas fa-check"></i> Accepter
            </button>
        </div>
        <a class="cookie-preferences-link" id="manageCookiesLink">
            <i class="fas fa-cog"></i> Gérer les préférences
        </a>
    `;
    
    document.body.appendChild(banner);
    
    return banner;
}

// Initialiser la bannière cookies
function initCookieBanner() {
    // Si consentement déjà donné, ne pas afficher
    if (hasCookieConsent()) {
        // Si accepté, charger Google Analytics
        if (localStorage.getItem(COOKIE_CONSENT_KEY) === COOKIE_CHOICE_ACCEPT) {
            loadGoogleAnalytics();
        }
        return;
    }
    
    // Créer et afficher la bannière
    const banner = createCookieBanner();
    
    // Gérer les boutons
    const acceptBtn = document.getElementById('acceptCookies');
    const refuseBtn = document.getElementById('refuseCookies');
    const manageLink = document.getElementById('manageCookiesLink');
    
    acceptBtn?.addEventListener('click', () => {
        saveCookieConsent(COOKIE_CHOICE_ACCEPT);
        hideCookieBanner(banner);
    });
    
    refuseBtn?.addEventListener('click', () => {
        saveCookieConsent(COOKIE_CHOICE_REFUSE);
        hideCookieBanner(banner);
    });
    
    manageLink?.addEventListener('click', () => {
        // Pour l'instant, on accepte par défaut
        saveCookieConsent(COOKIE_CHOICE_ACCEPT);
        hideCookieBanner(banner);
    });
}

// Masquer la bannière avec animation
function hideCookieBanner(banner) {
    banner.classList.add('hidden');
    setTimeout(() => {
        banner.remove();
    }, 500);
}

// =============================================================================
// INITIALISATION
// =============================================================================

// Initialiser quand le DOM est prêt
document.addEventListener('DOMContentLoaded', () => {
    // Attendre un peu pour laisser le temps aux autres scripts de s'initialiser
    setTimeout(() => {
        initCookieBanner();
    }, 100);
});
