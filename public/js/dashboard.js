// =============================================================================
// DASHBOARD.JS - Tableau de bord stratégique DPAI
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

// Actions recommandées
let userActions = [];

// Historique des analyses
let analysisHistory = [];

// Alertes
let userAlerts = [];

// =============================================================================
// FONCTIONS DE CHARGEMENT
// =============================================================================

// Charger toutes les données du dashboard
async function loadDashboard() {
    const user = firebase.auth().currentUser;
    if (!user) return;

    try {
        // Charger les données de l'utilisateur
        await loadUserData(user.uid);
        
        // Charger l'historique des analyses
        await loadAnalysisHistory(user.uid);
        
        // Charger les actions
        await loadUserActions(user.uid);
        
        // Mettre à jour l'interface
        updateDashboardUI();
        
        // Vérifier l'expiration
        checkExpiration();
        
    } catch (error) {
        console.error('Erreur chargement dashboard:', error);
        showError('Impossible de charger les données du tableau de bord');
    }
}

// Charger les données utilisateur et entreprise
async function loadUserData(userId) {
    const db = firebase.firestore();
    
    // Charger l'utilisateur
    const userDoc = await db.collection('users').doc(userId).get();
    if (userDoc.exists) {
        const userData = userDoc.data();
        
        // Mettre à jour l'UI utilisateur
        const userName = userData.displayName || userData.email || 'Utilisateur';
        const welcomeEl = document.getElementById('welcomeUserName');
        const dashboardEl = document.getElementById('dashboardUserName');
        if (welcomeEl) welcomeEl.textContent = userName;
        if (dashboardEl) dashboardEl.textContent = userName;
        
        // Charger les données de l'entreprise
        if (userData.companyInfo) {
            companyData = { ...companyData, ...userData.companyInfo };
        }
        
        // Charger les tokens
        if (userData.tokenState) {
            updateTokenDisplay(userData.tokenState);
        }
    }
    
    // Charger les données de l'entreprise (si collection séparée)
    const companyDoc = await db.collection('companies').doc(userId).get();
    if (companyDoc.exists) {
        companyData = { ...companyData, ...companyDoc.data() };
    }
}

// Charger l'historique des analyses
async function loadAnalysisHistory(userId) {
    const db = firebase.firestore();
    const historyRef = db.collection('users').doc(userId).collection('analysisHistory');
    const snapshot = await historyRef.orderBy('createdAt', 'desc').limit(50).get();
    
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
        <div class="analysis-item">
            <div class="analysis-icon">
                <i class="fas fa-${getAnalysisIcon(analysis.type)}"></i>
            </div>
            <div class="analysis-info">
                <h4>${getAnalysisName(analysis.type)}</h4>
                <p class="analysis-date">${formatDate(analysis.createdAt)}</p>
            </div>
            <div class="analysis-tokens">
                ${analysis.tokensUsed || 0} tokens
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
    
    userActions = defaultActions;
    
    // Sauvegarder dans Firestore
    const db = firebase.firestore();
    const batch = db.batch();
    defaultActions.forEach(action => {
        const actionRef = db.collection('users').doc(userId).collection('actions').doc();
        batch.set(actionRef, action);
    });
    batch.commit().catch(err => {
        console.error('Erreur sauvegarde actions par défaut:', err);
    });
}

// =============================================================================
// MISE À JOUR DE L'INTERFACE
// =============================================================================

// Mettre à jour l'affichage des tokens
function updateTokenDisplay(tokenState) {
    if (!tokenState) return;
    
    const available = tokenState.availableTokens !== -1 ? tokenState.availableTokens : 'Illimité';
    const total = tokenState.totalTokens !== -1 ? tokenState.totalTokens : 'Illimité';
    const used = tokenState.usedTokens || 0;
    
    const availableEl = document.getElementById('availableTokens');
    const totalEl = document.getElementById('totalTokens');
    const usedEl = document.getElementById('usedTokens');
    const progressEl = document.getElementById('tokenProgress');
    
    if (availableEl) availableEl.textContent = available;
    if (totalEl) totalEl.textContent = total;
    if (usedEl) usedEl.textContent = used;
    
    // Mettre à jour la barre de progression
    if (tokenState.availableTokens !== -1 && tokenState.totalTokens > 0 && progressEl) {
        const percentage = ((tokenState.totalTokens - tokenState.availableTokens) / tokenState.totalTokens) * 100;
        progressEl.style.width = `${percentage}%`;
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
    const employeesChange = 0; // À calculer depuis l'historique
    document.getElementById('kpiEmployees').textContent = employees;
    updateTrendElement('kpiEmployeesTrend', employeesChange, 'Employés');
    
    // EBITDA
    const ebitda = companyData.ebitda || 0;
    const ebitdaChange = 0; // À calculer
    document.getElementById('kpiEbitda').textContent = formatCurrency(ebitda);
    updateTrendElement('kpiEbitdaTrend', ebitdaChange, 'EBITDA');
    
    // Marge
    const margin = companyData.margin || 0;
    const marginChange = 0; // À calculer
    document.getElementById('kpiMargin').textContent = margin + '%';
    updateTrendElement('kpiMarginTrend', marginChange, 'Marge');
    
    // Croissance CA
    document.getElementById('kpiGrowth').textContent = (revenueChange > 0 ? '+' + revenueChange : revenueChange) + '%';
}

// Calculer le changement du CA (simulé pour l'instant)
function calculateRevenueChange() {
    // Si on a de l'historique, calculer le vrai changement
    if (companyData.history && companyData.history.length >= 2) {
        const latest = companyData.history[0].revenue || companyData.revenue || 0;
        const previous = companyData.history[1].revenue || companyData.revenue || 0;
        if (previous > 0) {
            return Math.round(((latest - previous) / previous) * 100);
        }
    }
    return 0; // Par défaut
}

// Mettre à jour un élément de tendance
function updateTrendElement(elementId, value, label) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
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
    const completedCount = userActions.filter(a => a.status === 'completed').length;
    const progress = userActions.length > 0 ? Math.round((completedCount / userActions.length) * 100) : 0;
    
    document.getElementById('actionsCompletedCount').textContent = completedCount;
    document.getElementById('actionsTotalCount').textContent = userActions.length;
    document.getElementById('actionsProgress').innerHTML = `
        <i class="fas fa-check-circle"></i>
        <span>${progress}%</span>
    `;
    
    userActions.forEach(action => {
        const priorityColor = getPriorityColor(action.priority);
        const statusClass = action.status || 'pending';
        const statusText = getStatusText(action.status);
        const impact = formatCurrency(action.impact || 0);
        const deadline = action.deadline ? formatDate(action.deadline) : 'Non définie';
        
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
    // Calculer les projections basées sur les actions en cours
    const revenue = companyData.revenue || 0;
    const ebitda = companyData.ebitda || 0;
    const margin = companyData.margin || 0;
    
    // Calculer l'impact potentiel des actions en cours
    const inProgressActions = userActions.filter(a => a.status === 'in-progress');
    const pendingActions = userActions.filter(a => a.status === 'pending');
    const potentialImpact = [...inProgressActions, ...pendingActions]
        .reduce((sum, action) => sum + (action.impact || 0), 0);
    
    // Projection CA (simulée : +10% si actions en cours)
    const projectedRevenue = inProgressActions.length > 0 ? revenue + (revenue * 0.10) : revenue;
    const revenueChange = inProgressActions.length > 0 ? Math.round(((projectedRevenue - revenue) / revenue) * 100) : 0;
    const revenueBarWidth = Math.min((revenueChange + 100), 100);
    
    document.getElementById('projectedRevenue').textContent = formatCurrency(projectedRevenue);
    document.getElementById('projectedRevenueChange').innerHTML = `
        <i class="fas fa-arrow-up"></i> +${revenueChange}%
    `;
    document.getElementById('projectedRevenueBar').style.width = `${revenueBarWidth}%`;
    
    // Projection EBITDA
    const projectedEbitda = inProgressActions.length > 0 ? ebitda + (ebitda * 0.15) : ebitda;
    const ebitdaChange = inProgressActions.length > 0 ? Math.round(((projectedEbitda - ebitda) / (ebitda || 1)) * 100) : 0;
    const ebitdaBarWidth = Math.min((ebitdaChange + 100), 100);
    
    document.getElementById('projectedEbitda').textContent = formatCurrency(projectedEbitda);
    document.getElementById('projectedEbitdaChange').innerHTML = `
        <i class="fas fa-arrow-up"></i> +${ebitdaChange}%
    `;
    document.getElementById('projectedEbitdaBar').style.width = `${ebitdaBarWidth}%`;
    
    // Projection Marge
    const projectedMargin = inProgressActions.length > 0 ? margin + 2 : margin;
    const marginChange = inProgressActions.length > 0 ? 2 : 0;
    const marginBarWidth = Math.min(margin + marginChange, 100);
    
    document.getElementById('projectedMargin').textContent = projectedMargin + '%';
    document.getElementById('projectedMarginChange').innerHTML = `
        <i class="fas fa-arrow-up"></i> +${marginChange}%
    `;
    document.getElementById('projectedMarginBar').style.width = `${marginBarWidth}%`;
    
    // Impact total
    document.getElementById('totalImpact').textContent = formatCurrency(potentialImpact);
}

// Mettre à jour les alertes
function updateAlerts() {
    const alertsList = document.getElementById('alertsList');
    if (!alertsList) return;
    
    const pendingCount = userActions.filter(a => a.status === 'pending').length;
    document.getElementById('pendingActionsCount').textContent = pendingCount;
    
    // Les alertes sont déjà dans le HTML, on les met à jour si nécessaire
}

// Mettre à jour les graphiques (simulé pour l'instant)
function updateCharts() {
    // Les graphiques seront implémentés avec Chart.js ou similaires plus tard
    // Pour l'instant, on affiche un message
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
    
    const info = {
        name: document.getElementById('editCompanyName').value,
        sector: document.getElementById('editCompanySector').value,
        revenue: parseFloat(document.getElementById('editCompanyRevenue').value) || 0,
        employees: parseInt(document.getElementById('editCompanyEmployees').value) || 0,
        ebitda: parseFloat(document.getElementById('editCompanyEbitda').value) || 0,
        margin: parseFloat(document.getElementById('editCompanyMargin').value) || 0,
        updatedAt: new Date().toISOString()
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
            
            // Vérifier l'expiration des tokens
            if (tokenState.expiresAt) {
                const expiryDate = new Date(tokenState.expiresAt);
                const now = new Date();
                
                if (expiryDate < now) {
                    showExpirationWarning('Votre abonnement a expiré. Veuillez le renouveler pour continuer à utiliser les services.');
                }
            }
            
            // Vérifier l'expiration de l'abonnement
            if (subscription.expiresAt) {
                const expiryDate = new Date(subscription.expiresAt);
                const now = new Date();
                const daysLeft = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
                
                if (daysLeft <= 7 && daysLeft > 0) {
                    showAlert(`Votre abonnement expire dans ${daysLeft} jour(s). Pensez à le renouveler.`);
                } else if (daysLeft <= 0) {
                    showExpirationWarning('Votre abonnement a expiré. Veuillez le renouveler.');
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
        });
    });
    
    // Initialiser les actions rapides (sera aussi appelée via authStateChanged)
    initQuickActions();
    
    // Ré-initialiser quand l'utilisateur se connecte (au cas où dashboardContent était masqué)
    window.addEventListener('authStateChanged', function(event) {
        const { user, userData } = event.detail;
        if (user && userData) {
            setTimeout(initQuickActions, 100); // Petit délai pour laisser le temps au DOM de s'afficher
        }
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
    competitive: { id: 'competitive', name: 'Analyse Concurrentielle', icon: 'fa-users', tokens: 45, requiredPlan: 'blocked' },
    benchmark: { id: 'benchmark', name: 'Benchmarking', icon: 'fa-chart-bar', tokens: 40, requiredPlan: 'blocked' },
    modeling: { id: 'modeling', name: 'Modélisation', icon: 'fa-cubes', tokens: 70, requiredPlan: 'blocked' },
    due_diligence: { id: 'due_diligence', name: 'Due Diligence', icon: 'fa-check-square', tokens: 80, requiredPlan: 'blocked' },
    valuation: { id: 'valuation', name: 'Valorisation', icon: 'fa-euro-sign', tokens: 100, requiredPlan: 'blocked' },
    synergy: { id: 'synergy', name: 'Analyse des Synergies', icon: 'fa-link', tokens: 60, requiredPlan: 'blocked' },
    integration_matrix: { id: 'integration_matrix', name: 'Matrice intégration', icon: 'fa-th', tokens: 60, requiredPlan: 'blocked' },
    valuation_simulator: { id: 'valuation_simulator', name: 'Simulateur valorisation', icon: 'fa-euro-sign', tokens: 100, requiredPlan: 'blocked' }
};

// Initialiser les actions rapides
function initQuickActions() {
    const container = document.querySelector('.quick-actions');
    if (!container) {
        console.warn('[DASHBOARD] Conteneur .quick-actions non trouvé');
        return;
    }
    
    // Vider le conteneur avant d'ajouter les boutons (évite les doublons)
    container.innerHTML = '';
    
    // Obtenir le plan de l'utilisateur
    const userPlan = (typeof authService !== 'undefined' && authService.userData) ? authService.userData.plan : 'free';
    
    // Générer les boutons
    const servicesOrder = ['swot', 'porter', 'pestel', 'competitive', 'reports', 'benchmark', 'modeling', 'due_diligence', 'valuation', 'synergy', 'ideal_sector', 'maturity_score', 'integration_matrix', 'valuation_simulator'];
    
    servicesOrder.forEach(serviceId => {
        const service = quickServices[serviceId];
        if (service) {
            const btn = document.createElement('button');
            
            // Vérifier si le service est accessible
            const isAccessible = !service.requiredPlan || service.requiredPlan === 'free';
            
            btn.className = 'quick-action-btn' + (isAccessible ? '' : ' locked');
            
            if (!isAccessible) {
                // Service bloqué : désactiver le clic et ajouter message
                btn.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    showPlanUpgradeMessage(service);
                };
                btn.setAttribute('title', 'Contactez-nous pour accéder à ce service (Phases 3 & 4)');
            } else {
                // Service accessible
                btn.onclick = () => startQuickAnalysis(serviceId);
            }
            
            // Ajouter l'icône de cadenas si verrouillé
            const lockIcon = isAccessible ? '' : '<div class="quick-action-lock"><i class="fas fa-lock"></i></div>';
            
            // Formater les tokens pour l'affichage
            let tokensDisplay = service.tokens + ' tokens';
            if (service.requiredPlan === 'blocked') {
                tokensDisplay = 'Sur devis';
            }
            
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

// Afficher un message pour inviter à contacter pour les services bloqués
function showPlanUpgradeMessage(service) {
    const message = `Ce service fait partie des Phases 3 & 4. Contactez duprey.conseil@gmail.com pour un devis personnalisé.`;
    alert(message);
}

// Démarrer une analyse rapide
function startQuickAnalysis(type) {
    // Rediriger vers la page de collecte d'infos pour cette analyse
    // Le type sera utilisé pour afficher le bon formulaire
    window.location.href = `analysis-form.html?type=${type}`;
}

// =============================================================================
// EXPORT POUR L'INTÉGRATION
// =============================================================================

window.loadDashboard = loadDashboard;
window.saveCompanyInfo = saveCompanyInfo;
window.changeActionStatus = changeActionStatus;
window.initQuickActions = initQuickActions;
window.startQuickAnalysis = startQuickAnalysis;
