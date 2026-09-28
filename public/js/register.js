// =============================================================================
// REGISTER.JS - Gestion de l'inscription - VERSION SIMPLE ET ROBUSTE
// =============================================================================

console.log('%c[Register.js] Chargement...', 'color: #FF5722; font-weight: bold;');

// Attendre que le DOM soit prêt
document.addEventListener('DOMContentLoaded', () => {
    console.log('%c[Register.js] DOM prêt', 'color: #FF5722;');

    // Éléments du formulaire
    const form = document.getElementById('registerForm');
    const nameInput = document.getElementById('registerName');
    const emailInput = document.getElementById('registerEmail');
    const passwordInput = document.getElementById('registerPassword');
    const confirmInput = document.getElementById('registerConfirmPassword');
    const submitBtn = document.getElementById('registerBtnForm');
    const errorEl = document.getElementById('registerError');
    const errorMsg = document.getElementById('registerErrorMessage');
    const googleBtn = document.getElementById('googleRegisterBtn');

    if (!form) {
        console.warn('%c[Register.js] Formulaire non trouvé', 'color: #FF9800;');
        return;
    }

    // Fermer les erreurs
    const closeError = () => {
        if (errorEl) errorEl.style.display = 'none';
    };

    const closeBtn = document.getElementById('registerErrorClose');
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
        if (errorEl) errorEl.style.display = 'block';
        if (errorMsg) errorMsg.textContent = message;
        console.error('%c❌ [Register.js] Erreur:', 'color: #F44336;', message);
    }

    // Gestion du formulaire d'inscription
    form.onsubmit = async (e) => {
        e.preventDefault();
        closeError();

        const name = nameInput?.value?.trim() || '';
        const email = emailInput?.value?.trim() || '';
        const password = passwordInput?.value || '';
        const confirm = confirmInput?.value || '';

        // Validation
        if (!name || name.length < 2) {
            showError('Veuillez entrer un nom valide (minimum 2 caractères)');
            return;
        }

        if (!email) {
            showError('Veuillez entrer votre email');
            return;
        }

        // Validation email simple
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            showError('Veuillez entrer une adresse email valide');
            return;
        }

        if (!password) {
            showError('Veuillez créer un mot de passe');
            return;
        }

        if (password.length < 6) {
            showError('Le mot de passe doit contenir au moins 6 caractères');
            return;
        }

        if (password !== confirm) {
            showError('Les mots de passe ne correspondent pas');
            return;
        }

        // Vérifier la checkbox des termes
        const termsCheck = document.getElementById('termsAgreement');
        if (termsCheck && !termsCheck.checked) {
            showError('Vous devez accepter les conditions générales');
            return;
        }

        // Désactiver le bouton
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Inscription...';
        }

        try {
            await waitForAuthService();

            const result = await window.authService.signUp(email, password, name);

            if (result.success) {
                // ✅ INSCRIPTION RÉUSSIE - REDIRECTION
                console.log('%c✅✅✅ [Register.js] Inscription réussie ! Redirection...', 'color: #28a745; font-weight: bold; font-size: 16px;');
                
                const redirectUrl = localStorage.getItem('redirectAfterLogin') || '/dashboard.html';
                localStorage.removeItem('redirectAfterLogin');
                window.location.href = redirectUrl;
            } else {
                // ❌ ERREUR
                showError(result.error || 'Erreur d\'inscription');
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = '<i class="fas fa-user-plus"></i> S\'inscrire';
                }
            }
        } catch (error) {
            showError(error.message || error.toString() || 'Erreur d\'inscription');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fas fa-user-plus"></i> S\'inscrire';
            }
        }
    };

    // Inscription Google
    if (googleBtn) {
        googleBtn.onclick = async (e) => {
            e.preventDefault();
            closeError();

            try {
                await waitForAuthService();

                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Inscription...';
                }

                const result = await window.authService.signInWithGoogle();

                if (result.success) {
                    // ✅ INSCRIPTION GOOGLE RÉUSSIE - REDIRECTION
                    console.log('%c✅✅✅ [Register.js] Inscription Google réussie ! Redirection...', 'color: #28a745; font-weight: bold; font-size: 16px;');
                    
                    const redirectUrl = localStorage.getItem('redirectAfterLogin') || '/dashboard.html';
                    localStorage.removeItem('redirectAfterLogin');
                    window.location.href = redirectUrl;
                } else {
                    showError(result.error || 'Erreur d\'inscription Google');
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.innerHTML = '<i class="fab fa-google"></i> Continuer avec Google';
                    }
                }
            } catch (error) {
                showError(error.message || error.toString() || 'Erreur d\'inscription Google');
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = '<i class="fab fa-google"></i> Continuer avec Google';
                }
            }
        };
    }

    // Toggle password visibility
    const togglePassword = (inputId, btnId) => {
        const input = document.getElementById(inputId);
        const btn = document.getElementById(btnId);
        if (input && btn) {
            const icon = btn.querySelector('i');
            if (input.type === 'password') {
                input.type = 'text';
                if (icon) {
                    icon.classList.replace('fa-eye', 'fa-eye-slash');
                }
            } else {
                input.type = 'password';
                if (icon) {
                    icon.classList.replace('fa-eye-slash', 'fa-eye');
                }
            }
        }
    };

    const toggleRegisterBtn = document.getElementById('toggleRegisterPassword');
    const toggleConfirmBtn = document.getElementById('toggleConfirmPassword');

    if (toggleRegisterBtn) {
        toggleRegisterBtn.onclick = () => togglePassword('registerPassword', 'toggleRegisterPassword');
    }
    if (toggleConfirmBtn) {
        toggleConfirmBtn.onclick = () => togglePassword('registerConfirmPassword', 'toggleConfirmPassword');
    }

    // Validation en temps réel de la correspondance des mots de passe
    if (confirmInput && passwordInput) {
        confirmInput.addEventListener('input', () => {
            const errorSpan = document.getElementById('confirmPasswordError');
            if (errorSpan) {
                if (confirmInput.value && passwordInput.value && confirmInput.value !== passwordInput.value) {
                    errorSpan.style.display = 'block';
                } else {
                    errorSpan.style.display = 'none';
                }
            }
        });
    }

    console.log('%c✅ [Register.js] Initialisation terminée', 'color: #28a745; font-weight: bold;');
});
