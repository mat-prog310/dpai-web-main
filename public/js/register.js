// =============================================================================
// REGISTER.JS - Inscription SIMPLIFIÉE
// =============================================================================

console.log('%c[Register.js] Chargement...', 'color: #FF5722; font-weight: bold;');

// Attendre DOM et authService
const waitForReady = setInterval(() => {
    if (document.readyState === 'complete' && window.authService) {
        clearInterval(waitForReady);
        init();
    }
}, 100);

function init() {
    const form = document.getElementById('registerForm');
    const nameInput = document.getElementById('registerName');
    const emailInput = document.getElementById('registerEmail');
    const passwordInput = document.getElementById('registerPassword');
    const submitBtn = document.getElementById('registerBtnForm');
    const errorEl = document.getElementById('registerError');
    const errorMsg = document.getElementById('registerErrorMessage');
    
    if (!form) return;
    
    form.onsubmit = async (e) => {
        e.preventDefault();
        
        const name = nameInput.value.trim();
        const email = emailInput.value.trim();
        const password = passwordInput.value;
        
        if (!name || !email || !password) return;
        
        // Désactiver le bouton
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Inscription...';
        }
        
        // Inscription
        const result = await window.authService.signUp(email, password, name);
        
        // Réactiver le bouton
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-user-plus"></i> S\'inscrire';
        }
        
        if (result.success) {
            // Inscription réussie → rediriger vers dashboard
            console.log('%c✅ Inscription réussie, redirection...', 'color: #28a745; font-weight: bold;');
            window.location.href = '/dashboard.html';
        } else {
            // Afficher l'erreur
            if (errorEl) errorEl.style.display = 'flex';
            if (errorMsg) errorMsg.textContent = result.error || 'Erreur d\'inscription';
        }
    };
    
    // Inscription Google
    const googleBtn = document.getElementById('googleRegisterBtn');
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
