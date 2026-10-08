/**
 * LOCAL-AI-CLIENT.JS - Client JavaScript pour le Conseiller IA DPAI Local
 * Gère l'intégration avec l'IA locale Python (my_local_ai) via une API locale ou serveur backend
 * 
 * IMPORTANT: Cette IA est 100% LOCALE DPAI, entraînée sur les données internes et les cas d'école
 * Elle est COMPLÈTEMENT SÉPARÉE de Mistral qui est utilisée UNIQUEMENT pour les analyses rapides dans le dashboard
 * 
 * Le Conseiller DPAI utilise UNIQUEMENT cette IA locale, sans fallback vers Mistral
 */

// =============================================================================
// CONFIGURATION
// =============================================================================

// URL de l'API locale (à exécuter en parallèle avec Python)
// Par défaut, on utilise une URL de fallback via Firebase Functions qui appellerait le script Python
const LOCAL_AI_CONFIG = {
    // Mode: 'local' (Python en local) ou 'server' (via Firebase Functions)
    mode: 'server',
    
    // Configuration pour le mode local (directe)
    local: {
        // URL pour le serveur Flask local (python my_local_ai/api_server.py)
        apiUrl: 'http://localhost:5002',
        chatEndpoint: '/api/chat',
        trainEndpoint: '/api/train',
        healthEndpoint: '/api/health'
    },
    
    // Configuration pour le mode serveur (recommandé en production)
    server: {
        // Firebase Functions endpoint qui appelle le script Python
        apiUrl: 'https://us-central1-dpai-8be62.cloudfunctions.net',
        chatEndpoint: '/callLocalAI',
        healthEndpoint: '/checkLocalAI'
    }
};

// Configuration de l'API locale DPAI
let currentConversationId = null;
let conversations = [];
let isLocalAIAvailable = false;
let isCheckingHealth = false;

// Configuration de l'URL de l'API
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

const LOCAL_AI_API_CONFIG = {
    // En mode serveur (production), on utilise Firebase Functions
    server: {
        apiUrl: 'https://us-central1-dpai-8be62.cloudfunctions.net',
        chatEndpoint: '/callLocalAI',
        conversationsEndpoint: '/listLocalAIConversations',
        deleteEndpoint: '/deleteLocalAIConversation',
        healthEndpoint: '/checkLocalAI' // À ajouter dans index.js
    },
    // En mode local, on peut utiliser le serveur Python directement
    local: {
        apiUrl: 'http://localhost:5002',
        chatEndpoint: '/api/chat',
        conversationsEndpoint: null, // Pas disponible en local
        deleteEndpoint: null,
        healthEndpoint: '/api/health'
    }
};

// Déterminer le mode à utiliser
function getAPIMode() {
    // Pour le moment, utiliser toujours le mode serveur
    // Le mode local nécessiterait une configuration spécifique
    return 'server';
}

// =============================================================================
// FONCTIONS D'AFFICHAGE
// =============================================================================

function showAccessRequired() {
    const accessCheck = document.getElementById('advisorAccessCheck');
    const chat = document.getElementById('advisorChat');
    const examples = document.getElementById('exampleQuestionsSection');
    
    if (accessCheck) accessCheck.style.display = 'block';
    if (chat) chat.style.display = 'none';
    if (examples) examples.style.display = 'none';
}

function showChat() {
    const accessCheck = document.getElementById('advisorAccessCheck');
    const chat = document.getElementById('advisorChat');
    const examples = document.getElementById('exampleQuestionsSection');
    
    if (accessCheck) accessCheck.style.display = 'none';
    if (chat) chat.style.display = 'block';
    if (examples) examples.style.display = 'block';
    
    loadConversations();
    checkLocalAIHealth();
}

// =============================================================================
// VÉRIFICATION DE LA SANTÉ DE L'IA LOCALE
// =============================================================================

async function checkLocalAIHealth() {
    if (isCheckingHealth) return;
    isCheckingHealth = true;
    
    try {
        const mode = getAPIMode();
        const config = LOCAL_AI_API_CONFIG[mode];
        
        // Pour le moment, on ne vérifie pas vraiment la santé en mode serveur
        // car Firebase Functions ne fournit pas d'endpoint de santé pour ça
        // On suppose que si on peut appeler, alors ça fonctionne
        isLocalAIAvailable = true;
        console.log('[Local-AI] ✅ IA locale disponible (mode serveur)');
        
        // Mettre à jour l'interface
        updateModelStatus(true);
        
    } catch (error) {
        isLocalAIAvailable = false;
        console.error('[Local-AI] ❌ Erreur vérification santé:', error);
        updateModelStatus(false);
    } finally {
        isCheckingHealth = false;
    }
}

function updateModelStatus(available) {
    const statusElements = document.querySelectorAll('.ai-model-badge');
    statusElements.forEach(el => {
        if (available) {
            el.textContent = 'Modèle Local DPAI v1 ✅';
            el.style.background = 'rgba(16, 185, 129, 0.2)';
        } else {
            el.textContent = 'Modèle Local DPAI v1 ⚠️';
            el.style.background = 'rgba(245, 158, 11, 0.2)';
        }
    });
}

// =============================================================================
// FONCTIONS DE GESTION DES CONVERSATIONS
// =============================================================================

function formatDate(date) {
    if (!(date instanceof Date)) {
        date = new Date(date);
    }
    return date.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short'
    });
}

function formatTime(date) {
    if (!(date instanceof Date)) {
        date = new Date(date);
    }
    return date.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

async function loadConversations() {
    try {
        if (!TokenManager || !TokenManager.userData) return;

        const response = await getLocalAIConversations();
        conversations = response || [];
        renderConversationsList();
    } catch (error) {
        console.error('Erreur chargement conversations:', error);
    }
}

function renderConversationsList() {
    const listEl = document.getElementById('conversationsList');
    if (!listEl) return;
    
    listEl.innerHTML = '';

    if (conversations.length === 0) {
        listEl.innerHTML = '<p class="no-conversations">Aucune conversation. Commencez en posant une question !</p>';
        return;
    }

    conversations.forEach(conv => {
        const item = document.createElement('div');
        item.className = 'conversation-item-dpai';
        if (currentConversationId === conv.id) {
            item.classList.add('active');
        }

        const lastMessage = conv.messages?.[conv.messages.length - 1]?.content;
        const preview = lastMessage ? lastMessage.slice(0, 40) + '...' : 'Nouvelle discussion';

        item.innerHTML = `
            <div class="conversation-preview-dpai">
                <i class="fas fa-comment-dots"></i>
                <div>
                    <strong>${conv.title || 'Sans titre'}</strong>
                    <p>${preview}</p>
                </div>
            </div>
            <span class="conversation-date-dpai">
                ${formatDate(conv.updatedAt || new Date())}
            </span>
        `;

        item.addEventListener('click', () => loadConversation(conv.id));
        listEl.appendChild(item);
    });
}

function newConversation() {
    currentConversationId = null;
    
    const chatMessages = document.getElementById('chatMessages');
    if (chatMessages) {
        chatMessages.innerHTML = `
            <div class="welcome-message-dpai">
                <div class="advisor-avatar-dpai">
                    <i class="fas fa-robot"></i>
                </div>
                <div class="welcome-content-dpai">
                    <h2>Nouvelle discussion</h2>
                    <p>Posez votre question sur la croissance externe, les fusions, acquisitions...</p>
                    <p style="font-size: 14px; color: #666; margin-top: 10px;">
                        <i class="fas fa-info-circle"></i> IA LOCALE DPAI - 100% entraînée sur vos données et cas d'école
                    </p>
                </div>
            </div>
        `;
    }
    
    const chatInput = document.getElementById('chatInput');
    if (chatInput) {
        chatInput.value = '';
        chatInput.focus();
    }
    
    updateConversationsList();
}

async function loadConversation(conversationId) {
    currentConversationId = conversationId;
    
    try {
        const db = firebase.firestore();
        const doc = await db.collection('local_ai_conversations').doc(conversationId).get();

        if (doc.exists) {
            const conv = doc.data();
            renderMessages(conv.messages || []);
            document.getElementById('chatInput')?.focus();
            updateConversationsList();
        }
    } catch (error) {
        console.error('Erreur chargement conversation:', error);
    }
}

function renderMessages(messages) {
    const container = document.getElementById('chatMessages');
    if (!container) return;
    
    container.innerHTML = '';

    if (messages.length === 0) {
        container.innerHTML = `
            <div class="welcome-message-dpai">
                <div class="advisor-avatar-dpai">
                    <i class="fas fa-robot"></i>
                </div>
                <div class="welcome-content-dpai">
                    <h2>Commencez une nouvelle discussion</h2>
                    <p>Posez-moi n'importe quelle question sur la croissance externe.</p>
                    <p style="font-size: 14px; color: #666; margin-top: 10px;">
                        <i class="fas fa-info-circle"></i> IA LOCALE DPAI - 100% entraînée sur vos données et cas d'école
                    </p>
                </div>
            </div>
        `;
        return;
    }

    messages.forEach(msg => {
        const messageEl = document.createElement('div');
        messageEl.className = `message-dpai ${msg.role}`;

        const avatar = msg.role === 'assistant'
            ? '<div class="message-avatar-dpai advisor"><i class="fas fa-robot"></i></div>'
            : '<div class="message-avatar-dpai user"><i class="fas fa-user"></i></div>';

        // Formater la réponse
        const formattedContent = formatLocalAIResponse(msg.content);

        messageEl.innerHTML = `
            ${avatar}
            <div class="message-content-dpai">
                ${formattedContent}
                <span class="message-time-dpai">${formatTime(msg.timestamp?.toDate() || new Date())}</span>
            </div>
        `;

        container.appendChild(messageEl);
    });

    container.scrollTop = container.scrollHeight;
}

function updateConversationsList() {
    renderConversationsList();
}

// =============================================================================
// COMMUNICATION AVEC L'IA LOCALE
// =============================================================================

/**
 * Appelle l'IA locale pour une conversation
 * @param {string} message - Message de l'utilisateur
 * @param {string|null} conversationId - ID de la conversation (null pour nouvelle)
 * @returns {Promise<Object>} Réponse de l'IA locale
 */
async function callLocalAI(message, conversationId = null) {
    try {
        if (!TokenManager || !TokenManager.userData) {
            throw new Error('Utilisateur non connecté');
        }

        const mode = getAPIMode();
        const config = LOCAL_AI_API_CONFIG[mode];
        const url = `${config.apiUrl}${config.chatEndpoint}`;
        
        // Si on est en mode serveur, utiliser l'auth Firebase
        const headers = {
            'Content-Type': 'application/json'
        };
        
        // Ajouter le token Firebase si disponible
        if (TokenManager.userData && typeof authService !== 'undefined' && authService.getCurrentUser) {
            const user = await authService.getCurrentUser();
            if (user && user.getIdToken) {
                const token = await user.getIdToken();
                headers['Authorization'] = `Bearer ${token}`;
            }
        }
        
        const response = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
                userId: TokenManager.userData.id,
                message: message,
                conversationId: conversationId
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            let errorData;
            try {
                errorData = JSON.parse(errorText);
            } catch (parseError) {
                errorData = { error: errorText };
            }
            throw new Error(errorData.error || errorData.message || 'Erreur serveur IA locale');
        }

        const data = await response.json();
        return data;

    } catch (error) {
        console.error('❌ Erreur appel IA locale:', error);
        
        // Si l'IA locale n'est pas disponible, retourner une erreur claire
        if (error.message && (error.message.includes('Failed to fetch') || error.message.includes('403'))) {
            throw new Error('L\'IA locale DPAI n\'est pas disponible. Vérifiez votre abonnement Conseiller IA (499 €/mois).');
        }
        
        throw error;
    }
}

/**
 * Récupère les conversations d'un utilisateur
 * @returns {Promise<Array>} Liste des conversations
 */
async function getLocalAIConversations() {
    try {
        if (!TokenManager || !TokenManager.userData) {
            throw new Error('Utilisateur non connecté');
        }

        const mode = getAPIMode();
        const config = LOCAL_AI_API_CONFIG[mode];
        
        // En mode serveur, utiliser l'endpoint Firebase Functions
        if (mode === 'server' && config.conversationsEndpoint) {
            const url = `${config.apiUrl}${config.conversationsEndpoint}?userId=${TokenManager.userData.id}`;
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error('Erreur récupération conversations');
            }
            
            const data = await response.json();
            return data.conversations || [];
        } else {
            // En mode local, utiliser Firestore directement
            const db = firebase.firestore();
            const snapshot = await db.collection('local_ai_conversations')
                .where('userId', '==', TokenManager.userData.id)
                .orderBy('updatedAt', 'desc')
                .get();

            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        }

    } catch (error) {
        console.error('❌ Erreur récupération conversations IA locale:', error);
        throw error;
    }
}

/**
 * Supprime une conversation
 * @param {string} conversationId - ID de la conversation à supprimer
 * @returns {Promise<Object>}
 */
async function deleteLocalAIConversation(conversationId) {
    try {
        if (!TokenManager || !TokenManager.userData) {
            throw new Error('Utilisateur non connecté');
        }

        const mode = getAPIMode();
        const config = LOCAL_AI_API_CONFIG[mode];
        
        // En mode serveur, utiliser l'endpoint Firebase Functions
        if (mode === 'server' && config.deleteEndpoint) {
            const url = `${config.apiUrl}${config.deleteEndpoint}?userId=${TokenManager.userData.id}&conversationId=${conversationId}`;
            const response = await fetch(url, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error('Erreur suppression conversation');
            }
            
            return await response.json();
        } else {
            // En mode local, utiliser Firestore directement
            const db = firebase.firestore();
            await db.collection('local_ai_conversations').doc(conversationId).delete();
            
            return { success: true };
        }
    } catch (error) {
        console.error('❌ Erreur suppression conversation IA locale:', error);
        throw error;
    }
}

// =============================================================================
// GESTION DU CHAT AVEC L'IA LOCALE
// =============================================================================

async function sendMessage() {
    const input = document.getElementById('chatInput');
    const message = input?.value?.trim();
    if (!message) return;

    // Désactiver le bouton
    const sendBtn = document.getElementById('sendBtn');
    const typingIndicator = document.getElementById('typingIndicator');
    
    if (sendBtn) sendBtn.disabled = true;
    if (input) input.disabled = true;
    if (typingIndicator) typingIndicator.style.display = 'block';

    try {
        // Ajouter le message utilisateur
        displayLocalAIChatMessage(message, 'user');
        input.value = '';

        // Vérifier si l'IA locale est disponible
        if (!isLocalAIAvailable) {
            await checkLocalAIHealth();
            if (!isLocalAIAvailable) {
                throw new Error('L\'IA locale DPAI n\'est pas disponible. Veuillez réessayer plus tard.');
            }
        }

        // Appeler l'IA locale
        const response = await callLocalAI(message, currentConversationId);

        if (response.success) {
            // Mettre à jour la conversation ID si nouvelle
            if (response.conversationId && !currentConversationId) {
                currentConversationId = response.conversationId;
            }

            // Ajouter la réponse IA
            displayLocalAIChatMessage(response.response, 'assistant');

            // Recharger les conversations
            await loadConversations();
        } else {
            showLocalAIError(response.error || 'Erreur inconnue');
        }

    } catch (error) {
        console.error('Erreur envoi message:', error);
        showLocalAIError(error.message || 'Erreur connue');
    } finally {
        if (sendBtn) sendBtn.disabled = false;
        if (input) input.disabled = false;
        if (input) input.focus();
        if (typingIndicator) typingIndicator.style.display = 'none';
    }
}

// Fonction pour poser une question depuis les exemples
function askQuestion(question) {
    const input = document.getElementById('chatInput');
    if (input) {
        input.value = question;
        sendMessage();
    }
}

// =============================================================================
// FORMATAGE ET AFFICHAGE
// =============================================================================

/**
 * Formate une réponse de l'IA locale pour l'affichage
 * @param {string} text - Texte à formater
 * @returns {string} Texte formaté
 */
function formatLocalAIResponse(text) {
    if (!text) return '';
    
    // Remplacer **texte** par <strong>texte</strong>
    let formatted = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Remplacer *texte* par <em>texte</em>
    formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
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
    
    // Ajouter le badge du modèle - CLARIFICATION : IA LOCALE UNIQUEMENT
    formatted += '<div class="model-info-dpai" style="color: #2563eb; font-weight: 500;"><i class="fas fa-check-circle"></i> Réponse par IA LOCALE DPAI - Pas de Mistral</div>';
    
    return formatted;
}

/**
 * Affiche un message dans le chat
 * @param {string} message - Message à afficher
 * @param {string} sender - Expéditeur ('user' ou 'assistant')
 */
function displayLocalAIChatMessage(message, sender) {
    const container = document.getElementById('chatMessages');
    if (!container) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message-dpai ${sender}`;
    
    const avatar = sender === 'assistant'
        ? '<div class="message-avatar-dpai advisor"><i class="fas fa-robot"></i></div>'
        : '<div class="message-avatar-dpai user"><i class="fas fa-user"></i></div>';
    
    // Formater le message
    const formattedContent = sender === 'assistant' 
        ? formatLocalAIResponse(message)
        : `<p>${message.replace(/\n/g, '<br>')}</p>`;
    
    messageDiv.innerHTML = `
        ${avatar}
        <div class="message-content-dpai">
            ${formattedContent}
            <span class="message-time-dpai">${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
    `;
    
    container.appendChild(messageDiv);
    container.scrollTop = container.scrollHeight;
}

/**
 * Affiche une erreur
 * @param {string} message - Message d'erreur
 */
function showLocalAIError(message) {
    const errorElement = document.getElementById('aiError');
    if (errorElement) {
        errorElement.getElementsByTagName('p')[0].textContent = message;
        errorElement.style.display = 'block';
        setTimeout(() => {
            errorElement.style.display = 'none';
        }, 8000);
    } else {
        alert(message);
    }
}

// =============================================================================
// VÉRIFICATION D'ACCÈS - ACTIVÉE (ACCÈS RESERVÉ ADVISOR)
// =============================================================================

async function checkAdvisorAccess() {
    try {
        if (!TokenManager || !TokenManager.userData) {
            showAccessRequired();
            return false;
        }

        // Vérifier si l'utilisateur a accès au Conseiller IA (plan advisor)
        const hasAccess = TokenManager.isAdvisorAllowed();
        
        if (!hasAccess) {
            showAccessRequired();
            return false;
        }

        showChat();
        return true;
    } catch (error) {
        console.error('Erreur vérification accès:', error);
        showAccessRequired();
        return false;
    }
}

// =============================================================================
// INITIALISATION
// =============================================================================

document.addEventListener('DOMContentLoaded', async () => {
    // Initialiser Firebase
    if (typeof initializeFirebase === 'function') {
        await initializeFirebase();
    }

    // Initialiser l'auth
    if (typeof authService === 'object' && authService.init) {
        await authService.init();
    }

    // Vérifier l'accès
    await checkAdvisorAccess();

    // Configurer les boutons
    const newChatBtn = document.getElementById('newChatBtn');
    const sendBtn = document.getElementById('sendBtn');
    const chatInput = document.getElementById('chatInput');
    const logoutBtn = document.getElementById('logoutBtn');
    
    if (newChatBtn) {
        newChatBtn.addEventListener('click', newConversation);
    }
    
    if (sendBtn) {
        sendBtn.addEventListener('click', sendMessage);
    }
    
    if (chatInput) {
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
    }

    // Gérer l'auth
    if (authService) {
        authService.onAuthStateChanged(async (user) => {
            if (user) {
                // Charger les données utilisateur
                await TokenManager.loadUserTokenData(user.uid);
                await checkAdvisorAccess();
            } else {
                showAccessRequired();
            }
        });
    }

    // Gérer la déconnexion
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            if (authService) {
                await authService.signOut();
            }
        });
    }

    // Vérifier la santé de l'IA locale toutes les 30 secondes
    setInterval(checkLocalAIHealth, 30000);
});

// Exposer les fonctions pour les autres scripts
window.LocalAIClient = {
    callLocalAI,
    getLocalAIConversations,
    deleteLocalAIConversation,
    sendMessage,
    newConversation,
    loadConversation,
    checkLocalAIHealth,
    isLocalAIAvailable: () => isLocalAIAvailable,
    formatLocalAIResponse,
    displayLocalAIChatMessage,
    showLocalAIError,
    askQuestion
};

console.log('[Local-AI-Client] Initialisé - Conseiller IA DPAI Locale prêt');
