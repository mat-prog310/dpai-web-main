// =============================================================================
// DASHBOARD.JS - Tableau de bord stratégique DPAI
// 
// SOLUTION DÉFINITIVE AU PROBLÈME DE CONNEXION/DASHBOARD :
// - Dispatch 'tokenManagerReady' quand TokenManager est initialisé
// - Écoute 'authFullyInitialized' pour charger les données
// - Utilise des événements au lieu de boucles setTimeout infinies
// - initQuickActions et checkAdvisorAccess sont appelés via écouteurs d'événements
// =============================================================================

// Données de l'entreprise (stockées dans Firestore)
let companyData = {
    name: '',
    sector: '',
    revenue: 0,
    employees: 0,
    ebitda: 0,
    margin: 0,
    history: []
};

// Instances de graphiques Chart.js
const charts = {
    revenueChart: null,
    analysesChart: null
};
let revenueChartPeriod = 'year';
let analysesChartPeriod = 'month';

// Actions recommandées
let userActions = [];

// Historique des analyses
let analysisHistory = [];

// Alertes
let userAlerts = [];
let currentUserData = {};
let dismissedDashboardAlerts = new Set();
let activeAlertFilter = 'all';

// =============================================================================
// FONCTIONS DE CHARGEMENT
// =============================================================================

// Charger toutes les données du dashboard
async function loadDashboard() {
    // Vérifier si on est en mode file://
    if (window.location.protocol === 'file:' || window.FIREBASE_DEMO_MODE) {
        console.error('%c[Dashboard] Mode file:// détecté - Firebase ne fonctionne pas! Redirection vers index.html', 'color: #F44336; font-weight: bold;');
        alert('ERREUR: Le dashboard nécessite un serveur web.\n\nUtilisez: python -m http.server 8000\nou tout autre serveur local.');
        window.location.href = '/index.html';
        return;
    }
    
    // Vérifier si Firebase est disponible
    if (typeof firebase === 'undefined' || !firebase.auth || !firebase.firestore) {
        console.error('%c[Dashboard] Firebase non disponible - Redirection vers index.html', 'color: #F44336; font-weight: bold;');
        window.location.href = '/index.html';
        return;
    }
    
    const user = firebase.auth().currentUser;
    if (!user) {
        console.log('%c[Dashboard] Utilisateur non connecté - Redirection vers login.html', 'color: #F44336; font-weight: bold;');
        window.location.href = '/login.html';
        return;
    }

    try {
        // Charger les données de l'utilisateur
        await loadUserData(user.uid);
        
        // Charger l'historique des analyses
        await loadAnalysisHistory(user.uid);
        
        // Charger les actions
        await loadUserActions(user.uid);

        // Charger les acquittements sans empêcher le dashboard de s’ouvrir en cas d’erreur réseau.
        try {
            await loadDismissedDashboardAlerts(user.uid);
        } catch (alertError) {
            console.warn('Impossible de charger les notifications acquittées:', alertError);
        }
        
        // Mettre à jour l'interface
        updateDashboardUI();
        
        // Mettre à jour l'UI de connexion
        updateAuthUI();
        
        // Vérifier l'expiration
        checkExpiration();
        await loadAdminBilling(user);
        
    } catch (error) {
        console.error('Erreur chargement dashboard:', error);
        showError('Impossible de charger les données du tableau de bord');
    }
}

// Variable pour éviter l'initialisation multiple de TokenManager
let tokenManagerInitialized = false;

// Charger les données utilisateur et entreprise
async function loadUserData(userId) {
    const db = firebase.firestore();
    
    // Charger l'utilisateur
    const userDoc = await db.collection('users').doc(userId).get();
    if (userDoc.exists) {
        const userData = userDoc.data();
        currentUserData = { id: userId, ...userData };
        
        // Initialiser TokenManager avec les données utilisateur
        // CORRECTION: Initialiser TokenManager immédiatement pour que initQuickActions() puisse y accéder
        if (typeof TokenManager !== 'undefined' && !tokenManagerInitialized) {
            TokenManager.init({ id: userId, ...userData });
            tokenManagerInitialized = true;
            console.log('%c✅ [Dashboard] TokenManager initialisé avec succès', 'color: #4CAF50; font-weight: bold;');
            
            // Dispatcher l'événement que TokenManager est prêt
            setTimeout(() => {
                window.dispatchEvent(new CustomEvent('tokenManagerReady'));
            }, 0);
        }
        
        updateAccessPanel(currentUserData);
    }
    // Listener pour les mises à jour utilisateur (UI uniquement)
    db.collection('users').doc(userId).onSnapshot((doc) => {
        if (doc.exists) {
            const updatedUserData = doc.data();
            currentUserData = { id: userId, ...updatedUserData };
            console.log('[Dashboard] User data updated:', updatedUserData.subscription?.plan || updatedUserData.plan);
            
            // Mettre à jour TokenManager
            if (typeof TokenManager !== 'undefined') {
                TokenManager.init({ id: userId, ...updatedUserData });
            }
            
            updateAccessPanel(currentUserData);
            
            // Mettre à jour le nom utilisateur
            const userName = updatedUserData.displayName || updatedUserData.email || 'Utilisateur';
            const welcomeEl = document.getElementById('welcomeUserName');
            const dashboardEl = document.getElementById('dashboardUserName');
            if (welcomeEl) welcomeEl.textContent = userName;
            if (dashboardEl) dashboardEl.textContent = userName;
            
            // Mettre à jour l'UI de connexion dans le header
            updateAuthUI();
            updateAccessPanel(currentUserData);
            
            // Mettre à jour les infos entreprise si présentes
            if (updatedUserData.companyInfo) {
                companyData = { ...companyData, ...updatedUserData.companyInfo };
                updateCompanyCard();
                updateKPIs();
            }
            updateFirstValue();
            updateAlerts();
            
            // Vérifier l'accès advisor (UI uniquement) - SOUVENT APPELÉ DEPUIS LE MAIN MAINTENANT
            if (typeof checkAdvisorAccess !== 'undefined' && tokenManagerInitialized) {
                checkAdvisorAccess();
            }
            
            // Recharger les actions si nécessaire - SOUVENT APPELÉ DEPUIS LE MAIN MAINTENANT
            if (typeof initQuickActions !== 'undefined' && tokenManagerInitialized) {
                initQuickActions();
            }
        }
    });
    
    // Charger les données de l'entreprise (si collection séparée)
    const companyDoc = await db.collection('companies').doc(userId).get();
    if (companyDoc.exists) {
        companyData = { ...companyData, ...companyDoc.data() };
    }
}

// Charger l'historique des analyses
async function loadAnalysisHistory(userId) {
    const db = firebase.firestore();
    const analysesRef = db.collection('users').doc(userId).collection('analyses');
    const snapshot = await analysesRef.orderBy('createdAt', 'desc').limit(50).get();
    
    analysisHistory = [];
    snapshot.forEach(doc => {
        analysisHistory.push({ id: doc.id, ...doc.data() });
    });
    
    // Mettre à jour l'affichage
    updateAnalysisList();
}

// Mettre à jour la liste des analyses récentes
function updateAnalysisList() {
    const container = document.getElementById('recentAnalyses');
    if (!container) return;
    
    if (analysisHistory.length === 0) {
        container.innerHTML = `
            <div class="empty-state small">
                <div class="empty-state-icon">
                    <i class="fas fa-chart-bar"></i>
                </div>
                <p>Vous n'avez pas encore réalisé d'analyse.</p>
                <p class="empty-state-message">Commencez par lancer votre première analyse !</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = analysisHistory.slice(0, 5).map(analysis => `
        <div class="analysis-item" onclick="viewAnalysisDetails('${analysis.id}')" style="cursor: pointer; transition: all 0.3s ease;">
            <div class="analysis-icon">
                <i class="fas fa-${getAnalysisIcon(analysis.type)}"></i>
            </div>
            <div class="analysis-info">
                <h4>${getAnalysisName(analysis.type)}</h4>
                <p class="analysis-date">${formatDate(analysis.createdAt)}</p>
            </div>
        </div>
    `).join('');
}


// Obtenir l'icône d'une analyse
function getAnalysisIcon(type) {
    const icons = {
        swot: 'swimming-pool',
        porter: 'project-diagram',
        pestel: 'globe-americas',
        competitive: 'users',
        reports: 'file-alt',
        benchmark: 'chart-bar',
        modeling: 'cubes',
        due_diligence: 'check-square',
        valuation: 'euro-sign',
        synergy: 'link'
    };
    return icons[type] || 'chart-line';
}

// Obtenir le nom d'une analyse
function getAnalysisName(type) {
    const names = {
        swot: 'Analyse SWOT',
        porter: 'Porter 5 Forces',
        pestel: 'Analyse PESTEL',
        competitive: 'Analyse Concurrentielle',
        reports: 'Rapports Détaillés',
        benchmark: 'Benchmarking',
        modeling: 'Modélisation',
        due_diligence: 'Due Diligence',
        valuation: 'Valorisation',
        synergy: 'Analyse des Synergies'
    };
    return names[type] || type;
}

// Consulter les détails d'une analyse depuis l'historique
async function viewAnalysisDetails(analysisId) {
    const user = firebase.auth().currentUser;
    if (!user) {
        alert('Veuillez vous connecter pour consulter cette analyse.');
        window.location.href = 'login.html';
        return;
    }
    
    try {
        // Trouver l'analyse dans le tableau local
        const analysis = analysisHistory.find(a => a.id === analysisId);
        
        if (analysis) {
            // Stocker dans localStorage pour que analysis-results.html puisse le lire
            localStorage.setItem('dpai_analysis_results', JSON.stringify(analysis));
            
            // Rediriger vers la page des résultats
            window.location.href = 'analysis-results.html';
        } else {
            // Si non trouvée localement, essayer de la charger depuis Firestore
            const db = firebase.firestore();
            const analysisDoc = await db.collection('users').doc(user.uid).collection('analyses').doc(analysisId).get();
            
            if (analysisDoc.exists) {
                const analysisData = { id: analysisDoc.id, ...analysisDoc.data() };
                localStorage.setItem('dpai_analysis_results', JSON.stringify(analysisData));
                window.location.href = 'analysis-results.html';
            } else {
                alert('Impossible de trouver cette analyse.');
            }
        }
    } catch (error) {
        console.error('Erreur lors du chargement des détails de l\'analyse:', error);
        alert('Erreur lors du chargement des détails de l\'analyse.');
    }
}

// Charger les actions utilisateur
async function loadUserActions(userId) {
    const db = firebase.firestore();
    const actionsRef = db.collection('users').doc(userId).collection('actions');
    const snapshot = await actionsRef.orderBy('createdAt', 'desc').get();
    
    userActions = [];
    snapshot.forEach(doc => {
        userActions.push({ id: doc.id, ...doc.data() });
    });
    
    // Générer des actions par défaut si aucune action
    if (userActions.length === 0) {
        generateDefaultActions(userId);
    }
}

// Générer des actions par défaut basées sur les analyses
function generateDefaultActions(userId) {
    const defaultActions = [
        {
            title: 'Compléter les informations de votre entreprise',
            description: 'Renseignez le chiffre d\'affaires, le nombre d\'employés et l\'EBITDA pour des analyses personnalisées.',
            priority: 'high',
            impact: 0,
            status: 'pending',
            deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            createdAt: new Date().toISOString(),
            type: 'system'
        },
        {
            title: 'Réaliser une analyse SWOT',
            description: 'Identifiez les forces, faiblesses, opportunités et menaces de votre entreprise.',
            priority: 'high',
            impact: 0,
            status: 'pending',
            deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            createdAt: new Date().toISOString(),
            type: 'analysis'
        },
        {
            title: 'Analyser vos concurrents',
            description: 'Utilisez l\'analyse concurrentielle pour comprendre votre positionnement.',
            priority: 'medium',
            impact: 0,
            status: 'pending',
            deadline: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            createdAt: new Date().toISOString(),
            type: 'analysis'
        }
    ];
    
    // Sauvegarder dans Firestore
    const db = firebase.firestore();
    const batch = db.batch();
    defaultActions.forEach(action => {
        const actionRef = db.collection('users').doc(userId).collection('actions').doc();
        action.id = actionRef.id;
        batch.set(actionRef, action);
    });
    userActions = defaultActions;
    batch.commit().catch(err => {
        console.error('Erreur sauvegarde actions par défaut:', err);
    });
}

// =============================================================================
// MISE À JOUR DE L'INTERFACE
// =============================================================================

// Mettre à jour l'état de la démo, de l'abonnement et de la prochaine facture.
function updateAccessPanel(userData = currentUserData) {
    const subscription = userData.subscription || {};
    const statusEl = document.getElementById('accessStatus');
    const detailEl = document.getElementById('accessStatusDetail');
    if (!statusEl || !detailEl) return;

    const expiryValue = subscription.trialEndsAt || subscription.currentPeriodEnd || subscription.expiresAt;
    const expiry = expiryValue?.toDate ? expiryValue.toDate() : (expiryValue ? new Date(expiryValue) : null);
    const hasValidExpiry = expiry && !Number.isNaN(expiry.getTime());
    const activeSubscription = subscription.status === 'active' && (!hasValidExpiry || expiry > new Date());
    const daysLeft = hasValidExpiry ? Math.max(0, Math.ceil((expiry - new Date()) / 86400000)) : null;
    const progress = subscription.status === 'trialing' && hasValidExpiry
        ? Math.min(100, Math.max(0, ((7 - daysLeft) / 7) * 100))
        : subscription.status === 'active' ? 100 : 0;
    const progressEl = document.getElementById('trialProgress');
    const progressLabel = document.getElementById('trialProgressLabel');
    if (progressEl) progressEl.style.width = `${progress}%`;

    if (subscription.status === 'trialing' && hasValidExpiry && daysLeft > 0) {
        statusEl.textContent = 'Démo active';
        detailEl.textContent = `${daysLeft} jour(s) restant(s)`;
        if (progressLabel) progressLabel.textContent = `Fin de l’essai : ${formatDate(expiry.toISOString())}`;
    } else if (subscription.status === 'active' && (!hasValidExpiry || daysLeft > 0)) {
        statusEl.textContent = 'DPAI Premium';
        detailEl.textContent = subscription.cancelAtPeriodEnd ? 'Résiliation programmée' : 'Abonnement actif';
        if (progressLabel) progressLabel.textContent = hasValidExpiry ? `Prochaine échéance : ${formatDate(expiry.toISOString())}` : 'Abonnement actif';
    } else if (subscription.status === 'trialing') {
        statusEl.textContent = 'Démo terminée';
        detailEl.textContent = 'Souscrivez pour retrouver toutes les fonctionnalités';
        if (progressLabel) progressLabel.textContent = 'Essai de 7 jours terminé';
    } else {
        statusEl.textContent = 'Accès inactif';
        detailEl.textContent = 'Démarrez votre démo de 7 jours';
        if (progressLabel) progressLabel.textContent = 'Essai de 7 jours';
    }

    const upgradeButton = document.getElementById('upgradeSubscriptionBtn');
    if (upgradeButton) upgradeButton.style.display = activeSubscription ? 'none' : '';

    const billingSummary = document.getElementById('billingSummary');
    if (billingSummary) {
        if (subscription.lastInvoiceStatus === 'payment_failed') {
            billingSummary.textContent = 'Dernier paiement refusé. Mettez à jour votre moyen de paiement.';
            billingSummary.classList.add('urgent');
        } else if (subscription.nextInvoiceDueAt) {
            const amount = formatCurrency(subscription.nextInvoiceAmount || subscription.price || 199);
            billingSummary.textContent = `Prochain prélèvement : ${amount} le ${formatDate(subscription.nextInvoiceDueAt)}`;
            billingSummary.classList.remove('urgent');
        } else if (subscription.lastInvoicePaidAt) {
            billingSummary.textContent = `Dernier paiement reçu le ${formatDate(subscription.lastInvoicePaidAt)}`;
            billingSummary.classList.remove('urgent');
        } else {
            billingSummary.textContent = '';
        }
    }
}

function updateFirstValue() {
    const steps = [
        {id: 'company', done: Boolean(companyData.name && companyData.sector && Number(companyData.revenue) > 0)},
        {id: 'analysis', done: analysisHistory.length > 0},
        {id: 'action', done: userActions.some(action => action.type === 'user')}
    ];
    const doneCount = steps.filter(step => step.done).length;
    const text = document.getElementById('activationProgressText');
    const bar = document.getElementById('activationProgressBar');
    if (text) text.textContent = `${doneCount} sur ${steps.length} étapes terminées`;
    if (bar) bar.style.width = `${Math.round((doneCount / steps.length) * 100)}%`;
    steps.forEach(step => {
        const element = document.querySelector(`[data-activation="${step.id}"]`);
        if (!element) return;
        element.classList.toggle('completed', step.done);
        element.setAttribute('aria-current', step.done ? 'step' : 'false');
    });
}

async function loadAdminBilling(user) {
    const section = document.getElementById('adminBillingSection');
    if (!section || !user) return;
    try {
        const tokenResult = await user.getIdTokenResult();
        if (tokenResult.claims.admin !== true) return;
        section.style.display = '';

        const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname);
        const functionsUrl = isLocal
            ? 'http://localhost:5001/dpai-8be62/us-central1'
            : 'https://us-central1-dpai-8be62.cloudfunctions.net';
        const response = await fetch(`${functionsUrl}/getBillingMetrics`, {
            headers: {'Authorization': `Bearer ${await user.getIdToken()}`}
        });
        if (!response.ok) throw new Error('Données de facturation indisponibles');
        const {metrics, generatedAt} = await response.json();
        document.getElementById('adminMrr').textContent = formatCurrency(metrics.monthlyRecurringRevenue);
        document.getElementById('adminActiveSubscriptions').textContent = metrics.activeSubscriptions;
        document.getElementById('adminTrials').textContent = metrics.trials;
        document.getElementById('adminInvoiceFailures').textContent = metrics.invoiceFailures;
        document.getElementById('adminBillingUpdatedAt').textContent = `Mis à jour le ${formatDate(generatedAt)}`;
    } catch (error) {
        console.error('Erreur chargement des métriques administrateur:', error);
    }
}

// Mettre à jour l'interface complète du dashboard
function updateDashboardUI() {
    // Mettre à jour la carte entreprise
    updateCompanyCard();
    
    // Mettre à jour les KPIs
    updateKPIs();
    
    // Mettre à jour le tableau des actions
    updateActionsTable();
    
    // Mettre à jour les projections
    updateProjections();
    
    // Mettre à jour les alertes
    updateAlerts();
    
    // Mettre à jour les graphiques
    updateCharts();
    updateAccessPanel(currentUserData);
    updateFirstValue();
}

// Mettre à jour la carte entreprise
function updateCompanyCard() {
    document.getElementById('companyName').textContent = companyData.name || 'Nom de l\'entreprise';
    document.getElementById('companySector').textContent = companyData.sector || 'Secteur d\'activité';
    document.getElementById('companyRevenue').textContent = formatCurrency(companyData.revenue);
    document.getElementById('companyEmployees').textContent = companyData.employees || '-';
    document.getElementById('companyEbitda').textContent = formatCurrency(companyData.ebitda);
    document.getElementById('companyMargin').textContent = (companyData.margin || 0) + '%';
}

// Mettre à jour les KPIs
function updateKPIs() {
    // CA
    const revenue = companyData.revenue || 0;
    const revenueChange = calculateRevenueChange();
    document.getElementById('kpiRevenue').textContent = formatCurrency(revenue);
    updateTrendElement('kpiRevenueTrend', revenueChange, 'CA');
    
    // Employés
    const employees = companyData.employees || 0;
    const employeesChange = calculateMetricChange('employees');
    document.getElementById('kpiEmployees').textContent = employees;
    updateTrendElement('kpiEmployeesTrend', employeesChange, 'Employés');
    
    // EBITDA
    const ebitda = companyData.ebitda || 0;
    const ebitdaChange = calculateMetricChange('ebitda');
    document.getElementById('kpiEbitda').textContent = formatCurrency(ebitda);
    updateTrendElement('kpiEbitdaTrend', ebitdaChange, 'EBITDA');
    
    // Marge
    const margin = companyData.margin || 0;
    const marginChange = calculateMetricChange('margin');
    document.getElementById('kpiMargin').textContent = margin + '%';
    updateTrendElement('kpiMarginTrend', marginChange, 'Marge');
    
    // Croissance CA
    document.getElementById('kpiGrowth').textContent = revenueChange === null
        ? '—'
        : `${revenueChange > 0 ? '+' : ''}${revenueChange}%`;
}

function getSortedCompanyHistory() {
    return [...(companyData.history || [])]
        .filter(point => point && (point.recordedAt || point.date || point.createdAt))
        .sort((left, right) => new Date(left.recordedAt || left.date || left.createdAt) - new Date(right.recordedAt || right.date || right.createdAt));
}

// Calculer le changement du CA à partir de deux points historiques réels.
function calculateRevenueChange() {
    return calculateMetricChange('revenue');
}

function calculateMetricChange(metric) {
    const history = getSortedCompanyHistory();
    if (history.length >= 2) {
        const latest = Number(history[history.length - 1][metric]) || 0;
        const previous = Number(history[history.length - 2][metric]) || 0;
        if (previous > 0) {
            return Math.round(((latest - previous) / previous) * 100);
        }
    }
    return null;
}

// Mettre à jour un élément de tendance
function updateTrendElement(elementId, value, label) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    if (value === null || value === undefined || Number.isNaN(value)) {
        element.className = 'kpi-trend stable';
        element.innerHTML = '<i class="fas fa-minus"></i><span>Historique insuffisant</span>';
        return;
    }

    let trendClass = 'stable';
    let icon = 'fa-minus';
    let text = '0%';
    
    if (value > 0) {
        trendClass = 'up';
        icon = 'fa-arrow-up';
        text = `+${value}%`;
    } else if (value < 0) {
        trendClass = 'down';
        icon = 'fa-arrow-down';
        text = `${value}%`;
    }
    
    element.className = `kpi-trend ${trendClass}`;
    element.innerHTML = `<i class="fas ${icon}"></i><span>${text}</span>`;
}

// Mettre à jour le tableau des actions
function updateActionsTable() {
    const tableBody = document.getElementById('actionsTableBody');
    if (!tableBody) return;

    const completedCount = userActions.filter(action => action.status === 'completed').length;
    const progress = userActions.length ? Math.round((completedCount / userActions.length) * 100) : 0;
    const completedEl = document.getElementById('actionsCompletedCount');
    const totalEl = document.getElementById('actionsTotalCount');
    const progressEl = document.getElementById('actionsProgress');
    if (completedEl) completedEl.textContent = completedCount;
    if (totalEl) totalEl.textContent = userActions.length;
    if (progressEl) progressEl.innerHTML = `<i class="fas fa-check-circle"></i><span>${progress}%</span>`;
    
    if (userActions.length === 0) {
        tableBody.innerHTML = `
            <tr class="no-actions">
                <td colspan="5" style="text-align: center; color: #718096; padding: 2rem;">
                    <i class="fas fa-info-circle"></i> Aucune action recommandée pour le moment
                </td>
            </tr>
        `;
        return;
    }
    
    let html = '';
    userActions.forEach(action => {
        const priorityColor = getPriorityColor(action.priority);
        const statusClass = action.status || 'pending';
        const statusText = getStatusText(action.status);
        const impact = formatCurrency(action.impact || 0);
        const deadline = formatActionDeadline(action.deadline);
        
        html += `
            <tr>
                <td>
                    <div style="font-weight: 600; color: #1a202c; margin-bottom: 0.25rem;">${escapeHtml(action.title)}</div>
                    <div style="font-size: 0.875rem; color: #718096;">${escapeHtml(action.description || '')}</div>
                </td>
                <td>
                    <span class="action-priority ${action.priority}" style="background: ${priorityColor};"></span>
                </td>
                <td>
                    <span class="action-status ${statusClass}">${statusText}</span>
                </td>
                <td>
                    <div class="action-impact">
                        <i class="fas fa-arrow-up" style="color: #38a169;"></i>
                        <span>${impact}</span>
                    </div>
                </td>
                <td>${deadline}</td>
            </tr>
        `;
    });
    
    tableBody.innerHTML = html;
    
    // Ajouter des événements de clic pour changer le statut
    document.querySelectorAll('#actionsTableBody tr').forEach((row, index) => {
        row.addEventListener('click', () => {
            const action = userActions[index];
            showActionDetails(action, index);
        });
    });
}

function formatActionDeadline(deadlineValue) {
    if (!deadlineValue) return 'Non définie';
    const deadline = new Date(deadlineValue);
    if (Number.isNaN(deadline.getTime())) return 'Non définie';
    const daysLeft = Math.ceil((new Date(deadline.toDateString()) - new Date(new Date().toDateString())) / 86400000);
    if (daysLeft < 0) return `${formatDate(deadlineValue)} · En retard de ${Math.abs(daysLeft)} j`;
    if (daysLeft === 0) return `${formatDate(deadlineValue)} · Aujourd’hui`;
    if (daysLeft <= 7) return `${formatDate(deadlineValue)} · J-${daysLeft}`;
    return formatDate(deadlineValue);
}

// Obtenir la couleur de priorité
function getPriorityColor(priority) {
    const colors = {
        high: '#e53e3e',
        medium: '#dd6b20',
        low: '#38a169'
    };
    return colors[priority] || '#4a5568';
}

// Obtenir le texte de statut
function getStatusText(status) {
    const texts = {
        completed: 'Terminée',
        'in-progress': 'En cours',
        pending: 'À démarrer',
        cancelled: 'Annulée'
    };
    return texts[status] || 'Inconnu';
}

// Mettre à jour les projections
function updateProjections() {
    const revenue = companyData.revenue || 0;
    const ebitda = companyData.ebitda || 0;
    const margin = companyData.margin || 0;
    const history = getSortedCompanyHistory();
    const previous = history.length >= 2 ? history[history.length - 2] : null;
    const metrics = [
        {valueId: 'projectedRevenue', changeId: 'projectedRevenueChange', barId: 'projectedRevenueBar', value: revenue, previous: Number(previous?.revenue)},
        {valueId: 'projectedEbitda', changeId: 'projectedEbitdaChange', barId: 'projectedEbitdaBar', value: ebitda, previous: Number(previous?.ebitda)},
        {valueId: 'projectedMargin', changeId: 'projectedMarginChange', barId: 'projectedMarginBar', value: margin, previous: Number(previous?.margin), suffix: '%'}
    ];

    metrics.forEach(metric => {
        const valueEl = document.getElementById(metric.valueId);
        const changeEl = document.getElementById(metric.changeId);
        const barEl = document.getElementById(metric.barId);
        if (valueEl) valueEl.textContent = metric.suffix ? `${metric.value}${metric.suffix}` : formatCurrency(metric.value);
        if (metric.previous > 0) {
            const change = Math.round(((metric.value - metric.previous) / metric.previous) * 100);
            if (changeEl) changeEl.textContent = `${change > 0 ? '+' : ''}${change}% depuis le relevé précédent`;
            if (barEl) barEl.style.width = `${Math.min(Math.abs(change), 100)}%`;
        } else {
            if (changeEl) changeEl.textContent = 'Historique insuffisant';
            if (barEl) barEl.style.width = '0%';
        }
    });

    const declaredImpact = userActions
        .filter(action => ['pending', 'in-progress'].includes(action.status))
        .reduce((sum, action) => sum + (Number(action.impact) || 0), 0);
    const totalImpact = document.getElementById('totalImpact');
    if (totalImpact) totalImpact.textContent = formatCurrency(declaredImpact);
}

async function loadDismissedDashboardAlerts(userId) {
    const snapshot = await firebase.firestore().collection('users').doc(userId)
        .collection('dashboard_alerts').limit(200).get();
    dismissedDashboardAlerts = new Set(snapshot.docs
        .filter(doc => doc.data().dismissed === true)
        .map(doc => doc.id));
}

function buildDashboardAlerts() {
    const alerts = [];
    const now = new Date();
    const subscription = currentUserData.subscription || {};
    const trialEnds = subscription.trialEndsAt || (subscription.status === 'trialing' ? subscription.expiresAt : null);
    const trialEndDate = trialEnds?.toDate ? trialEnds.toDate() : (trialEnds ? new Date(trialEnds) : null);

    if (subscription.lastInvoiceStatus === 'payment_failed') {
        alerts.push({
            id: 'stripe_payment_failed', kind: 'urgent', priority: 'urgent',
            title: 'Paiement à régulariser',
            message: 'Le dernier prélèvement a échoué. Vérifiez votre moyen de paiement pour conserver DPAI Premium.',
            action: 'Ouvrir la facturation', href: '#billingSummary'
        });
    }

    if (subscription.status === 'trialing' && trialEndDate && !Number.isNaN(trialEndDate.getTime())) {
        const daysLeft = Math.ceil((trialEndDate - now) / 86400000);
        if (daysLeft <= 3) {
            alerts.push({
                id: 'trial_ends_soon', kind: 'system', priority: daysLeft <= 1 ? 'urgent' : 'warning',
                title: daysLeft <= 0 ? 'Votre essai est terminé' : 'Votre essai se termine bientôt',
                message: daysLeft <= 0
                    ? 'Choisissez DPAI Premium pour retrouver l’accès complet.'
                    : `Il vous reste ${daysLeft} jour(s) d’essai. DPAI Premium coûte 199 €/mois.`,
                action: 'Voir l’abonnement'
            });
        }
    }

    if (subscription.nextInvoiceDueAt) {
        const dueDate = new Date(subscription.nextInvoiceDueAt);
        if (!Number.isNaN(dueDate.getTime())) {
            const daysToPayment = Math.ceil((dueDate - now) / 86400000);
            if (daysToPayment >= 0 && daysToPayment <= 3) {
                alerts.push({
                    id: 'invoice_due_soon', kind: 'system', priority: daysToPayment <= 1 ? 'urgent' : 'warning',
                    title: 'Prélèvement à venir',
                    message: `Votre prochain prélèvement de ${formatCurrency(subscription.nextInvoiceAmount || subscription.price || 199)} est prévu dans ${daysToPayment} jour(s).`,
                    action: 'Voir la facturation', href: '#billingSummary'
                });
            }
        }
    }

    if (!companyData.name || !companyData.sector || !(Number(companyData.revenue) > 0)) {
        alerts.push({
            id: 'complete_company_profile', kind: 'recommendation', priority: 'recommendation',
            title: 'Complétez le profil de votre entreprise',
            message: 'Ajoutez secteur et chiffre d’affaires pour personnaliser les analyses.',
            action: 'Compléter le profil', href: '#companyInfo'
        });
    }

    const pendingActions = userActions.filter(action => action.status === 'pending');
    if (pendingActions.length) {
        alerts.push({
            id: 'pending_actions', kind: 'recommendation', priority: 'recommendation',
            title: `${pendingActions.length} action(s) à commencer`,
            message: 'Une première étape concrète aide à transformer vos analyses en résultats.',
            action: 'Voir les actions', href: '#actionsTracker'
        });
    }

    userActions.forEach(action => {
        if (action.status === 'completed') {
            const updatedAt = action.updatedAt ? new Date(action.updatedAt) : null;
            if (updatedAt && now - updatedAt < 86400000) {
                alerts.push({
                    id: `action_completed_${action.id}`, kind: 'system', priority: 'success',
                    title: 'Petite victoire', message: `${action.title} est terminée.`, action: 'Continuer', href: '#actionsTracker'
                });
            }
            return;
        }
        if (action.status === 'cancelled' || !action.deadline) return;
        const deadline = new Date(action.deadline);
        if (Number.isNaN(deadline.getTime())) return;
        const daysLeft = Math.ceil((deadline - now) / 86400000);
        if (daysLeft <= 7) {
            alerts.push({
                id: `action_deadline_${action.id}`, kind: daysLeft <= 2 ? 'urgent' : 'recommendation',
                priority: daysLeft < 0 ? 'urgent' : daysLeft <= 2 ? 'warning' : 'recommendation',
                title: daysLeft < 0 ? 'Action en retard' : 'Échéance proche',
                message: `${action.title} · ${daysLeft < 0 ? `en retard de ${Math.abs(daysLeft)} jour(s)` : `dans ${daysLeft} jour(s)`}`,
                action: 'Voir les actions', href: '#actionsTracker'
            });
        }
    });

    return alerts.filter(alert => !dismissedDashboardAlerts.has(alert.id));
}

function updateAlerts() {
    const alertsList = document.getElementById('alertsList');
    if (!alertsList) return;

    const pendingCount = userActions.filter(action => action.status === 'pending').length;
    const pendingCountEl = document.getElementById('pendingActionsCount');
    if (pendingCountEl) pendingCountEl.textContent = pendingCount;

    const filter = activeAlertFilter || 'all';
    const alerts = buildDashboardAlerts().filter(alert => {
        if (filter === 'all') return true;
        if (filter === 'urgent') return alert.priority === 'urgent' || alert.priority === 'warning';
        if (filter === 'recommendations') return alert.kind === 'recommendation';
        if (filter === 'system') return alert.kind === 'system';
        return true;
    });

    if (!alerts.length) {
        alertsList.innerHTML = '<div class="empty-state small"><p>Aucune notification pour cette catégorie.</p></div>';
        return;
    }

    const alertIcons = {urgent: 'fa-triangle-exclamation', warning: 'fa-clock', recommendation: 'fa-lightbulb', success: 'fa-circle-check'};
    alertsList.innerHTML = alerts.map(alert => `
        <div class="alert-item ${alert.priority}" data-alert-id="${escapeHtml(alert.id)}">
            <div class="alert-icon"><i class="fas ${alertIcons[alert.priority] || 'fa-circle-info'}"></i></div>
            <div class="alert-content">
                <div class="alert-title">${escapeHtml(alert.title)}</div>
                <div class="alert-message">${escapeHtml(alert.message)}</div>
                ${alert.action ? `<a class="alert-action" href="${alert.href || '/pricing.html#premium'}">${escapeHtml(alert.action)}</a>` : ''}
            </div>
            <button type="button" class="alert-dismiss" data-dismiss-alert="${escapeHtml(alert.id)}" aria-label="Acquitter la notification" title="Acquitter"><i class="fas fa-check"></i></button>
        </div>
    `).join('');
}

async function dismissDashboardAlert(alertId) {
    const user = firebase.auth().currentUser;
    if (!user || !alertId) return;
    await firebase.firestore().collection('users').doc(user.uid)
        .collection('dashboard_alerts').doc(alertId)
        .set({dismissed: true, dismissedAt: new Date().toISOString()}, {merge: true});
    dismissedDashboardAlerts.add(alertId);
    updateAlerts();
}

// Mettre à jour les graphiques
function updateCharts() {
    // Vérifier que Chart.js est chargé
    if (typeof Chart === 'undefined') {
        console.warn('Chart.js non chargé, les graphiques ne seront pas affichés');
        return;
    }
    
    // Graphique du chiffre d'affaires
    createRevenueChart();
    
    // Graphique des analyses réalisées
    createAnalysesChart();
}

// Créer le graphique du chiffre d'affaires
function createRevenueChart() {
    const canvas = document.getElementById('revenueChartCanvas');
    if (!canvas) return;
    const emptyState = document.getElementById('revenueChartEmpty');
    const now = new Date();
    const daysByPeriod = {month: 30, quarter: 90, year: 365};
    const startDate = new Date(now.getTime() - (daysByPeriod[revenueChartPeriod] || 365) * 86400000);
    const history = getSortedCompanyHistory().filter(point => {
        const date = new Date(point.recordedAt || point.date || point.createdAt);
        return date >= startDate && date <= now && Number.isFinite(Number(point.revenue));
    });

    if (charts.revenueChart) {
        charts.revenueChart.destroy();
        charts.revenueChart = null;
    }
    if (!history.length) {
        canvas.style.display = 'none';
        if (emptyState) emptyState.style.display = 'block';
        return;
    }

    canvas.style.display = '';
    if (emptyState) emptyState.style.display = 'none';
    const labels = history.map(point => {
        const date = new Date(point.recordedAt || point.date || point.createdAt);
        return date.toLocaleDateString('fr-FR', {day: '2-digit', month: 'short'});
    });
    const revenueData = history.map(point => Number(point.revenue));
    const ctx = canvas.getContext('2d');
    
    charts.revenueChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Chiffre d\'affaires (€)',
                data: revenueData,
                borderColor: '#0f766e',
                backgroundColor: 'rgba(15, 118, 110, 0.12)',
                borderWidth: 3,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                }
            },
            scales: {
                x: {ticks: {maxTicksLimit: 8}},
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return formatCurrency(value);
                        }
                    }
                }
            }
        }
    });
}

// Créer le graphique des analyses réalisées
function createAnalysesChart() {
    const canvas = document.getElementById('analysesChartCanvas');
    if (!canvas) return;
    const emptyState = document.getElementById('analysesChartEmpty');
    if (charts.analysesChart) {
        charts.analysesChart.destroy();
        charts.analysesChart = null;
    }

    const now = new Date();
    const rangeDays = {month: 30, quarter: 90, year: 365}[analysesChartPeriod] || 30;
    const bucketDays = {month: 1, quarter: 7, year: 30}[analysesChartPeriod] || 1;
    const startDate = new Date(now.getTime() - rangeDays * 86400000);
    const bucketCount = Math.ceil(rangeDays / bucketDays);
    const labels = [];
    const data = new Array(bucketCount).fill(0);

    for (let index = 0; index < bucketCount; index++) {
        const bucketDate = new Date(startDate.getTime() + index * bucketDays * 86400000);
        labels.push(bucketDate.toLocaleDateString('fr-FR', analysesChartPeriod === 'year'
            ? {month: 'short', year: '2-digit'}
            : {day: '2-digit', month: 'short'}));
    }

    analysisHistory.forEach(analysis => {
        const rawDate = analysis.createdAt;
        const date = rawDate?.toDate ? rawDate.toDate() : new Date(rawDate);
        if (Number.isNaN(date.getTime()) || date < startDate || date > now) return;
        const index = Math.floor((date - startDate) / (bucketDays * 86400000));
        if (index >= 0 && index < data.length) data[index]++;
    });

    if (!data.some(count => count > 0)) {
        canvas.style.display = 'none';
        if (emptyState) emptyState.style.display = 'block';
        return;
    }
    canvas.style.display = '';
    if (emptyState) emptyState.style.display = 'none';
    const ctx = canvas.getContext('2d');
    charts.analysesChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Nombre d\'analyses',
                data: data,
                backgroundColor: 'rgba(217, 119, 6, 0.72)',
                borderColor: '#b45309',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.parsed.y} analyses`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

// =============================================================================
// GESTION DES ACTIONS
// =============================================================================

// Changer le statut d'une action
async function changeActionStatus(userId, actionId, newStatus) {
    const db = firebase.firestore();
    const actionRef = db.collection('users').doc(userId).collection('actions').doc(actionId);
    
    await actionRef.update({ status: newStatus, updatedAt: new Date().toISOString() });
    
    // Recharger les actions
    await loadUserActions(userId);
    updateActionsTable();
    updateProjections();
    updateFirstValue();
    updateAlerts();
}

// Afficher les détails d'une action
function showActionDetails(action, index) {
    const user = firebase.auth().currentUser;
    if (!user) return;
    
    const newStatus = action.status === 'pending' ? 'in-progress' : 
                     action.status === 'in-progress' ? 'completed' : 'pending';
    
    // Demander confirmation
    if (window.confirm(`Changer le statut de "${action.title}" en "${getStatusText(newStatus)}" ?`)) {
        changeActionStatus(user.uid, action.id || `action_${index}`, newStatus);
    }
}

// =============================================================================
// GESTION DE L'ENTREPRISE
// =============================================================================

// Sauvegarder les informations de l'entreprise
async function saveCompanyInfo(userId) {
    const db = firebase.firestore();
    const now = new Date();
    const recordedAt = now.toISOString();
    const history = getSortedCompanyHistory();
    const lastPoint = history[history.length - 1];
    const sameDay = lastPoint && new Date(lastPoint.recordedAt || lastPoint.date || lastPoint.createdAt).toDateString() === now.toDateString();
    const snapshot = {
        recordedAt,
        revenue: parseFloat(document.getElementById('editCompanyRevenue').value) || 0,
        employees: parseInt(document.getElementById('editCompanyEmployees').value) || 0,
        ebitda: parseFloat(document.getElementById('editCompanyEbitda').value) || 0,
        margin: parseFloat(document.getElementById('editCompanyMargin').value) || 0
    };
    const updatedHistory = snapshot.revenue > 0
        ? sameDay ? [...history.slice(0, -1), snapshot] : [...history, snapshot].slice(-90)
        : history;
    
    const info = {
        name: document.getElementById('editCompanyName').value,
        sector: document.getElementById('editCompanySector').value,
        revenue: snapshot.revenue,
        employees: snapshot.employees,
        ebitda: snapshot.ebitda,
        margin: snapshot.margin,
        updatedAt: recordedAt,
        history: updatedHistory
    };
    
    // Sauvegarder dans Firestore
    await db.collection('users').doc(userId).update({
        companyInfo: info,
        lastCompanyUpdate: new Date().toISOString()
    });
    
    // Mettre à jour localement
    companyData = { ...companyData, ...info };
    
    // Mettre à jour l'UI
    updateCompanyCard();
    updateKPIs();
    updateProjections();
    updateFirstValue();
    updateAlerts();
    
    // Fermer le modal
    document.getElementById('editCompanyModal').classList.remove('visible');
    
    showSuccess('Informations de l\'entreprise sauvegardées');
}

// =============================================================================
// GESTION DE L'EXPIRATION
// =============================================================================

// Vérifier si l'abonnement est expiré
function checkExpiration() {
    const user = firebase.auth().currentUser;
    if (!user) return;
    
    // Récupérer les données utilisateur
    const db = firebase.firestore();
    db.collection('users').doc(user.uid).get().then(doc => {
        if (doc.exists) {
            const userData = doc.data();
            const tokenState = userData.tokenState || {};
            const subscription = userData.subscription || {};

            const expiry = subscription.expiresAt || subscription.trialEndsAt || tokenState.expiresAt;
            if (expiry) {
                const expiryDate = expiry.toDate ? expiry.toDate() : new Date(expiry);
                const daysLeft = Math.ceil((expiryDate - new Date()) / (1000 * 60 * 60 * 24));
                const isTrial = subscription.status === 'trialing';

                if (daysLeft <= 7 && daysLeft > 0) {
                    showAlert(isTrial
                        ? `Votre démo se termine dans ${daysLeft} jour(s). DPAI Premium est disponible à 199 €/mois.`
                        : `Votre abonnement expire dans ${daysLeft} jour(s).`);
                } else if (daysLeft <= 0) {
                    showExpirationWarning(isTrial
                        ? 'Votre période de démonstration est terminée.'
                        : 'Votre abonnement a expiré.');
                }
            }
        }
    });
}

// Afficher un avertissement d'expiration
function showExpirationWarning(message) {
    const alertHtml = `
        <div class="alert-item urgent" style="margin-bottom: 1rem;">
            <div class="alert-icon"><i class="fas fa-exclamation-triangle"></i></div>
            <div class="alert-content">
                <div class="alert-title">Abonnement expiré</div>
                <div class="alert-message">${message}</div>
                <a class="btn btn-primary" href="/pricing.html#premium">Passer à DPAI Premium - 199 €/mois</a>
            </div>
            <div class="alert-time">Maintenant</div>
        </div>
    `;
    document.getElementById('alertsList').innerHTML = alertHtml + document.getElementById('alertsList').innerHTML;
}

// =============================================================================
// UTILITAIRES
// =============================================================================

// Formater une date
function formatDate(dateString) {
    if (!dateString) return 'Non définie';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// Formater une monnaie
function formatCurrency(amount) {
    if (amount === 0 || !amount) return '0 €';
    return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

// Afficher une erreur
function showError(message) {
    // Implémentation simple pour l'instant
    console.error('Erreur:', message);
    alert(message);
}

// Afficher un succès
function showSuccess(message) {
    console.log('Succès:', message);
    // Peut être amélioré avec des notifications toast
}

// Afficher une alerte
function showAlert(message) {
    console.log('Alerte:', message);
    // Peut être amélioré avec des notifications toast
}

// Échapper le HTML
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// =============================================================================
// ÉVÉNEMENTS
// =============================================================================

// Initialiser les événements lors du chargement
document.addEventListener('DOMContentLoaded', function() {
    // Modal Éditer Entreprise
    const editCompanyBtn = document.createElement('button');
    editCompanyBtn.className = 'btn btn-secondary btn-sm';
    editCompanyBtn.innerHTML = '<i class="fas fa-edit"></i> Modifier les informations';
    editCompanyBtn.style.marginTop = '1rem';
    editCompanyBtn.addEventListener('click', () => {
        document.getElementById('editCompanyName').value = companyData.name || '';
        document.getElementById('editCompanySector').value = companyData.sector || '';
        document.getElementById('editCompanyRevenue').value = companyData.revenue || '';
        document.getElementById('editCompanyEmployees').value = companyData.employees || '';
        document.getElementById('editCompanyEbitda').value = companyData.ebitda || '';
        document.getElementById('editCompanyMargin').value = companyData.margin || '';
        document.getElementById('editCompanyModal').classList.add('visible');
    });
    
    // Ajouter le bouton à la carte entreprise
    const companyCard = document.querySelector('.company-identity-card');
    if (companyCard) {
        companyCard.appendChild(editCompanyBtn);
    }
    
    // Bouton Ajouter Action
    const addActionBtn = document.createElement('button');
    addActionBtn.className = 'btn btn-primary btn-sm';
    addActionBtn.innerHTML = '<i class="fas fa-plus"></i> Ajouter une action';
    addActionBtn.style.marginLeft = '1rem';
    addActionBtn.addEventListener('click', () => {
        document.getElementById('addActionModal').classList.add('visible');
    });
    
    // Ajouter le bouton à la section actions
    const actionsHeader = document.querySelector('.actions-header');
    if (actionsHeader) {
        const headerDiv = actionsHeader.querySelector('div:last-child');
        if (headerDiv) {
            headerDiv.prepend(addActionBtn);
        }
    }
    
    // Modal Éditer Entreprise - Boutons
    document.getElementById('closeEditModal')?.addEventListener('click', () => {
        document.getElementById('editCompanyModal').classList.remove('visible');
    });
    
    document.getElementById('cancelEditCompany')?.addEventListener('click', () => {
        document.getElementById('editCompanyModal').classList.remove('visible');
    });
    
    document.getElementById('saveCompanyInfo')?.addEventListener('click', async () => {
        const user = firebase.auth().currentUser;
        if (user) {
            await saveCompanyInfo(user.uid);
        }
    });
    
    // Modal Ajouter Action - Boutons
    document.getElementById('closeAddActionModal')?.addEventListener('click', () => {
        document.getElementById('addActionModal').classList.remove('visible');
    });
    
    document.getElementById('cancelAddAction')?.addEventListener('click', () => {
        document.getElementById('addActionModal').classList.remove('visible');
    });
    
    document.getElementById('saveAction')?.addEventListener('click', async () => {
        const user = firebase.auth().currentUser;
        if (user) {
            await saveNewAction(user.uid);
        }
    });
    
    // Fermer les modals en cliquant à l'extérieur
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('visible');
            }
        });
    });
    
    // Onglets Alertes
    document.querySelectorAll('.alert-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.alert-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            activeAlertFilter = tab.dataset.tab || 'all';
            updateAlerts();
        });
    });

    document.querySelectorAll('.chart-btn[data-chart="revenue"]').forEach(button => {
        button.addEventListener('click', () => {
            document.querySelectorAll('.chart-btn[data-chart="revenue"]').forEach(item => item.classList.remove('active'));
            button.classList.add('active');
            revenueChartPeriod = button.dataset.period || 'year';
            createRevenueChart();
        });
    });

    document.querySelectorAll('.chart-btn[data-chart="analyses"]').forEach(button => {
        button.addEventListener('click', () => {
            document.querySelectorAll('.chart-btn[data-chart="analyses"]').forEach(item => item.classList.remove('active'));
            button.classList.add('active');
            analysesChartPeriod = button.dataset.period || 'month';
            createAnalysesChart();
        });
    });

    document.querySelectorAll('[data-activation="action"]').forEach(link => {
        link.addEventListener('click', event => {
            event.preventDefault();
            document.getElementById('addActionModal')?.classList.add('visible');
        });
    });

    document.getElementById('alertsList')?.addEventListener('click', async event => {
        const dismissButton = event.target.closest('[data-dismiss-alert]');
        if (!dismissButton) return;
        dismissButton.disabled = true;
        try {
            await dismissDashboardAlert(dismissButton.dataset.dismissAlert);
        } catch (error) {
            console.error('Erreur lors de l’acquittement de la notification:', error);
            dismissButton.disabled = false;
        }
    });
    
    // Écouter l'événement tokenManagerReady pour initialiser les composants dépendants
    window.addEventListener('tokenManagerReady', function() {
        console.log('%c✅ [DASHBOARD] tokenManagerReady reçu, initialisation des composants...', 'color: #4CAF50; font-weight: bold;');
        // Maintenant que TokenManager est prêt, on peut initialiser les actions rapides et vérifier l'accès advisor
        setTimeout(() => {
            if (typeof initQuickActions === 'function') {
                initQuickActions();
            }
            if (typeof checkAdvisorAccess === 'function') {
                checkAdvisorAccess();
            }
        }, 0);
    });
    
    // Écouter l'événement authFullyInitialized pour charger le dashboard
    // Cet événement est dispatché par auth.js quand user + userData sont COMPLÈTEMENT prêts
    window.addEventListener('authFullyInitialized', function(event) {
        const { user, userData } = event.detail;
        console.log('%c[DASHBOARD] authFullyInitialized reçu, user:', 'color: #2196F3; font-weight: bold;', user ? user.email : 'null');
        
        if (user) {
            // Charger le dashboard
            loadDashboard();
        }
    });
    
    // Écouter aussi authStateChanged pour compatibilité
    // Note: initQuickActions et checkAdvisorAccess seront appelés automatiquement
    // via l'événement tokenManagerReady, pas besoin de les appeler ici
    window.addEventListener('authStateChanged', function(event) {
        const { user, userData } = event.detail;
        // On ne fait rien ici car tout est géré via authFullyInitialized et tokenManagerReady
    });
});

// Sauvegarder une nouvelle action
async function saveNewAction(userId) {
    const db = firebase.firestore();
    
    const action = {
        title: document.getElementById('actionTitle').value,
        description: document.getElementById('actionDescription').value,
        priority: document.getElementById('actionPriority').value,
        impact: parseFloat(document.getElementById('actionImpact').value) || 0,
        deadline: document.getElementById('actionDeadline').value,
        status: 'pending',
        createdAt: new Date().toISOString(),
        type: 'user'
    };
    
    await db.collection('users').doc(userId).collection('actions').add(action);
    
    document.getElementById('addActionModal').classList.remove('visible');
    document.getElementById('actionForm').reset();
    
    // Recharger les actions
    await loadUserActions(userId);
    updateActionsTable();
    updateProjections();
    updateFirstValue();
    updateAlerts();
    
    showSuccess('Action ajoutée avec succès');
}

// =============================================================================
// ACTIONS RAPIDES
// =============================================================================

// Services disponibles pour les actions rapides
// Coûts alignés avec functions/index.js et analysis-form.html
const quickServices = {
    // PLAN FREE - PAS DE CADENAS
    swot: { id: 'swot', name: 'Analyse SWOT', icon: 'fa-swimming-pool', tokens: 50, requiredPlan: 'free' },
    porter: { id: 'porter', name: 'Porter 5 Forces', icon: 'fa-project-diagram', tokens: 60, requiredPlan: 'free' },
    pestel: { id: 'pestel', name: 'Analyse PESTEL', icon: 'fa-globe-americas', tokens: 55, requiredPlan: 'free' },
    reports: { id: 'reports', name: 'Rapports Détaillés', icon: 'fa-file-alt', tokens: 100, requiredPlan: 'free' },
    ideal_sector: { id: 'ideal_sector', name: 'Secteur idéal', icon: 'fa-globe', tokens: 40, requiredPlan: 'free' },
    maturity_score: { id: 'maturity_score', name: 'Score de maturité', icon: 'fa-chart-line', tokens: 25, requiredPlan: 'free' },
    // BLOQUÉS - AVEC CADENAS
    competitive: { id: 'competitive', name: 'Analyse Concurrentielle', icon: 'fa-users', tokens: 45, requiredPlan: 'advisor' },
    benchmark: { id: 'benchmark', name: 'Benchmarking', icon: 'fa-chart-bar', tokens: 40, requiredPlan: 'advisor' },
    modeling: { id: 'modeling', name: 'Modélisation', icon: 'fa-cubes', tokens: 70, requiredPlan: 'advisor' },
    due_diligence: { id: 'due_diligence', name: 'Due Diligence', icon: 'fa-check-square', tokens: 80, requiredPlan: 'advisor' },
    valuation: { id: 'valuation', name: 'Valorisation', icon: 'fa-euro-sign', tokens: 100, requiredPlan: 'advisor' },
    synergy: { id: 'synergy', name: 'Analyse des Synergies', icon: 'fa-link', tokens: 60, requiredPlan: 'advisor' },
    integration_matrix: { id: 'integration_matrix', name: 'Matrice intégration', icon: 'fa-th', tokens: 60, requiredPlan: 'advisor' },
    valuation_simulator: { id: 'valuation_simulator', name: 'Simulateur valorisation', icon: 'fa-euro-sign', tokens: 100, requiredPlan: 'advisor' }
};

// Initialiser les actions rapides
function initQuickActions() {
    const container = document.querySelector('.quick-actions');
    if (!container) {
        console.warn('[DASHBOARD] Conteneur .quick-actions non trouvé');
        return;
    }
    
    // CORRECTION: Attendre que TokenManager soit initialisé
    if (typeof TokenManager === 'undefined' || !TokenManager.tokenState) {
        console.warn('[DASHBOARD] TokenManager non initialisé, attente de l\'événement tokenManagerReady');
        // Écouter l'événement au lieu de faire une boucle
        window.addEventListener('tokenManagerReady', () => {
            initQuickActions();
        }, { once: true });
        return;
    }
    
    console.log('[DASHBOARD] initQuickActions appelée, plan:', TokenManager.tokenState.plan);
    
    // Vider le conteneur avant d'ajouter les boutons (évite les doublons)
    container.innerHTML = '';
    
    // Obtenir le plan de l'utilisateur
    const userPlan = TokenManager.tokenState.plan;
    const hasActiveAccess = TokenManager.isAIAllowed();
    
    // Générer les boutons
    const servicesOrder = ['swot', 'porter', 'pestel', 'competitive', 'reports', 'benchmark', 'modeling', 'due_diligence', 'valuation', 'synergy', 'ideal_sector', 'maturity_score', 'integration_matrix', 'valuation_simulator'];
    
    servicesOrder.forEach(serviceId => {
        const service = quickServices[serviceId];
        if (service) {
            const btn = document.createElement('button');
            
            // Vérifier si le service est accessible
            const isAccessible = hasActiveAccess && (!service.requiredPlan || service.requiredPlan === 'free' || (service.requiredPlan === 'advisor' && (userPlan === 'advisor' || userPlan === 'api_monthly')));
            
            btn.className = 'quick-action-btn' + (isAccessible ? '' : ' locked');
            
            if (!isAccessible) {
                // Service bloqué : désactiver le clic et ajouter message
                btn.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    showPlanUpgradeMessage(service);
                };
                btn.setAttribute('title', 'Inclus avec DPAI Premium');
            } else {
                // Service accessible
                btn.onclick = () => startQuickAnalysis(serviceId);
            }
            
            // Ajouter l'icône de cadenas si verrouillé
            const lockIcon = isAccessible ? '' : '<div class="quick-action-lock"><i class="fas fa-lock"></i></div>';
            
            const tokensDisplay = isAccessible ? 'Inclus' : 'DPAI Premium';
            
            btn.innerHTML = `
                <div class="quick-action-icon">
                    <i class="fas ${service.icon}"></i>
                </div>
                <span>${service.name}</span>
                <span class="quick-action-tokens">${tokensDisplay}</span>
                ${lockIcon}
            `;
            
            container.appendChild(btn);
        }
    });
}

// Diriger vers l'offre qui débloque les services premium
function showPlanUpgradeMessage(service) {
    window.location.href = '/pricing.html#premium';
}

// Démarrer une analyse rapide
function startQuickAnalysis(type) {
    // Rediriger vers la page de collecte d'infos pour cette analyse
    // Le type sera utilisé pour afficher le bon formulaire
    window.location.href = `analysis-form.html?type=${type}`;
}

// =============================================================================
// FONCTION POUR LE BOUTON CONSEILLER IA
// =============================================================================

// =============================================================================
// FONCTION POUR LE BOUTON CONSEILLER IA
// =============================================================================

// Fonction pour vérifier et appliquer l'accès au Conseiller IA
function checkAdvisorAccess() {
    const advisorLockOverlay = document.getElementById('advisorLockOverlay');
    const advisorBtn = document.getElementById('advisorBtn');
    
    if (!advisorLockOverlay || !advisorBtn) return;
    
    let shouldUnlock = false;
    
    // Vérifier TokenManager (seule source fiable)
    if (typeof TokenManager !== 'undefined' && TokenManager.tokenState) {
        const plan = TokenManager.tokenState.plan;
        shouldUnlock = plan === 'advisor';
    }
    
    // CORRECTION: Si TokenManager n'est pas initialisé, écouter l'événement au lieu de boucler
    if (!shouldUnlock && (typeof TokenManager === 'undefined' || !TokenManager.tokenState)) {
        console.warn('[DASHBOARD] TokenManager non prêt pour checkAdvisorAccess, attente de l\'événement tokenManagerReady');
        window.addEventListener('tokenManagerReady', () => {
            checkAdvisorAccess();
        }, { once: true });
        return;
    }
    
    // Appliquer le verrouillage/déverrouillage
    if (shouldUnlock) {
        advisorLockOverlay.style.display = 'none';
        advisorBtn.style.pointerEvents = 'auto';
        advisorBtn.style.opacity = '1';
        // S'assurer que le lien pointe vers la bonne page
        if (advisorBtn.href !== 'conseiller-dpai.html' && advisorBtn.href !== window.location.origin + '/conseiller-dpai.html') {
            advisorBtn.href = 'conseiller-dpai.html';
        }
    } else {
        advisorLockOverlay.style.display = 'flex';
        advisorBtn.style.pointerEvents = 'none';
        advisorBtn.style.opacity = '0.7';
    }
}

// =============================================================================
// MISE À JOUR UI CONNEXION
// =============================================================================

function updateAuthUI() {
    const userMenu = document.getElementById('userMenu');
    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');
    const userNameSpan = document.getElementById('userName');

    const user = firebase.auth().currentUser;

    if (user) {
        // Utilisateur connecté
        if (userMenu) userMenu.style.display = 'block';
        if (loginBtn) loginBtn.style.display = 'none';
        if (registerBtn) registerBtn.style.display = 'none';
        if (userNameSpan) userNameSpan.textContent = user.displayName || user.email || 'Compte';
    } else {
        // Utilisateur déconnecté
        if (userMenu) userMenu.style.display = 'none';
        if (loginBtn) loginBtn.style.display = 'inline-block';
        if (registerBtn) registerBtn.style.display = 'inline-block';
    }
}

// Écouter les changements d'authentification pour mettre à jour l'UI
if (typeof window !== 'undefined') {
    window.addEventListener('authStateChanged', updateAuthUI);
}

// =============================================================================
// EXPORT POUR L'INTÉGRATION
// =============================================================================

window.loadDashboard = loadDashboard;
window.saveCompanyInfo = saveCompanyInfo;
window.changeActionStatus = changeActionStatus;
window.initQuickActions = initQuickActions;
window.startQuickAnalysis = startQuickAnalysis;
window.viewAnalysisDetails = viewAnalysisDetails;
window.checkAdvisorAccess = checkAdvisorAccess;
window.updateAuthUI = updateAuthUI;
