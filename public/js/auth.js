// =============================================================================
// AUTH.JS - Service d'authentification Firebase SIMPLIFIÉ
// =============================================================================

// Déjà initialisé ? Ne rien faire
if (typeof window.authService !== 'undefined') {
    console.log('%c[Auth.js] Déjà chargé, skip', 'color: #FF9800;');
} else {
    console.log('%c[Auth.js] Initialisation...', 'color: #4CAF50; font-weight: bold;');
    
    // Attendre Firebase
    const initAuth = setInterval(() => {
        if (window.firebaseAuth && window.firebaseDB) {
            clearInterval(initAuth);
            createAuthService();
        }
    }, 100);
    
    // Timeout
    setTimeout(() => {
        clearInterval(initAuth);
        console.error('%c❌ [Auth.js] Firebase non chargé après 10s', 'color: #F44336; font-weight: bold;');
    }, 10000);
    
    function createAuthService() {
        console.log('%c[Auth.js] Firebase prêt, création authService...', 'color: #4CAF50; font-weight: bold;');
        
        // Définir authService globalement
        window.authService = {
            auth: window.firebaseAuth,
            db: window.firebaseDB,
            currentUser: null,
            
            // Connexion email/password
            signIn: async function(email, password) {
                try {
                    const result = await this.auth.signInWithEmailAndPassword(email, password);
                    return { success: true, user: result.user };
                } catch (error) {
                    console.error('[Auth.js] Erreur connexion:', error);
                    return { success: false, error: error.message };
                }
            },
            
            // Inscription email/password
            signUp: async function(email, password, name) {
                try {
                    const result = await this.auth.createUserWithEmailAndPassword(email, password);
                    const user = result.user;
                    
                    // Mettre à jour le profil
                    await user.updateProfile({ displayName: name });
                    
                    // Envoyer email de vérification
                    await user.sendEmailVerification();
                    
                    // Créer user dans Firestore
                    const userData = {
                        id: user.uid,
                        name: name,
                        email: email,
                        plan: 'free',
                        createdAt: new Date().toISOString(),
                        lastLoginAt: new Date().toISOString(),
                        availableTokens: 500,
                        tokensUsed: 0,
                        totalTokens: 500
                    };
                    
                    await this.db.collection('users').doc(user.uid).set(userData);
                    
                    return { success: true, user: user };
                } catch (error) {
                    console.error('[Auth.js] Erreur inscription:', error);
                    return { success: false, error: error.message };
                }
            },
            
            // Déconnexion
            signOut: async function() {
                try {
                    await this.auth.signOut();
                    return { success: true };
                } catch (error) {
                    console.error('[Auth.js] Erreur déconnexion:', error);
                    return { success: false, error: error.message };
                }
            },
            
            // Réinit mot de passe
            resetPassword: async function(email) {
                try {
                    await this.auth.sendPasswordResetEmail(email);
                    return { success: true };
                } catch (error) {
                    console.error('[Auth.js] Erreur réinit:', error);
                    return { success: false, error: error.message };
                }
            }
        };
        
        console.log('%c✅ [Auth.js] authService créé avec succès !', 'color: #28a745; font-weight: bold;');
    }
}
