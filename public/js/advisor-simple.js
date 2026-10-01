/**
 * Conseiller IA DPAI - Version simplifiée avec API Mistral
 * Utilise les prompts DPAI personnalisés pour une réponse experte
 */

// =============================================================================
// CONFIGURATION
// =============================================================================

let currentConversationId = null;
let conversations = [];

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
}

// =============================================================================
// GESTION DES CONVERSATIONS
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

        const response = await AIClient.getAdvisorConversations();
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
        item.className = 'conversation-item';
        if (currentConversationId === conv.id) {
            item.classList.add('active');
        }

        const lastMessage = conv.messages?.[conv.messages.length - 1]?.content;
        const preview = lastMessage ? lastMessage.slice(0, 40) + '...' : 'Nouvelle discussion';

        item.innerHTML = `
            <div class="conversation-preview">
                <i class="fas fa-comment-dots"></i>
                <div>
                    <strong>${conv.title || 'Sans titre'}</strong>
                    <p>${preview}</p>
                </div>
            </div>
            <span class="conversation-date">
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
            <div class="welcome-message">
                <div class="advisor-avatar">
                    <i class="fas fa-robot"></i>
                </div>
                <div class="welcome-content">
                    <h2>Nouvelle discussion</h2>
                    <p>Posez votre question sur la croissance externe, les fusions, acquisitions...</p>
                    <p style="font-size: 14px; color: #666; margin-top: 10px;">
                        <i class="fas fa-info-circle"></i> Powered by Mistral AI + Expertise DPAI
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
        const doc = await db.collection('advisor_conversations').doc(conversationId).get();

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
            <div class="welcome-message">
                <div class="advisor-avatar">
                    <i class="fas fa-robot"></i>
                </div>
                <div class="welcome-content">
                    <h2>Commencez une nouvelle discussion</h2>
                    <p>Posez-moi n'importe quelle question sur la croissance externe.</p>
                </div>
            </div>
        `;
        return;
    }

    messages.forEach(msg => {
        const messageEl = document.createElement('div');
        messageEl.className = `message ${msg.role}`;

        const avatar = msg.role === 'assistant'
            ? '<div class="message-avatar advisor"><i class="fas fa-robot"></i></div>'
            : '<div class="message-avatar user"><i class="fas fa-user"></i></div>';

        // Formater la réponse
        const formattedContent = AIClient.formatAIResponse(msg.content);

        messageEl.innerHTML = `
            ${avatar}
            <div class="message-content">
                ${formattedContent}
                <span class="message-time">${formatTime(msg.timestamp?.toDate() || new Date())}</span>
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
// GESTION DU CHAT AVEC API MISTRAL
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
        AIClient.displayChatMessage(message, 'user');
        input.value = '';

        // Appeler le Conseiller IA (utilise API Mistral avec prompts DPAI)
        const response = await AIClient.callAdvisorChat(message, currentConversationId);

        if (response.success) {
            // Mettre à jour la conversation ID si nouvelle
            if (response.conversationId && !currentConversationId) {
                currentConversationId = response.conversationId;
            }

            // Ajouter la réponse IA
            AIClient.displayChatMessage(response.response, 'assistant');

            // Recharger les conversations
            await loadConversations();
        } else {
            AIClient.showAIError(response.error || 'Erreur inconnue');
        }

    } catch (error) {
        console.error('Erreur envoi message:', error);
        AIClient.showAIError(error.message || 'Erreur connue');
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
// VÉRIFICATION D'ACCÈS
// =============================================================================

async function checkAdvisorAccess() {
    try {
        if (!TokenManager || !TokenManager.userData) {
            showAccessRequired();
            return false;
        }

        // Vérifier si l'utilisateur a accès
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
});
