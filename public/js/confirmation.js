// =============================================================================
// CONFIRMATION.JS - Gestion de la confirmation des paiements Stripe
// Cette page est appelée par Stripe après un paiement réussi ou annulé
// =============================================================================

// Attendre que Firebase et authService soient prêts
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔍 [confirmation.js] DOM chargé, attente de Firebase...');
    
    // Attendre que authService soit initialisé
    const initInterval = setInterval(() => {
        if (typeof window.authService !== 'undefined' && 
            typeof window.firebase !== 'undefined' &&
            window.authService && window.authService.currentUser) {
            clearInterval(initInterval);
            console.log('✅ [confirmation.js] Firebase et authService prêts');
            handleConfirmation();
        } else if (typeof window.authService !== 'undefined' && window.authService && !window.authService.currentUser) {
            // Utilisateur non connecté
            clearInterval(initInterval);
            console.log('⚠️ [confirmation.js] Pas d\'utilisateur connecté');
            showErrorState('Utilisateur non connecté', 'Veuillez vous connecter pour confirmer votre achat.');
        }
    }, 200);
    
    // Timeout de sécurité
    setTimeout(() => {
        clearInterval(initInterval);
        if (!window.confirmationHandled) {
            console.log('⚠️ [confirmation.js] Timeout atteint, vérification manuelle...');
            handleConfirmation();
        }
    }, 10000);
});

// Marqueur pour éviter les doubles traitements
window.confirmationHandled = false;

// =============================================================================
// FONCTION PRINCIPALE DE GESTION
// =============================================================================
async function handleConfirmation() {
    if (window.confirmationHandled) return;
    window.confirmationHandled = true;
    
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    const canceled = urlParams.get('canceled');
    const sessionId = urlParams.get('session_id');
    
    console.log('🔍 [confirmation.js] Paramètres URL:', { success, canceled, sessionId });
    
    // Nettoyer l'URL
    window.history.replaceState({}, document.title, window.location.pathname);
    
    // Cas 1 : Paiement annulé
    if (canceled === 'true') {
        console.log('❌ [confirmation.js] Paiement annulé');
        showCanceledState();
        return;
    }
    
    // Cas 2 : Succès (vrai ou faux)
    if (success === 'true' || success === 'false') {
        if (success === 'false') {
            console.log('⚠️ [confirmation.js] Paiement échoué');
            showErrorState(
                'Paiement échoué',
                'Le paiement n\'a pas abouti. Vous pouvez réessayer.'
            );
            return;
        }
        
        // Paiement réussi - Vérifier et confirmer
        console.log('✅ [confirmation.js] Paiement réussi, sessionId:', sessionId);
        await verifyAndConfirmPayment(sessionId);
        return;
    }
    
    // Cas 3 : Pas de paramètres - vérifier sessionStorage (ancien système)
    console.log('🔍 [confirmation.js] Pas de paramètres Stripe, vérification sessionStorage...');
    const purchaseId = sessionStorage.getItem('stripe_purchase_id');
    const purchaseType = sessionStorage.getItem('stripe_purchase_type');
    
    if (purchaseId && purchaseType) {
        console.log('ℹ️ [confirmation.js] Données trouvées en sessionStorage:', { purchaseId, purchaseType });
        await confirmPurchaseFromSessionStorage(purchaseId, purchaseType);
    } else {
        // Pas d'informations - afficher état générique
        console.log('⚠️ [confirmation.js] Aucune information de paiement trouvée');
        showErrorState(
            'Informations manquantes',
            'Aucune information de paiement détectée. Si vous avez déjà payé, vos services devraient être activés.'
        );
    }
}

// =============================================================================
// VÉRIFIER ET CONFIRMER LE PAIEMENT VIA SESSION_ID
// =============================================================================
async function verifyAndConfirmPayment(sessionId) {
    if (!sessionId) {
        console.error('❌ [confirmation.js] Pas de sessionId');
        showErrorState('Erreur', 'Aucun identifiant de session Stripe trouvée.');
        return;
    }
    
    const user = window.authService?.currentUser;
    if (!user) {
        console.error('❌ [confirmation.js] Pas d\'utilisateur');
        showErrorState('Erreur', 'Vous devez être connecté.');
        return;
    }
    
    try {
        // Montre l'état de chargement
        showLoadingState('Vérification du paiement Stripe...', 50);
        
        // Essayer de récupérer le purchaseId depuis Firestore via sessionId
        console.log('🔍 [confirmation.js] Recherche du purchaseId pour sessionId:', sessionId);
        
        // Rechercher dans purchases collection
        const purchasesQuery = await db.collection('purchases')
            .where('stripeSessionId', '==', sessionId)
            .where('userId', '==', user.uid)
            .limit(1)
            .get();
        
        if (!purchasesQuery.empty) {
            const purchaseDoc = purchasesQuery.docs[0];
            const purchaseData = purchaseDoc.data();
            
            console.log('✅ [confirmation.js] Achat trouvé:', purchaseData);
            
            if (purchaseData.status === 'completed') {
                // Déjà traité
                console.log('ℹ️ [confirmation.js] Achat déjà confirmé');
                showSuccessState(
                    purchaseData.type === 'subscription' 
                        ? `Abonnement ${purchaseData.planId || 'inconnu'}` 
                        : `Pack de ${purchaseData.tokenAmount || '?'} tokens`,
                    purchaseData
                );
                return;
            }
            
            // Confirmer l'achat
            await confirmPurchaseData(purchaseData, user.uid, sessionId, purchaseDoc.id);
            return;
        }
        
        // Rechercher dans pending_purchases
        console.log('🔍 [confirmation.js] Recherche dans pending_purchases...');
        const pendingDoc = await db.collection('pending_purchases').doc(user.uid).get();
        
        if (pendingDoc.exists) {
            const pendingData = pendingDoc.data();
            console.log('✅ [confirmation.js] Achat en attente trouvé:', pendingData);
            
            // Vérifier si cette session correspond
            if (pendingData.stripeSessionId === sessionId) {
                await confirmPurchaseData(pendingData, user.uid, sessionId, pendingDoc.id);
                return;
            }
        }
        
        // Essayer avec le client_reference_id depuis Stripe
        console.log('🔍 [confirmation.js] Tentative de récupération via Stripe API...');
        try {
            const functions = firebase.functions();
            const verifySession = functions.httpsCallable('verifyStripeSession');
            const result = await verifySession({ sessionId: sessionId, userId: user.uid });
            
            if (result.data.success) {
                console.log('✅ [confirmation.js] Vérification Stripe réussie');
                await confirmFromStripeSession(result.data, user.uid, sessionId);
                return;
            }
        } catch (error) {
            console.warn('⚠️ [confirmation.js] Impossible de vérifier via Stripe API:', error);
        }
        
        // Dernier recours : vérifier si l'utilisateur a déjà été mis à jour
        console.log('🔍 [confirmation.js] Vérification des données utilisateur...');
        const userDoc = await db.collection('users').doc(user.uid).get();
        if (userDoc.exists) {
            const userData = userDoc.data();
            // Si l'utilisateur a des tokens ou un plan premium, le paiement a probablement été traité
            if ((userData.tokenState && userData.tokenState.availableTokens > 50) || 
                ['pro', 'enterprise'].includes(userData.plan)) {
                showSuccessState(
                    `Vos services sont actifs`,
                    userData
                );
                return;
            }
        }
        
        // Aucune information trouvée
        console.error('❌ [confirmation.js] Aucune donnée d\'achat trouvée');
        showErrorState(
            'Achat introuvable',
            'Nous ne trouvons pas votre achat. Si vous avez déjà payé, attendez quelques minutes et rechargez la page.'
        );
        
    } catch (error) {
        console.error('❌ [confirmation.js] Erreur:', error);
        showErrorState(
            'Erreur de confirmation',
            error.message || 'Une erreur est survenue lors de la vérification.'
        );
    }
}

// =============================================================================
// CONFIRMER À PARTIR DES DONNÉES DE PURCHASE
// =============================================================================
async function confirmPurchaseData(purchaseData, userId, sessionId, purchaseId) {
    console.log('🔧 [confirmation.js] confirmPurchaseData:', { type: purchaseData.type, purchaseId });
    
    const user = window.authService?.currentUser;
    if (!user) {
        showErrorState('Erreur', 'Utilisateur non connecté.');
        return;
    }
    
    try {
        const functions = firebase.functions();
        let confirmFn, params;
        
        showLoadingState('Confirmation de votre achat...', 70);
        
        if (purchaseData.type === 'subscription') {
            confirmFn = functions.httpsCallable('confirmStripeSubscription');
            params = {
                userId: userId,
                sessionId: sessionId,
                purchaseId: purchaseId,
                planId: purchaseData.planId,
                isAnnual: purchaseData.isAnnual || false
            };
        } else if (purchaseData.type === 'token_pack') {
            confirmFn = functions.httpsCallable('confirmTokenPurchase');
            params = {
                userId: userId,
                sessionId: sessionId,
                purchaseId: purchaseId,
                packId: purchaseData.packId,
                tokenAmount: purchaseData.tokenAmount || 0
            };
        } else {
            throw new Error(`Type d'achat inconnu: ${purchaseData.type}`);
        }
        
        console.log('📤 [confirmation.js] Appel de la fonction de confirmation:', params);
        const result = await confirmFn(params);
        
        if (result.data.success) {
            console.log('✅ [confirmation.js] Confirmation réussie:', result.data);
            showSuccessState(
                purchaseData.type === 'subscription'
                    ? `Abonnement ${result.data.planId || purchaseData.planId || 'inconnu'}`
                    : `${result.data.tokenAmount || purchaseData.tokenAmount || '?'} tokens`,
                { ...purchaseData, ...result.data }
            );
        } else {
            console.error('❌ [confirmation.js] Confirmation échouée:', result.data.error);
            showErrorState(
                'Confirmation échouée',
                result.data.error || 'Une erreur est survenue.'
            );
        }
        
    } catch (error) {
        console.error('❌ [confirmation.js] Erreur confirmation:', error);
        showErrorState(
            'Erreur de confirmation',
            error.message || 'Une erreur est survenue.'
        );
    }
}

// =============================================================================
// CONFIRMER À PARTIR DE SESSION STRIPE
// =============================================================================
async function confirmFromStripeSession(sessionData, userId, sessionId) {
    console.log('🔧 [confirmation.js] confirmFromStripeSession:', sessionData);
    
    try {
        const functions = firebase.functions();
        
        // Déterminer le type à partir des métadonnées
        const metadata = sessionData.metadata || {};
        const clientRef = sessionData.clientReferenceId ? JSON.parse(sessionData.clientReferenceId) : {};
        
        const type = metadata.type || clientRef.type;
        
        showLoadingState('Finalisation de votre achat...', 80);
        
        if (type === 'subscription') {
            const confirmFn = functions.httpsCallable('confirmStripeSubscription');
            const result = await confirmFn({
                userId: userId,
                sessionId: sessionId,
                planId: metadata.planId || clientRef.planId || 'pro',
                isAnnual: metadata.isAnnual === 'true' || clientRef.isAnnual === true
            });
            
            if (result.data.success) {
                showSuccessState(
                    `Abonnement ${result.data.planId || 'inconnu'}`,
                    result.data
                );
            } else {
                showErrorState('Confirmation échouée', result.data.error || 'Erreur');
            }
        } else if (type === 'token_pack') {
            const confirmFn = functions.httpsCallable('confirmTokenPurchase');
            const result = await confirmFn({
                userId: userId,
                sessionId: sessionId,
                packId: metadata.packId || clientRef.packId || 'discovery',
                tokenAmount: parseInt(metadata.tokenAmount) || clientRef.tokenAmount || 0
            });
            
            if (result.data.success) {
                showSuccessState(
                    `${result.data.tokenAmount || metadata.tokenAmount || '?'} tokens`,
                    result.data
                );
            } else {
                showErrorState('Confirmation échouée', result.data.error || 'Erreur');
            }
        } else {
            showErrorState('Type inconnu', 'Impossible de déterminer le type d\'achat.');
        }
        
    } catch (error) {
        console.error('❌ [confirmation.js] Erreur:', error);
        showErrorState('Erreur', error.message || 'Erreur de confirmation.');
    }
}

// =============================================================================
// CONFIRMER À PARTIR DU SESSION STORAGE
// =============================================================================
async function confirmPurchaseFromSessionStorage(purchaseId, purchaseType) {
    console.log('🔧 [confirmation.js] confirmPurchaseFromSessionStorage:', { purchaseId, purchaseType });
    
    const user = window.authService?.currentUser;
    if (!user) {
        showErrorState('Erreur', 'Utilisateur non connecté.');
        return;
    }
    
    try {
        const functions = firebase.functions();
        
        showLoadingState('Confirmation de votre achat...', 70);
        
        if (purchaseType === 'subscription') {
            const planId = sessionStorage.getItem('stripe_purchase_planId') || 'pro';
            const isAnnual = sessionStorage.getItem('stripe_purchase_isAnnual') === 'true';
            
            const confirmFn = functions.httpsCallable('confirmStripeSubscription');
            const result = await confirmFn({
                userId: user.uid,
                purchaseId: purchaseId,
                planId: planId,
                isAnnual: isAnnual
            });
            
            if (result.data.success) {
                showSuccessState(
                    `Abonnement ${result.data.planId || planId}`,
                    result.data
                );
            } else {
                showErrorState('Confirmation échouée', result.data.error || 'Erreur');
            }
        } else if (purchaseType === 'token_pack') {
            const packId = sessionStorage.getItem('stripe_purchase_packId') || 'discovery';
            const tokenAmount = parseInt(sessionStorage.getItem('stripe_purchase_tokenAmount')) || 0;
            
            const confirmFn = functions.httpsCallable('confirmTokenPurchase');
            const result = await confirmFn({
                userId: user.uid,
                purchaseId: purchaseId,
                packId: packId,
                tokenAmount: tokenAmount
            });
            
            if (result.data.success) {
                showSuccessState(
                    `${result.data.tokenAmount || tokenAmount || '?'} tokens`,
                    result.data
                );
            } else {
                showErrorState('Confirmation échouée', result.data.error || 'Erreur');
            }
        } else {
            showErrorState('Type inconnu', 'Type d\'achat inconnu.');
        }
        
        // Nettoyer sessionStorage
        sessionStorage.removeItem('stripe_purchase_id');
        sessionStorage.removeItem('stripe_purchase_type');
        sessionStorage.removeItem('stripe_purchase_planId');
        sessionStorage.removeItem('stripe_purchase_isAnnual');
        sessionStorage.removeItem('stripe_purchase_packId');
        sessionStorage.removeItem('stripe_purchase_tokenAmount');
        
    } catch (error) {
        console.error('❌ [confirmation.js] Erreur:', error);
        showErrorState('Erreur', error.message || 'Erreur de confirmation.');
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
    if (statusEl && data && data.tokenAmount) {
        statusEl.textContent = `+${data.tokenAmount} tokens disponibles immédiatement`;
    } else if (statusEl && data && data.planId) {
        statusEl.textContent = `Abonnement ${data.planId.toUpperCase()} actif`;
    }
    
    // Recharger les données utilisateur en arrière-plan
    if (typeof window.syncUserData === 'function') {
        setTimeout(() => {
            window.syncUserData().then(() => {
                console.log('🔄 [confirmation.js] Données utilisateur synchronisées');
            });
        }, 500);
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
    }
}

function showCanceledState() {
    document.getElementById('loadingState').classList.add('hidden');
    document.getElementById('successState').classList.add('hidden');
    document.getElementById('errorState').classList.add('hidden');
    document.getElementById('canceledState').classList.remove('hidden');
}

// =============================================================================
// FONCTION POUR VÉRIFIER UNE SESSION STRIPE (à ajouter dans functions/index.js)
// =============================================================================
// Cette fonction doit être ajoutée dans votre backend Firebase Functions
// Elle permet de récupérer les infos d'une session Stripe depuis le frontend

console.log('%c💳 [confirmation.js] Service de confirmation chargé', 'color: #28a745; font-weight: bold;');
