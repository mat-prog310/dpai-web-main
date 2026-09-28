// Configuration Firebase pour DPAI Web
// Initialisation immédiate - les scripts Firebase sont chargés AVANT ce fichier

const firebaseConfig = {
  apiKey: "AIzaSyDowkBbuxpYbpkMqdXyrxXGgk7FHxy7m68",
  authDomain: "dpai-8be62.firebaseapp.com",
  projectId: "dpai-8be62",
  storageBucket: "dpai-8be62.firebasestorage.app",
  messagingSenderId: "829160806332",
  appId: "1:829160806332:web:125fd1c706ca97a0fcbdb9",
  measurementId: "G-R3QVVF35GB"
};

// Vérifier le protocole - Firebase Auth ne fonctionne pas avec file://
if (window.location.protocol === 'file:') {
  console.error(
    'ERREUR: Firebase Auth ne fonctionne pas avec le protocole file://. ' +
    'Utilisez un serveur web local (http://localhost) pour tester.'
  );
  window.FIREBASE_FILE_PROTOCOL = true;
}

// Initialiser Firebase IMMEDIATEMENT
try {
  // Vérifier que firebase est déjà chargé
  if (typeof firebase !== 'undefined' && typeof firebase.initializeApp === 'function') {
    // Initialiser l'application si ce n'est pas déjà fait
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
    
    // Définir les instances globalement
    window.firebase = firebase;
    window.firebaseAuth = firebase.auth();
    window.db = firebase.firestore();
    window.firebaseDB = firebase.firestore();
    window.firebaseFunctions = firebase.functions ? firebase.functions() : null;
    
    console.log('%c✅ [Firebase] Initialisé avec succès', 'color: #28a745; font-weight: bold;');
  } else {
    // Firebase SDK pas encore chargé - essayer de le charger manuellement
    console.warn('⚠️ [Firebase] SDK non encore chargé, initialisation reportée');
    
    // Fonction pour réessayer
    window.initializeFirebase = function() {
      if (typeof firebase !== 'undefined' && typeof firebase.initializeApp === 'function' && !firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
        window.firebase = firebase;
        window.firebaseAuth = firebase.auth();
        window.db = firebase.firestore();
        window.firebaseDB = firebase.firestore();
        window.firebaseFunctions = firebase.functions ? firebase.functions() : null;
        console.log('%c✅ [Firebase] Initialisé avec succès (reporté)', 'color: #28a745; font-weight: bold;');
      }
    };
    
    // Vérifier périodiquement
    const initInterval = setInterval(() => {
      if (typeof firebase !== 'undefined' && typeof firebase.initializeApp === 'function') {
        clearInterval(initInterval);
        window.initializeFirebase();
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
