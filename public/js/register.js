// =============================================================================
// REGISTER.JS - Gestion de l'inscription
// Version simplifiée et fiable
// =============================================================================

console.log('%c[Register.js] Chargement du module d\'inscription...', 'color: #FF5722; font-weight: bold;');

// Attendre que le DOM et authService soient prêts
document.addEventListener('DOMContentLoaded', function() {
    // Attendre que authService soit disponible
    const checkAuthReady = setInterval(() => {
        if (window.authService && typeof window.authService.signUp === 'function') {
            clearInterval(checkAuthReady);
            console.log('%c✅ [Register] authService est disponible', 'color: #4CAF50; font-weight: bold;');
            initRegisterForm();
        }
    }, 100);
    
    // Timeout de sécurité
    setTimeout(() => {
        clearInterval(checkAuthReady);
        console.error('%c❌ [Register] authService NON disponible après 10 secondes', 'color: #F44336; font-weight: bold;');
        // Essayer quand même d'initialiser le formulaire
        initRegisterForm();
    }, 10000);
});

// =============================================================================
// FONCTIONS D'INITIALISATION
// =============================================================================

// Initialiser le formulaire d'inscription
function initRegisterForm() {
    const registerForm = document.getElementById('registerForm');
    const registerName = document.getElementById('registerName');
    const registerEmail = document.getElementById('registerEmail');
    const registerPassword = document.getElementById('registerPassword');
    const registerConfirmPassword = document.getElementById('registerConfirmPassword');
    const registerReferralCode = document.getElementById('registerReferralCode');
    const registerBtn = document.getElementById('registerBtnForm');
    const registerError = document.getElementById('registerError');
    const registerErrorTitle = document.getElementById('registerErrorTitle');
    const registerErrorMessage = document.getElementById('registerErrorMessage');
    const registerErrorClose = document.getElementById('registerErrorClose');
    const registerSuccess = document.getElementById('registerSuccess');
    const googleRegisterBtn = document.getElementById('googleRegisterBtn');
    
    if (!registerForm) return;
    
    // Gérer la soumission du formulaire
    registerForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Cacher les alertes
        hideAllAlerts([registerError, registerSuccess]);
        
        // Désactiver le bouton
        if (registerBtn) {
            registerBtn.disabled = true;
            registerBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Inscription...';
        }
        
        // Récupérer les valeurs
        const name = registerName ? registerName.value.trim() : '';
        const email = registerEmail ? registerEmail.value.trim() : '';
        const password = registerPassword ? registerPassword.value : '';
        const confirmPassword = registerConfirmPassword ? registerConfirmPassword.value : '';
        const referralCode = registerReferralCode ? registerReferralCode.value.trim() : null;
        
        // Validation
        if (!name || name.length < 2) {
            showError(registerError, registerErrorTitle, registerErrorMessage, 'Le nom doit contenir au moins 2 caractères');
            resetRegisterButton(registerBtn);
            return;
        }
        
        if (!email || !validateEmail(email)) {
            showError(registerError, registerErrorTitle, registerErrorMessage, 'Adresse email invalide');
            resetRegisterButton(registerBtn);
            return;
        }
        
        if (password.length < 6) {
            showError(registerError, registerErrorTitle, registerErrorMessage, 'Le mot de passe doit contenir au moins 6 caractères');
            resetRegisterButton(registerBtn);
            return;
        }
        
        if (password !== confirmPassword) {
            showError(registerError, registerErrorTitle, registerErrorMessage, 'Les mots de passe ne correspondent pas');
            resetRegisterButton(registerBtn);
            return;
        }
        
        // Vérifier qu'authService est disponible
        if (!window.authService || typeof window.authService.signUp !== 'function') {
            showError(registerError, registerErrorTitle, registerErrorMessage, 'Service d\'authentification non disponible. Veuillez rafraîchir la page.');
            resetRegisterButton(registerBtn);
            return;
        }
        
        // Inscription Firebase
        window.authService.signUp(email, password, name, referralCode).then(result => {
            if (result.success) {
                // Afficher le succès
                if (registerSuccess) registerSuccess.style.display = 'flex';
                
                // Rediriger après 1 seconde
                setTimeout(() => {
                    window.location.href = './dashboard.html';
                }, 1000);
            } else {
                showError(registerError, registerErrorTitle, registerErrorMessage, result.error || 'Erreur d\'inscription');
                resetRegisterButton(registerBtn);
            }
        }).catch(error => {
            showError(registerError, registerErrorTitle, registerErrorMessage, error.message || 'Erreur d\'inscription');
            resetRegisterButton(registerBtn);
        });
    });
    
    // Fermer l'alerte d'erreur
    if (registerErrorClose) {
        registerErrorClose.onclick = function() {
            if (registerError) registerError.style.display = 'none';
        };
    }
    
    // Inscription avec Google
    if (googleRegisterBtn) {
        googleRegisterBtn.onclick = function() {
            // Désactiver le bouton
            const btn = this;
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Inscription...';
            
            // Vérifier qu'authService et Firebase sont prêts
            const checkReady = setInterval(() => {
                if (typeof firebase !== 'undefined' && firebase && firebase.auth && 
                    window.authService && window.authService.auth) {
                    clearInterval(checkReady);
                    
                    try {
                        const provider = new firebase.auth.GoogleAuthProvider();
                        
                        window.authService.auth.signInWithPopup(provider)
                            .then(async (result) => {
                                // Nouveau utilisateur
                                if (result.additionalUserInfo.isNewUser) {
                                    await createNewUserFromGoogle(result.user);
                                }
                                // Rediriger
                                window.location.href = './dashboard.html';
                            })
                            .catch(error => {
                                showError(registerError, registerErrorTitle, registerErrorMessage, error.message || 'Erreur d\'inscription Google');
                                resetGoogleButton(btn);
                            });
                    } catch (e) {
                        showError(registerError, registerErrorTitle, registerErrorMessage, 'Firebase non initialisé. Veuillez rafraîchir la page.');
                        resetGoogleButton(btn);
                    }
                }
            }, 100);
            
            // Timeout de sécurité
            setTimeout(() => {
                clearInterval(checkReady);
                showError(registerError, registerErrorTitle, registerErrorMessage, 'Firebase met trop de temps à se charger. Veuillez rafraîchir la page.');
                resetGoogleButton(btn);
            }, 10000);
        };
    }
}

// Créer un nouvel utilisateur à partir de Google
async function createNewUserFromGoogle(user) {
    if (!window.authService || !window.authService.db) return;
    
    const userData = {
        id: user.uid,
        name: user.displayName || user.email || 'Utilisateur',
        email: user.email,
        plan: 'free',
        subscriptionStartDate: new Date().toISOString(),
        subscriptionEndDate: null,
        tokenState: typeof TokenManager !== 'undefined' ? TokenManager.createTokenState(user.uid, 'free') : { availableTokens: 500, usedTokens: 0, totalTokens: 500 },
        loyaltyInfo: typeof LoyaltySystem !== 'undefined' ? LoyaltySystem.create(user.uid) : { totalAnalyses: 0, monthlyAnalyses: 0, monthlyLoyaltyTokens: 0 },
        referralCode: null,
        referralInfo: null,
        companyName: null,
        companyDomain: typeof TokenUtils !== 'undefined' ? TokenUtils.extractDomain(user.email) : null,
        hasCompanyDiscount: false,
        hasAccessToPremiumSuggestions: true,
        hasAccessToAdvancedAnalytics: true,
        hasAccessToAPI: true,
        isEmailVerified: user.emailVerified || false,
        isActive: true,
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
        provider: 'google',
        photoURL: user.photoURL
    };
    
    try {
        await window.authService.db.collection('users').doc(user.uid).set(userData);
        if (typeof TokenManager !== 'undefined') {
            TokenManager.init(userData);
        }
    } catch (error) {
        console.error('Erreur création utilisateur Google:', error);
    }
}

// =============================================================================
// FONCTIONS UTILITAIRES
// =============================================================================

// Réinitialiser le bouton d'inscription
function resetRegisterButton(btn) {
    if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-user-plus"></i> S\'inscrire';
    }
}

// Réinitialiser le bouton Google
function resetGoogleButton(btn) {
    if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i class="fab fa-google"></i> Continuer avec Google';
    }
}

// Cacher toutes les alertes
function hideAllAlerts(alerts) {
    if (!alerts) return;
    alerts.forEach(alert => {
        if (alert) alert.style.display = 'none';
    });
}

// Afficher une erreur
function showError(errorEl, titleEl, messageEl, message) {
    if (errorEl) errorEl.style.display = 'flex';
    if (titleEl) titleEl.textContent = 'Erreur';
    if (messageEl) messageEl.textContent = message;
}

// Valider un email
function validateEmail(email) {
    if (!email) return false;
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}
