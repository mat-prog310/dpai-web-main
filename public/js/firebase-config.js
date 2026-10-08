// Configuration Firebase pour DPAI Web
// Initialisation immédiate - les scripts Firebase sont chargés AVANT ce fichier

console.log('%c[Firebase-Config] Chargement du fichier de configuration...', 'color: #2196F3; font-weight: bold;');

// Email de contact principal
const CONTACT_EMAIL = 'duprey.conseil@gmail.com';

// Configuration Firebase
// ⚠️  NOTE DE SÉCURITÉ: La clé API Firebase peut être dans le code client car
// Firebase est conçu pour cela. La sécurité est assurée par les règles Firestore.
// Cependant, pour une sécurité maximale, cette clé peut être injectée côté serveur.
const firebaseConfig = {
  apiKey: "AIzaSyDowkBbuxpYbpkMqdXyrxXGgk7FHxy7m68",
  authDomain: "dpai-8be62.firebaseapp.com",
  projectId: "dpai-8be62",
  storageBucket: "dpai-8be62.firebasestorage.app",
  messagingSenderId: "829160806332",
  appId: "1:829160806332:web:125fd1c706ca97a0fcbdb9",
  measurementId: "G-R3QVVF35GB"
};

// Vérifier si une clé a été injectée côté serveur (pour plus de sécurité)
if (typeof window !== 'undefined' && window.FIREBASE_CONFIG) {
  Object.assign(firebaseConfig, window.FIREBASE_CONFIG);
}

// Vérifier le protocole - Firebase Auth ne fonctionne pas avec file://
if (window.location && window.location.protocol === 'file:') {
  console.error(
    'ERREUR: Firebase Auth ne fonctionne pas avec le protocole file://. ' +
    'Utilisez un serveur web local (http://localhost) pour tester.'
  );
  window.FIREBASE_FILE_PROTOCOL = true;
}

// Fonction pour initialiser Firebase
function initializeFirebaseInstances() {
  if (typeof firebase !== 'undefined' && typeof firebase.initializeApp === 'function') {
    // Initialiser l'application si ce n'est pas déjà fait
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
    
    // Définir les instances globalement - UNE SEULE FOIS
    if (typeof window.firebaseAuth === 'undefined') {
      window.firebase = firebase;
      window.firebaseAuth = firebase.auth();
      window.firebaseDB = firebase.firestore();
      window.db = firebase.firestore();  // Alias pour compatibilité
      window.firebaseFunctions = firebase.functions ? firebase.functions() : null;
      
      console.log('%c✅ [Firebase] Initialisé avec succès', 'color: #28a745; font-weight: bold;');
      return true;
    }
  }
  return false;
}

// Initialiser Firebase IMMEDIATEMENT
try {
  // Essayer immédiatement
  if (!initializeFirebaseInstances()) {
    // Firebase SDK pas encore chargé - essayer de le charger manuellement
    console.warn('⚠️ [Firebase] SDK non encore chargé, initialisation reportée');
    
    // Vérifier périodiquement
    const initInterval = setInterval(() => {
      if (initializeFirebaseInstances()) {
        clearInterval(initInterval);
      }
    }, 100);
    
    // Timeout de sécurité
    setTimeout(() => {
      clearInterval(initInterval);
      console.error('%c❌ [Firebase] SDK non chargé après 10 secondes', 'color: #dc3545; font-weight: bold;');
    }, 10000);
  }
} catch (error) {
  console.error('%c❌ [Firebase] Erreur d\'initialisation:', 'color: #dc3545; font-weight: bold;', error);
}

// Exposer l'email de contact globalement
window.CONTACT_EMAIL = CONTACT_EMAIL;
