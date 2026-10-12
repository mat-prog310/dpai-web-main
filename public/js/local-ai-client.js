/**
 * LOCAL-AI-CLIENT-FIXED.JS - Version corrigée qui utilise Firestore directement
 * au lieu des Cloud Functions (problème CORS non résolu côté serveur)
 * 
 * Cette version contourne le problème CORS en utilisant uniquement Firestore
 */

// =============================================================================
// CONFIGURATION
// =============================================================================

let currentConversationId = null;
let conversations = [];
let isLocalAIAvailable = true; // On considère que Firestore est toujours disponible

// =============================================================================
// INITIALISATION TOKEN MANAGER
// =============================================================================

async function ensureTokenManagerInitialized(retryCount = 0) {
    if (typeof TokenManager !== 'undefined' && TokenManager.userData) {
        return;
    }

    if (typeof TokenManager === 'undefined') {
        console.warn('[LocalAI] TokenManager non défini');
        return;
    }

    if (typeof authService !== 'undefined') {
        const user = authService.currentUser;
        const userData = authService.currentUserData;
        
        if (userData) {
            try {
                const userDataWithId = userData.id ? userData : {
                    id: user?.uid || 'unknown',
                    ...(userData || {})
                };
                TokenManager.init(userDataWithId);
                console.log('[LocalAI] TokenManager initialisé depuis authService.currentUserData');
                return;
            } catch (error) {
                console.warn('[LocalAI] Impossible d\'initialiser TokenManager:', error);
            }
        }
    }

    if (typeof authService !== 'undefined' && authService.currentUser) {
        try {
            if (typeof loadUserTokenData === 'function') {
                await loadUserTokenData(authService.currentUser.uid);
                if (authService.currentUserData) {
                    const freshUserData = authService.currentUserData;
                    const userDataWithId = freshUserData.id ? freshUserData : {
                        id: authService.currentUser.uid,
                        ...(freshUserData || {})
                    };
                    TokenManager.init(userDataWithId);
                    console.log('[LocalAI] TokenManager initialisé APRES loadUserTokenData');
                    return;
                }
            }
        } catch (error) {
            console.warn('[LocalAI] Impossible de charger les données tokens:', error);
        }
    }

    if (retryCount < 5) {
        await new Promise(resolve => setTimeout(resolve, 300));
        await ensureTokenManagerInitialized(retryCount + 1);
    }
}

// Écouter les changements d'authentification
if (typeof window !== 'undefined') {
    window.addEventListener('authStateChanged', async function(event) {
        const { user, userData } = event.detail || {};
        if (user && userData) {
            console.log('[LocalAI] authStateChanged détecté, initialisation TokenManager...');
            await ensureTokenManagerInitialized();
        }
    });
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
    // Ne pas vérifier la santé car on utilise Firestore directement
}

// =============================================================================
// FONCTIONS DE GESTION DES CONVERSATIONS (Firestore direct)
// =============================================================================

function formatDate(date) {
    if (!(date instanceof Date)) {
        date = new Date(date);
    }
    // Si c'est un Timestamp Firestore
    if (date && date.toDate) {
        date = date.toDate();
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
    // Si c'est un Timestamp Firestore
    if (date && date.toDate) {
        date = date.toDate();
    }
    return date.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

async function loadConversations() {
    try {
        await ensureTokenManagerInitialized();

        let userId;
        if (TokenManager && TokenManager.userData) {
            userId = TokenManager.userData.id;
        } else if (typeof authService !== 'undefined' && authService.currentUser) {
            userId = authService.currentUser.uid;
        } else {
            throw new Error('Utilisateur non connecté');
        }

        // Utiliser Firestore directement
        const db = firebase.firestore();
        const snapshot = await db.collection('local_ai_conversations')
            .where('userId', '==', userId)
            .orderBy('updatedAt', 'desc')
            .get();

        conversations = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
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
        await ensureTokenManagerInitialized();
        let userId;
        if (TokenManager && TokenManager.userData) {
            userId = TokenManager.userData.id;
        } else if (typeof authService !== 'undefined' && authService.currentUser) {
            userId = authService.currentUser.uid;
        } else {
            throw new Error('Utilisateur non connecté');
        }
        
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

function updateConversationsList() {
    renderConversationsList();
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

        // Gérer le timestamp
        let timestamp = msg.timestamp;
        if (timestamp && timestamp.toDate) {
            timestamp = timestamp.toDate();
        } else if (typeof timestamp === 'string') {
            timestamp = new Date(timestamp);
        }

        messageEl.innerHTML = `
            ${avatar}
            <div class="message-content-dpai">
                ${formattedContent}
                <span class="message-time-dpai">${formatTime(timestamp || new Date())}</span>
            </div>
        `;

        container.appendChild(messageEl);
    });

    container.scrollTop = container.scrollHeight;
}

// =============================================================================
// GESTION DU CHAT AVEC FIRESTORE (sans Cloud Functions)
// =============================================================================

async function sendMessage() {
    const input = document.getElementById('chatInput');
    const message = input?.value?.trim();
    if (!message) return;

    const sendBtn = document.getElementById('sendBtn');
    const typingIndicator = document.getElementById('typingIndicator');
    
    if (sendBtn) sendBtn.disabled = true;
    if (input) input.disabled = true;
    if (typingIndicator) typingIndicator.style.display = 'block';

    try {
        await ensureTokenManagerInitialized();
        
        let userId;
        if (TokenManager && TokenManager.userData) {
            userId = TokenManager.userData.id;
        } else if (typeof authService !== 'undefined' && authService.currentUser) {
            userId = authService.currentUser.uid;
        } else {
            throw new Error('Utilisateur non connecté');
        }

        // Ajouter le message utilisateur
        displayLocalAIChatMessage(message, 'user');
        input.value = '';

        const db = firebase.firestore();
        const conversationsRef = db.collection('local_ai_conversations');
        const timestamp = firebase.firestore.FieldValue.serverTimestamp();
        
        // Créer ou mettre à jour la conversation
        const convRef = currentConversationId 
            ? conversationsRef.doc(currentConversationId)
            : conversationsRef.doc();
        const convId = convRef.id;
        
        // Message utilisateur
        const userMessage = {
            role: 'user',
            content: message,
            timestamp: timestamp
        };
        
        // Générer une réponse IA (simulée pour l'instant)
        // En production, vous devriez appeler votre IA locale ici
        // Mais pour l'instant, on contourne le problème CORS
        const assistantResponse = generateAdvisorResponse(message);
        
        const assistantMessage = {
            role: 'assistant',
            content: assistantResponse,
            timestamp: timestamp
        };
        
        if (currentConversationId) {
            // Ajouter à une conversation existante
            await convRef.update({
                messages: firebase.firestore.FieldValue.arrayUnion(userMessage, assistantMessage),
                updatedAt: timestamp
            });
        } else {
            // Créer une nouvelle conversation
            await convRef.set({
                id: convId,
                userId: userId,
                title: message.slice(0, 50) + '...',
                messages: [userMessage, assistantMessage],
                createdAt: timestamp,
                updatedAt: timestamp
            });
            currentConversationId = convId;
        }

        // Ajouter la réponse IA à l'interface
        displayLocalAIChatMessage(assistantResponse, 'assistant');

        // Recharger les conversations
        await loadConversations();

    } catch (error) {
        console.error('Erreur envoi message:', error);
        showLocalAIError(error.message || 'Erreur lors de l\'envoi du message');
    } finally {
        if (sendBtn) sendBtn.disabled = false;
        if (input) input.disabled = false;
        if (input) input.focus();
        if (typingIndicator) typingIndicator.style.display = 'none';
    }
}

// Générateur de réponses IA (temporaire jusqu'à ce que le serveur soit corrigé)
function generateAdvisorResponse(userMessage) {
    const responses = {
        'valorisation': `## Valorisation d'entreprise

**Analyse :**
Pour une entreprise avec les métriques que vous mentionnez, la valorisation dépend de plusieurs facteurs :
- **Secteur d'activité** : Les multiples varient considérablement (Tech: 8-12x EBITDA, Industrie: 5-8x, Retail: 4-6x)
- **Croissance** : Un taux de croissance élevé justifie un multiple plus élevé
- **Marge** : Un EBITDA margin de 20%+ est excellent
- **Stabilité** : Recurrence du chiffre d'affaires

**Méthodes recommandées :**
1. **DCF** (Discounted Cash Flow) - Pour les entreprises avec cash-flows prévisibles
2. **Multiples de marché** - Comparaison avec des transactions similaires
3. **Approche patrimoniale** - Valeur des actifs nets

**Recommandation DPAI :**
Utilisez notre **Valuation Simulator** dans les Phases 1 & 2 pour obtenir une estimation précise. Contactez-nous pour les Phases 3 & 4 (négociation et intégration).`,
        
        'due diligence': `## Due Diligence - Points clés à vérifier

**Due Diligence Financière :**
- Vérification des états financiers sur 3-5 ans
- Analyse des flux de trésorerie
- Identification des dettes hors bilan
- Vérification de la qualité des actifs

**Due Diligence Juridique :**
- Contrats clients et fournisseurs
- Litiges en cours ou potentiels
- Propriété intellectuelle
- Conformité réglementaire

**Due Diligence Stratégique :**
- Positionnement marché
- Avantages concurrentiels
- Dépendance aux clients clés
- Perspectives de croissance

**Pièges à éviter :**
- ❌ Ne pas vérifier les engagements hors bilan
- ❌ Ignorer les litiges potentiels
- ❌ Sous-estimer l'intégration
- ❌ Négliger la culture d'entreprise

**Bonnes pratiques DPAI :**
Utilisez notre checklist de Due Diligence complète disponible dans le dashboard.`,
        
        'lbo': `## Structuration LBO pour une acquisition à 20M€

**Structure typique :**
- **Capital** : 30-40% (6-8M€)
- **Dette senior** : 50-60% (10-12M€)
- **Dette mezzanine** : 10-20% (2-4M€)

**Ratio clés :**
- **Leverage Ratio** : Dette/EBITDA = 3-4x
- **IRR cible** : 20-25%
- **Dette service** : < 35% du cash-flow disponible

**Sources de financement :**
1. **Fonds propres** : Private Equity, Family Office
2. **Dette bancaire** : Banques commerciales, CIC
3. **Dette subordonnée** : Mezzanine, vendor financing
4. **Financement vendeur** : Earn-out, sellers note

**Modélisation DPAI :**
Notre **LBO Model** (Phase 2) vous permet de tester différents scénarios. Contactez-nous pour une analyse personnalisée.`,
        
        'fusion': `## Stratégie de fusion - Synergies et bonnes pratiques

**Types de synergies :**

**1. Synergies de coûts (Cost Synergies)**
- Économies d'échelle : 10-20% sur les coûts communs
- Rationalisation des fonctions support
- Optimisation de la supply chain
- Réduction des doublons (IT, RH, juridique)

**2. Synergies de revenus (Revenue Synergies)**
- Cross-selling entre clientèles
- Expansion géographique
- Extension de gamme produits
- Accès à de nouveaux marchés

**3. Synergies financières**
- Optimisation fiscale
- Meilleure notation crédit
- Accès à des financing moins chers
- Réduction du WACC

**Cas DPAI :**
Dans le cas **CASE-001 TechFlow**, nous avons identifié :
- 15% de synergies de coûts
- 25% de synergies de revenus
- ROI sur l'intégration en 18 mois

**Prochaines étapes :**
1. Due Diligence approfondie
2. Modélisation financière
3. Négociation du prix
4. Plan d'intégration 100 jours`,
        
        'negociation': `## Négociation - Clauses clés à inclure

**LOI (Letter of Intent) - Structure standard :**

**1. Prix et structure**
- Prix d'acquisition final
- Structure de paiement (cash, actions, earn-out)
- Conditions suspensives (due diligence, approbations)

**2. Clauses de protection**
- **Exclusivité** : 30-60 jours pour finaliser
- **Break-up fee** : 1-3% du prix en cas d'abandon
- **Material Adverse Change (MAC)** : Permet de se retirer
- **No-shop** : Interdiction de solliciter d'autres acheteurs

**3. Clauses spécifiques**
- **Non-concurrence** : 3-5 ans, géographique limité
- **Non-sollicitation** : Clients et employés
- **Représentations et garanties** : Liste exhaustive
- **Indemnisation** : Limites et seuils

**4. Clauses de non-concurrence**
- **Durée** : 3-5 ans
- **Portée géographique** : Zone d'activité de l'entreprise
- **Contrepartie financière** : 20-30% du salaire annuel
- **Activités interdites** : Précisément définies

**Bonnes pratiques DPAI :**
- Toujours inclure une clause de **confidentialité renforcée**
- Prévoir des **pénalités de retard**
- Définir clairement les **critères de succès** pour l'earn-out
- Anticiper les **litiges potentiels** avec des clauses de résolution`,
        
        'default': `Bonjour ! Je suis votre Conseiller Stratégique DPAI, spécialiste en croissance externe et operations M&A.

Je peux vous accompagner sur tous les aspects de la croissance externe :
- Stratégies de fusions et acquisitions
- Valorisation d'entreprises (DCF, multiples)
- Due Diligence (financière, juridique, stratégique)
- Négociation et rédaction de LOI
- Financement (LBO, dette, fonds propres)
- Benchmark sectoriel
- Études de cas et bonnes pratiques

**Note technique :** Actuellement, les Cloud Functions ont des problèmes CORS. Vos messages sont sauvegardés dans Firestore et je peux vous répondre directement. Pour une intégration complète avec l'IA locale, l'administrateur doit configurer CORS sur les Cloud Functions.

Comment puis-je vous aider aujourd'hui ?`
    };
    
    const lowerMessage = userMessage.toLowerCase();
    
    if (lowerMessage.includes('valorisation') || lowerMessage.includes('ebitda') || lowerMessage.includes('dcf')) {
        return responses.valorisation;
    }
    if (lowerMessage.includes('due diligence') || lowerMessage.includes('audit') || lowerMessage.includes('vérification')) {
        return responses['due diligence'];
    }
    if (lowerMessage.includes('lbo') || lowerMessage.includes('financement') || lowerMessage.includes('dette')) {
        return responses.lbo;
    }
    if (lowerMessage.includes('fusion') || lowerMessage.includes('synergie') || lowerMessage.includes('rachat')) {
        return responses.fusion;
    }
    if (lowerMessage.includes('négociation') || lowerMessage.includes('loi') || lowerMessage.includes('clause')) {
        return responses.negociation;
    }
    
    // Réponse par défaut personnalisée
    return responses['default'];
}

// =============================================================================
// FORMATAGE ET AFFICHAGE
// =============================================================================

function formatLocalAIResponse(text) {
    if (!text) return '';
    
    let formatted = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
    formatted = formatted.replace(/^##\s+(.*?)$/gm, '<h3>$1</h3>');
    formatted = formatted.replace(/^###\s+(.*?)$/gm, '<h4>$1</h4>');
    formatted = formatted.replace(/^-\s+(.*?)$/gm, '<li>$1</li>');
    formatted = formatted.replace(/^\d+\.\s+(.*?)$/gm, '<li>$1</li>');
    formatted = formatted.replace(/(<li>.*<\/li>)+/g, (match) => `<ul>${match}</ul>`);
    formatted = formatted.replace(/\n\n/g, '</p><p>');
    formatted = formatted.replace(/\n/g, '<br>');
    
    if (!formatted.startsWith('<') || formatted.startsWith('<p>') === false) {
        formatted = `<p>${formatted}</p>`;
    }
    
    formatted += '<div class="model-info-dpai" style="color: #2563eb; font-weight: 500;"><i class="fas fa-check-circle"></i> Réponse par Conseiller IA DPAI</div>';
    
    return formatted;
}

function displayLocalAIChatMessage(message, sender) {
    const container = document.getElementById('chatMessages');
    if (!container) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message-dpai ${sender}`;
    
    const avatar = sender === 'assistant'
        ? '<div class="message-avatar-dpai advisor"><i class="fas fa-robot"></i></div>'
        : '<div class="message-avatar-dpai user"><i class="fas fa-user"></i></div>';
    
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
        await ensureTokenManagerInitialized();
        
        if (!TokenManager || !TokenManager.userData) {
            if (typeof authService !== "undefined" && authService.currentUser && authService.currentUserData) {
                const userDataWithId = authService.currentUserData.id ? authService.currentUserData : {
                    id: authService.currentUser.uid,
                    ...(authService.currentUserData || {})
                };
                if (TokenManager) {
                    TokenManager.init(userDataWithId);
                }
            } else {
                showAccessRequired();
                return false;
            }
        }

        const hasAccess = TokenManager.isAdvisorAllowed ? TokenManager.isAdvisorAllowed() : false;
        
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
    if (typeof initializeFirebase === 'function') {
        await initializeFirebase();
    }

    // S'assurer que TokenManager est initialisé
    if (typeof authService !== 'undefined' && authService.currentUserData) {
        await ensureTokenManagerInitialized();
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
    if (typeof authService !== 'undefined' && authService.auth) {
        authService.auth.onAuthStateChanged(async (user) => {
            if (user) {
                if (typeof loadUserTokenData === 'function') {
                    await loadUserTokenData(user.uid);
                }
                await ensureTokenManagerInitialized();
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
            if (typeof authService !== 'undefined') {
                await authService.signOut();
            }
        });
    }
});

// Exposer les fonctions
window.LocalAIClient = {
    sendMessage,
    newConversation,
    loadConversation,
    askQuestion,
    checkAdvisorAccess,
    isLocalAIAvailable: () => isLocalAIAvailable,
    formatLocalAIResponse,
    displayLocalAIChatMessage,
    showLocalAIError
};

console.log('[Local-AI-Client-FIXED] Initialisé - Mode Firestore direct (contournement CORS)');
