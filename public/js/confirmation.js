// =============================================================================
// CONFIRMATION.JS - Gestion de la confirmation des paiements Stripe
// Cette page est appelée par Stripe après un paiement réussi ou annulé
// NOUVELLE VERSION: Vérification réelle via polling Firestore
// =============================================================================

// Attendre que Firebase, authService et db soient prêts
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔍 [confirmation.js] DOM chargé, attente de Firebase...');
    
    // Attendre que Firebase, Firestore et authService soient prêts
    const initInterval = setInterval(() => {
        const hasFirebase = typeof firebase !== 'undefined' && firebase;
        const hasFirestore = hasFirebase && typeof db !== 'undefined' && db && typeof db.collection === 'function';
        const hasAuthService = typeof window.authService !== 'undefined' && window.authService;
        
        if (hasFirebase && hasFirestore && hasAuthService) {
            // Initialiser authService si pas déjà fait
            if (typeof authService.init === 'function' && !authService.currentUser) {
                console.log('🔐 [confirmation.js] Initialisation de authService...');
                authService.init();
            }
            
            // Si on a un currentUser, on lance la confirmation
            if (window.authService.currentUser) {
                clearInterval(initInterval);
                console.log('✅ [confirmation.js] Firebase, Firestore et authService prêts, utilisateur connecté');
                handleConfirmation();
            }
            // Sinon, on continue d'attendre
        } else if (hasFirebase && !hasFirestore) {
            console.log('⚠️ [confirmation.js] Firebase chargé mais Firestore non disponible');
        } else if (!hasFirebase) {
            console.log('⚠️ [confirmation.js] Firebase non chargé');
        }
    }, 200);
    
    // Timeout de sécurité
    setTimeout(() => {
        clearInterval(initInterval);
        if (!window.confirmationHandled) {
            console.log('⚠️ [confirmation.js] Timeout atteint, vérification manuelle...');
            // Essayer quand même
            if (typeof handleConfirmation === 'function') {
                handleConfirmation();
            }
        }
    }, 10000);
});

// Marqueur pour éviter les doubles traitements
window.confirmationHandled = false;

// =============================================================================
// CONFIGURATION DU POLLING
// =============================================================================
const POLLING_CONFIG = {
    maxAttempts: 10,      // Nombre maximum de tentatives
    delayMs: 3000,        // Délai entre chaque tentative (3 secondes)
    timeoutMs: 30000      // Timeout total (30 secondes)
};

// =============================================================================
// FONCTION DE POLLING POUR VÉRIFIER LA CONFIRMATION D'ACHAT
// =============================================================================

/**
 * Vérifie si Firestore est disponible
 */
function isFirestoreAvailable() {
    return typeof db !== 'undefined' && db && typeof db.collection === 'function';
}

/**
 * Attend que l'achat soit confirmé via polling Firestore
 * @param {string} purchaseId - L'ID de l'achat à vérifier
 * @param {string} expectedUserId - L'ID de l'utilisateur attendu (optionnel)
 * @returns {Promise<Object>} - Les données de l'achat si confirmé
 */
async function waitForPurchaseConfirmation(purchaseId, expectedUserId = null) {
    if (!purchaseId) {
        throw new Error('Aucun purchaseId fourni');
    }
    
    if (!isFirestoreAvailable()) {
        throw new Error('Firestore non disponible');
    }
    
    console.log('🔄 [confirmation.js] Début du polling pour purchaseId:', purchaseId);
    
    let attempts = 0;
    const startTime = Date.now();
    
    while (attempts < POLLING_CONFIG.maxAttempts) {
        attempts++;
        const elapsedTime = Date.now() - startTime;
        
        // Vérifier timeout
        if (elapsedTime > POLLING_CONFIG.timeoutMs) {
            console.error('⏰ [confirmation.js] Timeout atteint après', elapsedTime, 'ms');
            throw new Error('Timeout: Le webhook Stripe met trop de temps à confirmer le paiement');
        }
        
        try {
            // Récupérer le document de l'achat
            const purchaseDoc = await db.collection('purchases').doc(purchaseId).get();
            
            if (!purchaseDoc.exists) {
                console.log(`⚠️ [confirmation.js] Document purchases/${purchaseId} non trouvé (tentative ${attempts}/${POLLING_CONFIG.maxAttempts})`);
                
                // Vérifier dans pending_purchases (ancien système)
                if (expectedUserId) {
                    const pendingDoc = await db.collection('pending_purchases').doc(expectedUserId).get();
                    if (pendingDoc.exists) {
                        const data = pendingDoc.data();
                        if (data.purchaseId === purchaseId) {
                            console.log('ℹ️ [confirmation.js] Trouvé dans pending_purchases');
                            // Continuer à polling
                        }
                    }
                }
                
                // Attendre avant la prochaine tentative
                if (attempts < POLLING_CONFIG.maxAttempts) {
                    await new Promise(resolve => setTimeout(resolve, POLLING_CONFIG.delayMs));
                }
                continue;
            }
            
            const purchaseData = purchaseDoc.data();
            
            // Vérifier que l'achat appartient à l'utilisateur attendu
            if (expectedUserId) {
                if (!purchaseData.userId) {
                    console.error('❌ [confirmation.js] Le document achat n\'a pas de userId');
                    throw new Error('Données d\'achat incomplètes: userId manquant');
                }
                if (purchaseData.userId !== expectedUserId) {
                    console.error('🚫 [confirmation.js] L\'achat n\'appartient pas à l\'utilisateur connecté');
                    throw new Error('Achat non autorisé: L\'achat appartient à un autre utilisateur');
                }
            }
            
            // Vérifier le statut
            if (purchaseData.status === 'completed') {
                console.log('✅ [confirmation.js] Paiement confirmé pour purchaseId:', purchaseId);
                console.log('   Statut:', purchaseData.status);
                console.log('   Type:', purchaseData.type);
                console.log('   StripeSessionId:', purchaseData.stripeSessionId);
                console.log('   WebhookProcessed:', purchaseData.webhookProcessed);
                return purchaseData;
            }
            
            // Si statut est 'pending' ou non défini, on continue le polling
            const currentStatus = purchaseData.status || 'pending';
            console.log(`⏳ [confirmation.js] Statut: ${currentStatus} (tentative ${attempts}/${POLLING_CONFIG.maxAttempts})`);
            
            // Afficher la progression dans l'UI
            const newProgress = 50 + (attempts * 4); // 50% à 90%
            showLoadingState(
                `Vérification en cours (${attempts}/${POLLING_CONFIG.maxAttempts})...`,
                Math.min(newProgress, 90)
            );
            
            // Si on a un stripeSessionId, on peut vérifier directement via Stripe API
            if (purchaseData.stripeSessionId) {
                console.log('   Session Stripe:', purchaseData.stripeSessionId);
            }
            
            // Attendre avant la prochaine tentative
            if (attempts < POLLING_CONFIG.maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, POLLING_CONFIG.delayMs));
            }
            
        } catch (error) {
            console.error('❌ [confirmation.js] Erreur lors du polling:', error);
            
            // Attendre avant de réessayer
            if (attempts < POLLING_CONFIG.maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, POLLING_CONFIG.delayMs));
            } else {
                throw error;
            }
        }
    }
    
    // Si on arrive ici, toutes les tentatives ont échoué
    throw new Error(`Le paiement n'a pas pu être confirmé après ${POLLING_CONFIG.maxAttempts} tentatives`);
}

/**
 * Trouve le purchaseId associé à un sessionId Stripe
 * @param {string} sessionId - Le sessionId Stripe
 * @param {string} userId - L'ID de l'utilisateur
 * @returns {Promise<string|null>} - Le purchaseId ou null
 */
async function findPurchaseIdBySessionId(sessionId, userId) {
    if (!isFirestoreAvailable()) {
        return null;
    }
    
    try {
        console.log('🔍 [confirmation.js] Recherche de purchaseId pour sessionId:', sessionId);
        
        // Rechercher dans les achats de l'utilisateur par stripeSessionId
        let purchasesQuery = await db.collection('purchases')
            .where('userId', '==', userId)
            .where('stripeSessionId', '==', sessionId)
            .limit(1)
            .get();
        
        if (!purchasesQuery.empty) {
            console.log('✅ [confirmation.js] Trouvé purchaseId par stripeSessionId:', purchasesQuery.docs[0].id);
            return purchasesQuery.docs[0].id;
        }
        
        // Rechercher par stripeId (peut contenir le sessionId)
        purchasesQuery = await db.collection('purchases')
            .where('userId', '==', userId)
            .where('stripeId', '==', sessionId)
            .limit(1)
            .get();
        
        if (!purchasesQuery.empty) {
            console.log('✅ [confirmation.js] Trouvé purchaseId par stripeId:', purchasesQuery.docs[0].id);
            return purchasesQuery.docs[0].id;
        }
        
        // Rechercher dans les 10 derniers achats de l'utilisateur
        const recentPurchases = await db.collection('purchases')
            .where('userId', '==', userId)
            .orderBy('createdAt', 'desc')
            .limit(10)
            .get();
        
        for (const doc of recentPurchases.docs) {
            const data = doc.data();
            // Vérifier si le sessionId est dans stripeSessionId, stripeId ou clientReferenceId
            if (data.stripeSessionId === sessionId || 
                data.stripeId === sessionId ||
                (data.clientReferenceId && data.clientReferenceId.includes(sessionId))) {
                console.log('✅ [confirmation.js] Trouvé purchaseId dans achats récents:', doc.id);
                return doc.id;
            }
        }
        
        console.log('⚠️ [confirmation.js] Aucun purchaseId trouvé pour sessionId:', sessionId);
        return null;
        
    } catch (error) {
        console.error('❌ [confirmation.js] Erreur recherche purchaseId:', error);
        return null;
    }
}

/**
 * Vérifie une session Stripe directement via l'API Stripe (si disponible)
 * @param {string} sessionId - Le sessionId Stripe
 * @returns {Promise<Object>} - Les données de la session
 */
async function verifyStripeSession(sessionId) {
    // Cette fonction nécessiterait d'appeler l'API Stripe depuis le frontend
    // mais ce n'est pas sécurisé (nécessite la clé secrète)
    // On utilise donc uniquement le polling Firestore
    console.log('ℹ️ [confirmation.js] Vérification directe Stripe non disponible depuis frontend');
    return null;
}

// =============================================================================
// FONCTION PRINCIPALE DE GESTION
// =============================================================================
async function handleConfirmation() {
    if (window.confirmationHandled) return;
    window.confirmationHandled = true;
    
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    const canceled = urlParams.get('canceled');
    const sessionId = urlParams.get('session_id') || urlParams.get('sessionId');
    
    console.log('🔍 [confirmation.js] Paramètres URL:', { success, canceled, sessionId });
    
    // Nettoyer l'URL
    window.history.replaceState({}, document.title, window.location.pathname);
    
    // Cas 1 : Paiement annulé
    if (canceled === 'true') {
        console.log('❌ [confirmation.js] Paiement annulé');
        
        // Nettoyer le sessionStorage
        const stripeKeys = [
            'stripe_purchase_id',
            'stripe_purchase_type',
            'stripe_purchase_planId',
            'stripe_purchase_isAnnual',
            'stripe_purchase_packId',
            'stripe_purchase_tokenAmount'
        ];
        stripeKeys.forEach(key => sessionStorage.removeItem(key));
        
        showCanceledState();
        return;
    }
    
    // Cas 2 : Succès (vrai ou faux)
    if (success === 'true' || success === 'false' || sessionId) {
        const user = window.authService?.currentUser;
        
        if (!user) {
            console.error('❌ [confirmation.js] Pas d\'utilisateur connecté');
            showErrorState(
                'Connexion requise',
                'Vous devez être connecté pour vérifier votre paiement.'
            );
            return;
        }
        
        console.log('🔍 [confirmation.js] Vérification du paiement...');
        
        // Priorité 1: On a un sessionId dans l'URL
        if (sessionId) {
            console.log('ℹ️ [confirmation.js] SessionId trouvé dans URL:', sessionId);
            await verifyAndConfirmPayment(sessionId, user.uid);
            return;
        }
        
        // Priorité 2: On a un success=true mais pas de sessionId
        // Vérifier sessionStorage pour le purchaseId
        const purchaseId = sessionStorage.getItem('stripe_purchase_id');
        const purchaseType = sessionStorage.getItem('stripe_purchase_type');
        
        if (purchaseId && purchaseType) {
            console.log('ℹ️ [confirmation.js] PurchaseId trouvé dans sessionStorage:', purchaseId);
            await confirmPurchaseFromSessionStorage(purchaseId, purchaseType, user.uid);
            return;
        }
        
        // Pas d'informations valides
        console.error('❌ [confirmation.js] Aucune information de paiement valide');
        showErrorState(
            'Informations manquantes',
            'Aucune information de paiement détectée. Si vous avez déjà payé, vos services devraient être activés sous 1-2 minutes.'
        );
        return;
    }
    
    // Cas 3 : Pas de paramètres - vérifier sessionStorage (ancien système)
    console.log('🔍 [confirmation.js] Pas de paramètres Stripe, vérification sessionStorage...');
    const purchaseId = sessionStorage.getItem('stripe_purchase_id');
    const purchaseType = sessionStorage.getItem('stripe_purchase_type');
    
    const user = window.authService?.currentUser;
    
    if (!user) {
        const fileProtocolMsg = window.FIREBASE_FILE_PROTOCOL 
            ? ' Utilisez un serveur web local (http://localhost) pour tester.'
            : '';
        showErrorState(
            'Connexion requise',
            'Vous devez être connecté pour confirmer votre achat.' + fileProtocolMsg
        );
        return;
    }
    
    if (purchaseId && purchaseType) {
        console.log('ℹ️ [confirmation.js] Données trouvées en sessionStorage:', { purchaseId, purchaseType });
        await confirmPurchaseFromSessionStorage(purchaseId, purchaseType, user.uid);
    } else {
        // Pas d'informations - afficher état générique
        console.log('⚠️ [confirmation.js] Aucune information de paiement trouvée');
        showErrorState(
            'Informations manquantes',
            'Aucune information de paiement détectée. Si vous avez déjà payé, attendez quelques minutes et rechargez la page.'
        );
    }
}

// =============================================================================
// VÉRIFIER ET CONFIRMER LE PAIEMENT VIA SESSION_ID OU PURCHASE_ID
// =============================================================================
async function verifyAndConfirmPayment(sessionId, userId) {
    if (!sessionId) {
        console.error('❌ [confirmation.js] Pas de sessionId');
        showErrorState('Erreur', 'Aucun identifiant de session Stripe trouvé.');
        return;
    }
    
    const user = window.authService?.currentUser;
    if (!user) {
        console.error('❌ [confirmation.js] Pas d\'utilisateur');
        showErrorState('Erreur', 'Vous devez être connecté.');
        return;
    }
    
    try {
        showLoadingState('Vérification de votre paiement Stripe...', 40);
        
        // Étape 1: Essayer de trouver le purchaseId associé au sessionId
        let purchaseId = null;
        
        // Vérifier d'abord dans sessionStorage
        const storedPurchaseId = sessionStorage.getItem('stripe_purchase_id');
        if (storedPurchaseId) {
            console.log('ℹ️ [confirmation.js] PurchaseId trouvé dans sessionStorage:', storedPurchaseId);
            purchaseId = storedPurchaseId;
        }
        
        // Si pas dans sessionStorage, chercher dans Firestore
        if (!purchaseId) {
            purchaseId = await findPurchaseIdBySessionId(sessionId, userId);
        }
        
        // Étape 2: Si on a un purchaseId, faire le polling
        if (purchaseId) {
            console.log('🎯 [confirmation.js] Polling pour purchaseId:', purchaseId);
            const purchaseData = await waitForPurchaseConfirmation(purchaseId, userId);
            
            // Étape 3: Afficher le succès avec les bonnes informations
            await displayConfirmationSuccess(purchaseData, userId);
            return;
        }
        
        // Étape 3: Si on n'a pas trouvé de purchaseId, créer une vérification basique
        console.log('⚠️ [confirmation.js] Aucun purchaseId trouvé, vérification basique...');
        
        // Afficher un message indiquant que la confirmation est en cours via webhook
        showSuccessState(
            'Paiement en cours de traitement',
            {
                type: 'unknown',
                message: 'Votre paiement a été reçu par Stripe. Le webhook est en train de mettre à jour votre compte. Cela peut prendre 1-2 minutes.'
            }
        );
        
    } catch (error) {
        console.error('❌ [confirmation.js] Erreur:', error);
        
        // Nettoyer le sessionStorage en cas d'erreur
        const stripeKeys = [
            'stripe_purchase_id',
            'stripe_purchase_type',
            'stripe_purchase_planId',
            'stripe_purchase_isAnnual',
            'stripe_purchase_packId',
            'stripe_purchase_tokenAmount'
        ];
        stripeKeys.forEach(key => sessionStorage.removeItem(key));
        
        showErrorState(
            'Erreur de confirmation',
            error.message || 'Une erreur est survenue lors de la vérification. Si vous avez déjà payé, vos services seront activés sous 1-2 minutes via le webhook Stripe.'
        );
    }
}

// =============================================================================
// CONFIRMER À PARTIR DU SESSION STORAGE
// =============================================================================
async function confirmPurchaseFromSessionStorage(purchaseId, purchaseType, userId) {
    console.log('🔧 [confirmation.js] confirmPurchaseFromSessionStorage:', { purchaseId, purchaseType, userId });
    
    const user = window.authService?.currentUser;
    if (!user) {
        const fileProtocolMsg = window.FIREBASE_FILE_PROTOCOL 
            ? ' Utilisez un serveur web local (http://localhost) pour tester.'
            : '';
        showErrorState(
            'Connexion requise',
            'Vous devez être connecté pour confirmer votre achat.' + fileProtocolMsg
        );
        return;
    }
    
    try {
        showLoadingState('Vérification de votre paiement...', 50);
        
        // Attendre la confirmation via polling
        console.log('🎯 [confirmation.js] Polling pour purchaseId:', purchaseId);
        const purchaseData = await waitForPurchaseConfirmation(purchaseId, userId);
        
        // Afficher le succès
        await displayConfirmationSuccess(purchaseData, userId);
        
    } catch (error) {
        console.error('❌ [confirmation.js] Erreur:', error);
        
        // Nettoyage du sessionStorage
        const stripeKeys = [
            'stripe_purchase_id',
            'stripe_purchase_type',
            'stripe_purchase_planId',
            'stripe_purchase_isAnnual',
            'stripe_purchase_packId',
            'stripe_purchase_tokenAmount'
        ];
        stripeKeys.forEach(key => sessionStorage.removeItem(key));
        
        showErrorState(
            'Erreur de confirmation',
            error.message || 'Une erreur est survenue. Si vous avez déjà payé, vos services seront activés sous 1-2 minutes via le webhook Stripe.'
        );
    }
}

// =============================================================================
// AFFICHER LE SUCCÈS AVEC LES BONNES INFORMATIONS
// =============================================================================
async function displayConfirmationSuccess(purchaseData, userId) {
    console.log('✅ [confirmation.js] Affichage du succès pour:', purchaseData);
    
    // Nettoyer le sessionStorage
    const stripeKeys = [
        'stripe_purchase_id',
        'stripe_purchase_type',
        'stripe_purchase_planId',
        'stripe_purchase_isAnnual',
        'stripe_purchase_packId',
        'stripe_purchase_tokenAmount'
    ];
    stripeKeys.forEach(key => sessionStorage.removeItem(key));
    
    // Déterminer le type d'achat
    const type = purchaseData.type || 
                 sessionStorage.getItem('stripe_purchase_type') || 
                 (purchaseData.planId ? 'subscription' : 
                  purchaseData.packId ? 'token_pack' : 'unknown');
    
    let itemDescription, data;
    
    if (type === 'subscription') {
        const planId = purchaseData.planId || sessionStorage.getItem('stripe_purchase_planId') || 'pro';
        const isAnnual = purchaseData.isAnnual || 
                       (sessionStorage.getItem('stripe_purchase_isAnnual') === 'true') || 
                       false;
        
        itemDescription = `Abonnement ${planId.toUpperCase()}`;
        data = {
            type: 'subscription',
            planId: planId,
            isAnnual: isAnnual,
            message: 'Votre abonnement est activé. Vos tokens et services sont disponibles immédiatement.'
        };
        
    } else if (type === 'token_pack') {
        const packId = purchaseData.packId || sessionStorage.getItem('stripe_purchase_packId') || 'discovery';
        const tokenAmount = purchaseData.tokenAmount || 
                           parseInt(sessionStorage.getItem('stripe_purchase_tokenAmount')) || 
                           (purchaseData.tokensAdded || 0);
        
        const packNames = { 
            discovery: 'Découverte', 
            boost: 'Boost', 
            expert: 'Expert', 
            unique_report: 'Rapport unique' 
        };
        
        itemDescription = `${tokenAmount} tokens`;
        data = {
            type: 'token_pack',
            packId: packId,
            packName: packNames[packId] || packId,
            tokenAmount: tokenAmount,
            message: 'Vos tokens sont disponibles immédiatement.'
        };
        
    } else {
        itemDescription = 'Paiement';
        data = {
            type: 'unknown',
            message: 'Votre paiement a été confirmé avec succès.'
        };
    }
    
    showSuccessState(itemDescription, data);
    
    // Recharger les données utilisateur en arrière-plan
    if (typeof window.syncUserData === 'function') {
        setTimeout(() => {
            window.syncUserData().then(() => {
                console.log('🔄 [confirmation.js] Données utilisateur synchronisées');
            });
        }, 1000);
    }
}

// =============================================================================
// AFFICHER LES ÉTATS
// =============================================================================
function showLoadingState(message, progress) {
    document.getElementById('loadingState').classList.remove('hidden');
    document.getElementById('successState').classList.add('hidden');
    document.getElementById('errorState').classList.add('hidden');
    document.getElementById('canceledState').classList.add('hidden');
    
    if (message) {
        const subtitle = document.getElementById('loadingState').querySelector('.confirmation-subtitle');
        if (subtitle) subtitle.textContent = message;
    }
    
    if (progress) {
        const progressFill = document.querySelector('.progress-fill');
        if (progressFill) progressFill.style.width = progress + '%';
    }
}

function showSuccessState(itemDescription, data) {
    document.getElementById('loadingState').classList.add('hidden');
    document.getElementById('successState').classList.remove('hidden');
    document.getElementById('errorState').classList.add('hidden');
    document.getElementById('canceledState').classList.add('hidden');
    
    // Mettre à jour le message
    const successMessage = document.getElementById('successMessage');
    if (successMessage) {
        successMessage.textContent = `Votre ${itemDescription} a été activé avec succès !`;
    }
    
    // Mettre à jour les détails
    const detailsContainer = document.getElementById('successDetails');
    if (detailsContainer && data) {
        let html = '';
        
        if (data.planId) {
            html += `<div class="detail-row">
                <span class="detail-label">Abonnement</span>
                <span class="detail-value">${data.planId.toUpperCase()}</span>
            </div>`;
            html += `<div class="detail-row">
                <span class="detail-label">Type</span>
                <span class="detail-value">${data.isAnnual ? 'Annuel' : 'Mensuel'}</span>
            </div>`;
        }
        
        if (data.tokenAmount) {
            html += `<div class="detail-row">
                <span class="detail-label">Tokens ajoutés</span>
                <span class="detail-value">${data.tokenAmount}</span>
            </div>`;
        }
        
        if (data.packId) {
            const packNames = { discovery: 'Découverte', boost: 'Boost', expert: 'Expert', unique_report: 'Rapport unique' };
            html += `<div class="detail-row">
                <span class="detail-label">Pack</span>
                <span class="detail-value">${packNames[data.packId] || data.packId}</span>
            </div>`;
        }
        
        if (html) {
            detailsContainer.innerHTML = html;
        } else {
            detailsContainer.innerHTML = '<p style="margin: 0; color: #6c757d;">Vos services sont prêts à être utilisés.</p>';
        }
    }
    
    // Mettre à jour le statut
    const statusEl = document.getElementById('successStatus');
    if (statusEl && data) {
        if (data.tokenAmount) {
            statusEl.textContent = `+${data.tokenAmount} tokens disponibles immédiatement`;
        } else if (data.planId) {
            statusEl.textContent = `Abonnement ${data.planId.toUpperCase()} actif`;
        } else if (data.message) {
            statusEl.textContent = data.message;
        }
    }
}

function showErrorState(title, message) {
    document.getElementById('loadingState').classList.add('hidden');
    document.getElementById('successState').classList.add('hidden');
    document.getElementById('errorState').classList.remove('hidden');
    document.getElementById('canceledState').classList.add('hidden');
    
    if (title) {
        const titleEl = document.getElementById('errorState').querySelector('.confirmation-title');
        if (titleEl) titleEl.textContent = title;
    }
    
    if (message) {
        const messageEl = document.getElementById('errorMessage');
        if (messageEl) messageEl.textContent = message;
        
        const detailsEl = document.getElementById('errorDetails');
        if (detailsEl) detailsEl.textContent = message;
    }
}

function showCanceledState() {
    document.getElementById('loadingState').classList.add('hidden');
    document.getElementById('successState').classList.add('hidden');
    document.getElementById('errorState').classList.add('hidden');
    document.getElementById('canceledState').classList.remove('hidden');
}

// =============================================================================
// EXPORT POUR DÉBOGAGE
// =============================================================================
window.waitForPurchaseConfirmation = waitForPurchaseConfirmation;
window.findPurchaseIdBySessionId = findPurchaseIdBySessionId;

console.log('%c💳 [confirmation.js] Service de confirmation chargé', 'color: #28a745; font-weight: bold;');
