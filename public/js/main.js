// =============================================================================
// MAIN.JS - Pour index.html et dashboard.html UNIQUEMENT
// Gère l'UI en fonction de l'état de connexion
// =============================================================================

console.log('%c[Main.js] Chargement...', 'color: #607D8B; font-weight: bold;');

// Attendre DOM et authService
document.addEventListener('DOMContentLoaded', () => {
    console.log('%c[Main.js] DOM prêt, attente authService...', 'color: #607D8B; font-weight: bold;');
    
    const checkReady = setInterval(() => {
        if (window.authService) {
            clearInterval(checkReady);
            console.log('%c✅ [Main.js] authService prêt, initialisation UI...', 'color: #4CAF50; font-weight: bold;');
            initAll();
        }
    }, 100);
    
    setTimeout(() => {
        clearInterval(checkReady);
        console.warn('%c⚠️ [Main.js] authService non disponible après 5s', 'color: #FF9800; font-weight: bold;');
    }, 5000);
});

function initAll() {
    initAuthUI();
    initNavigation();
    initScroll();
    initTabs();
    initFAQ();
    initForms();
    initFirebase();
}

// =============================================================================
// AUTH UI
// =============================================================================

function initAuthUI() {
    // Écouter les changements d'auth
    window.addEventListener('authStateChanged', (event) => {
        const { user, userData } = event.detail;
        updateAuthUI(user, userData);
    });
}

function updateAuthUI(user, userData) {
    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');
    const userMenu = document.getElementById('userMenu');
    const userNameEl = document.getElementById('userName');
    const logoutBtn = document.getElementById('logoutBtn');
    const unauthView = document.getElementById('unauthenticatedView');
    const dashboardContent = document.getElementById('dashboardContent');
    const dashboardHeader = document.getElementById('dashboardHeader');
    const welcomeName = document.getElementById('welcomeUserName');
    
    if (user && userData) {
        // Connecté
        if (loginBtn) loginBtn.style.display = 'none';
        if (registerBtn) registerBtn.style.display = 'none';
        if (userMenu) userMenu.style.display = 'block';
        if (userNameEl) userNameEl.textContent = user.displayName || user.email || 'Compte';
        if (unauthView) unauthView.style.display = 'none';
        if (dashboardContent) dashboardContent.style.display = 'block';
        if (dashboardHeader) dashboardHeader.style.display = 'block';
        if (welcomeName) welcomeName.textContent = user.displayName || user.email || 'Utilisateur';
        updateDashboardStats(userData);
    } else {
        // Non connecté
        if (loginBtn) loginBtn.style.display = 'inline-flex';
        if (registerBtn) registerBtn.style.display = 'inline-flex';
        if (userMenu) userMenu.style.display = 'none';
        if (unauthView) unauthView.style.display = 'block';
        if (dashboardContent) dashboardContent.style.display = 'none';
        if (dashboardHeader) dashboardHeader.style.display = 'none';
    }
    
    // Bouton de déconnexion
    if (logoutBtn) {
        logoutBtn.onclick = (e) => {
            e.preventDefault();
            window.authService.signOut().then(() => {
                window.location.reload();
            });
        };
    }
}

function updateDashboardStats(userData) {
    if (!userData) return;
    
    const format = (v) => (window.TokenUtils?.formatTokens ? TokenUtils.formatTokens(v || 0) : String(v || 0));
    
    // Tokens
    const availableEl = document.getElementById('availableTokens');
    const usedEl = document.getElementById('usedTokens');
    const totalEl = document.getElementById('totalTokens');
    const progressEl = document.getElementById('tokenProgress');
    const planEl = document.getElementById('userPlan');
    
    if (availableEl) availableEl.textContent = format(userData.availableTokens || 0);
    if (usedEl) usedEl.textContent = format(userData.tokensUsed || 0);
    if (totalEl) totalEl.textContent = format(userData.totalTokens || 0);
    
    if (progressEl) {
        const pct = userData.tokenUsagePercentage || 0;
        progressEl.style.width = `${pct}%`;
        progressEl.classList.toggle('error', pct > 80);
        progressEl.classList.toggle('warning', pct > 50 && pct <= 80);
    }
    if (planEl) planEl.textContent = userData.plan === 'free' ? 'Gratuit' : userData.plan;
    
    // Analyses
    const totalAnalysesEl = document.getElementById('totalAnalyses');
    const monthlyAnalysesEl = document.getElementById('monthlyAnalyses');
    if (totalAnalysesEl) totalAnalysesEl.textContent = userData.totalAnalyses || 0;
    if (monthlyAnalysesEl) monthlyAnalysesEl.textContent = userData.monthlyAnalyses || 0;
    
    // Résumé tokens
    const availSummaryEl = document.getElementById('tokenAvailable');
    const usedSummaryEl = document.getElementById('tokenUsedMonthly');
    const limitEl = document.getElementById('tokenMonthlyLimit');
    if (availSummaryEl) availSummaryEl.textContent = format(userData.availableTokens || 0);
    if (usedSummaryEl) usedSummaryEl.textContent = format(userData.tokensUsed || 0);
    if (limitEl) limitEl.textContent = format(userData.tokenLimit || 50);
    
    // Fidélité
    const loyaltyTokensEl = document.getElementById('loyaltyTokens');
    const loyaltyTotalEl = document.getElementById('loyaltyTotalAnalyses');
    const loyaltyMonthlyEl = document.getElementById('loyaltyMonthlyAnalyses');
    if (loyaltyTokensEl && userData.loyaltyInfo) loyaltyTokensEl.textContent = format(userData.loyaltyInfo.monthlyLoyaltyTokens || 0);
    if (loyaltyTotalEl && userData.loyaltyInfo) loyaltyTotalEl.textContent = userData.loyaltyInfo.totalAnalyses || 0;
    if (loyaltyMonthlyEl && userData.loyaltyInfo) loyaltyMonthlyEl.textContent = userData.loyaltyInfo.monthlyAnalyses || 0;
}

// =============================================================================
// NAVIGATION
// =============================================================================

function initNavigation() {
    const mobileToggle = document.getElementById('mobileToggle');
    const navLinks = document.getElementById('navLinks');
    const navActions = document.querySelector('.nav-actions');
    const navbar = document.querySelector('.navbar');
    
    if (mobileToggle && navLinks) {
        mobileToggle.onclick = () => {
            mobileToggle.classList.toggle('active');
            navLinks.classList.toggle('active');
            if (navActions) navActions.classList.toggle('active');
        };
    }
    
    if (navbar) {
        window.addEventListener('scroll', () => {
            navbar.classList.toggle('scrolled', window.scrollY > 50);
        });
    }
    
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            if (mobileToggle?.classList.contains('active')) {
                mobileToggle.classList.remove('active');
                if (navLinks) navLinks.classList.remove('active');
                if (navActions) navActions.classList.remove('active');
            }
        });
    });
}

// =============================================================================
// SCROLL
// =============================================================================

function initScroll() {
    const backToTop = document.getElementById('backToTop');
    
    if (backToTop) {
        window.addEventListener('scroll', () => {
            backToTop.classList.toggle('visible', window.scrollY > 300);
        });
        
        backToTop.onclick = (e) => {
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
                const offset = target.getBoundingClientRect().top + window.pageYOffset - 80;
                window.scrollTo({ top: offset, behavior: 'smooth' });
            }
        });
    });
}

// =============================================================================
// TABS
// =============================================================================

function initTabs() {
    document.querySelectorAll('.pricing-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.pricing-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            const section = document.getElementById(tab.dataset.tab);
            if (section) section.scrollIntoView({ behavior: 'smooth' });
        });
    });
}

// =============================================================================
// FAQ
// =============================================================================

function initFAQ() {
    document.querySelectorAll('.faq-item').forEach(item => {
        const question = item.querySelector('.faq-question');
        if (question) {
            question.addEventListener('click', () => {
                document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));
                item.classList.add('open');
            });
        }
    });
}

// =============================================================================
// FORMS
// =============================================================================

function initForms() {
    // Toggle password
    document.querySelectorAll('.toggle-password').forEach(btn => {
        btn.onclick = () => {
            const input = btn.parentElement.querySelector('input');
            const icon = btn.querySelector('i');
            if (input.type === 'password') {
                input.type = 'text';
                icon.classList.replace('fa-eye', 'fa-eye-slash');
            } else {
                input.type = 'password';
                icon.classList.replace('fa-eye-slash', 'fa-eye');
            }
        };
    });
    
    // Password strength
    const passInput = document.getElementById('registerPassword');
    const passStrength = document.getElementById('passwordStrength');
    const passText = document.getElementById('passwordStrengthText');
    if (passInput && passStrength) {
        passInput.addEventListener('input', () => {
            const s = calculatePasswordStrength(passInput.value);
            passStrength.style.width = `${s.percent}%`;
            passStrength.style.backgroundColor = s.color;
            if (passText) {
                passText.textContent = s.label;
                passText.style.color = s.color;
            }
        });
    }
    
    // Confirm password
    const confirmInput = document.getElementById('registerConfirmPassword');
    const confirmError = document.getElementById('confirmPasswordError');
    if (confirmInput && passInput && confirmError) {
        confirmInput.addEventListener('input', () => {
            confirmError.style.display = confirmInput.value === passInput.value ? 'none' : 'block';
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
    let color = score < 30 ? '#ef4444' : score < 60 ? '#f59e0b' : score < 80 ? '#10b981' : '#10b981';
    let label = score < 30 ? 'Faible' : score < 60 ? 'Moyen' : score < 80 ? 'Bon' : 'Excellente';
    return { score, percent: score, color, label };
}

// =============================================================================
// FIREBASE
// =============================================================================

function initFirebase() {
    if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
        console.log('%c✅ [Main.js] Firebase déjà initialisé', 'color: #4CAF50;');
    }
}

// =============================================================================
// EXPORTS GLOBAUX
// =============================================================================

window.startAnalysis = (type) => {
    const modal = document.getElementById('analysisModal');
    if (modal) {
        const typeInput = document.getElementById('analysisType');
        if (typeInput) typeInput.value = type;
        modal.classList.add('visible');
    }
};

window.showAlert = (type, title, message) => {
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <div class="alert-content">
            <span class="alert-title">${title}</span>
            <span class="alert-message">${message}</span>
        </div>
        <button class="alert-close">&times;</button>
    `;
    alert.style.cssText = 'position:fixed;top:20px;right:20px;z-index:10000;max-width:400px;animation:slideIn .3s ease-out';
    document.body.appendChild(alert);
    
    if (type !== 'error') setTimeout(() => {
        alert.style.animation = 'slideOut .3s ease-out';
        setTimeout(() => alert.remove(), 300);
    }, 5000);
    
    const closeBtn = alert.querySelector('.alert-close');
    if (closeBtn) {
        closeBtn.onclick = () => {
            alert.style.animation = 'slideOut .3s ease-out';
            setTimeout(() => alert.remove(), 300);
        };
    }
};
