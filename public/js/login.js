// =============================================================================
// LOGIN.JS - Gestion de la connexion
// Version simplifiée et fiable
// =============================================================================

console.log('%c[Login.js] Chargement du module de connexion...', 'color: #9C27B0; font-weight: bold;');

// Variable pour suivre si on est en train de se connecter
let isLoggingIn = false;

// Attendre que le DOM et authService soient prêts
document.addEventListener('DOMContentLoaded', function() {
    // Attendre que authService soit disponible
    const checkAuthReady = setInterval(() => {
        if (window.authService && typeof window.authService.signIn === 'function') {
            clearInterval(checkAuthReady);
            console.log('%c✅ [Login] authService est disponible', 'color: #4CAF50; font-weight: bold;');
            
            // Écouter les changements d'auth pour la redirection automatique
            setupAuthRedirect();
            
            initLoginForm();
            initForgotPasswordModal();
        }
    }, 100);
    
    // Timeout de sécurité
    setTimeout(() => {
        clearInterval(checkAuthReady);
        console.error('%c❌ [Login] authService NON disponible après 10 secondes', 'color: #F44336; font-weight: bold;');
        // Essayer quand même d'initialiser le formulaire
        initLoginForm();
        initForgotPasswordModal();
    }, 10000);
});

// Configurer la redirection automatique après connexion
function setupAuthRedirect() {
    // Écouter l'événement authStateChanged pour la redirection
    window.addEventListener('authStateChanged', function(event) {
        const { user } = event.detail;
        // Si un utilisateur se connecte sur la page de login, rediriger
        if (user && isLoggingIn) {
            isLoggingIn = false;
            window.location.href = '/dashboard.html';
        }
    });
}

// =============================================================================
// FONCTIONS D'INITIALISATION
// =============================================================================

// Initialiser le formulaire de connexion
function initLoginForm() {
    const loginForm = document.getElementById('loginForm');
    const loginEmail = document.getElementById('loginEmail');
    const loginPassword = document.getElementById('loginPassword');
    const loginBtn = document.getElementById('loginBtnForm');
    const loginError = document.getElementById('loginError');
    const loginErrorTitle = document.getElementById('loginErrorTitle');
    const loginErrorMessage = document.getElementById('loginErrorMessage');
    const loginErrorClose = document.getElementById('loginErrorClose');
    const loginSuccess = document.getElementById('loginSuccess');
    const googleLoginBtn = document.getElementById('googleLoginBtn');
    const forgotPasswordBtn = document.getElementById('forgotPasswordBtn');
    
    if (!loginForm) return;
    
    // Gérer la soumission du formulaire
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Cacher les alertes
        hideAllAlerts([loginError, loginSuccess]);
        
        // Désactiver le bouton
        if (loginBtn) {
            loginBtn.disabled = true;
            loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Connexion...';
        }
        
        // Récupérer les valeurs
        const email = loginEmail ? loginEmail.value.trim() : '';
        const password = loginPassword ? loginPassword.value : '';
        
        // Validation
        if (!email || !validateEmail(email)) {
            showError(loginError, loginErrorTitle, loginErrorMessage, 'Adresse email invalide');
            resetLoginButton(loginBtn);
            return;
        }
        
        if (password.length < 6) {
            showError(loginError, loginErrorTitle, loginErrorMessage, 'Le mot de passe doit contenir au moins 6 caractères');
            resetLoginButton(loginBtn);
            return;
        }
        
        // Vérifier qu'authService est disponible
        if (!window.authService || typeof window.authService.signIn !== 'function') {
            showError(loginError, loginErrorTitle, loginErrorMessage, 'Service d\'authentification non disponible. Veuillez rafraîchir la page.');
            resetLoginButton(loginBtn);
            return;
        }
        
        // Marquer qu'on est en train de se connecter
        isLoggingIn = true;
        
        // Connexion Firebase
        window.authService.signIn(email, password).then(result => {
            if (result.success) {
                // La redirection sera gérée par l'écouteur authStateChanged
                // Ne rien faire ici
            } else {
                isLoggingIn = false;
                showError(loginError, loginErrorTitle, loginErrorMessage, result.error || 'Erreur de connexion');
                resetLoginButton(loginBtn);
            }
        }).catch(error => {
            isLoggingIn = false;
            showError(loginError, loginErrorTitle, loginErrorMessage, error.message || 'Erreur de connexion');
            resetLoginButton(loginBtn);
        });
    });
    
    // Fermer l'alerte d'erreur
    if (loginErrorClose) {
        loginErrorClose.onclick = function() {
            if (loginError) loginError.style.display = 'none';
        };
    }
    
    // Connexion avec Google
    if (googleLoginBtn) {
        googleLoginBtn.onclick = function() {
            // Désactiver le bouton
            const btn = this;
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Connexion...';
            
            // Marquer qu'on est en train de se connecter
            isLoggingIn = true;
            
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
                                // La redirection sera gérée par l'écouteur authStateChanged
                            })
                            .catch(error => {
                                isLoggingIn = false;
                                showError(loginError, loginErrorTitle, loginErrorMessage, error.message || 'Erreur de connexion Google');
                                resetGoogleButton(btn);
                            });
                    } catch (e) {
                        isLoggingIn = false;
                        showError(loginError, loginErrorTitle, loginErrorMessage, 'Firebase non initialisé. Veuillez rafraîchir la page.');
                        resetGoogleButton(btn);
                    }
                }
            }, 100);
            
            // Timeout de sécurité
            setTimeout(() => {
                clearInterval(checkReady);
                isLoggingIn = false;
                showError(loginError, loginErrorTitle, loginErrorMessage, 'Firebase met trop de temps à se charger. Veuillez rafraîchir la page.');
                resetGoogleButton(btn);
            }, 10000);
        };
    }
    
    // Mot de passe oublié
    if (forgotPasswordBtn) {
        forgotPasswordBtn.onclick = function(e) {
            e.preventDefault();
            const forgotPasswordModal = document.getElementById('forgotPasswordModal');
            if (forgotPasswordModal) {
                forgotPasswordModal.classList.add('visible');
            }
        };
    }
}

// Initialiser le modal de mot de passe oublié
function initForgotPasswordModal() {
    const forgotPasswordModal = document.getElementById('forgotPasswordModal');
    const forgotPasswordForm = document.getElementById('forgotPasswordForm');
    const resetEmail = document.getElementById('resetEmail');
    const forgotPasswordModalClose = document.getElementById('forgotPasswordModalClose');
    const resetPasswordSuccess = document.getElementById('resetPasswordSuccess');
    const resetPasswordError = document.getElementById('resetPasswordError');
    const resetPasswordErrorMessage = document.getElementById('resetPasswordErrorMessage');
    
    // Fermer le modal
    if (forgotPasswordModalClose) {
        forgotPasswordModalClose.onclick = function() {
            if (forgotPasswordModal) forgotPasswordModal.classList.remove('visible');
            hideAllAlerts([resetPasswordSuccess, resetPasswordError]);
        };
    }
    
    // Soumission du formulaire
    if (forgotPasswordForm) {
        forgotPasswordForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            hideAllAlerts([resetPasswordSuccess, resetPasswordError]);
            
            const email = resetEmail ? resetEmail.value.trim() : '';
            
            if (!email || !validateEmail(email)) {
                if (resetPasswordError) resetPasswordError.style.display = 'flex';
                if (resetPasswordErrorMessage) resetPasswordErrorMessage.textContent = 'Adresse email invalide';
                return;
            }
            
            // Vérifier qu'authService est disponible
            if (!window.authService || typeof window.authService.resetPassword !== 'function') {
                if (resetPasswordError) resetPasswordError.style.display = 'flex';
                if (resetPasswordErrorMessage) resetPasswordErrorMessage.textContent = 'Service non disponible';
                return;
            }
            
            // Envoyer l'email de réinitialisation
            window.authService.resetPassword(email).then(result => {
                if (result.success) {
                    if (resetPasswordSuccess) resetPasswordSuccess.style.display = 'flex';
                    if (resetPasswordError) resetPasswordError.style.display = 'none';
                    
                    // Réinitialiser le formulaire
                    if (forgotPasswordForm) forgotPasswordForm.reset();
                } else {
                    if (resetPasswordError) resetPasswordError.style.display = 'flex';
                    if (resetPasswordErrorMessage) resetPasswordErrorMessage.textContent = result.error || 'Erreur lors de l\'envoi';
                }
            }).catch(error => {
                if (resetPasswordError) resetPasswordError.style.display = 'flex';
                if (resetPasswordErrorMessage) resetPasswordErrorMessage.textContent = error.message || 'Erreur lors de l\'envoi';
            });
        });
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

// Réinitialiser le bouton de connexion
function resetLoginButton(btn) {
    if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Se connecter';
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
