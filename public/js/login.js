// =============================================================================
// LOGIN.JS - Gestion de la connexion - VERSION SIMPLE ET ROBUSTE
// =============================================================================

console.log('%c[Login.js] Chargement...', 'color: #9C27B0; font-weight: bold;');

// Attendre que le DOM soit prêt
document.addEventListener('DOMContentLoaded', () => {
    console.log('%c[Login.js] DOM prêt', 'color: #9C27B0;');

    // Éléments du formulaire
    const form = document.getElementById('loginForm');
    const emailInput = document.getElementById('loginEmail');
    const passwordInput = document.getElementById('loginPassword');
    const submitBtn = document.getElementById('loginBtnForm');
    const errorEl = document.getElementById('loginError');
    const errorMsg = document.getElementById('loginErrorMessage');
    const googleBtn = document.getElementById('googleLoginBtn');
    const forgotBtn = document.getElementById('forgotPasswordBtn');

    if (!form) {
        console.warn('%c[Login.js] Formulaire non trouvé', 'color: #FF9800;');
        return;
    }

    // Fermer les erreurs
    const closeError = () => {
        if (errorEl) errorEl.style.display = 'none';
    };

    const closeBtn = document.getElementById('loginErrorClose');
    if (closeBtn) {
        closeBtn.onclick = closeError;
    }

    // Fonction pour attendre authService
    async function waitForAuthService(timeout = 5000) {
        return new Promise((resolve, reject) => {
            if (window.authService) {
                resolve();
                return;
            }

            const checkInterval = setInterval(() => {
                if (window.authService) {
                    clearInterval(checkInterval);
                    resolve();
                }
            }, 100);

            setTimeout(() => {
                clearInterval(checkInterval);
                reject(new Error(`authService non disponible après ${timeout}ms`));
            }, timeout);
        });
    }

    // Fonction pour afficher une erreur
    function showError(message) {
        if (errorEl) errorEl.style.display = 'flex';
        if (errorMsg) errorMsg.textContent = message;
        console.error('%c❌ [Login.js] Erreur:', 'color: #F44336;', message);
    }

    // Fonction pour afficher un succès
    function showSuccess(message) {
        const successEl = document.getElementById('loginSuccess');
        const successMsg = document.getElementById('loginSuccessMessage');
        
        if (successEl) {
            successEl.style.display = 'flex';
            if (successMsg) successMsg.textContent = message;
        }
    }

    // Gestion du formulaire de connexion
    form.onsubmit = async (e) => {
        e.preventDefault();
        closeError();

        const email = emailInput?.value?.trim() || '';
        const password = passwordInput?.value || '';

        // Validation
        if (!email) {
            showError('Veuillez entrer votre email');
            return;
        }

        if (!password) {
            showError('Veuillez entrer votre mot de passe');
            return;
        }

        if (password.length < 6) {
            showError('Le mot de passe doit contenir au moins 6 caractères');
            return;
        }

        // Désactiver le bouton
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Connexion...';
        }

        try {
            await waitForAuthService();
            
            const result = await window.authService.signIn(email, password);

            if (result.success) {
                // Vérifier si l'email est vérifié
                if (result.user.emailVerified || !result.user.email) {
                    // ✅ CONNEXION RÉUSSIE - REDIRECTION
                    console.log('%c✅✅✅ [Login.js] Connexion réussie ! Redirection...', 'color: #28a745; font-weight: bold; font-size: 16px;');
                    
                    // Rediriger vers dashboard ou page précédente
                    const redirectUrl = localStorage.getItem('redirectAfterLogin') || '/dashboard.html';
                    localStorage.removeItem('redirectAfterLogin');
                    window.location.href = redirectUrl;
                } else {
                    // Email non vérifié - rediriger vers page de vérification
                    showError('Veuillez vérifier votre email avant de vous connecter');
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Se connecter';
                    }
                }
            } else {
                // ❌ ERREUR
                showError(result.error || 'Erreur de connexion');
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Se connecter';
                }
            }
        } catch (error) {
            showError(error.message || error.toString() || 'Erreur de connexion');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Se connecter';
            }
        }
    };

    // Connexion Google
    if (googleBtn) {
        googleBtn.onclick = async (e) => {
            e.preventDefault();
            closeError();

            try {
                await waitForAuthService();

                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Connexion...';
                }

                const result = await window.authService.signInWithGoogle();

                if (result.success) {
                    // ✅ CONNEXION GOOGLE RÉUSSIE - REDIRECTION
                    console.log('%c✅✅✅ [Login.js] Connexion Google réussie ! Redirection...', 'color: #28a745; font-weight: bold; font-size: 16px;');
                    
                    const redirectUrl = localStorage.getItem('redirectAfterLogin') || '/dashboard.html';
                    localStorage.removeItem('redirectAfterLogin');
                    window.location.href = redirectUrl;
                } else {
                    showError(result.error || 'Erreur de connexion Google');
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.innerHTML = '<i class="fab fa-google"></i> Continuer avec Google';
                    }
                }
            } catch (error) {
                showError(error.message || error.toString() || 'Erreur de connexion Google');
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = '<i class="fab fa-google"></i> Continuer avec Google';
                }
            }
        };
    }

    // Mot de passe oublié
    if (forgotBtn) {
        forgotBtn.onclick = (e) => {
            e.preventDefault();
            document.getElementById('loginFormCard')?.style.setProperty('display', 'none');
            document.getElementById('forgotPasswordCard')?.style.setProperty('display', 'block');
        };
    }

    // Formulaire mot de passe oublié
    const forgotForm = document.getElementById('forgotPasswordForm');
    if (forgotForm) {
        forgotForm.onsubmit = async (e) => {
            e.preventDefault();
            const forgotEmail = document.getElementById('forgotEmail');
            const email = forgotEmail?.value?.trim() || '';

            if (!email) {
                showError('Veuillez entrer votre email');
                return;
            }

            try {
                await waitForAuthService();
                const result = await window.authService.resetPassword(email);

                if (result.success) {
                    if (forgotEmail) forgotEmail.value = '';
                    showSuccess('Email de réinitialisation envoyé ! Vérifiez votre boîte mail.');
                    setTimeout(() => {
                        document.getElementById('forgotPasswordCard')?.style.setProperty('display', 'none');
                        document.getElementById('loginFormCard')?.style.setProperty('display', 'block');
                    }, 3000);
                } else {
                    showError(result.error || 'Erreur lors de l\'envoi');
                }
            } catch (error) {
                showError(error.message || error.toString());
            }
        };
    }

    // Retour à la connexion depuis mot de passe oublié
    const backToLoginBtn = document.getElementById('backToLogin');
    if (backToLoginBtn) {
        backToLoginBtn.onclick = () => {
            document.getElementById('forgotPasswordCard')?.style.setProperty('display', 'none');
            document.getElementById('loginFormCard')?.style.setProperty('display', 'block');
        };
    }

    console.log('%c✅ [Login.js] Initialisation terminée', 'color: #28a745; font-weight: bold;');
});
