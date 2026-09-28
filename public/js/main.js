// =============================================================================
// MAIN.JS - Script principal pour DPAI Web
// Version simplifiée et fiable
// =============================================================================

console.log('%c[Main.js] Chargement du script principal...', 'color: #607D8B; font-weight: bold;');

// Attendre que le DOM soit chargé
document.addEventListener('DOMContentLoaded', function() {
    console.log('%c[Main.js] DOM chargé, initialisation...', 'color: #607D8B; font-weight: bold;');
    
    // Initialiser tous les composants
    initFirebase();
    initAuthListener();
    initNavigation();
    initScroll();
    initTabs();
    initFAQ();
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

function initAuthListener() {
    // authService.init() est appelé automatiquement dans auth.js
    // On se contente d'écouter les événements authStateChanged
    
    let authCheck;
    let authTimeout;
    
    const authFound = () => {
        clearInterval(authCheck);
        clearTimeout(authTimeout);
        
        // Écouter les changements d'état d'authentification
        window.addEventListener('authStateChanged', function(event) {
            const { user, userData } = event.detail;
            updateAuthUI(user, userData);
        });
        
        console.log('%c✅ [Main] authService est prêt, écouteur d\'auth activé', 'color: #4CAF50; font-weight: bold;');
    };
    
    // Attendre que authService soit disponible
    authCheck = setInterval(() => {
        if (window.authService) {
            authFound();
        }
    }, 100);
    
    // Timeout de sécurité
    authTimeout = setTimeout(() => {
        clearInterval(authCheck);
        console.warn('%c⚠️ [Main] authService non disponible après 5 secondes', 'color: #FF9800; font-weight: bold;');
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
            if (window.authService && typeof window.authService.signOut === 'function') {
                window.authService.signOut().then(() => {
                    window.location.reload();
                });
            }
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
    
    // Formater les nombres
    const formatTokens = (value) => {
        if (typeof TokenUtils !== 'undefined' && TokenUtils.formatTokens) {
            return TokenUtils.formatTokens(value || 0);
        }
        return String(value || 0);
    };
    
    // Tokens
    const availableTokensEl = document.getElementById('availableTokens');
    const usedTokensEl = document.getElementById('usedTokens');
    const totalTokensEl = document.getElementById('totalTokens');
    const tokenProgressEl = document.getElementById('tokenProgress');
    const userPlanEl = document.getElementById('userPlan');
    
    if (availableTokensEl) availableTokensEl.textContent = formatTokens(userData.availableTokens || 0);
    if (usedTokensEl) usedTokensEl.textContent = formatTokens(userData.tokensUsed || 0);
    if (totalTokensEl) totalTokensEl.textContent = formatTokens(userData.totalTokens || 0);
    
    if (tokenProgressEl) {
        const percentage = userData.tokenUsagePercentage || 0;
        tokenProgressEl.style.width = `${percentage}%`;
        
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
    if (userPlanEl) userPlanEl.textContent = planNames[userData.plan] || userData.plan || 'Gratuit';
    
    // Analyses
    const totalAnalysesEl = document.getElementById('totalAnalyses');
    const monthlyAnalysesEl = document.getElementById('monthlyAnalyses');
    
    if (totalAnalysesEl) totalAnalysesEl.textContent = userData.totalAnalyses || 0;
    if (monthlyAnalysesEl) monthlyAnalysesEl.textContent = userData.monthlyAnalyses || 0;
    
    // Résumé des tokens
    const tokenAvailableEl = document.getElementById('tokenAvailable');
    const tokenUsedMonthlyEl = document.getElementById('tokenUsedMonthly');
    const tokenMonthlyLimitEl = document.getElementById('tokenMonthlyLimit');
    
    if (tokenAvailableEl) tokenAvailableEl.textContent = formatTokens(userData.availableTokens || 0);
    if (tokenUsedMonthlyEl) tokenUsedMonthlyEl.textContent = formatTokens(userData.tokensUsed || 0);
    if (tokenMonthlyLimitEl) tokenMonthlyLimitEl.textContent = formatTokens(userData.tokenLimit || 50);
    
    // Fidélité
    const loyaltyTokensEl = document.getElementById('loyaltyTokens');
    const loyaltyTotalAnalysesEl = document.getElementById('loyaltyTotalAnalyses');
    const loyaltyMonthlyAnalysesEl = document.getElementById('loyaltyMonthlyAnalyses');
    
    if (loyaltyTokensEl && userData.loyaltyInfo) {
        loyaltyTokensEl.textContent = formatTokens(userData.loyaltyInfo.monthlyLoyaltyTokens || 0);
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
    
    // Toggle mobile menu
    if (mobileToggle && navLinks) {
        mobileToggle.onclick = function() {
            this.classList.toggle('active');
            navLinks.classList.toggle('active');
            if (navActions) navActions.classList.toggle('active');
        };
    }
    
    // Scroll effect for navbar
    if (navbar) {
        window.addEventListener('scroll', function() {
            if (window.scrollY > 50) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        });
    }
    
    // Close mobile menu when clicking a link
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
            if (window.scrollY > 300) {
                backToTop.classList.add('visible');
            } else {
                backToTop.classList.remove('visible');
            }
        });
        
        backToTop.onclick = function(e) {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        };
    }
    
    // Smooth scroll for anchor links
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
                
                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
}

// =============================================================================
// INITIALISATION TABS
// =============================================================================

function initTabs() {
    const tabs = document.querySelectorAll('.pricing-tab');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            
            tabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            const section = document.getElementById(tabId);
            if (section) {
                section.scrollIntoView({ behavior: 'smooth' });
            }
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
                if (!isOpen) {
                    item.classList.add('open');
                }
            });
        }
    });
}

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
// EXPORT GLOBAL
// =============================================================================

// Exposer les fonctions globales si nécessaire
if (typeof window !== 'undefined') {
    window.startAnalysis = function(type) {
        const modal = document.getElementById('analysisModal');
        if (modal) {
            const analysisTypeInput = document.getElementById('analysisType');
            if (analysisTypeInput) analysisTypeInput.value = type;
            updateAnalysisEstimation(type);
            modal.classList.add('visible');
        }
    };
    
    window.launchAnalysis = function(type, name, description, cost, companyData) {
        console.log('launchAnalysis appelé - à implémenter dans dashboard.js');
    };
    
    window.showAlert = function(type, title, message) {
        if (typeof showGlobalAlert === 'function') {
            showGlobalAlert(type, title, message);
        } else {
            // Fallback simple
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
    };
}

// Fonction pour la compatibilité avec l'ancienne version
function updateAnalysisEstimation(type) {
    const estimatedAnalysisTypeEl = document.getElementById('estimatedAnalysisType');
    const estimatedTokensEl = document.getElementById('estimatedTokens');
    
    if (typeof TokenManager === 'undefined') {
        console.warn('⚠️ TokenManager non chargé');
        return;
    }
    
    const plan = window.authService && window.authService.userData ? window.authService.userData.plan : 'free';
    const cost = TokenManager.getCost(type, plan);
    const available = window.authService && window.authService.userData ? window.authService.userData.availableTokens : 0;
    
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
}
