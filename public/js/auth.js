// =============================================================================
// AUTH.JS - Service d'authentification Firebase - VERSION CORRIGÉE ET SIMPLE
// =============================================================================

console.log('%c[Auth.js] Initialisation...', 'color: #2196F3; font-weight: bold;');

// Empêcher le double chargement
if (typeof window.DPAI_AUTH_INITIALIZED === 'undefined') {
    window.DPAI_AUTH_INITIALIZED = true;

    // Attendre que Firebase soit prêt
    const waitForFirebase = () => {
        return new Promise((resolve, reject) => {
            const checkInterval = setInterval(() => {
                if (window.firebase && window.firebase.auth && window.firebase.firestore) {
                    clearInterval(checkInterval);
                    resolve();
                }
            }, 100);

            setTimeout(() => {
                clearInterval(checkInterval);
                reject(new Error('Firebase non disponible après 10 secondes'));
            }, 10000);
        });
    };

    // Initialisation principale
    (async () => {
        try {
            await waitForFirebase();
            createAuthService();
        } catch (error) {
            console.error('%c❌ [Auth.js] Erreur:', 'color: #F44336; font-weight: bold;', error);
        }
    })();

    function createAuthService() {
        console.log('%c[Auth.js] Création du service...', 'color: #4CAF50; font-weight: bold;');

        const firebase = window.firebase;
        const auth = firebase.auth();
        const db = firebase.firestore();

        // Configuration de la persistance
        try {
            auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
            console.log('%c✅ [Auth.js] Persistance configurée (LOCAL)', 'color: #4CAF50;');
        } catch (error) {
            console.warn('%c⚠️ [Auth.js] Persistance non disponible:', 'color: #FF9800;', error);
        }

        // État actuel
        let currentUser = null;
        let currentUserData = null;

        // Écouter les changements d'état d'authentification
        auth.onAuthStateChanged(async (user) => {
            console.log('%c[Auth.js] onAuthStateChanged:', 'color: #9C27B0;', user ? 'CONNECTÉ' : 'DÉCONNECTÉ');

            if (user) {
                // Utilisateur connecté - charger ses données
                try {
                    const userDoc = await db.collection('users').doc(user.uid).get();
                    currentUser = user;
                    currentUserData = userDoc.exists ? userDoc.data() : null;

                    // Créer les données utilisateur si elles n'existent pas
                    if (!userDoc.exists) {
                        const userData = {
                            id: user.uid,
                            name: user.displayName || user.email || 'Utilisateur',
                            email: user.email || '',
                            plan: 'free',
                            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                            lastLoginAt: firebase.firestore.FieldValue.serverTimestamp(),
                            availableTokens: 500,
                            tokensUsed: 0,
                            totalTokens: 500,
                            totalAnalyses: 0,
                            monthlyAnalyses: 0,
                            tokenState: {
                                userId: user.uid,
                                plan: 'free',
                                baseTokens: 500,
                                bonusTokens: 0,
                                totalTokens: 500,
                                usedTokens: 0,
                                availableTokens: 500,
                                lastTokenUpdate: firebase.firestore.FieldValue.serverTimestamp(),
                                firstAnalysisDone: false,
                                monthlyTokensUsed: 0,
                                lastMonthlyReset: firebase.firestore.FieldValue.serverTimestamp()
                            },
                            loyaltyInfo: {
                                userId: user.uid,
                                totalAnalyses: 0,
                                monthlyAnalyses: 0,
                                monthlyLoyaltyTokens: 0,
                                lastAnalysisDate: null,
                                lastMonthlyReset: firebase.firestore.FieldValue.serverTimestamp()
                            }
                        };
                        await db.collection('users').doc(user.uid).set(userData);
                        currentUserData = userData;
                        console.log('%c✅ [Auth.js] Nouvel utilisateur créé dans Firestore', 'color: #28a745;');
                    } else {
                        // Mettre à jour la date de dernière connexion
                        await db.collection('users').doc(user.uid).update({
                            lastLoginAt: firebase.firestore.FieldValue.serverTimestamp()
                        });
                    }

                    // Dispatcher l'événement
                    const event = new CustomEvent('authStateChanged', {
                        detail: { user: user, userData: currentUserData }
                    });
                    window.dispatchEvent(event);

                    console.log('%c✅ [Auth.js] Utilisateur:', 'color: #28a745;', user.email || user.uid);
                } catch (error) {
                    console.error('%c❌ [Auth.js] Erreur chargement userData:', 'color: #F44336;', error);
                }
            } else {
                // Utilisateur déconnecté
                currentUser = null;
                currentUserData = null;

                // Dispatcher l'événement
                const event = new CustomEvent('authStateChanged', {
                    detail: { user: null, userData: null }
                });
                window.dispatchEvent(event);

                console.log('%c➡️ [Auth.js] Déconnecté', 'color: #FF9800;');
            }
        });

        // Définir authService globalement
        window.authService = {
            auth: auth,
            db: db,
            firebase: firebase,

            get currentUser() {
                return currentUser;
            },

            get currentUserData() {
                return currentUserData;
            },

            // Connexion email/password
            signIn: async function(email, password) {
                try {
                    const result = await auth.signInWithEmailAndPassword(email, password);
                    console.log('%c✅ [Auth.js] Connexion réussie:', 'color: #28a745;', result.user.email);
                    return { success: true, user: result.user };
                } catch (error) {
                    console.error('%c❌ [Auth.js] Erreur connexion:', 'color: #F44336;', error);
                    let errorMessage = error.message;
                    
                    // Traduction des erreurs Firebase
                    if (error.code === 'auth/user-not-found') {
                        errorMessage = 'Utilisateur non trouvé';
                    } else if (error.code === 'auth/wrong-password') {
                        errorMessage = 'Mot de passe incorrect';
                    } else if (error.code === 'auth/invalid-email') {
                        errorMessage = 'Email invalide';
                    } else if (error.code === 'auth/user-disabled') {
                        errorMessage = 'Compte désactivé';
                    }
                    
                    return { success: false, error: errorMessage, code: error.code };
                }
            },

            // Inscription email/password
            signUp: async function(email, password, name) {
                try {
                    const result = await auth.createUserWithEmailAndPassword(email, password);
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
                        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                        lastLoginAt: firebase.firestore.FieldValue.serverTimestamp(),
                        availableTokens: 500,
                        tokensUsed: 0,
                        totalTokens: 500,
                        totalAnalyses: 0,
                        monthlyAnalyses: 0,
                        tokenState: {
                            userId: user.uid,
                            plan: 'free',
                            baseTokens: 500,
                            bonusTokens: 0,
                            totalTokens: 500,
                            usedTokens: 0,
                            availableTokens: 500,
                            lastTokenUpdate: firebase.firestore.FieldValue.serverTimestamp(),
                            firstAnalysisDone: false,
                            monthlyTokensUsed: 0,
                            lastMonthlyReset: firebase.firestore.FieldValue.serverTimestamp()
                        },
                        loyaltyInfo: {
                            userId: user.uid,
                            totalAnalyses: 0,
                            monthlyAnalyses: 0,
                            monthlyLoyaltyTokens: 0,
                            lastAnalysisDate: null,
                            lastMonthlyReset: firebase.firestore.FieldValue.serverTimestamp()
                        }
                    };

                    await db.collection('users').doc(user.uid).set(userData);

                    console.log('%c✅ [Auth.js] Inscription réussie:', 'color: #28a745;', user.email);
                    return { success: true, user: user };
                } catch (error) {
                    console.error('%c❌ [Auth.js] Erreur inscription:', 'color: #F44336;', error);
                    let errorMessage = error.message;
                    
                    // Traduction des erreurs Firebase
                    if (error.code === 'auth/email-already-in-use') {
                        errorMessage = 'Cet email est déjà utilisé';
                    } else if (error.code === 'auth/invalid-email') {
                        errorMessage = 'Email invalide';
                    } else if (error.code === 'auth/weak-password') {
                        errorMessage = 'Le mot de passe doit contenir au moins 6 caractères';
                    }
                    
                    return { success: false, error: errorMessage, code: error.code };
                }
            },

            // Déconnexion
            signOut: async function() {
                try {
                    await auth.signOut();
                    console.log('%c✅ [Auth.js] Déconnexion réussie', 'color: #28a745;');
                    return { success: true };
                } catch (error) {
                    console.error('%c❌ [Auth.js] Erreur déconnexion:', 'color: #F44336;', error);
                    return { success: false, error: error.message };
                }
            },

            // Réinitialisation mot de passe
            resetPassword: async function(email) {
                try {
                    await auth.sendPasswordResetEmail(email);
                    console.log('%c✅ [Auth.js] Email de réinit envoyé à:', 'color: #28a745;', email);
                    return { success: true };
                } catch (error) {
                    console.error('%c❌ [Auth.js] Erreur réinit:', 'color: #F44336;', error);
                    let errorMessage = error.message;
                    
                    if (error.code === 'auth/user-not-found') {
                        errorMessage = 'Aucun compte trouvé avec cet email';
                    }
                    
                    return { success: false, error: errorMessage, code: error.code };
                }
            },

            // Connexion Google
            signInWithGoogle: async function() {
                try {
                    const provider = new firebase.auth.GoogleAuthProvider();
                    const result = await auth.signInWithPopup(provider);
                    const user = result.user;

                    // Si nouvel utilisateur, créer dans Firestore
                    if (result.additionalUserInfo?.isNewUser) {
                        const userData = {
                            id: user.uid,
                            name: user.displayName || user.email || 'Utilisateur',
                            email: user.email || '',
                            plan: 'free',
                            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                            lastLoginAt: firebase.firestore.FieldValue.serverTimestamp(),
                            availableTokens: 500,
                            tokensUsed: 0,
                            totalTokens: 500,
                            totalAnalyses: 0,
                            monthlyAnalyses: 0,
                            tokenState: {
                                userId: user.uid,
                                plan: 'free',
                                baseTokens: 500,
                                bonusTokens: 0,
                                totalTokens: 500,
                                usedTokens: 0,
                                availableTokens: 500,
                                lastTokenUpdate: firebase.firestore.FieldValue.serverTimestamp(),
                                firstAnalysisDone: false,
                                monthlyTokensUsed: 0,
                                lastMonthlyReset: firebase.firestore.FieldValue.serverTimestamp()
                            },
                            loyaltyInfo: {
                                userId: user.uid,
                                totalAnalyses: 0,
                                monthlyAnalyses: 0,
                                monthlyLoyaltyTokens: 0,
                                lastAnalysisDate: null,
                                lastMonthlyReset: firebase.firestore.FieldValue.serverTimestamp()
                            }
                        };
                        await db.collection('users').doc(user.uid).set(userData);
                        console.log('%c✅ [Auth.js] Nouvel utilisateur Google créé dans Firestore', 'color: #28a745;');
                    }

                    console.log('%c✅ [Auth.js] Connexion Google réussie:', 'color: #28a745;', user.email);
                    return { success: true, user: user };
                } catch (error) {
                    console.error('%c❌ [Auth.js] Erreur Google:', 'color: #F44336;', error);
                    return { success: false, error: error.message, code: error.code };
                }
            }
        };

        console.log('%c✅✅✅ [Auth.js] authService PRÊT !', 'color: #28a745; font-weight: bold; font-size: 16px;');

        // Dispatcher un événement indiquant que authService est prêt
        window.dispatchEvent(new CustomEvent('authServiceReady'));
    }
} else {
    console.log('%c[Auth.js] Déjà initialisé', 'color: #FF9800;');
}
