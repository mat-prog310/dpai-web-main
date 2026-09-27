// Configuration Firebase pour DPAI Web
// Les scripts Firebase sont chargés AVANT ce fichier dans index.html

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

// Attendre que Firebase SDK soit complètement chargé
function initializeFirebaseWhenReady() {
  const checkInterval = setInterval(() => {
    // Vérifier que firebase est défini ET a une méthode initializeApp
    if (typeof firebase !== 'undefined' && typeof firebase.initializeApp === 'function') {
      clearInterval(checkInterval);
      
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
    }
  }, 100);
  
  // Timeout de sécurité
  setTimeout(() => {
    clearInterval(checkInterval);
    if (typeof firebase === 'undefined') {
      console.error('%c❌ [Firebase] SDK non chargé après 10 secondes', 'color: #dc3545; font-weight: bold;');
    }
  }, 10000);
}

// Lancer l'initialisation
initializeFirebaseWhenReady();
