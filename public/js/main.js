// =============================================================================
// MAIN.JS - Script principal pour DPAI Web
// =============================================================================

console.log('%c[Main.js] Chargement du script principal...', 'color: #607D8B; font-weight: bold;');

// Références Firebase (exposées par firebase-config.js)
// db est défini globalement dans firebase-config.js

// Attendre que le DOM soit chargé
document.addEventListener('DOMContentLoaded', function() {
    console.log('%c[Main.js] DOM chargé, initialisation...', 'color: #607D8B; font-weight: bold;');
    initFirebase();
    initAuth();
    initNavigation();
    initScroll();
    initTabs();
    initFAQ();
    // ⚠️ initModals() et initTokenCalculator() sont gérés par pricing.js
    // ⚠️ NE PAS les dupliquer ici pour éviter les doubles handlers
    initForms();
});

// =============================================================================
// INITIALISATION FIREBASE
// =============================================================================
function initFirebase() {
    if (typeof firebase === 'undefined') {
        console.warn('Firebase non chargé. Veuillez vérifier les scripts.');
        return;
    }
    
    try {
        const firebaseRef = window.firebase || firebase;
        if (!firebaseRef.apps.length) {
            console.warn('Firebase non initialisé. Configuration manquante.');
        }
    } catch (error) {
        console.error('Erreur initialisation Firebase:', error);
    }
}

// =============================================================================
// INITIALISATION AUTHENTIFICATION
// =============================================================================
function initAuth() {
    // Attendre que authService soit disponible
    // authService.init() est déjà appelé dans auth.js, ne pas le rappeler ici
    const authCheck = setInterval(() => {
        if (typeof window.authService !== 'undefined' && window.authService) {
            clearInterval(authCheck);
            // authService.init() a déjà été appelé dans auth.js
            // On ajoute juste l'écouteur d'événements ici
            
            // Écouter les changements d'état d'authentification
            window.addEventListener('authStateChanged', function(event) {
                const { user, userData } = event.detail;
                updateAuthUI(user, userData);
            });
            
            console.log('%c✅ [Main] authService est prêt', 'color: #4CAF50; font-weight: bold;');
        }
    }, 100);
    
    // Timeout de sécurité
    setTimeout(() => {
        clearInterval(authCheck);
        console.warn('[Main] authService non disponible après 5 secondes');
    }, 5000);
}

// Mettre à jour l'UI selon l'état d'authentification
function updateAuthUI(user, userData) {
    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');
    const userMenu = document.getElementById('userMenu');
    const userName = document.getElementById('userName');
    const logoutBtn = document.getElementById('logoutBtn');
    const unauthenticatedView = document.getElementById('unauthenticatedView');
    const dashboardContent = document.getElementById('dashboardContent');
    const dashboardHeader = document.getElementById('dashboardHeader');
    const welcomeUserName = document.getElementById('welcomeUserName');
    const dashboardUserName = document.getElementById('dashboardUserName');
    
    if (user && userData) {
        // Utilisateur connecté
        if (loginBtn) loginBtn.style.display = 'none';
        if (registerBtn) registerBtn.style.display = 'none';
        if (userMenu) userMenu.style.display = 'block';
        if (userName) userName.textContent = user.displayName || user.email || 'Compte';
        if (unauthenticatedView) unauthenticatedView.style.display = 'none';
        if (dashboardContent) dashboardContent.style.display = 'block';
        if (dashboardHeader) dashboardHeader.style.display = 'block';
        if (welcomeUserName) welcomeUserName.textContent = user.displayName || user.email || 'Utilisateur';
        if (dashboardUserName) dashboardUserName.textContent = user.displayName || user.email || 'Utilisateur';
        
        // Mettre à jour les stats du dashboard
        updateDashboardStats(userData);
    } else {
        // Utilisateur non connecté
        if (loginBtn) loginBtn.style.display = 'inline-flex';
        if (registerBtn) registerBtn.style.display = 'inline-flex';
        if (userMenu) userMenu.style.display = 'none';
        if (unauthenticatedView) unauthenticatedView.style.display = 'block';
        if (dashboardContent) dashboardContent.style.display = 'none';
        if (dashboardHeader) dashboardHeader.style.display = 'none';
    }
    
    // Gérer le bouton de déconnexion
    if (logoutBtn) {
        logoutBtn.onclick = function(e) {
            e.preventDefault();
            authService.signOut().then(() => {
                window.location.reload();
            });
        };
    }
}

// Mettre à jour les statistiques du dashboard
function updateDashboardStats(userData) {
    if (!userData) return;
    
    const planNames = {
        free: 'Gratuit',
        pro: 'Pro',
        enterprise: 'Entreprise'
    };
    
    // Mettre à jour les tokens
    const availableTokensEl = document.getElementById('availableTokens');
    const usedTokensEl = document.getElementById('usedTokens');
    const totalTokensEl = document.getElementById('totalTokens');
    const tokenProgressEl = document.getElementById('tokenProgress');
    const userPlanEl = document.getElementById('userPlan');
    
    if (availableTokensEl) {
        availableTokensEl.textContent = TokenUtils.formatTokens(userData.availableTokens || 0);
    }
    if (usedTokensEl) {
        usedTokensEl.textContent = TokenUtils.formatTokens(userData.tokensUsed || 0);
    }
    if (totalTokensEl) {
        totalTokensEl.textContent = TokenUtils.formatTokens(userData.totalTokens || 0);
    }
    if (tokenProgressEl) {
        const percentage = userData.tokenUsagePercentage || 0;
        tokenProgressEl.style.width = `${percentage}%`;
        
        // Changer la couleur selon le pourcentage
        if (percentage > 80) {
            tokenProgressEl.classList.add('error');
            tokenProgressEl.classList.remove('warning');
        } else if (percentage > 50) {
            tokenProgressEl.classList.add('warning');
            tokenProgressEl.classList.remove('error');
        } else {
            tokenProgressEl.classList.remove('warning', 'error');
        }
    }
    if (userPlanEl) {
        userPlanEl.textContent = planNames[userData.plan] || userData.plan || 'Gratuit';
    }
    
    // Mettre à jour les analyses
    const totalAnalysesEl = document.getElementById('totalAnalyses');
    const monthlyAnalysesEl = document.getElementById('monthlyAnalyses');
    
    if (totalAnalysesEl) {
        totalAnalysesEl.textContent = userData.totalAnalyses || 0;
    }
    if (monthlyAnalysesEl) {
        monthlyAnalysesEl.textContent = userData.monthlyAnalyses || 0;
    }
    
    // Mettre à jour le résumé des tokens
    const tokenAvailableEl = document.getElementById('tokenAvailable');
    const tokenUsedMonthlyEl = document.getElementById('tokenUsedMonthly');
    const tokenMonthlyLimitEl = document.getElementById('tokenMonthlyLimit');
    
    if (tokenAvailableEl) {
        tokenAvailableEl.textContent = TokenUtils.formatTokens(userData.availableTokens || 0);
    }
    if (tokenUsedMonthlyEl) {
        tokenUsedMonthlyEl.textContent = TokenUtils.formatTokens(userData.tokensUsed || 0);
    }
    if (tokenMonthlyLimitEl) {
        tokenMonthlyLimitEl.textContent = TokenUtils.formatTokens(userData.tokenLimit || 50);
    }
    
    // Mettre à jour la fidélité
    const loyaltyTokensEl = document.getElementById('loyaltyTokens');
    const loyaltyTotalAnalysesEl = document.getElementById('loyaltyTotalAnalyses');
    const loyaltyMonthlyAnalysesEl = document.getElementById('loyaltyMonthlyAnalyses');
    
    if (loyaltyTokensEl && userData.loyaltyInfo) {
        loyaltyTokensEl.textContent = TokenUtils.formatTokens(userData.loyaltyInfo.monthlyLoyaltyTokens || 0);
    }
    if (loyaltyTotalAnalysesEl && userData.loyaltyInfo) {
        loyaltyTotalAnalysesEl.textContent = userData.loyaltyInfo.totalAnalyses || 0;
    }
    if (loyaltyMonthlyAnalysesEl && userData.loyaltyInfo) {
        loyaltyMonthlyAnalysesEl.textContent = userData.loyaltyInfo.monthlyAnalyses || 0;
    }
}

// =============================================================================
// INITIALISATION NAVIGATION
// =============================================================================
function initNavigation() {
    const mobileToggle = document.getElementById('mobileToggle');
    const navLinks = document.getElementById('navLinks');
    const navActions = document.querySelector('.nav-actions');
    const navbar = document.querySelector('.navbar');
    
    if (mobileToggle && navLinks) {
        mobileToggle.onclick = function() {
            this.classList.toggle('active');
            navLinks.classList.toggle('active');
            if (navActions) navActions.classList.toggle('active');
        };
    }
    
    if (navbar) {
        window.addEventListener('scroll', function() {
            if (window.scrollY > 50) navbar.classList.add('scrolled');
            else navbar.classList.remove('scrolled');
        });
    }
    
    const links = document.querySelectorAll('.nav-link');
    links.forEach(link => {
        link.addEventListener('click', function() {
            if (mobileToggle && mobileToggle.classList.contains('active')) {
                mobileToggle.classList.remove('active');
                if (navLinks) navLinks.classList.remove('active');
                if (navActions) navActions.classList.remove('active');
            }
        });
    });
}

// =============================================================================
// INITIALISATION SCROLL
// =============================================================================
function initScroll() {
    const backToTop = document.getElementById('backToTop');
    
    if (backToTop) {
        window.addEventListener('scroll', function() {
            if (window.scrollY > 300) backToTop.classList.add('visible');
            else backToTop.classList.remove('visible');
        });
        
        backToTop.onclick = function(e) {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        };
    }
    
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href === '#') return;
            
            const target = document.querySelector(href);
            if (target) {
                e.preventDefault();
                const headerOffset = 80;
                const elementPosition = target.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
                window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
            }
        });
    });
}

// =============================================================================
// INITIALISATION TABS
// =============================================================================
function initTabs() {
    // ⚠️ géré par pricing.js si tu es sur pricing.html
    // Ici on garde pour la page index.html
    const tabs = document.querySelectorAll('.pricing-tab');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            tabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            const section = document.getElementById(tabId);
            if (section) section.scrollIntoView({ behavior: 'smooth' });
        });
    });
}

// =============================================================================
// INITIALISATION FAQ
// =============================================================================
function initFAQ() {
    const faqItems = document.querySelectorAll('.faq-item');
    
    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        if (question) {
            question.addEventListener('click', function() {
                const isOpen = item.classList.contains('open');
                faqItems.forEach(i => i.classList.remove('open'));
                if (!isOpen) item.classList.add('open');
            });
        }
    });
}

// =============================================================================
// ❌ SUPPRIMÉ : initModals() - doublon avec pricing.js
// ❌ SUPPRIMÉ : openSubscriptionModal() - doublon
// ❌ SUPPRIMÉ : openTokenPackModal() - doublon
// ❌ SUPPRIMÉ : purchaseSubscription() - doublon
// ❌ SUPPRIMÉ : purchaseTokenPack() - doublon
// ❌ SUPPRIMÉ : initTokenCalculator() - doublon
// ❌ SUPPRIMÉ : increment() / decrement() - gérés par pricing.js
// ❌ SUPPRIMÉ : scrollToSubscriptions() - gérés par pricing.js
// =============================================================================

// =============================================================================
// INITIALISATION FORMS
// =============================================================================
function initForms() {
    const togglePasswordBtns = document.querySelectorAll('.toggle-password');
    togglePasswordBtns.forEach(btn => {
        btn.onclick = function() {
            const input = this.parentElement.querySelector('input');
            const icon = this.querySelector('i');
            
            if (input.type === 'password') {
                input.type = 'text';
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            } else {
                input.type = 'password';
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            }
        };
    });
    
    const passwordInput = document.getElementById('registerPassword');
    const passwordStrength = document.getElementById('passwordStrength');
    const passwordStrengthText = document.getElementById('passwordStrengthText');
    
    if (passwordInput && passwordStrength) {
        passwordInput.addEventListener('input', function() {
            const password = this.value;
            const strength = calculatePasswordStrength(password);
            passwordStrength.style.width = `${strength.percent}%`;
            passwordStrength.style.backgroundColor = strength.color;
            if (passwordStrengthText) {
                passwordStrengthText.textContent = strength.label;
                passwordStrengthText.style.color = strength.color;
            }
        });
    }
    
    const confirmPasswordInput = document.getElementById('registerConfirmPassword');
    const confirmPasswordError = document.getElementById('confirmPasswordError');
    
    if (confirmPasswordInput && passwordInput && confirmPasswordError) {
        confirmPasswordInput.addEventListener('input', function() {
            if (this.value !== passwordInput.value) {
                confirmPasswordError.style.display = 'block';
                this.classList.add('error');
            } else {
                confirmPasswordError.style.display = 'none';
                this.classList.remove('error');
            }
        });
    }
}

function calculatePasswordStrength(password) {
    let score = 0;
    if (password.length >= 8) score += 25;
    if (password.length >= 12) score += 15;
    if (password.length >= 16) score += 10;
    if (/[A-Z]/.test(password)) score += 15;
    if (/[a-z]/.test(password)) score += 15;
    if (/[0-9]/.test(password)) score += 15;
    if (/[^A-Za-z0-9]/.test(password)) score += 20;
    score = Math.min(score, 100);
    
    let color, label;
    if (score < 30) { color = '#ef4444'; label = 'Faible'; }
    else if (score < 60) { color = '#f59e0b'; label = 'Moyen'; }
    else if (score < 80) { color = '#10b981'; label = 'Bon'; }
    else { color = '#10b981'; label = 'Excellente'; }
    
    return { score, percent: score, color, label };
}

// =============================================================================
// ANALYSE FONCTIONS
// =============================================================================
function startAnalysis(type) {
    const modal = document.getElementById('analysisModal');
    if (modal) {
        const analysisTypeInput = document.getElementById('analysisType');
        if (analysisTypeInput) analysisTypeInput.value = type;
        updateAnalysisEstimation(type);
        modal.classList.add('visible');
    }
}

function updateAnalysisEstimation(type) {
    const estimatedAnalysisTypeEl = document.getElementById('estimatedAnalysisType');
    const estimatedTokensEl = document.getElementById('estimatedTokens');
    const userAvailableTokensEl = document.getElementById('userAvailableTokens');
    const insufficientTokensAlert = document.getElementById('insufficientTokensAlert');
    const startAnalysisBtn = document.getElementById('startAnalysisBtn');
    
    if (typeof TokenManager === 'undefined') {
        console.warn('⚠️ TokenManager non chargé');
        return;
    }
    
    const plan = authService.userData?.plan || 'free';
    const cost = TokenManager.getCost(type, plan);
    const available = authService.userData?.availableTokens || 0;
    const canAfford = available >= cost;
    
    if (estimatedAnalysisTypeEl) {
        const analysisNames = {
            swot: 'Analyse SWOT',
            porter: 'Porter 5 Forces',
            pestel: 'Analyse PESTEL',
            competitive: 'Analyse Concurrentielle'
        };
        estimatedAnalysisTypeEl.textContent = analysisNames[type] || type;
    }
    if (estimatedTokensEl) estimatedTokensEl.textContent = cost;
    if (userAvailableTokensEl) userAvailableTokensEl.textContent = available;
    
    if (insufficientTokensAlert) {
        insufficientTokensAlert.style.display = canAfford ? 'none' : 'flex';
        if (startAnalysisBtn) startAnalysisBtn.disabled = !canAfford;
    }
}

function initAnalysisForm() {
    const analysisForm = document.getElementById('analysisForm');
    const analysisTypeSelect = document.getElementById('analysisType');
    
    if (analysisForm && analysisTypeSelect) {
        analysisTypeSelect.addEventListener('change', function() {
            updateAnalysisEstimation(this.value);
        });
        
        analysisForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const type = analysisTypeSelect.value;
            const name = document.getElementById('analysisName').value;
            const description = document.getElementById('analysisDescription').value;
            
            if (!type) {
                showAlert('error', 'Erreur', 'Veuillez sélectionner un type d\'analyse.');
                return;
            }
            
            const plan = authService.userData?.plan || 'free';
            const cost = TokenManager.getCost(type, plan);
            const available = authService.userData?.availableTokens || 0;
            
            if (available < cost) {
                showAlert('error', 'Erreur', 'Vous n\'avez pas assez de tokens pour cette analyse.');
                return;
            }
            
            const modal = document.getElementById('analysisModal');
            if (modal) modal.classList.remove('visible');
            
            launchAnalysis(type, name, description, cost);
        });
    }
}

async function launchAnalysis(type, name, description, cost, companyData) {
    const isFileProtocol = window.location.protocol === 'file:';
    const isFirebaseAvailable = typeof window.firebase !== 'undefined' && window.firebase;
    const isDemoMode = !isFirebaseAvailable || isFileProtocol;
    
    try {
        let analysisData = null;
        
        if (!isDemoMode) {
            await TokenManager.useTokens(cost, type);
            const user = authService.currentUser;
            if (user) {
                const docRef = await db.collection('users').doc(user.uid).collection('analyses').add({
                    type, name, description, cost,
                    status: 'completed',
                    createdAt: new Date().toISOString(),
                    results: generateMockResults(type)
                });
                analysisData = {
                    id: docRef.id, type, name, description, cost,
                    status: 'completed',
                    createdAt: new Date().toISOString(),
                    results: generateMockResults(type),
                    score: 75
                };
            }
        } else {
            if (window.TokenManager) {
                const currentAvailable = window.TokenManager.availableTokens || 9999;
                const newAvailable = currentAvailable - cost;
                
                if (!window.TokenManager._demoTokens) window.TokenManager._demoTokens = currentAvailable;
                window.TokenManager._demoTokens = newAvailable;
                
                Object.defineProperty(window.TokenManager, 'availableTokens', {
                    get: function() { return window.TokenManager._demoTokens || 9999; },
                    configurable: true
                });
                
                if (!window.TokenManager.userData) window.TokenManager.userData = {};
                if (!window.TokenManager.userData.tokenState) {
                    window.TokenManager.userData.tokenState = { availableTokens: 9999, usedTokens: 0, totalTokens: 9999 };
                }
                window.TokenManager.userData.tokenState.availableTokens = newAvailable;
                window.TokenManager.userData.tokenState.usedTokens = 9999 - newAvailable;
            }
            
            analysisData = {
                id: 'demo-' + Date.now(),
                type, name: name || `Analyse ${type}`, description: description || '',
                cost, status: 'completed',
                createdAt: new Date().toISOString(),
                results: generateMockResults(type),
                score: 75
            };
            
            try {
                let demoAnalyses = JSON.parse(localStorage.getItem('dpai_demo_analyses') || '[]');
                demoAnalyses.unshift(analysisData);
                if (demoAnalyses.length > 5) demoAnalyses = demoAnalyses.slice(0, 5);
                localStorage.setItem('dpai_demo_analyses', JSON.stringify(demoAnalyses));
            } catch (e) {
                console.error('[DPAI] Erreur sauvegarde historique démo:', e);
            }
        }
        
        showAlert('success', 'Succès', `Votre analyse ${name} a été lancée avec succès !`);
        
        if (typeof showAnalysisResults === 'function' && analysisData) {
            showAnalysisResults(analysisData);
        }
        
        if (typeof updateAfterAnalysis === 'function') {
            updateAfterAnalysis(type, name, description, cost);
        }
    } catch (error) {
        console.error('[DPAI] Erreur dans launchAnalysis:', error);
        showAlert('error', 'Erreur', error.message || 'Une erreur est survenue.');
    }
}

function generateMockResults(type) {
    const results = {
        swot: {
            strengths: ['Forte notoriété', 'Équipe expérimentée', 'Technologie avancée'],
            weaknesses: ['Coûts élevés', 'Dépendance à un client'],
            opportunities: ['Nouveau marché', 'Partenariat stratégique'],
            threats: ['Concurrence accrue', 'Changement réglementaire']
        },
        porter: {
            supplierPower: 'Moyen', buyerPower: 'Élevé', newEntrants: 'Faible',
            substitutes: 'Moyen', rivalry: 'Élevé'
        },
        pestel: {
            political: 'Stable', economic: 'Croissance', social: 'Favorable',
            technological: 'Innovant', environmental: 'Réglementé', legal: 'Conforme'
        },
        competitive: {
            competitors: ['Competitor A', 'Competitor B'],
            comparison: { price: 'Compétitif', quality: 'Supérieur', features: 'Complet' }
        }
    };
    return results[type] || {};
}

// =============================================================================
// ALERTS (fallback si showGlobalAlert n'existe pas)
// =============================================================================
function showAlert(type, title, message) {
    if (typeof window.showGlobalAlert === 'function' && window.showGlobalAlert !== showAlert) {
        window.showGlobalAlert(type, title, message);
        return;
    }
    
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <div class="alert-content">
            <span class="alert-title">${title}</span>
            <span class="alert-message">${message}</span>
        </div>
        <button type="button" class="alert-close">&times;</button>
    `;
    alert.style.cssText = `
        position: fixed; top: 20px; right: 20px; z-index: 10000;
        max-width: 400px; animation: slideIn 0.3s ease-out;
    `;
    document.body.appendChild(alert);
    
    if (type !== 'error') {
        setTimeout(() => {
            alert.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => alert.remove(), 300);
        }, 5000);
    }
    
    const closeBtn = alert.querySelector('.alert-close');
    if (closeBtn) {
        closeBtn.onclick = function() {
            alert.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => alert.remove(), 300);
        };
    }
}

// Exposer globalement
window.startAnalysis = startAnalysis;
window.launchAnalysis = launchAnalysis;
window.showAlert = showAlert;
