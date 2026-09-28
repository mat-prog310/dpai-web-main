// =============================================================================
// AUTH.JS - Service d'authentification Firebase SIMPLIFIÉ
// =============================================================================

console.log('%c[Auth.js] Initialisation...', 'color: #4CAF50; font-weight: bold;');

// Ne PAS réinitialiser si déjà fait
if (window.authServiceInitialized) {
    console.log('%c[Auth.js] Déjà initialisé, skip', 'color: #FF9800;');
    return;
}
window.authServiceInitialized = true;

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
    // Définir authService globalement
    window.authService = {
        auth: window.firebaseAuth,
        db: window.firebaseDB,
        currentUser: null,
        
        // Connexion
        signIn: async function(email, password) {
            try {
                const result = await this.auth.signInWithEmailAndPassword(email, password);
                return { success: true, user: result.user };
            } catch (error) {
                console.error('Erreur connexion:', error);
                return { success: false, error: error.message };
            }
        },
        
        // Inscription
        signUp: async function(email, password, name) {
            try {
                const result = await this.auth.createUserWithEmailAndPassword(email, password);
                const user = result.user;
                await user.updateProfile({ displayName: name });
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
                console.error('Erreur inscription:', error);
                return { success: false, error: error.message };
            }
        },
        
        // Déconnexion
        signOut: async function() {
            try {
                await this.auth.signOut();
                return { success: true };
            } catch (error) {
                console.error('Erreur déconnexion:', error);
                return { success: false, error: error.message };
            }
        },
        
        // Réinit mot de passe
        resetPassword: async function(email) {
            try {
                await this.auth.sendPasswordResetEmail(email);
                return { success: true };
            } catch (error) {
                console.error('Erreur réinit:', error);
                return { success: false, error: error.message };
            }
        }
    };
    
    console.log('%c✅ [Auth.js] authService créé', 'color: #28a745; font-weight: bold;');
}
