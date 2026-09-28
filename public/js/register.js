// =============================================================================
// REGISTER.JS - Inscription ULTRA-SIMPLE
// =============================================================================

console.log('%c[Register.js] Chargement...', 'color: #FF5722; font-weight: bold;');

// Attendre que le DOM soit chargé
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('registerForm');
    const nameInput = document.getElementById('registerName');
    const emailInput = document.getElementById('registerEmail');
    const passwordInput = document.getElementById('registerPassword');
    const confirmInput = document.getElementById('registerConfirmPassword');
    const submitBtn = document.getElementById('registerBtnForm');
    const errorEl = document.getElementById('registerError');
    const errorMsg = document.getElementById('registerErrorMessage');
    const googleBtn = document.getElementById('googleRegisterBtn');
    
    if (!form) return;
    
    // Attacher l'écouteur DIRECTEMENT
    form.onsubmit = async (e) => {
        e.preventDefault();
        
        // Vérifier qu'authService est disponible
        if (!window.authService) {
            if (errorEl) errorEl.style.display = 'flex';
            if (errorMsg) errorMsg.textContent = 'Service d\'authentification non disponible. Veuillez rafraîchir la page.';
            return;
        }
        
        const name = nameInput?.value?.trim() || '';
        const email = emailInput?.value?.trim() || '';
        const password = passwordInput?.value || '';
        const confirm = confirmInput?.value || '';
        
        if (!name || !email || !password) {
            if (errorEl) errorEl.style.display = 'flex';
            if (errorMsg) errorMsg.textContent = 'Veuillez remplir tous les champs';
            return;
        }
        
        if (password !== confirm) {
            if (errorEl) errorEl.style.display = 'flex';
            if (errorMsg) errorMsg.textContent = 'Les mots de passe ne correspondent pas';
            return;
        }
        
        // Désactiver le bouton
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Inscription...';
        }
        
        try {
            const result = await window.authService.signUp(email, password, name);
            
            if (result.success) {
                // ✅ INSCRIPTION RÉUSSIE → REDIRECTION VERS DASHBOARD
                console.log('%c✅ Inscription réussie, redirection vers /dashboard.html', 'color: #28a745; font-weight: bold;');
                window.location.href = '/dashboard.html';
            } else {
                // ❌ ERREUR
                if (errorEl) errorEl.style.display = 'flex';
                if (errorMsg) errorMsg.textContent = result.error || 'Erreur d\'inscription';
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = '<i class="fas fa-user-plus"></i> S\'inscrire';
                }
            }
        } catch (error) {
            if (errorEl) errorEl.style.display = 'flex';
            if (errorMsg) errorMsg.textContent = error.message || 'Erreur d\'inscription';
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
            
            if (!window.authService || !window.firebase) {
                if (errorEl) errorEl.style.display = 'flex';
                if (errorMsg) errorMsg.textContent = 'Firebase non initialisé. Rafraîchissez la page.';
                return;
            }
            
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Inscription...';
            }
            
            try {
                const provider = new firebase.auth.GoogleAuthProvider();
                const result = await window.authService.auth.signInWithPopup(provider);
                
                // Si nouvel utilisateur, créer dans Firestore
                if (result.additionalUserInfo?.isNewUser) {
                    const userData = {
                        id: result.user.uid,
                        name: result.user.displayName || result.user.email,
                        email: result.user.email,
                        plan: 'free',
                        createdAt: new Date().toISOString(),
                        availableTokens: 500
                    };
                    try {
                        await window.authService.db.collection('users').doc(result.user.uid).set(userData);
                    } catch (dbError) {
                        console.warn('Erreur création utilisateur Firestore:', dbError);
                    }
                }
                
                // ✅ INSCRIPTION GOOGLE RÉUSSIE → REDIRECTION VERS DASHBOARD
                console.log('%c✅ Inscription Google réussie, redirection vers /dashboard.html', 'color: #28a745; font-weight: bold;');
                window.location.href = '/dashboard.html';
            } catch (error) {
                if (errorEl) errorEl.style.display = 'flex';
                if (errorMsg) errorMsg.textContent = error.message || 'Erreur d\'inscription Google';
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = '<i class="fab fa-google"></i> Continuer avec Google';
                }
            }
        };
    }
});
