// =============================================================================
// LOGIN.JS - Connexion ULTRA-SIMPLE
// =============================================================================

console.log('%c[Login.js] Chargement...', 'color: #9C27B0; font-weight: bold;');

// Attendre que le DOM soit chargé
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('loginForm');
    const emailInput = document.getElementById('loginEmail');
    const passwordInput = document.getElementById('loginPassword');
    const submitBtn = document.getElementById('loginBtnForm');
    const errorEl = document.getElementById('loginError');
    const errorMsg = document.getElementById('loginErrorMessage');
    const googleBtn = document.getElementById('googleLoginBtn');
    
    if (!form) return;
    
    // Attacher l'écouteur DIRECTEMENT (ne pas attendre authService)
    form.onsubmit = async (e) => {
        e.preventDefault();
        
        // Vérifier qu'authService est disponible
        if (!window.authService) {
            if (errorEl) errorEl.style.display = 'flex';
            if (errorMsg) errorMsg.textContent = 'Service d\'authentification non disponible. Veuillez rafraîchir la page.';
            return;
        }
        
        const email = emailInput?.value?.trim() || '';
        const password = passwordInput?.value || '';
        
        if (!email || !password) {
            if (errorEl) errorEl.style.display = 'flex';
            if (errorMsg) errorMsg.textContent = 'Veuillez remplir tous les champs';
            return;
        }
        
        // Désactiver le bouton
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Connexion...';
        }
        
        try {
            const result = await window.authService.signIn(email, password);
            
            if (result.success) {
                // ✅ CONNEXION RÉUSSIE → REDIRECTION VERS DASHBOARD
                console.log('%c✅ Connexion réussie, redirection vers /dashboard.html', 'color: #28a745; font-weight: bold;');
                window.location.href = '/dashboard.html';
            } else {
                // ❌ ERREUR
                if (errorEl) errorEl.style.display = 'flex';
                if (errorMsg) errorMsg.textContent = result.error || 'Erreur de connexion';
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Se connecter';
                }
            }
        } catch (error) {
            if (errorEl) errorEl.style.display = 'flex';
            if (errorMsg) errorMsg.textContent = error.message || 'Erreur de connexion';
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
            
            if (!window.authService || !window.firebase) {
                if (errorEl) errorEl.style.display = 'flex';
                if (errorMsg) errorMsg.textContent = 'Firebase non initialisé. Rafraîchissez la page.';
                return;
            }
            
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Connexion...';
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
                
                // ✅ CONNEXION GOOGLE RÉUSSIE → REDIRECTION VERS DASHBOARD
                console.log('%c✅ Connexion Google réussie, redirection vers /dashboard.html', 'color: #28a745; font-weight: bold;');
                window.location.href = '/dashboard.html';
            } catch (error) {
                if (errorEl) errorEl.style.display = 'flex';
                if (errorMsg) errorMsg.textContent = error.message || 'Erreur de connexion Google';
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = '<i class="fab fa-google"></i> Continuer avec Google';
                }
            }
        };
    }
});
