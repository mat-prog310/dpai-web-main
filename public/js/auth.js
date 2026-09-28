// =============================================================================
// AUTH.JS - Gestion de l'authentification Firebase
// Version simplifiée et fiable
// =============================================================================

console.log('%c[Auth.js] Chargement du module d\'authentification...', 'color: #4CAF50; font-weight: bold;');

// =============================================================================
// CLASSE AUTH SERVICE
// =============================================================================

class AuthService {
  constructor() {
    this.auth = window.firebaseAuth;
    this.db = window.firebaseDB;
    this.currentUser = null;
    this.userData = null;
    this.authStateListener = null;
    this.functions = window.firebaseFunctions;
  }

  // Initialisation
  init() {
    if (!this.auth || !this.db) {
      console.error('%c❌ [AuthService] Firebase auth/firestore non disponible', 'color: #dc3545; font-weight: bold;');
      return false;
    }
    
    // Configurer la persistance pour Firebase v8
    try {
      if (this.auth && this.auth.setPersistence && typeof firebase !== 'undefined') {
        this.auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
            .then(() => {
              console.log('%c✅ [AuthService] Persistance configurée avec succès', 'color: #28a745; font-weight: bold;');
            })
            .catch((error) => {
              console.warn('[AuthService] Erreur configuration persistance:', error);
            });
      }
    } catch (e) {
      console.warn('[AuthService] Impossible de configurer la persistance:', e);
    }
    
    // Écouter les changements d'état d'authentification
    this.setupAuthListener();
    
    return true;
  }

  // Configurer l'écouteur d'état d'authentification
  setupAuthListener() {
    if (this.authStateListener) {
      this.authStateListener(); // Nettoyer l'ancien écouteur
    }
    
    this.authStateListener = this.auth.onAuthStateChanged(async (user) => {
      if (user) {
        this.currentUser = user;
        await this.loadUserData(user.uid);
        localStorage.setItem('dpai_user_uid', user.uid);
      } else {
        this.currentUser = null;
        this.userData = null;
        localStorage.removeItem('dpai_user_uid');
      }
      this.updateUI();
    });
  }

  // Charger les données utilisateur depuis Firestore
  async loadUserData(uid) {
    try {
      const userDoc = await this.db.collection('users').doc(uid).get();
      if (userDoc.exists) {
        this.userData = { id: uid, ...userDoc.data() };
        if (typeof TokenManager !== 'undefined') {
          TokenManager.init(this.userData);
        }
      } else {
        // Nouveau utilisateur, créer un profil par défaut
        const newUser = this.createDefaultUser(uid);
        await this.db.collection('users').doc(uid).set(newUser);
        this.userData = newUser;
        if (typeof TokenManager !== 'undefined') {
          TokenManager.init(this.userData);
        }
      }
    } catch (error) {
      console.error('Erreur chargement utilisateur:', error);
    }
  }

  // Créer un utilisateur par défaut
  createDefaultUser(uid) {
    const user = this.auth.currentUser;
    const email = user ? user.email : '';
    const displayName = user ? (user.displayName || email.split('@')[0] || 'Utilisateur') : 'Utilisateur';
    
    return {
      id: uid,
      name: displayName,
      email: email,
      plan: 'free',
      subscriptionStartDate: new Date().toISOString(),
      subscriptionEndDate: null,
      tokenState: typeof TokenManager !== 'undefined' ? TokenManager.createTokenState(uid, 'free') : { availableTokens: 500, usedTokens: 0, totalTokens: 500 },
      loyaltyInfo: typeof LoyaltySystem !== 'undefined' ? LoyaltySystem.create(uid) : { totalAnalyses: 0, monthlyAnalyses: 0, monthlyLoyaltyTokens: 0 },
      referralCode: null,
      referralInfo: null,
      companyName: null,
      companyDomain: typeof TokenUtils !== 'undefined' ? TokenUtils.extractDomain(email) : null,
      hasCompanyDiscount: false,
      hasAccessToPremiumSuggestions: true,
      hasAccessToAdvancedAnalytics: true,
      hasAccessToAPI: true,
      isEmailVerified: user ? user.emailVerified || false : false,
      isActive: true,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString()
    };
  }

  // Connexion avec email/mot de passe
  async signIn(email, password) {
    try {
      const userCredential = await this.auth.signInWithEmailAndPassword(email, password);
      const user = userCredential.user;
      
      // Mettre à jour la date de dernière connexion
      try {
        await this.db.collection('users').doc(user.uid).set({
          lastLoginAt: new Date().toISOString()
        }, { merge: true });
      } catch (dbError) {
        console.warn('Avertissement: Impossible de mettre à jour la date de connexion:', dbError);
      }
      
      return { success: true, user: user };
    } catch (error) {
      console.error('Erreur connexion:', error);
      return { success: false, error: error.message };
    }
  }

  // Inscription avec email/mot de passe
  async signUp(email, password, name, referralCode = null) {
    try {
      const userCredential = await this.auth.createUserWithEmailAndPassword(email, password);
      const user = userCredential.user;
      
      // Mettre à jour le profil
      await user.updateProfile({ displayName: name });
      
      // Envoyer email de vérification
      await user.sendEmailVerification();
      
      // Créer l'utilisateur dans Firestore
      const companyDomain = typeof TokenUtils !== 'undefined' ? TokenUtils.extractDomain(email) : null;
      const newUser = {
        id: user.uid,
        name: name,
        email: email,
        plan: 'free',
        subscriptionStartDate: new Date().toISOString(),
        subscriptionEndDate: null,
        tokenState: typeof TokenManager !== 'undefined' ? TokenManager.createTokenState(user.uid, 'free') : { availableTokens: 500, usedTokens: 0, totalTokens: 500 },
        loyaltyInfo: typeof LoyaltySystem !== 'undefined' ? LoyaltySystem.create(user.uid) : { totalAnalyses: 0, monthlyAnalyses: 0, monthlyLoyaltyTokens: 0 },
        referralCode: null,
        referralInfo: referralCode ? {
          referralCode: referralCode,
          sponsorId: null,
          sponsorName: null,
          sponsorEmail: null,
          status: 'pending',
          createdAt: new Date().toISOString()
        } : null,
        companyName: null,
        companyDomain: companyDomain,
        hasCompanyDiscount: false,
        hasAccessToPremiumSuggestions: true,
        hasAccessToAdvancedAnalytics: true,
        hasAccessToAPI: true,
        isEmailVerified: false,
        isActive: true,
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
        provider: 'email'
      };
      
      await this.db.collection('users').doc(user.uid).set(newUser);
      
      // Si code de parrainage, trouver le sponsor
      if (referralCode) {
        await this.processReferral(user.uid, referralCode);
      }
      
      this.userData = newUser;
      if (typeof TokenManager !== 'undefined') {
        TokenManager.init(this.userData);
      }
      
      return { success: true, user: user };
    } catch (error) {
      console.error('Erreur inscription:', error);
      return { success: false, error: error.message };
    }
  }

  // Traitement du parrainage
  async processReferral(userId, referralCode) {
    try {
      const referralQuery = await this.db.collection('users')
        .where('referralCode', '==', referralCode)
        .limit(1)
        .get();
      
      if (!referralQuery.empty) {
        const sponsor = referralQuery.docs[0];
        
        await this.db.collection('users').doc(userId).update({
          referralInfo: {
            referralCode: referralCode,
            sponsorId: sponsor.id,
            sponsorName: sponsor.data().name,
            sponsorEmail: sponsor.data().email,
            status: 'pending',
            createdAt: new Date().toISOString()
          }
        });
        
        console.log(`Nouveau filleul pour ${sponsor.data().name}`);
      }
    } catch (error) {
      console.error('Erreur parrainage:', error);
    }
  }

  // Déconnexion
  async signOut() {
    try {
      await this.auth.signOut();
      this.currentUser = null;
      this.userData = null;
      if (typeof TokenManager !== 'undefined') {
        TokenManager.clear();
      }
      return { success: true };
    } catch (error) {
      console.error('Erreur déconnexion:', error);
      return { success: false, error: error.message };
    }
  }

  // Réinitialisation du mot de passe
  async resetPassword(email) {
    try {
      await this.auth.sendPasswordResetEmail(email);
      return { success: true };
    } catch (error) {
      console.error('Erreur réinitialisation:', error);
      return { success: false, error: error.message };
    }
  }

  // Vérification email
  async verifyEmail() {
    try {
      const user = this.auth.currentUser;
      if (user) {
        await user.sendEmailVerification();
        return { success: true };
      }
      return { success: false, error: 'Aucun utilisateur connecté' };
    } catch (error) {
      console.error('Erreur vérification email:', error);
      return { success: false, error: error.message };
    }
  }

  // Mettre à jour le profil
  async updateProfile(name, companyName = null) {
    try {
      const user = this.auth.currentUser;
      if (!user) return { success: false, error: 'Aucun utilisateur connecté' };
      
      await user.updateProfile({ displayName: name });
      
      const updateData = { name: name };
      if (companyName) updateData.companyName = companyName;
      
      await this.db.collection('users').doc(user.uid).update(updateData);
      
      this.userData.name = name;
      if (companyName) this.userData.companyName = companyName;
      
      return { success: true };
    } catch (error) {
      console.error('Erreur mise à jour profil:', error);
      return { success: false, error: error.message };
    }
  }

  // Mettre à jour l'UI
  updateUI() {
    const event = new CustomEvent('authStateChanged', {
      detail: { user: this.currentUser, userData: this.userData }
    });
    window.dispatchEvent(event);
  }

  // Nettoyage
  destroy() {
    if (this.authStateListener) {
      this.authStateListener();
    }
  }
}

// =============================================================================
// INITIALISATION GLOBALE
// =============================================================================

// Définir authService global
window.authService = null;

// Fonction pour initialiser authService
function initializeAuthService() {
    // Vérifier si Firebase est prêt
    const checkFirebaseReady = () => {
        return typeof window.firebaseAuth !== 'undefined' && 
               typeof window.firebaseDB !== 'undefined' &&
               window.firebaseAuth && 
               window.firebaseDB;
    };
    
    if (checkFirebaseReady()) {
        createAuthService();
        return;
    }
    
    // Attendre Firebase
    const checkInterval = setInterval(() => {
        if (checkFirebaseReady()) {
            clearInterval(checkInterval);
            createAuthService();
        }
    }, 100);
    
    // Timeout de sécurité
    setTimeout(() => {
        clearInterval(checkInterval);
        console.error('%c❌ [AuthService] Firebase non chargé après 10 secondes', 'color: #F44336; font-weight: bold; font-size: 16px;');
    }, 10000);
}

function createAuthService() {
    console.log('%c[AuthService] Firebase est prêt, création de AuthService...', 'color: #4CAF50; font-weight: bold;');
    window.authService = new AuthService();
    window.authService.init();
    console.log('%c✅ [AuthService] Initialisé avec succès', 'color: #28a745; font-weight: bold;');
}

// Lancer l'initialisation
initializeAuthService();
