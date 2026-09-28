// =============================================================================
// LOGIN.JS - Connexion SIMPLIFIÉE
// =============================================================================

console.log('%c[Login.js] Chargement...', 'color: #9C27B0; font-weight: bold;');

// Attendre DOM et authService
const waitForReady = setInterval(() => {
    if (document.readyState === 'complete' && window.authService) {
        clearInterval(waitForReady);
        init();
    }
}, 100);

function init() {
    const form = document.getElementById('loginForm');
    const emailInput = document.getElementById('loginEmail');
    const passwordInput = document.getElementById('loginPassword');
    const submitBtn = document.getElementById('loginBtnForm');
    const errorEl = document.getElementById('loginError');
    const errorMsg = document.getElementById('loginErrorMessage');
    
    if (!form) return;
    
    form.onsubmit = async (e) => {
        e.preventDefault();
        
        const email = emailInput.value.trim();
        const password = passwordInput.value;
        
        if (!email || !password) return;
        
        // Désactiver le bouton
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Connexion...';
        }
        
        // Connexion
        const result = await window.authService.signIn(email, password);
        
        // Réactiver le bouton
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Se connecter';
        }
        
        if (result.success) {
            // Connexion réussie → rediriger vers dashboard
            console.log('%c✅ Connexion réussie, redirection...', 'color: #28a745; font-weight: bold;');
            window.location.href = '/dashboard.html';
        } else {
            // Afficher l'erreur
            if (errorEl) errorEl.style.display = 'flex';
            if (errorMsg) errorMsg.textContent = result.error || 'Erreur de connexion';
        }
    };
    
    // Connexion Google
    const googleBtn = document.getElementById('googleLoginBtn');
    if (googleBtn) {
        googleBtn.onclick = async () => {
            const provider = new firebase.auth.GoogleAuthProvider();
            try {
                const result = await window.authService.auth.signInWithPopup(provider);
                // Si nouvel utilisateur, créer dans Firestore
                if (result.additionalUserInfo.isNewUser) {
                    const userData = {
                        id: result.user.uid,
                        name: result.user.displayName || result.user.email,
                        email: result.user.email,
                        plan: 'free',
                        createdAt: new Date().toISOString(),
                        availableTokens: 500
                    };
                    await window.authService.db.collection('users').doc(result.user.uid).set(userData);
                }
                // Rediriger
                window.location.href = '/dashboard.html';
            } catch (error) {
                if (errorEl) errorEl.style.display = 'flex';
                if (errorMsg) errorMsg.textContent = error.message || 'Erreur Google';
            }
        };
    }
}
