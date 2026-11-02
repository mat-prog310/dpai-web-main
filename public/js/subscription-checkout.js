(() => {
    const checkoutButton = document.querySelector('[data-subscription-checkout]');
    const trialButton = document.querySelector('[data-trial-start]');
    const portalButton = document.querySelector('[data-subscription-portal]');
    const statusMessage = document.getElementById('subscriptionStatus');
    if (!checkoutButton && !portalButton) return;

    const updatePortalButton = () => {
        const customerId = window.authService?.currentUserData?.subscription?.stripeCustomerId;
        if (portalButton) portalButton.style.display = customerId ? '' : 'none';
    };
    window.addEventListener('authStateChanged', updatePortalButton);
    window.addEventListener('authFullyInitialized', updatePortalButton);
    updatePortalButton();

    trialButton?.addEventListener('click', async event => {
        const user = window.authService?.currentUser;
        if (!user) return;
        event.preventDefault();
        trialButton.setAttribute('aria-busy', 'true');
        if (statusMessage) statusMessage.textContent = 'Activation de votre démo...';
        try {
            const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname);
            const functionsUrl = isLocal
                ? 'http://localhost:5001/dpai-8be62/us-central1'
                : 'https://us-central1-dpai-8be62.cloudfunctions.net';
            const response = await fetch(`${functionsUrl}/startTrial`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${await user.getIdToken()}`
                },
                body: JSON.stringify({})
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Impossible d’activer la démo.');
            window.location.assign('/dashboard.html');
        } catch (error) {
            if (statusMessage) statusMessage.textContent = error.message;
            trialButton.removeAttribute('aria-busy');
        }
    });

    const query = new URLSearchParams(window.location.search);
    if (query.get('subscription') === 'success' && statusMessage) {
        statusMessage.textContent = 'Paiement recu. Votre abonnement sera active apres confirmation.';
    } else if (query.get('subscription') === 'cancelled' && statusMessage) {
        statusMessage.textContent = 'Paiement annule. Votre essai reste disponible jusqu’a son expiration.';
    }

    checkoutButton?.addEventListener('click', async () => {
        const auth = window.firebase?.auth?.();
        const user = auth?.currentUser;
        if (!user) {
            window.location.href = '/login.html?redirect=pricing.html';
            return;
        }

        checkoutButton.disabled = true;
        if (statusMessage) statusMessage.textContent = 'Ouverture du paiement securise...';

        try {
            const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname);
            const functionsUrl = isLocal
                ? 'http://localhost:5001/dpai-8be62/us-central1'
                : 'https://us-central1-dpai-8be62.cloudfunctions.net';
            const response = await fetch(`${functionsUrl}/createCheckoutSession`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${await user.getIdToken()}`
                },
                body: JSON.stringify({})
            });
            const result = await response.json();
            if (!response.ok || !result.url) {
                throw new Error(result.error || 'Impossible de creer la session de paiement.');
            }
            window.location.assign(result.url);
        } catch (error) {
            if (statusMessage) statusMessage.textContent = error.message;
            checkoutButton.disabled = false;
        }
    });

    portalButton?.addEventListener('click', async () => {
        const user = window.authService?.currentUser;
        if (!user) {
            window.location.href = '/login.html?redirect=pricing.html';
            return;
        }
        portalButton.disabled = true;
        if (statusMessage) statusMessage.textContent = 'Ouverture de votre espace de facturation...';
        try {
            const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname);
            const functionsUrl = isLocal
                ? 'http://localhost:5001/dpai-8be62/us-central1'
                : 'https://us-central1-dpai-8be62.cloudfunctions.net';
            const response = await fetch(`${functionsUrl}/createBillingPortalSession`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${await user.getIdToken()}`
                },
                body: JSON.stringify({})
            });
            const result = await response.json();
            if (!response.ok || !result.url) {
                throw new Error(result.error || 'Impossible d’ouvrir votre espace de facturation.');
            }
            window.location.assign(result.url);
        } catch (error) {
            if (statusMessage) statusMessage.textContent = error.message;
            portalButton.disabled = false;
        }
    });
})();
