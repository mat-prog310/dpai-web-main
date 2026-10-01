// =============================================================================
// AI-CLIENT.JS - Client JavaScript pour l'IA DPAI
// Gère les appels aux endpoints Firebase Functions pour l'IA
// NOUVEAU : Conseiller IA utilise le MODÈLE LOCAL (pas Mistral)
// Mistral reste utilisé UNIQUEMENT pour les analyses (SWOT, Porter, etc.)
// =============================================================================

// Configuration de l'URL de base (à adapter en production)
const AI_API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5001/dpai-web-main/us-central1'
    : 'https://us-central1-dpai-web-main.cloudfunctions.net';

// URL complète pour les endpoints
const AI_ENDPOINTS = {
    // Les analyses utilisent MISTRAL (API externe)
    analyze: `${AI_API_BASE_URL}/analyzeWithAI`,
    
    // Le Conseiller IA utilise l'API MISTRAL avec prompts DPAI
    chat: `${AI_API_BASE_URL}/advisorChat`,
    
    conversations: `${AI_API_BASE_URL}/listAdvisorConversations`,
    deleteConversation: `${AI_API_BASE_URL}/deleteAdvisorConversation`,
    setPlan: `${AI_API_BASE_URL}/setUserPlan`
};

// =============================================================================
// FONCTIONS D'APPEL À L'API IA
// =============================================================================

/**
 * Appelle l'API pour une analyse IA (SWOT, Porter, etc.) - UTILISE MISTRAL
 * @param {string} type - Type d'analyse (swot, porter, pestel, etc.)
 * @param {Object} data - Données pour l'analyse
 * @returns {Promise<Object>} Résultat de l'analyse
 */
async function callAIAnalysis(type, data) {
    try {
        if (!TokenManager || !TokenManager.userData) {
            throw new Error('Utilisateur non connecté');
        }

        const response = await fetch(AI_ENDPOINTS.analyze, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userId: TokenManager.userData.id,
                type: type,
                data: data
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Erreur serveur');
        }

        return await response.json();
    } catch (error) {
        console.error('❌ Erreur appel IA (analyses):', error);
        throw error;
    }
}

/**
 * Appelle l'API pour une conversation avec le Conseiller IA DPAI
 * UTILISE TON MODÈLE LOCAL (pas Mistral !)
 * @param {string} message - Message de l'utilisateur
 * @param {string|null} conversationId - ID de la conversation (null pour nouvelle)
 * @returns {Promise<Object>} Réponse du Conseiller IA (ton modèle entraîné)
 */
async function callAdvisorChat(message, conversationId = null) {
    try {
        if (!TokenManager || !TokenManager.userData) {
            throw new Error('Utilisateur non connecté');
        }

        const response = await fetch(AI_ENDPOINTS.chat, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userId: TokenManager.userData.id,
                message: message,
                conversationId: conversationId
            })
        });

        if (!response.ok) {
            const error = await response.json();
            if (error.error && error.error.includes('Abonnement Conseiller IA')) {
                // Rediriger vers la page de pricing
                window.location.href = '/pricing.html#advisor';
            }
            throw new Error(error.error || 'Erreur serveur local');
        }

        return await response.json();
    } catch (error) {
        console.error('❌ Erreur Conseiller IA:', error);
        throw error;
    }
}

/**
 * Récupère les conversations d'un utilisateur
 * @returns {Promise<Array>} Liste des conversations
 */
async function getAdvisorConversations() {
    try {
        if (!TokenManager || !TokenManager.userData) {
            throw new Error('Utilisateur non connecté');
        }

        const response = await fetch(`${AI_ENDPOINTS.conversations}?userId=${TokenManager.userData.id}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Erreur serveur');
        }

        const data = await response.json();
        return data.conversations || [];
    } catch (error) {
        console.error('❌ Erreur récupération conversations:', error);
        throw error;
    }
}

/**
 * Supprime une conversation
 * @param {string} conversationId - ID de la conversation à supprimer
 * @returns {Promise<Object>}
 */
async function deleteAdvisorConversation(conversationId) {
    try {
        if (!TokenManager || !TokenManager.userData) {
            throw new Error('Utilisateur non connecté');
        }

        const response = await fetch(`${AI_ENDPOINTS.deleteConversation}?userId=${TokenManager.userData.id}&conversationId=${conversationId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Erreur serveur');
        }

        return await response.json();
    } catch (error) {
        console.error('❌ Erreur suppression conversation:', error);
        throw error;
    }
}

/**
 * Change le plan d'un utilisateur (pour les tests/admin)
 * @param {string} plan - Nouveau plan (free, api_monthly, advisor)
 * @returns {Promise<Object>}
 */
async function setUserPlan(plan) {
    try {
        if (!TokenManager || !TokenManager.userData) {
            throw new Error('Utilisateur non connecté');
        }

        const response = await fetch(AI_ENDPOINTS.setPlan, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userId: TokenManager.userData.id,
                plan: plan
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Erreur serveur');
        }

        return await response.json();
    } catch (error) {
        console.error('❌ Erreur changement de plan:', error);
        throw error;
    }
}

// =============================================================================
// FONCTIONS POUR LES ANALYSES CLASSIQUES AVEC IA (UTILISENT MISTRAL)
// =============================================================================

/**
 * Exécute une analyse SWOT avec IA (UTILISE MISTRAL)
 * @param {Object} companyData - Données de l'entreprise
 * @returns {Promise<Object>}
 */
async function analyzeWithSWOT(companyData) {
    return callAIAnalysis('swot', companyData);
}

/**
 * Exécute une analyse Porter 5 Forces avec IA (UTILISE MISTRAL)
 * @param {Object} companyData - Données de l'entreprise
 * @returns {Promise<Object>}
 */
async function analyzeWithPorter(companyData) {
    return callAIAnalysis('porter', companyData);
}

/**
 * Exécute une analyse PESTEL avec IA (UTILISE MISTRAL)
 * @param {Object} companyData - Données de l'entreprise
 * @returns {Promise<Object>}
 */
async function analyzeWithPestel(companyData) {
    return callAIAnalysis('pestel', companyData);
}

/**
 * Exécute une valorisation avec IA (UTILISE MISTRAL)
 * @param {Object} companyData - Données de l'entreprise
 * @returns {Promise<Object>}
 */
async function analyzeValuation(companyData) {
    return callAIAnalysis('valuation', companyData);
}

// =============================================================================
// GESTION DES ERREURS ET NOTIFICATIONS
// =============================================================================

/**
 * Affiche une notification d'erreur
 * @param {string} message - Message d'erreur
 */
function showAIError(message) {
    const errorElement = document.getElementById('aiError');
    if (errorElement) {
        errorElement.getElementsByTagName('p')[0].textContent = message;
        errorElement.style.display = 'block';
        setTimeout(() => {
            errorElement.style.display = 'none';
        }, 5000);
    } else {
        alert(message);
    }
}

/**
 * Affiche un indicateur de chargement
 * @param {boolean} show - Afficher ou masquer
 */
function showAILoading(show = true) {
    const loadingElement = document.getElementById('aiLoading');
    if (loadingElement) {
        loadingElement.style.display = show ? 'block' : 'none';
    }
}

// =============================================================================
// UTILITAIRES POUR L'AFFICHAGE DES RÉSULTATS
// =============================================================================

/**
 * Formate une réponse IA pour l'affichage (conversion markdown basique)
 * @param {string} text - Texte à formater
 * @returns {string} Texte formaté
 */
function formatAIResponse(text) {
    if (!text) return '';
    
    // Remplacer **texte** par <strong>texte</strong>
    let formatted = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Remplacer ## titre par <h3>titre</h3>
    formatted = formatted.replace(/^##\s+(.*?)$/gm, '<h3>$1</h3>');
    formatted = formatted.replace(/^###\s+(.*?)$/gm, '<h4>$1</h4>');
    
    // Remplacer - texte par <li>texte</li>
    formatted = formatted.replace(/^-\s+(.*?)$/gm, '<li>$1</li>');
    formatted = formatted.replace(/^\d+\.\s+(.*?)$/gm, '<li>$1</li>');
    
    // Ajouter des <ul> autour des listes
    formatted = formatted.replace(/(<li>.*<\/li>)+/g, (match) => `<ul>${match}</ul>`);
    
    // Remplacer les sauts de ligne doubles par des paragraphs
    formatted = formatted.replace(/\n\n/g, '</p><p>');
    formatted = formatted.replace(/\n/g, '<br>');
    
    // S'assurer qu'on commence par un <p>
    if (!formatted.startsWith('<') || formatted.startsWith('<p>') === false) {
        formatted = `<p>${formatted}</p>`;
    }
    
    return formatted;
}

/**
 * Affiche le résultat d'une analyse IA
 * @param {string} result - Résultat de l'analyse
 * @param {string} containerId - ID du conteneur où afficher
 */
function displayAIResult(result, containerId = 'aiResult') {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = formatAIResponse(result);
    container.scrollIntoView({ behavior: 'smooth' });
}

/**
 * Affiche un message dans le chat
 * @param {string} message - Message à afficher
 * @param {string} sender - Expéditeur ('user' ou 'assistant')
 * @param {string} containerId - ID du conteneur de chat
 */
function displayChatMessage(message, sender, containerId = 'chatMessages') {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;
    
    const avatar = sender === 'assistant'
        ? '<div class="message-avatar advisor"><i class="fas fa-robot"></i></div>'
        : '<div class="message-avatar user"><i class="fas fa-user"></i></div>';
    
    // Ajouter un badge pour indiquer le modèle utilisé
    const modelBadge = sender === 'assistant' 
        ? '<span class="model-badge">Modèle DPAI</span>' 
        : '';
    
    messageDiv.innerHTML = `
        ${avatar}
        <div class="message-content">
            ${formatAIResponse(message)}
            ${modelBadge}
            <span class="message-time">${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
    `;
    
    container.appendChild(messageDiv);
    container.scrollTop = container.scrollHeight;
}

// =============================================================================
// EXPORTS POUR LES AUTRES SCRIPTS
// =============================================================================

// Exporter toutes les fonctions
window.AIClient = {
    // API Calls
    callAIAnalysis,
    callAdvisorChat,
    getAdvisorConversations,
    deleteAdvisorConversation,
    setUserPlan,
    
    // Analyses spécifiques (utilisent Mistral)
    analyzeWithSWOT,
    analyzeWithPorter,
    analyzeWithPestel,
    analyzeValuation,
    
    // Utilitaires
    showAIError,
    showAILoading,
    formatAIResponse,
    displayAIResult,
    displayChatMessage
};

// Exporter aussi les fonctions individuellement pour la compatibilité
window.callAIAnalysis = callAIAnalysis;
window.callAdvisorChat = callAdvisorChat;
window.getAdvisorConversations = getAdvisorConversations;
window.deleteAdvisorConversation = deleteAdvisorConversation;
window.setUserPlan = setUserPlan;

console.log('[AI-Client] Initialisé - Conseiller IA et analyses utilisent API Mistral + Expertise DPAI');
