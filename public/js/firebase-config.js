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

// ===========================================================================
// CONFIGURATION STRIPE - Basculable entre TEST et PRODUCTION
// ===========================================================================
// Clé publique TEST - Pour les paiements de test (utilise des cartes de test)
// https://dashboard.stripe.com/test/apikeys
// ===========================================================================
window.stripePublishableKey = "pk_test_51UJIbK2dD1TTJziQgwBAsLPvo6gX6KE9LZDEX9e3AMrYzEyA3U6RpOEjVQttkIGgPUWjMGCcasWVWPS9Qrb3gliT00REq347RI";

// Pour basculer en PRODUCTION, décommentez la ligne ci-dessous et commentez celle ci-dessus
// window.stripePublishableKey = "pk_live_51TaGALKEd7fefQpsxCOkbQw5qkmOorwI9UbdKv2TBeLzSouvPbaRdusfCVVCVb5YwqUdWgkm1qvqh6nq4PnPy1FB00jvv10lRc";

// Vérifier le protocole - Firebase Auth ne fonctionne pas avec file://
if (window.location.protocol === 'file:') {
  console.error(
    'ERREUR: Firebase Auth ne fonctionne pas avec le protocole file://. ' +
    'Utilisez un serveur web local (http://localhost) pour tester.'
  );
  window.FIREBASE_FILE_PROTOCOL = true;
}

// Attendre que Firebase soit chargé (pour éviter les erreurs de timing)
function waitForFirebase() {
  return new Promise((resolve) => {
    const checkFirebase = () => {
      if (typeof firebase !== 'undefined') {
        resolve();
      } else {
        setTimeout(checkFirebase, 100);
      }
    };
    checkFirebase();
  });
}

// Initialiser Firebase quand il est prêt
waitForFirebase().then(() => {
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
}).catch(() => {
  console.error('Firebase non disponible après attente');
});
